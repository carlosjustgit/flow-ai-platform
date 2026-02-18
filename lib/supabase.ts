import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rqwxtbyuvxtsjpifhguw.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxd3h0Ynl1dnh0c2pwaWZoZ3V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NTk2MzEsImV4cCI6MjA2MjEzNTYzMX0.8T5QnxkiFoFLL3V6nJCdal4r9RtkWSIbDtKfpuFj60g';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Singleton instance for browser client
let browserClientInstance: SupabaseClient | null = null;

/**
 * Create a browser-side Supabase client (uses anon key, respects RLS)
 * For use in client components and pages
 */
export function createSupabaseBrowserClient() {
  if (!browserClientInstance) {
    browserClientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    });
  }
  return browserClientInstance;
}

/**
 * Create a server-side Supabase client (uses service role key, bypasses RLS)
 * For use in API routes and server actions
 */
export function createServiceClient() {
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required for server-side operations');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Legacy alias for browser client
 */
export function createSupabaseClient() {
  return createSupabaseBrowserClient();
}
