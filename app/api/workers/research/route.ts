import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { createServiceClient } from '@/lib/supabase';
import { logWorkerRun } from '@/lib/logging';
import { validateResearchFoundation } from '@/lib/validation';
import { getArtifact, updateJobStatus } from '@/lib/orchestrator';
import { generateJSON } from '@/lib/gemini';

/**
 * POST /api/workers/research
 * Process onboarding report and generate research foundation pack with Google Search grounding
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { project_id, input_artifact_id, job_id } = body;

    if (!project_id || !input_artifact_id || !job_id) {
      return NextResponse.json(
        { error: 'project_id, input_artifact_id, and job_id are required' },
        { status: 400 }
      );
    }

    // Load input artifact (onboarding report)
    const inputArtifact = await getArtifact(input_artifact_id);
    
    // Prefer JSON, fallback to content text
    let onboardingReport: string;
    if ((inputArtifact as any).content_json) {
      onboardingReport = JSON.stringify((inputArtifact as any).content_json, null, 2);
    } else if ((inputArtifact as any).content) {
      onboardingReport = (inputArtifact as any).content;
    } else {
      throw new Error('Onboarding report content is empty');
    }

    // Load research prompt
    const promptPath = resolve(process.cwd(), 'prompts/research.md');
    const promptTemplate = await readFile(promptPath, 'utf-8');

    // Load system instruction from AI Studio reference
    const systemInstructionPath = resolve(process.cwd(), 'ai-studio-instructions/research-agent.md');
    const systemInstruction = await readFile(systemInstructionPath, 'utf-8');

    // Prepare full prompt with onboarding report
    const fullPrompt = `${promptTemplate}

Onboarding Report:
${onboardingReport}

Generate EXACTLY two fields in your JSON response:
1. research_foundation_pack_json - the full structured research pack matching the schema
2. research_foundation_pack_markdown - a skimmable 2-page summary with sources section

Output ONLY valid JSON with these two fields, no markdown formatting.`;

    // Call Gemini with JSON output mode and Google Search grounding enabled
    const model = 'gemini-3-flash-preview';
    const { data: responseData, tokensIn, tokensOut } = await generateJSON(
      fullPrompt,
      systemInstruction,
      model,
      true // Enable Google Search grounding
    );

    // Extract the two artifacts from the response
    const researchFoundationJson = responseData.research_foundation_pack_json;
    const researchFoundationMarkdown = responseData.research_foundation_pack_markdown;

    if (!researchFoundationJson || !researchFoundationMarkdown) {
      throw new Error('Response missing required fields: research_foundation_pack_json and research_foundation_pack_markdown');
    }

    // Validate against schema (strict)
    const validation = await validateResearchFoundation(researchFoundationJson);
    if (!validation.valid) {
      throw new Error(`Research foundation validation failed: ${validation.errors?.join(', ')}`);
    }

    const supabase = createServiceClient();

    // Store JSON artifact
    const { data: jsonArtifact, error: jsonError } = await supabase
      .from('artifacts')
      .insert({
        project_id,
        type: 'research_foundation_pack_json',
        format: 'json',
        title: 'Research foundation pack',
        content_json: researchFoundationJson
      } as any)
      .select()
      .single();

    if (jsonError) {
      throw new Error(`Failed to store research foundation pack JSON: ${jsonError.message}`);
    }

    // Store markdown artifact
    const { data: mdArtifact, error: mdError } = await supabase
      .from('artifacts')
      .insert({
        project_id,
        type: 'research_foundation_pack_md',
        format: 'md',
        title: 'Research foundation pack summary',
        content: researchFoundationMarkdown
      } as any)
      .select()
      .single();

    if (mdError) {
      throw new Error(`Failed to store research foundation pack markdown: ${mdError.message}`);
    }

    // Calculate duration
    const durationMs = Date.now() - startTime;
    const cost = (tokensIn * 0.000001 + tokensOut * 0.000002).toFixed(6);

    // Log run
    await logWorkerRun({
      job_id,
      model,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      duration_ms: durationMs,
    });

    // Update job status
    await updateJobStatus(job_id, 'done', null, (jsonArtifact as any).id);

    return NextResponse.json(
      {
        artifacts: [
          { id: (jsonArtifact as any).id, type: 'research_foundation_pack_json' },
          { id: (mdArtifact as any).id, type: 'research_foundation_pack_md' }
        ],
        run_id: job_id
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in POST /api/workers/research:', error);

    // Log failed run if we have job_id
    try {
      const errorBody = await request.clone().json();
      if (errorBody.job_id) {
        const durationMs = Date.now() - startTime;
        await logWorkerRun({
          job_id: errorBody.job_id,
          model: 'gemini-3-flash-preview',
          duration_ms: durationMs,
        });
        await updateJobStatus(
          errorBody.job_id,
          'failed',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
