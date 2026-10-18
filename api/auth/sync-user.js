import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xvnvyrddhgmxqynypboa.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2bnZ5cmRkaGdteHF5bnlwYm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjA3MTYyMywiZXhwIjoyMTA3NjQ3NjIzfQ.EnsCmbkRf6AMw2_62AWzqgk2hXSu1zEOTX3GguuZjQI';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function normalizePhone(raw) {
  if (!raw) return '';
  let cleaned = String(raw).trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+254')) cleaned = cleaned.slice(4);
  else if (cleaned.startsWith('254')) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  return `+254${cleaned}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Optional Backfill Mode: /api/auth/sync-user?backfill=true
  if (req.method === 'GET' && req.query.backfill === 'true') {
    try {
      const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();
      if (usersErr) throw usersErr;

      const report = [];
      for (const u of usersData.users || []) {
        const phone = u.phone || u.user_metadata?.phone;
        const normalized = phone ? normalizePhone(phone) : null;
        const fullName = u.user_metadata?.full_name || u.email?.split('@')[0] || '';
        const role = u.user_metadata?.role || 'customer';

        if (normalized) {
          // Sync auth user phone column if empty
          if (!u.phone) {
            try {
              await supabase.auth.admin.updateUserById(u.id, {
                phone: normalized.replace('+', ''),
                phone_confirm: true
              });
            } catch (err) {
              console.warn(`[Sync] Could not set auth phone for ${u.email}:`, err.message);
            }
          }

          // Sync public.profiles
          const { error: profErr } = await supabase.from('profiles').upsert({
            id: u.id,
            full_name: fullName,
            phone: normalized,
            roles: [role],
            status: 'ACTIVE'
          });

          report.push({ email: u.email, phone: normalized, synced: !profErr, error: profErr?.message });
        }
      }

      return res.status(200).json({ success: true, count: report.length, report });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, email, phone, fullName, role, merchantType, vehicleType } = req.body || {};

    if (!userId && !email) {
      return res.status(400).json({ error: 'userId or email is required' });
    }

    let targetId = userId;
    let targetUser = null;

    if (!targetId && email) {
      const { data: listData } = await supabase.auth.admin.listUsers();
      targetUser = listData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (targetUser) targetId = targetUser.id;
    } else if (targetId) {
      const { data: getUserData } = await supabase.auth.admin.getUserById(targetId);
      targetUser = getUserData?.user;
    }

    if (!targetId) {
      return res.status(404).json({ error: 'User not found in Supabase Auth' });
    }

    const normalizedPhone = phone ? normalizePhone(phone) : null;
    const finalName = fullName || targetUser?.user_metadata?.full_name || email?.split('@')[0] || 'User';
    const finalRole = role || targetUser?.user_metadata?.role || 'customer';

    // 1. Update Supabase Auth admin user (phone and metadata)
    const updatePayload = {
      user_metadata: {
        ...(targetUser?.user_metadata || {}),
        full_name: finalName,
        role: finalRole,
        ...(normalizedPhone ? { phone: normalizedPhone } : {}),
        ...(merchantType ? { merchant_type: merchantType } : {}),
        ...(vehicleType ? { vehicle_type: vehicleType } : {})
      }
    };

    if (normalizedPhone) {
      updatePayload.phone = normalizedPhone.replace('+', '');
      updatePayload.phone_confirm = true;
    }

    let authUpdateResult = null;
    try {
      const { data: updatedAuthUser, error: authErr } = await supabase.auth.admin.updateUserById(targetId, updatePayload);
      if (authErr) {
        console.warn('[Sync-User] Auth admin update warning:', authErr.message);
        // If phone already taken on auth table, retry metadata update without top-level phone
        if (authErr.message?.includes('already exists') || authErr.message?.includes('unique')) {
          delete updatePayload.phone;
          delete updatePayload.phone_confirm;
          const retryRes = await supabase.auth.admin.updateUserById(targetId, updatePayload);
          authUpdateResult = retryRes.data?.user;
        }
      } else {
        authUpdateResult = updatedAuthUser?.user;
      }
    } catch (e) {
      console.warn('[Sync-User] Auth admin error:', e.message);
    }

    // 2. Upsert public.profiles with guaranteed phone and full_name
    const profilePayload = {
      id: targetId,
      full_name: finalName,
      roles: [finalRole],
      status: 'ACTIVE',
      account_status: finalRole === 'customer' ? 'active' : 'pending_onboarding'
    };

    if (normalizedPhone) {
      profilePayload.phone = normalizedPhone;
    }

    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (profileErr) {
      console.warn('[Sync-User] Profile upsert warning:', profileErr.message);
    }

    return res.status(200).json({
      success: true,
      userId: targetId,
      phone: normalizedPhone,
      profile: profileData || profilePayload,
      authUser: authUpdateResult
    });
  } catch (err) {
    console.error('[Sync-User] Fatal error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
