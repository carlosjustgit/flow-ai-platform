import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { logWorkerRun } from '@/lib/logging';
import { getArtifact, updateJobStatus } from '@/lib/orchestrator';
import { generatePresentationPack } from '@/lib/gemini';
import { renderPptxFromSlides } from '@/lib/pptx';

/**
 * POST /api/workers/presentation
 *
 * Presentation Agent — Worker #4.
 * Input:  research_foundation_pack_json artifact + kb_file artifacts
 * Output:
 *   - presentation_content_json artifact (raw slide data for re-rendering)
 *   - presentation artifact with file_url pointing to PPTX in Supabase Storage
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { project_id, input_artifact_id, job_id } = body;

    if (!project_id || !input_artifact_id || !job_id) {
      return NextResponse.json(
        { error: 'project_id, input_artifact_id, and job_id are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Load research foundation pack (the primary input)
    const researchArtifact = await getArtifact(input_artifact_id);
    const researchPack = (researchArtifact as any).content_json;
    if (!researchPack) {
      throw new Error('Research foundation pack artifact has no JSON content');
    }

    // Load the project name
    const { data: project } = await supabase
      .from('projects')
      .select('client_name')
      .eq('id', project_id)
      .single();

    const clientName = (project as any)?.client_name ?? 'Client';

    // Load all KB files for this project
    const { data: kbArtifacts } = await supabase
      .from('artifacts')
      .select('title, content')
      .eq('project_id', project_id)
      .eq('type', 'kb_file')
      .order('created_at', { ascending: true });

    const kbFiles = ((kbArtifacts as any[]) || [])
      .filter((a) => a.content)
      .map((a) => ({ title: a.title, content: a.content }));

    // Generate slide content via Gemini
    const result = await generatePresentationPack(researchPack, kbFiles, clientName);

    // Render PPTX file
    const pptxBuffer = await renderPptxFromSlides(result.slides, result.deck_title, clientName);

    // Upload PPTX to Supabase Storage
    const filename = `${project_id}/presentation-${Date.now()}.pptx`;
    const { data: storageData, error: storageError } = await supabase.storage
      .from('flow-artifacts')
      .upload(filename, pptxBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        upsert: true,
      });

    if (storageError) {
      throw new Error(`Failed to upload PPTX to storage: ${storageError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('flow-artifacts')
      .getPublicUrl(filename);

    const fileUrl = urlData?.publicUrl ?? null;

    // Store raw slide JSON artifact (for future re-rendering)
    const { data: jsonArtifact, error: jsonError } = await supabase
      .from('artifacts')
      .insert({
        project_id,
        type: 'presentation_content_json',
        format: 'json',
        title: `${clientName} — Presentation Content`,
        content_json: { client_name: result.client_name, deck_title: result.deck_title, slides: result.slides },
      } as any)
      .select()
      .single();

    if (jsonError) throw new Error(`Failed to store presentation JSON: ${jsonError.message}`);

    // Store presentation artifact with file_url
    const { data: pptxArtifact, error: pptxError } = await supabase
      .from('artifacts')
      .insert({
        project_id,
        type: 'presentation',
        format: 'pptx',
        title: `${clientName} — Strategic Presentation`,
        file_url: fileUrl,
      } as any)
      .select()
      .single();

    if (pptxError) throw new Error(`Failed to store presentation artifact: ${pptxError.message}`);

    const durationMs = Date.now() - startTime;

    await logWorkerRun({
      job_id,
      model: 'gemini-3-flash-preview',
      tokens_in: result.tokensIn,
      tokens_out: result.tokensOut,
      duration_ms: durationMs,
    });

    await updateJobStatus(job_id, 'done', null, (pptxArtifact as any).id);

    return NextResponse.json({
      artifacts: [
        { id: (jsonArtifact as any).id, type: 'presentation_content_json' },
        { id: (pptxArtifact as any).id, type: 'presentation', file_url: fileUrl },
      ],
      slide_count: result.slides.length,
      tokens_in: result.tokensIn,
      tokens_out: result.tokensOut,
      duration_ms: durationMs,
    });
  } catch (error) {
    console.error('[presentation-worker] error:', error);

    try {
      const errorBody = await request.clone().json();
      if (errorBody.job_id) {
        await logWorkerRun({
          job_id: errorBody.job_id,
          model: 'gemini-3-flash-preview',
          duration_ms: Date.now() - startTime,
        });
        await updateJobStatus(
          errorBody.job_id,
          'failed',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    } catch {
      // best-effort
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
