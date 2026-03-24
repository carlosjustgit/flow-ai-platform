import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

/**
 * POST /api/orchestrator/sessions/:sessionId/trigger
 *
 * Bridges a completed onboarding_sessions record to the AI pipeline.
 * Creates a project (if no project_id is supplied), ingests the session
 * report as artifacts, and fires the research worker — all in one call.
 *
 * Body: { project_id? }   (omit to auto-create a new project)
 * Returns: { session_id, project_id, job_id, artifact_id, created_project }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const body = await request.json().catch(() => ({}));
    const { project_id: suppliedProjectId } = body as { project_id?: string };

    const supabase = createServiceClient();

    // Load the onboarding session
    const { data: session, error: sessionError } = await supabase
      .from('onboarding_sessions')
      .select('id, client_name, company, report, language, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Onboarding session not found' },
        { status: 404 }
      );
    }

    if ((session as any).status !== 'completed') {
      return NextResponse.json(
        { error: `Session is not completed (status: ${(session as any).status})` },
        { status: 422 }
      );
    }

    const report: string | null = (session as any).report;
    if (!report) {
      return NextResponse.json(
        { error: 'Session has no report — interview may not have generated a brief yet' },
        { status: 422 }
      );
    }

    const language: string = (session as any).language ?? 'pt';
    const clientName: string = (session as any).company || (session as any).client_name || 'Unknown';

    // Resolve or create project
    let projectId = suppliedProjectId;
    let createdProject = false;

    if (!projectId) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({ client_name: clientName, language } as any)
        .select()
        .single();

      if (projectError || !project) {
        throw new Error(`Failed to create project: ${projectError?.message}`);
      }

      projectId = (project as any).id;
      createdProject = true;
    } else {
      // Verify supplied project exists
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        return NextResponse.json(
          { error: 'Supplied project_id not found' },
          { status: 404 }
        );
      }
    }

    // Store onboarding report as JSON artifact (wrap markdown in JSON envelope)
    const { data: jsonArtifact, error: jsonError } = await supabase
      .from('artifacts')
      .insert({
        project_id: projectId,
        type: 'onboarding_report_json',
        format: 'json',
        title: 'Onboarding Report',
        content_json: { report },
      } as any)
      .select()
      .single();

    if (jsonError) {
      throw new Error(`Failed to store onboarding report JSON: ${jsonError.message}`);
    }

    // Store markdown artifact
    await supabase
      .from('artifacts')
      .insert({
        project_id: projectId,
        type: 'onboarding_report_md',
        format: 'md',
        title: 'Onboarding Report (Markdown)',
        content: report,
      } as any);

    // Create research job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        project_id: projectId,
        type: 'research',
        status: 'queued',
        input_artifact_id: (jsonArtifact as any).id,
      } as any)
      .select()
      .single();

    if (jobError) {
      throw new Error(`Failed to create research job: ${jobError.message}`);
    }

    const jobId = (job as any).id;

    // Fire research worker (fire-and-forget)
    const workerUrl = new URL('/api/workers/research', request.url).toString();
    fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        input_artifact_id: (jsonArtifact as any).id,
        job_id: jobId,
      }),
    }).catch((err) => {
      console.error('[orchestrator/sessions/trigger] Failed to fire research worker:', err);
    });

    // Mark job running now that the worker has been fired
    await supabase
      .from('jobs')
      .update({ status: 'running' } as any)
      .eq('id', jobId);

    return NextResponse.json(
      {
        session_id: sessionId,
        project_id: projectId,
        job_id: jobId,
        artifact_id: (jsonArtifact as any).id,
        created_project: createdProject,
        message: 'Session triggered. Onboarding report ingested and research agent started.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[orchestrator/sessions/trigger] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
