import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPUBASE_PROJECT_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Missing SUPUBASE_PROJECT_URL or SUPABASE_ANON_KEY');
}

export const supabase: SupabaseClient = createClient(url.trim(), anonKey.trim());

export default supabase;
