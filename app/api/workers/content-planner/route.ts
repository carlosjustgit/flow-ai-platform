import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { logWorkerRun } from '@/lib/logging';
import { getArtifact, updateJobStatus } from '@/lib/orchestrator';
import { generateContentPlan } from '@/lib/gemini';
import type { ResearchFoundationPackJson } from '@/lib/gemini';

// Content planning with Google Search grounding — needs extended timeout
export const maxDuration = 300;

/**
 * POST /api/workers/content-planner
 *
 * Content Planner Agent — World-class growth hacker + content strategist.
 * Input:  research_foundation_pack_json artifact + kb_file artifacts
 * Output: content_plan_json + content_plan_md artifacts
 *
 * Produces a 30-day, platform-native content calendar with publish-ready
 * hooks, captions, visual briefs, and growth tactics for each post.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const supabase = createServiceClient();

  try {
    const body = await request.json();
    const { project_id, input_artifact_id, job_id, channels } = body;

    if (!project_id || !input_artifact_id || !job_id) {
      return NextResponse.json(
        { error: 'project_id, input_artifact_id, and job_id are required' },
        { status: 400 }
      );
    }

    // Fetch project metadata (name + language)
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
    const activeChannels: string[] = Array.isArray(channels) && channels.length > 0
      ? channels
      : ['instagram', 'linkedin'];

    // Load research foundation pack
    const researchArtifact = await getArtifact(input_artifact_id);
    const researchPack: ResearchFoundationPackJson = (researchArtifact as any).content_json
      ?? JSON.parse((researchArtifact as any).content ?? '{}');

    if (!researchPack || Object.keys(researchPack).length === 0) {
      throw new Error('Research foundation pack is empty — run the Research Agent first.');
    }

    // Load any existing KB files for additional context
    const { data: kbArtifacts } = await supabase
      .from('artifacts')
      .select('title, content')
      .eq('project_id', project_id)
      .eq('type', 'kb_file')
      .order('created_at', { ascending: true });

    const kbFiles = (kbArtifacts as any[] ?? []).map((a: any) => ({
      title: a.title ?? '',
      content: a.content ?? '',
    }));

    // Generate the content plan
    const result = await generateContentPlan(researchPack, kbFiles, clientName, language, activeChannels);

    const durationMs = Date.now() - startTime;

    // Store JSON artifact
    const { data: jsonArtifact, error: jsonError } = await supabase
      .from('artifacts')
      .insert({
        project_id,
        type: 'content_plan_json',
        format: 'json',
        title: `Content Calendar — ${clientName}`,
        content_json: {
          strategy_overview: result.strategy_overview,
          posts: result.posts,
        },
      } as any)
      .select()
      .single();

    if (jsonError) {
      throw new Error(`Failed to store content plan JSON: ${jsonError.message}`);
    }

    // Store markdown artifact
    const { data: mdArtifact, error: mdError } = await supabase
      .from('artifacts')
      .insert({
        project_id,
        type: 'content_plan_md',
        format: 'md',
        title: `Content Calendar (Markdown) — ${clientName}`,
        content: result.calendar_markdown,
      } as any)
      .select()
      .single();

    if (mdError) {
      throw new Error(`Failed to store content plan markdown: ${mdError.message}`);
    }

    await logWorkerRun({
      job_id,
      model: 'gemini-3-flash-preview',
      tokens_in: result.tokensIn,
      tokens_out: result.tokensOut,
      duration_ms: durationMs,
    });

    await updateJobStatus(job_id, 'done', null, (jsonArtifact as any).id);

    return NextResponse.json({
      artifacts: [
        { id: (jsonArtifact as any).id, type: 'content_plan_json' },
        { id: (mdArtifact as any).id, type: 'content_plan_md' },
      ],
      posts_count: result.posts.length,
      channels: activeChannels,
      tokens_in: result.tokensIn,
      tokens_out: result.tokensOut,
      duration_ms: durationMs,
    });
  } catch (error) {
    console.error('[content-planner-worker] error:', error);

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
