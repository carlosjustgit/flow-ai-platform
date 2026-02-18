import { createServiceClient } from '@/lib/supabase';

/**
 * Create a new kb_packager job after research completes
 */
export async function createKBPackagerJob(
  projectId: string,
  strategyPackArtifactId: string
): Promise<string> {
  const supabase = createServiceClient();

  const { data: job, error } = await supabase
    .from('jobs')
    .insert({
      project_id: projectId,
      type: 'kb_packager',
      status: 'queued',
      input_artifact_id: strategyPackArtifactId
    } as any)
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create kb_packager job: ${error.message}`);
  }

  if (!job) {
    throw new Error('Failed to create kb_packager job: No data returned');
  }

  return (job as any).id;
}

/**
 * Create approval records for KB artifacts
 */
export async function createApprovalsForArtifacts(
  projectId: string,
  artifactIds: string[]
): Promise<void> {
  const supabase = createServiceClient();

  const approvals = artifactIds.map(artifactId => ({
    project_id: projectId,
    artifact_id: artifactId,
    status: 'pending'
  }));

  const { error } = await supabase
    .from('approvals')
    .insert(approvals as any);

  if (error) {
    throw new Error(`Failed to create approvals: ${error.message}`);
  }
}

/**
 * Update job status and error
 */
export async function updateJobStatus(
  jobId: string,
  status: string,
  error?: string | null,
  outputArtifactId?: string | null
): Promise<void> {
  const supabase = createServiceClient();

  const updates: Record<string, any> = { status };
  if (error !== undefined) updates.error = error;
  if (outputArtifactId !== undefined) updates.output_artifact_id = outputArtifactId;

  const { error: updateError } = await (supabase
    .from('jobs') as any)
    .update(updates)
    .eq('id', jobId);

  if (updateError) {
    throw new Error(`Failed to update job status: ${updateError.message}`);
  }
}

/**
 * Get job by ID
 */
export async function getJob(jobId: string) {
  const supabase = createServiceClient();

  const { data: job, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) {
    throw new Error(`Failed to get job: ${error.message}`);
  }

  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  return job;
}

/**
 * Get artifact by ID
 */
export async function getArtifact(artifactId: string) {
  const supabase = createServiceClient();

  const { data: artifact, error } = await supabase
    .from('artifacts')
    .select('*')
    .eq('id', artifactId)
    .single();

  if (error) {
    throw new Error(`Failed to get artifact: ${error.message}`);
  }

  if (!artifact) {
    throw new Error(`Artifact not found: ${artifactId}`);
  }

  return artifact;
}
