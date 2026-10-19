import { createClient } from '@supabase/supabase-js';

const url = 'https://xvnvyrddhgmxqynypboa.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2bnZ5cmRkaGdteHF5bnlwYm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjA3MTYyMywiZXhwIjoyMTA3NjQ3NjIzfQ.EnsCmbkRf6AMw2_62AWzqgk2hXSu1zEOTX3GguuZjQI';

const supabase = createClient(url, key);

async function run() {
  const { data: merchants, error: mErr } = await supabase
    .from('merchants')
    .select('*');
  console.log('=== MERCHANTS IN DB ===');
  console.log('Count:', merchants ? merchants.length : 0);
  console.log('Error:', mErr ? mErr.message : null);
  console.log(JSON.stringify(merchants, null, 2));

  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, full_name, roles, status, account_status, created_at, updated_at');
  console.log('=== PROFILES IN DB ===');
  console.log(JSON.stringify(profiles, null, 2));
}

run();
