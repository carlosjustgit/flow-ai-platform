import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { createServiceClient } from '@/lib/supabase';

// KB generation can take 30-60s with large research packs
export const maxDuration = 300;
import { logWorkerRun } from '@/lib/logging';
import { validateKBFiles, KBFile } from '@/lib/validation';
import { getArtifact, updateJobStatus, createApprovalsForArtifacts } from '@/lib/orchestrator';

const KB_PACKAGER_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      filename: { type: Type.STRING },
      title: { type: Type.STRING },
      format: { type: Type.STRING },
      content: { type: Type.STRING },
    },
    required: ['filename', 'title', 'format', 'content'],
  },
};

/**
 * POST /api/workers/kb-packager
 * Process research foundation pack and generate knowledge base files
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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is required');

    const supabase = createServiceClient();

    // Fetch project language
    const { data: projectRow } = await supabase
      .from('projects')
      .select('language')
      .eq('id', project_id)
      .single();
    const language: string = (projectRow as any)?.language ?? 'pt';
    const langDirective = language === 'en'
      ? 'OUTPUT LANGUAGE: Write ALL file content in UK English. Use British spelling throughout.'
      : 'OUTPUT LANGUAGE: Write ALL file content in European Portuguese (pt-PT). Use formal pt-PT vocabulary — never Brazilian Portuguese.';

    // Load input artifact (research foundation pack)
    const inputArtifact = await getArtifact(input_artifact_id);
    const researchPack = (inputArtifact as any).content_json || JSON.parse((inputArtifact as any).content || '{}');

    if (!researchPack || Object.keys(researchPack).length === 0) {
      throw new Error('Research foundation pack content is empty');
    }

    // Load prompt
    const promptPath = resolve(process.cwd(), 'prompts/kb-packager.md');
    const promptTemplate = await readFile(promptPath, 'utf-8');

    const fullPrompt = `${promptTemplate}

Research Foundation Pack:
${JSON.stringify(researchPack, null, 2)}

Generate the following knowledge base files:
- 01-company-overview.md
- 02-icp-and-segments.md
- 03-offer-and-positioning.md
- 04-messaging-and-voice.md
- 05-content-pillars.md
- 06-competitors.md
- 07-faq-and-objections.md
- 08-visual-brand-guidelines.md`;

    const model = 'gemini-3-flash-preview';
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      config: {
        systemInstruction: `${langDirective}\n\nYou are a knowledge base specialist. Create clear, concise knowledge base markdown files from the research foundation pack. Return a JSON array of file objects.`,
        responseMimeType: 'application/json',
        responseSchema: KB_PACKAGER_SCHEMA,
        temperature: 0.2,
      },
    });

    const text = response.text;
    if (!text) throw new Error('No response generated from Gemini.');

    const kbFiles: KBFile[] = JSON.parse(text);
    const tokensIn = (response as any).usageMetadata?.promptTokenCount ?? 0;
    const tokensOut = (response as any).usageMetadata?.candidatesTokenCount ?? 0;

    // Validate
    const validation = await validateKBFiles(kbFiles);
    if (!validation.valid) {
      throw new Error(`KB files validation failed: ${validation.errors?.join(', ')}`);
    }

    const artifactIds: string[] = [];

    for (const file of kbFiles) {
      const { data: artifact, error } = await supabase
        .from('artifacts')
        .insert({
          project_id,
          type: 'kb_file',
          format: file.format,
          title: file.title,
          content: file.content,
        } as any)
        .select()
        .single();

      if (error) throw new Error(`Failed to store KB file ${file.filename}: ${error.message}`);
      artifactIds.push((artifact as any).id);
    }

    const durationMs = Date.now() - startTime;

    await logWorkerRun({ job_id, model, tokens_in: tokensIn, tokens_out: tokensOut, duration_ms: durationMs });
    await updateJobStatus(job_id, 'needs_approval', null, artifactIds[0]);
    await createApprovalsForArtifacts(project_id, artifactIds);

    return NextResponse.json({
      artifacts: kbFiles.map((file, index) => ({ id: artifactIds[index], filename: file.filename, title: file.title })),
      run_id: job_id,
    });
  } catch (error) {
    console.error('Error in POST /api/workers/kb-packager:', error);

    try {
      const errorBody = await request.clone().json();
      if (errorBody.job_id) {
        await logWorkerRun({ job_id: errorBody.job_id, model: 'gemini-3-flash-preview', duration_ms: Date.now() - startTime });
        await updateJobStatus(errorBody.job_id, 'failed', error instanceof Error ? error.message : 'Unknown error');
      }
    } catch {
      // best-effort
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
