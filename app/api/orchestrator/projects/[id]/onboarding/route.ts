import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/orchestrator/projects/:id/onboarding
 *
 * Ingests an onboarding report for a project, stores it as an artifact,
 * creates a research job, and immediately fires the research worker so
 * the pipeline starts with zero manual clicks.
 *
 * Body: { onboarding_report_json, onboarding_report_md?, language? }
 * Returns: { project_id, job_id }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { onboarding_report_json, onboarding_report_md, language } = body;

    if (!onboarding_report_json && !onboarding_report_md) {
      return NextResponse.json(
        { error: 'onboarding_report_json or onboarding_report_md is required' },
        { status: 400 }
      );
    }

    if (language && !['pt', 'en'].includes(language)) {
      return NextResponse.json(
        { error: 'language must be "pt" or "en"' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, client_name, language')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Update language if provided
    if (language && language !== (project as any).language) {
      await supabase
        .from('projects')
        .update({ language } as any)
        .eq('id', projectId);
    }

    // If only markdown was provided, wrap it so the pipeline has a JSON artifact to reference
    const jsonPayload = onboarding_report_json ?? { report: onboarding_report_md };

    // Store JSON artifact
    const { data: jsonArtifact, error: jsonError } = await supabase
      .from('artifacts')
      .insert({
        project_id: projectId,
        type: 'onboarding_report_json',
        format: 'json',
        title: 'Onboarding Report',
        content_json: jsonPayload,
      } as any)
      .select()
      .single();

    if (jsonError) {
      throw new Error(`Failed to store onboarding report JSON: ${jsonError.message}`);
    }

    // Store markdown artifact (use provided or stringify JSON)
    const mdContent = onboarding_report_md ?? (typeof onboarding_report_json === 'string'
      ? onboarding_report_json
      : JSON.stringify(onboarding_report_json, null, 2));

    await supabase
      .from('artifacts')
      .insert({
        project_id: projectId,
        type: 'onboarding_report_md',
        format: 'md',
        title: 'Onboarding Report (Markdown)',
        content: mdContent,
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

    // Fire research worker immediately (fire-and-forget)
    // Build absolute URL from the incoming request so it works in all environments
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
      console.error('[orchestrator/onboarding] Failed to fire research worker:', err);
    });

    // Mark job as running now that the worker has been fired
    await supabase
      .from('jobs')
      .update({ status: 'running' } as any)
      .eq('id', jobId);

    return NextResponse.json(
      {
        project_id: projectId,
        job_id: jobId,
        artifact_id: (jsonArtifact as any).id,
        message: 'Onboarding report ingested. Research agent started.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[orchestrator/onboarding] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
