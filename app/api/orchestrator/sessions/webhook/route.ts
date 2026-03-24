import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

/**
 * POST /api/orchestrator/sessions/webhook
 *
 * Called automatically by a Supabase pg_net database trigger whenever an
 * onboarding_sessions row is updated to status = 'completed'.
 *
 * This is the permanent bridge between the Flowi interview chatbot and the
 * AI pipeline — no manual intervention required.
 *
 * Body: { session_id: string, type: 'onboarding_session_completed' }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, type } = body as { session_id?: string; type?: string };

    if (type !== 'onboarding_session_completed' || !session_id) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Load the session — re-validate it is truly completed
    const { data: session, error: sessionError } = await supabase
      .from('onboarding_sessions')
      .select('id, client_name, company, report, language, status')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if ((session as any).status !== 'completed') {
      // Could be a stale/duplicate trigger — ignore silently
      return NextResponse.json({ skipped: true, reason: 'not completed' });
    }

    const report: string | null = (session as any).report;
    if (!report) {
      return NextResponse.json(
        { error: 'Session has no report yet' },
        { status: 422 }
      );
    }

    // Guard against double-triggering: if artifacts already exist, skip
    const { data: existing } = await supabase
      .from('artifacts')
      .select('id')
      .eq('type', 'onboarding_report_json')
      .filter('content_json->>session_id', 'eq', session_id)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ skipped: true, reason: 'already triggered' });
    }

    const language: string = (session as any).language ?? 'pt';
    const clientName: string = (session as any).company || (session as any).client_name || 'Unknown';

    // Create project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({ client_name: clientName, language } as any)
      .select()
      .single();

    if (projectError || !project) {
      throw new Error(`Failed to create project: ${projectError?.message}`);
    }

    const projectId = (project as any).id;

    // Store onboarding report — embed session_id in JSON for idempotency guard above
    const { data: jsonArtifact, error: jsonError } = await supabase
      .from('artifacts')
      .insert({
        project_id: projectId,
        type: 'onboarding_report_json',
        format: 'json',
        title: 'Onboarding Report',
        content_json: { report, session_id },
      } as any)
      .select()
      .single();

    if (jsonError) {
      throw new Error(`Failed to store onboarding report JSON: ${jsonError.message}`);
    }

    // Store markdown artifact
    await supabase.from('artifacts').insert({
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
      console.error('[sessions/webhook] Failed to fire research worker:', err);
    });

    await supabase
      .from('jobs')
      .update({ status: 'running' } as any)
      .eq('id', jobId);

    console.log(`[sessions/webhook] Pipeline triggered for session ${session_id} → project ${projectId}`);

    return NextResponse.json({
      session_id,
      project_id: projectId,
      job_id: jobId,
      artifact_id: (jsonArtifact as any).id,
      message: 'Pipeline triggered successfully.',
    });
  } catch (error) {
    console.error('[sessions/webhook] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
