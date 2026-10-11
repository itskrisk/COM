import { createClient } from '@supabase/supabase-js';

// Supabase client credentials with resilient defaults
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kjpqzybsxapaecpyzxih.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_oQSUmk5Pbl4hITNxoQki9w_MfUZcifw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

