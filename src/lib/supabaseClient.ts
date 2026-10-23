import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Use implicit flow so email confirmation links work from any browser/device.
        // PKCE (the default) stores a code-verifier in the tab that initiated signup —
        // when the user clicks the link in their email client it opens a NEW tab that
        // has no verifier, causing "Session expired / code exchange failed" for everyone.
        flowType: 'implicit',
    }
});