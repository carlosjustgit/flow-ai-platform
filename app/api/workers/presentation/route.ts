import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { logWorkerRun } from '@/lib/logging';
import { getArtifact, updateJobStatus } from '@/lib/orchestrator';
import { generatePresentationPack } from '@/lib/gemini';
import { buildTemplateData, renderPptxFromTemplate } from '@/lib/pptx';

export const maxDuration = 300;

/**
 * POST /api/workers/presentation
 *
 * Presentation Agent — Worker #4.
 * Input:  research_foundation_pack_json artifact + kb_file artifacts
 * Output:
 *   - presentation_content_json artifact (raw narrative data for audit/re-rendering)
 *   - presentation artifact with file_url pointing to PPTX in Supabase Storage
 *
 * Flow:
 *   1. Gemini writes the narrative copy (titles, headlines, bullets) for slides 1-6
 *   2. Lean Canvas fields are taken directly from the research pack (structured data)
 *   3. buildTemplateData merges both into a flat TemplateData object
 *   4. renderPptxFromTemplate populates templates/deck-template.pptx via docxtemplater
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let job_id: string | undefined;

  try {
    const body = await request.json();
    const { project_id, input_artifact_id, job_id: jobId } = body;
    job_id = jobId;

    if (!project_id || !input_artifact_id || !job_id) {
      return NextResponse.json(
        { error: 'project_id, input_artifact_id, and job_id are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Load research foundation pack
    const researchArtifact = await getArtifact(input_artifact_id);
    const researchPack = (researchArtifact as any).content_json;
    if (!researchPack) {
      throw new Error('Research foundation pack artifact has no JSON content');
    }

    // Load project
    const { data: project } = await supabase
      .from('projects')
      .select('client_name, language')
      .eq('id', project_id)
      .single();

    const clientName = (project as any)?.client_name ?? 'Client';
    const language: 'pt' | 'en' = (project as any)?.language ?? 'pt';

    // Load KB files
    const { data: kbArtifacts } = await supabase
      .from('artifacts')
      .select('title, content')
      .eq('project_id', project_id)
      .eq('type', 'kb_file')
      .order('created_at', { ascending: true });

    const kbFiles = ((kbArtifacts as any[]) || [])
      .filter((a) => a.content)
      .map((a) => ({ title: a.title, content: a.content }));

    // Step 1 — Gemini generates narrative copy
    const narrative = await generatePresentationPack(researchPack, kbFiles, clientName);

    // Step 2 — Merge with Lean Canvas data from research pack
    const leanCanvas = (researchPack as any).lean_canvas ?? {};
    const templateData = buildTemplateData(
      {
        client_name: narrative.client_name || clientName,
        deck_title: narrative.deck_title,
        headline: narrative.headline,
        slide2_headline: narrative.slide2_headline,
        slide3_title: narrative.slide3_title,
        slide3_bullet_1: narrative.slide3_bullet_1,
        slide3_bullet_2: narrative.slide3_bullet_2,
        slide4_title: narrative.slide4_title,
        slide4_bullet_1: narrative.slide4_bullet_1,
        slide4_bullet_2: narrative.slide4_bullet_2,
        slide5_title: narrative.slide5_title,
        slide5_bullet_1: narrative.slide5_bullet_1,
        slide6_title: narrative.slide6_title || (language === 'pt' ? 'Modelo de Negócio' : 'Business Model Canvas'),
      },
      leanCanvas
    );

    // Step 3 — Populate the branded PPTX template
    const pptxBuffer = await renderPptxFromTemplate(templateData);

    // Upload PPTX to Supabase Storage
    const filename = `${project_id}/presentation-${Date.now()}.pptx`;
    const { error: storageError } = await supabase.storage
      .from('flow-artifacts')
      .upload(filename, pptxBuffer, {
        contentType:
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        upsert: true,
      });

    if (storageError) {
      throw new Error(`Failed to upload PPTX to storage: ${storageError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('flow-artifacts')
      .getPublicUrl(filename);

    const fileUrl = urlData?.publicUrl ?? null;

    // Store raw narrative JSON artifact
    const { data: jsonArtifact, error: jsonError } = await supabase
      .from('artifacts')
      .insert({
        project_id,
        type: 'presentation_content_json',
        format: 'json',
        title: `${clientName} — Presentation Content`,
        content_json: templateData,
      } as any)
      .select()
      .single();

    if (jsonError) throw new Error(`Failed to store presentation JSON: ${jsonError.message}`);

    // Store PPTX artifact with file_url
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
      tokens_in: narrative.tokensIn,
      tokens_out: narrative.tokensOut,
      duration_ms: durationMs,
    });

    await updateJobStatus(job_id, 'done', null, (pptxArtifact as any).id);

    return NextResponse.json({
      artifacts: [
        { id: (jsonArtifact as any).id, type: 'presentation_content_json' },
        { id: (pptxArtifact as any).id, type: 'presentation', file_url: fileUrl },
      ],
      tokens_in: narrative.tokensIn,
      tokens_out: narrative.tokensOut,
      duration_ms: durationMs,
    });
  } catch (error) {
    console.error('[presentation-worker] error:', error);

    if (job_id) {
      try {
        await logWorkerRun({
          job_id,
          model: 'gemini-3-flash-preview',
          duration_ms: Date.now() - startTime,
        });
        await updateJobStatus(
          job_id,
          'failed',
          error instanceof Error ? error.message : 'Unknown error'
        );
      } catch {
        // best-effort
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
