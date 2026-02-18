'use client';

import { useEffect, useState, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Artifact {
  id: string;
  type: string;
  format: string;
  title: string;
  content: string | null;
  content_json: any;
  created_at: string;
}

interface Job {
  id: string;
  type: string;
  status: string;
  input_artifact_id: string | null;
  output_artifact_id: string | null;
  error: string | null;
  created_at: string;
}

const AGENT_LABELS: Record<string, string> = {
  research: 'Research Agent',
  kb_packager: 'KB Builder Agent',
  presentation: 'Presentation Agent',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  queued: 'bg-blue-100 text-blue-800',
  running: 'bg-indigo-100 text-indigo-800',
  done: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  needs_approval: 'bg-purple-100 text-purple-800',
};

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [project, setProject] = useState<any>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAgent, setRunningAgent] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [projectRes, artifactsRes, jobsRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('artifacts').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
        supabase.from('jobs').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      ]);

      if (projectRes.error) throw projectRes.error;
      setProject(projectRes.data);
      setArtifacts((artifactsRes.data as any) || []);
      setJobs((jobsRes.data as any) || []);
    } catch (err) {
      console.error('Failed to load project:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const findOnboardingArtifact = () => {
    return artifacts.find(a => a.type === 'onboarding_report_json' || a.type === 'onboarding_report');
  };

  const findResearchArtifact = () => {
    return artifacts.find(a => a.type === 'research_foundation_pack_json');
  };

  const runAgent = async (agentType: string) => {
    setRunningAgent(agentType);
    setAgentStatus(null);

    try {
      let inputArtifact: Artifact | undefined;
      let endpoint: string;

      if (agentType === 'research') {
        inputArtifact = findOnboardingArtifact();
        if (!inputArtifact) {
          setAgentStatus('No onboarding report found. Complete onboarding first.');
          setRunningAgent(null);
          return;
        }
        endpoint = '/api/workers/research';
      } else if (agentType === 'kb_packager') {
        inputArtifact = findResearchArtifact();
        if (!inputArtifact) {
          setAgentStatus('No research pack found. Run the Research Agent first.');
          setRunningAgent(null);
          return;
        }
        endpoint = '/api/workers/kb-packager';
      } else {
        setAgentStatus(`Agent type "${agentType}" is not yet implemented.`);
        setRunningAgent(null);
        return;
      }

      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          project_id: projectId,
          type: agentType,
          status: 'running',
          input_artifact_id: inputArtifact.id,
        } as any)
        .select()
        .single();

      if (jobError) throw jobError;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          input_artifact_id: inputArtifact.id,
          job_id: (job as any).id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Agent failed');
      }

      setAgentStatus(`${AGENT_LABELS[agentType] || agentType} completed successfully!`);
      await loadData();
    } catch (err: any) {
      console.error('Error running agent:', err);
      setAgentStatus(`Error: ${err.message}`);
    } finally {
      setRunningAgent(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Project not found</p>
      </div>
    );
  }

  const onboardingArtifact = findOnboardingArtifact();
  const researchArtifact = findResearchArtifact();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/projects" className="text-gray-500 hover:text-gray-700">
                &larr; Back
              </Link>
              <img src="/logo.png" alt="Flow" className="h-8 w-auto" />
              <h1 className="text-lg font-bold text-gray-900">{project.client_name}</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {agentStatus && (
          <div className={`mb-6 p-4 rounded-md ${agentStatus.startsWith('Error') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
            {agentStatus}
          </div>
        )}

        {/* Agent Pipeline */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Agent Pipeline</h2>
          <div className="flex flex-wrap gap-4">
            {/* Step 1: Onboarding */}
            <div className={`flex-1 min-w-[200px] p-4 rounded-lg border-2 ${onboardingArtifact ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{onboardingArtifact ? '✅' : '⏳'}</span>
                <h3 className="font-semibold">1. Onboarding</h3>
              </div>
              <p className="text-sm text-gray-600">
                {onboardingArtifact ? 'Report received' : 'Waiting for onboarding report'}
              </p>
            </div>

            <div className="flex items-center text-gray-400 text-2xl">&rarr;</div>

            {/* Step 2: Research */}
            <div className={`flex-1 min-w-[200px] p-4 rounded-lg border-2 ${researchArtifact ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{researchArtifact ? '✅' : '🔬'}</span>
                <h3 className="font-semibold">2. Research Agent</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {researchArtifact ? 'Research complete' : 'Needs onboarding report as input'}
              </p>
              {!researchArtifact && (
                <button
                  onClick={() => runAgent('research')}
                  disabled={runningAgent !== null || !onboardingArtifact}
                  className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {runningAgent === 'research' ? 'Running...' : 'Run Research Agent'}
                </button>
              )}
            </div>

            <div className="flex items-center text-gray-400 text-2xl">&rarr;</div>

            {/* Step 3: KB Builder */}
            <div className="flex-1 min-w-[200px] p-4 rounded-lg border-2 border-gray-200 bg-white">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">📚</span>
                <h3 className="font-semibold">3. KB Builder</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">Needs research pack as input</p>
              <button
                onClick={() => runAgent('kb_packager')}
                disabled={runningAgent !== null || !researchArtifact}
                className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {runningAgent === 'kb_packager' ? 'Running...' : 'Run KB Builder'}
              </button>
            </div>

            <div className="flex items-center text-gray-400 text-2xl">&rarr;</div>

            {/* Step 4: Presentation (coming soon) */}
            <div className="flex-1 min-w-[200px] p-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🎨</span>
                <h3 className="font-semibold text-gray-400">4. Presentation</h3>
              </div>
              <p className="text-sm text-gray-400">Coming soon</p>
            </div>
          </div>
        </div>

        {/* Artifacts */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Artifacts ({artifacts.length})</h2>
          {artifacts.length === 0 ? (
            <p className="text-gray-500">No artifacts yet.</p>
          ) : (
            <div className="space-y-3">
              {artifacts.map((artifact) => (
                <div key={artifact.id} className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{artifact.title}</h3>
                      <p className="text-sm text-gray-500">
                        Type: {artifact.type} | Format: {artifact.format} | Created: {new Date(artifact.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">{artifact.format.toUpperCase()}</span>
                  </div>
                  {artifact.content && (
                    <details className="mt-3">
                      <summary className="text-sm text-blue-600 cursor-pointer hover:underline">View content</summary>
                      <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto max-h-96">{artifact.content}</pre>
                    </details>
                  )}
                  {artifact.content_json && (
                    <details className="mt-3">
                      <summary className="text-sm text-blue-600 cursor-pointer hover:underline">View JSON</summary>
                      <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto max-h-96">{JSON.stringify(artifact.content_json, null, 2)}</pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Jobs */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Jobs ({jobs.length})</h2>
          {jobs.length === 0 ? (
            <p className="text-gray-500">No jobs yet.</p>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div key={job.id} className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-gray-900">{AGENT_LABELS[job.type] || job.type}</span>
                      <span className={`ml-3 text-xs px-2 py-1 rounded-full ${STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-800'}`}>
                        {job.status}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">{new Date(job.created_at).toLocaleString()}</span>
                  </div>
                  {job.error && (
                    <p className="mt-2 text-sm text-red-600">Error: {job.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
