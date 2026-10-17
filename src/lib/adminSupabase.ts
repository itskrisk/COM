import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xvnvyrddhgmxqynypboa.supabase.co';
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2bnZ5cmRkaGdteHF5bnlwYm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjA3MTYyMywiZXhwIjoyMTA3NjQ3NjIzfQ.EnsCmbkRf6AMw2_62AWzqgk2hXSu1zEOTX3GguuZjQI';

// Admin Supabase client with elevated privileges for the Admin Console (Approvals, Status updates)
export const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});
