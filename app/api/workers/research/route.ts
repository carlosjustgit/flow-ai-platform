import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { logWorkerRun } from '@/lib/logging';
import { getArtifact, updateJobStatus } from '@/lib/orchestrator';
import { generateResearchPack } from '@/lib/gemini';

/**
 * POST /api/workers/research
 *
 * Research Agent - Worker endpoint.
 * Input:  onboarding_report artifact (JSON preferred, markdown fallback)
 * Output: research_foundation_pack_json + research_foundation_pack_md artifacts
 *
 * Uses the official @google/genai SDK with responseSchema enforcement and
 * Google Search grounding - same behaviour as the Google AI Studio export.
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

    // Load the onboarding report artifact from Supabase
    const inputArtifact = await getArtifact(input_artifact_id);

    // Prefer structured JSON; fall back to markdown text
    let onboardingReport: string;
    if ((inputArtifact as any).content_json) {
      onboardingReport = JSON.stringify((inputArtifact as any).content_json, null, 2);
    } else if ((inputArtifact as any).content) {
      onboardingReport = (inputArtifact as any).content;
    } else {
      throw new Error('Onboarding report artifact has no content');
    }

    // Call the Research Agent (Gemini 3 + Google Search + responseSchema)
    const result = await generateResearchPack(onboardingReport);

    const supabase = createServiceClient();

    // Store JSON artifact
    const { data: jsonArtifact, error: jsonError } = await supabase
      .from('artifacts')
      .insert({
        project_id,
        type: 'research_foundation_pack_json',
        format: 'json',
        title: 'Research Foundation Pack',
        content_json: result.research_foundation_pack_json,
      } as any)
      .select()
      .single();

    if (jsonError) {
      throw new Error(`Failed to store research foundation pack JSON: ${jsonError.message}`);
    }

    // Store markdown artifact
    const { data: mdArtifact, error: mdError } = await supabase
      .from('artifacts')
      .insert({
        project_id,
        type: 'research_foundation_pack_md',
        format: 'md',
        title: 'Research Foundation Pack Summary',
        content: result.research_foundation_pack_markdown,
      } as any)
      .select()
      .single();

    if (mdError) {
      throw new Error(`Failed to store research foundation pack markdown: ${mdError.message}`);
    }

    const durationMs = Date.now() - startTime;

    // Log run metrics
    await logWorkerRun({
      job_id,
      model: 'gemini-3-flash-preview',
      tokens_in: result.tokensIn,
      tokens_out: result.tokensOut,
      duration_ms: durationMs,
    });

    // Advance job to done
    await updateJobStatus(job_id, 'done', null, (jsonArtifact as any).id);

    return NextResponse.json({
      artifacts: [
        { id: (jsonArtifact as any).id, type: 'research_foundation_pack_json' },
        { id: (mdArtifact as any).id, type: 'research_foundation_pack_md' },
      ],
      tokens_in: result.tokensIn,
      tokens_out: result.tokensOut,
      duration_ms: durationMs,
    });
  } catch (error) {
    console.error('[research-worker] error:', error);

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
      // best-effort logging
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
