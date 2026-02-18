import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Schema } from '@google/genai';
import { createServiceClient } from '@/lib/supabase';
import { logWorkerRun } from '@/lib/logging';
import { getArtifact, updateJobStatus } from '@/lib/orchestrator';

/**
 * AGENT WORKER TEMPLATE - Flow Productions AI Agent Team
 *
 * HOW TO ADD A NEW GOOGLE AI STUDIO AGENT
 * ----------------------------------------
 * 1. Copy this file → app/api/workers/[agent-name]/route.ts
 * 2. Add a new generate[AgentName]Pack() function in lib/gemini.ts
 *    - Port SYSTEM_INSTRUCTION and RESPONSE_SCHEMA from your AI Studio export
 *    - Use @google/genai SDK, never raw REST fetch
 * 3. Fill in the 4 TODO sections below
 * 4. Add agent step to the portal pipeline in app/(portal)/projects/[id]/page.tsx
 * 5. Create .cursor/agents/[agent-name]-agent.md subagent definition
 *
 * See .cursor/agents/add-new-agent.md for the full integration guide.
 */

// TODO 1: Import your agent's function from lib/gemini.ts
// import { generate[AgentName]Pack } from '@/lib/gemini';

// TODO 2: Set your agent's response schema (ported from AI Studio export)
const RESPONSE_SCHEMA: Schema = {
  // Replace with your schema
  type: 'object' as any,
};

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const supabase = createServiceClient();

  try {
    const { project_id, input_artifact_id, job_id } = await req.json();

    if (!project_id || !input_artifact_id || !job_id) {
      return NextResponse.json({ error: 'project_id, input_artifact_id, and job_id are required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is required');

    // TODO 3: Load your input artifact
    const inputArtifact = await getArtifact(input_artifact_id);
    const inputData = (inputArtifact as any).content_json
      ? JSON.stringify((inputArtifact as any).content_json, null, 2)
      : (inputArtifact as any).content ?? '';

    // TODO 4: Call your generate function from lib/gemini.ts
    // const result = await generate[AgentName]Pack(inputData);
    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-3-flash-preview';

    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: `Process this data:\n${inputData}` }] }],
      config: {
        // TODO: Replace systemInstruction and responseSchema with your agent's values
        systemInstruction: 'You are an AI agent. Process the input and return structured output.',
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.3,
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text;
    if (!text) throw new Error('No response generated from Gemini.');
    const data = JSON.parse(text);

    const tokensIn = (response as any).usageMetadata?.promptTokenCount ?? 0;
    const tokensOut = (response as any).usageMetadata?.candidatesTokenCount ?? 0;

    // TODO 5: Store output artifacts with appropriate types
    const { data: jsonArtifact } = await supabase
      .from('artifacts')
      .insert({
        project_id,
        type: '[AGENT-NAME]_output_json',
        format: 'json',
        title: '[Agent Name] Output',
        content_json: data,
      } as any)
      .select()
      .single();

    await updateJobStatus(job_id, 'done', null, (jsonArtifact as any).id);

    await logWorkerRun({
      job_id,
      model,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      duration_ms: Date.now() - startTime,
    });

    return NextResponse.json({ success: true, artifact_id: (jsonArtifact as any).id });
  } catch (error: any) {
    const body = await req.clone().json().catch(() => ({}));

    await logWorkerRun({
      job_id: body.job_id,
      model: 'gemini-3-flash-preview',
      duration_ms: Date.now() - startTime,
    }).catch(() => {});

    await updateJobStatus(body.job_id, 'failed', error.message).catch(() => {});

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
