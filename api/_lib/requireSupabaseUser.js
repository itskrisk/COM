import { createClient } from '@supabase/supabase-js';

function readBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header || typeof header !== 'string') return { token: null, malformed: false };
  const match = header.match(/^Bearer\s+(\S+)$/i);
  if (!match) return { token: null, malformed: true };
  return { token: match[1], malformed: false };
}

/**
 * Verifies a Supabase access token from Authorization: Bearer.
 * Uses the anon/public key only. Returns the user or writes 401/503 and returns null.
 */
export async function requireSupabaseUser(req, res) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error('requireSupabaseUser: Supabase URL or anon key is not configured');
    res.status(503).json({ error: 'Authentication unavailable' });
    return null;
  }

  const { token, malformed } = readBearerToken(req);
  if (!token) {
    res.status(401).json({
      error: malformed ? 'Malformed authorization header' : 'Authentication required'
    });
    return null;
  }

  try {
    const authClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data?.user?.id) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return null;
    }
    return data.user;
  } catch {
    console.error('requireSupabaseUser: token verification failed');
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }
}
