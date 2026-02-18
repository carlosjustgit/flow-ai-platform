import { createServiceClient } from './supabase';

interface RunInsert {
  job_id: string;
  model: string;
  tokens_in: number | null;
  tokens_out: number | null;
  cost_estimate: number | null;
  duration_ms: number;
}

export async function createRunLog(data: RunInsert): Promise<string> {
  const supabase = createServiceClient();
  
  const { data: run, error } = await supabase
    .from('runs')
    .insert(data as any)
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create run log:', error);
    throw new Error(`Failed to create run log: ${error.message}`);
  }

  if (!run) {
    throw new Error('Failed to create run log: No data returned');
  }

  return (run as any).id;
}

export function calculateCostEstimate(
  model: string,
  tokensIn: number,
  tokensOut: number
): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'gemini-3-flash-preview': { input: 0.075, output: 0.30 },
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
    'gemini-1.5-pro': { input: 1.25, output: 5.00 },
    'default': { input: 0.10, output: 0.40 }
  };

  const modelPricing = pricing[model] || pricing.default;
  const inputCost = (tokensIn / 1_000_000) * modelPricing.input;
  const outputCost = (tokensOut / 1_000_000) * modelPricing.output;
  return Number((inputCost + outputCost).toFixed(6));
}

export interface WorkerRunData {
  job_id: string;
  model: string;
  tokens_in?: number;
  tokens_out?: number;
  duration_ms: number;
}

export async function logWorkerRun(data: WorkerRunData): Promise<string> {
  const costEstimate = data.tokens_in && data.tokens_out
    ? calculateCostEstimate(data.model, data.tokens_in, data.tokens_out)
    : null;

  return createRunLog({
    job_id: data.job_id,
    model: data.model,
    tokens_in: data.tokens_in ?? null,
    tokens_out: data.tokens_out ?? null,
    cost_estimate: costEstimate,
    duration_ms: data.duration_ms
  });
}
