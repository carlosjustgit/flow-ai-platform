import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

/**
 * POST /api/orchestrator/projects
 * Create a new project
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { client_name } = body;

    if (!client_name || typeof client_name !== 'string') {
      return NextResponse.json(
        { error: 'client_name is required and must be a string' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: project, error } = await supabase
      .from('projects')
      .insert({ client_name } as any)
      .select()
      .single();

    if (error) {
      console.error('Failed to create project:', error);
      return NextResponse.json(
        { error: `Failed to create project: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/orchestrator/projects:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
