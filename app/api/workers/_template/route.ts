import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { createServiceClient } from '@/lib/supabase';
import { logWorkerRun } from '@/lib/logging';
import { getArtifact, updateJobStatus } from '@/lib/orchestrator';
import { generateJSON } from '@/lib/gemini';
import { validateAgentOutput } from '@/lib/validation';

/**
 * AGENT WORKER TEMPLATE
 * 
 * To add a new Google AI Studio agent:
 * 1. Copy this file to app/api/workers/[agent-name]/route.ts
 * 2. Update the 4 sections marked with TODO
 * 3. Add your schema to schemas/[agent-name].schema.json
 * 4. Add your system instruction to ai-studio-instructions/[agent-name]-agent.md
 * 5. Done!
 */

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const supabase = createServiceClient();

  try {
    const { project_id, input_artifact_id, job_id } = await req.json();

    // TODO 1: Update artifact type to match your agent's input
    const inputArtifact = await getArtifact(input_artifact_id);

    // TODO 2: Update paths to your agent's instruction and prompt
    const systemInstruction = await readFile(
      resolve(process.cwd(), 'ai-studio-instructions/[AGENT-NAME]-agent.md'),
      'utf-8'
    );
    const promptTemplate = await readFile(
      resolve(process.cwd(), 'prompts/[AGENT-NAME].md'),
      'utf-8'
    );

    // Build prompt from template and input
    const prompt = promptTemplate.replace('{{INPUT}}', JSON.stringify(inputArtifact.content_json || inputArtifact.content, null, 2));

    // Call Gemini with Google Search grounding
    const { data, tokensIn, tokensOut } = await generateJSON(
      prompt,
      systemInstruction,
      'gemini-3-flash-preview',
      true // Enable Google Search grounding
    );

    // TODO 3: Update schema path and artifact types
    const validation = await validateAgentOutput(
      data,
      'schemas/[AGENT-NAME].schema.json'
    );

    if (!validation.valid) {
      throw new Error(`Validation failed: ${JSON.stringify(validation.errors)}`);
    }

    // TODO 4: Create output artifacts with appropriate types
    const { data: jsonArtifact } = await supabase
      .from('artifacts')
      .insert({
        project_id,
        type: '[AGENT-NAME]_output_json',
        format: 'json',
        title: '[Agent Name] Output',
        content_json: data,
      })
      .select()
      .single();

    // Optional: Create markdown summary artifact
    const { data: mdArtifact } = await supabase
      .from('artifacts')
      .insert({
        project_id,
        type: '[AGENT-NAME]_output_md',
        format: 'md',
        title: '[Agent Name] Summary',
        content: data.summary || JSON.stringify(data, null, 2),
      })
      .select()
      .single();

    // Update job status - using first artifact as output
    await updateJobStatus(job_id, 'done', '', jsonArtifact!.id);

    // Log the run
    await logWorkerRun({
      job_id,
      model: 'gemini-3-flash-preview',
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      duration_ms: Date.now() - startTime,
    });

    return NextResponse.json({ success: true, artifacts: [jsonArtifact!.id, mdArtifact!.id] });

  } catch (error: any) {
    const body = await req.json().catch(() => ({}));
    await updateJobStatus(body.job_id, 'failed', error.message);
    
    await logWorkerRun({
      job_id: body.job_id,
      model: 'gemini-3-flash-preview',
      duration_ms: Date.now() - startTime,
    });

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
