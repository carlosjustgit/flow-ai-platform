import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { createServiceClient } from '@/lib/supabase';
import { logWorkerRun } from '@/lib/logging';
import { validateKBFiles, KBFile } from '@/lib/validation';
import { getArtifact, updateJobStatus, createApprovalsForArtifacts } from '@/lib/orchestrator';
import { generateJSON } from '@/lib/gemini';

/**
 * POST /api/workers/kb-packager
 * Process strategy pack and generate knowledge base files
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

    // Load input artifact (strategy pack)
    const inputArtifact = await getArtifact(input_artifact_id);
    const strategyPack = (inputArtifact as any).content_json || JSON.parse((inputArtifact as any).content || '{}');

    if (!strategyPack || Object.keys(strategyPack).length === 0) {
      throw new Error('Strategy pack content is empty');
    }

    // Load kb-packager prompt
    const promptPath = resolve(process.cwd(), 'prompts/kb-packager.md');
    const promptTemplate = await readFile(promptPath, 'utf-8');

    // Prepare prompt with strategy pack
    const fullPrompt = `${promptTemplate}

Strategy Pack JSON:
${JSON.stringify(strategyPack, null, 2)}

Generate an array of knowledge base files. Each file should have: filename, title, format, content.
Minimum files required:
- 01-company-overview.md
- 02-icp-and-segments.md
- 03-offer-and-positioning.md
- 04-messaging-and-voice.md
- 05-content-pillars.md
- 06-competitors.md
- 07-faq-and-objections.md
- 08-visual-brand-guidelines.md

Output ONLY a valid JSON array, no markdown formatting.`;

    // Call Gemini with JSON output mode
    const model = 'gemini-2.0-flash';
    const { data: kbFiles, tokensIn, tokensOut } = await generateJSON<KBFile[]>(
      fullPrompt,
      'You are a knowledge base specialist. Create clear, concise knowledge base files from the strategy pack.',
      model
    );

    // Validate against schema
    const validation = await validateKBFiles(kbFiles);
    if (!validation.valid) {
      throw new Error(`KB files validation failed: ${validation.errors?.join(', ')}`);
    }

    const supabase = createServiceClient();
    const artifactIds: string[] = [];

    // Store each KB file as a separate artifact
    for (const file of kbFiles) {
      const { data: artifact, error } = await supabase
        .from('artifacts')
        .insert({
          project_id,
          type: 'kb_file',
          format: file.format,
          title: file.title,
          content: file.content
        } as any)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to store KB file ${file.filename}: ${error.message}`);
      }

      artifactIds.push((artifact as any).id);
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

    // Update job status to needs_approval
    await updateJobStatus(job_id, 'needs_approval', null, artifactIds[0]);

    // Create approval records for all KB artifacts
    await createApprovalsForArtifacts(project_id, artifactIds);

    return NextResponse.json(
      {
        artifacts: kbFiles.map((file, index) => ({
          id: artifactIds[index],
          filename: file.filename,
          title: file.title
        })),
        run_id: job_id
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in POST /api/workers/kb-packager:', error);

    // Log failed run if we have job_id
    try {
      const errorBody = await request.clone().json();
      if (errorBody.job_id) {
        const durationMs = Date.now() - startTime;
        await logWorkerRun({
          job_id: errorBody.job_id,
          model: 'gemini-2.0-flash',
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
