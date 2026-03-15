import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_PROJECT_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Missing SUPABASE_PROJECT_URL or SUPABASE_ANON_KEY');
}

export const supabase: SupabaseClient = createClient(url.trim(), anonKey.trim());

export default supabase;
