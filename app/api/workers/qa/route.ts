import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { logWorkerRun } from '@/lib/logging';
import { getArtifact, updateJobStatus } from '@/lib/orchestrator';
import { generateQAResults } from '@/lib/gemini';
import type { ContentPost } from '@/lib/gemini';

// No Google Search grounding — QA is fast, 120s is generous
export const maxDuration = 120;

/**
 * POST /api/workers/qa
 *
 * QA Agent — batch post reviewer.
 * Input:  content_plan_json artifact (30 posts from Content Planner)
 * Output: qa_results_json artifact (one QAResult per post)
 *
 * Also loads research_foundation_pack_json from the same project to extract
 * brand voice, messaging pillars, and claims rules for compliance checking.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const supabase = createServiceClient();

  try {
    const body = await request.json();
    const { project_id, input_artifact_id, job_id } = body;

    if (!project_id || !input_artifact_id || !job_id) {
      return NextResponse.json(
        { error: 'project_id, input_artifact_id, and job_id are required' },
        { status: 400 }
      );
    }

    // Fetch project language
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('client_name, language')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      throw new Error(`Failed to fetch project: ${projectError?.message ?? 'Not found'}`);
    }

    const clientName: string = (project as any).client_name ?? 'Client';
    const language: string = (project as any).language ?? 'pt';

    // Load content plan (input artifact)
    const contentArtifact = await getArtifact(input_artifact_id);
    const contentPlan = (contentArtifact as any).content_json;

    if (!contentPlan?.posts || !Array.isArray(contentPlan.posts) || contentPlan.posts.length === 0) {
      throw new Error('Content plan has no posts — run the Content Planner first.');
    }

    const posts: ContentPost[] = contentPlan.posts;

    // Load research foundation pack for strategy context (brand voice, claims rules)
    const { data: researchArtifact } = await supabase
      .from('artifacts')
      .select('content_json')
      .eq('project_id', project_id)
      .eq('type', 'research_foundation_pack_json')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const researchPack = (researchArtifact as any)?.content_json ?? {};
    const campaignFoundations = researchPack?.campaign_foundations ?? {};

    const strategyContext = {
      positioning_statement: campaignFoundations?.positioning_statement ?? '',
      messaging_pillars: Array.isArray(campaignFoundations?.messaging_pillars)
        ? campaignFoundations.messaging_pillars
        : [],
      claims_rules: {
        allowed: Array.isArray(campaignFoundations?.claims_rules?.allowed)
          ? campaignFoundations.claims_rules.allowed
          : [],
        not_allowed: Array.isArray(campaignFoundations?.claims_rules?.not_allowed)
          ? campaignFoundations.claims_rules.not_allowed
          : [],
        needs_proof: Array.isArray(campaignFoundations?.claims_rules?.needs_proof)
          ? campaignFoundations.claims_rules.needs_proof
          : [],
      },
      content_themes: Array.isArray(campaignFoundations?.content_themes)
        ? campaignFoundations.content_themes
        : [],
    };

    // Run QA
    const result = await generateQAResults(posts, strategyContext, language);

    const durationMs = Date.now() - startTime;

    // Store QA results artifact
    const { data: qaArtifact, error: qaError } = await supabase
      .from('artifacts')
      .insert({
        project_id,
        type: 'qa_results_json',
        format: 'json',
        title: `QA Results — ${clientName}`,
        content_json: {
          results: result.results,
          summary: {
            total: result.results.length,
            approved: result.results.filter(r => r.overall_status === 'approved').length,
            minor_edits: result.results.filter(r => r.overall_status === 'minor_edits').length,
            needs_revision: result.results.filter(r => r.overall_status === 'needs_revision').length,
          },
        },
      } as any)
      .select()
      .single();

    if (qaError) {
      throw new Error(`Failed to store QA results: ${qaError.message}`);
    }

    await logWorkerRun({
      job_id,
      model: 'gemini-3-flash-preview',
      tokens_in: result.tokensIn,
      tokens_out: result.tokensOut,
      duration_ms: durationMs,
    });

    await updateJobStatus(job_id, 'done', null, (qaArtifact as any).id);

    return NextResponse.json({
      artifact_id: (qaArtifact as any).id,
      summary: {
        total: result.results.length,
        approved: result.results.filter(r => r.overall_status === 'approved').length,
        minor_edits: result.results.filter(r => r.overall_status === 'minor_edits').length,
        needs_revision: result.results.filter(r => r.overall_status === 'needs_revision').length,
      },
      tokens_in: result.tokensIn,
      tokens_out: result.tokensOut,
      duration_ms: durationMs,
    });
  } catch (error) {
    console.error('[qa-worker] error:', error);

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
