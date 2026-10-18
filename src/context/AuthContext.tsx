import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export type AppRole = 'customer' | 'merchant' | 'courier' | 'admin';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  emailVerified: boolean;
  loyaltyTier: string;
  accountStatus?: string;
  merchant?: any | null;
  rider?: any | null;
  profile?: {
    id: string;
    full_name?: string;
    phone?: string;
    roles: string[];
    status: string;
    account_status?: string;
    avatarUrl?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface RoleMismatchInfo {
  currentRole: AppRole;
  expectedRole: AppRole;
  portalLink: string;
  portalLabel: string;
}

export interface SignInResult {
  error: string | null;
  user?: User | null;
  profile?: any | null;
  roleMismatch?: RoleMismatchInfo | null;
  activeSessionConflict?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  token: string | null;
  signIn: (email: string, password: string, expectedRole?: AppRole) => Promise<SignInResult>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ error: string | null; user?: User | null; profile?: any | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  addRole: (role: AppRole) => Promise<{ error: string | null }>;
  refreshUser: () => Promise<void>;
  updateToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to resolve single role consistently
export const resolveRole = (roleStr?: string): AppRole => {
  if (!roleStr) return 'customer';
  const lower = roleStr.toLowerCase();
  if (lower === 'admin') return 'admin';
  if (lower === 'merchant') return 'merchant';
  if (lower === 'courier' || lower === 'rider') return 'courier';
  return 'customer';
};

// Full DB hydration — used for session restore on page load and background enrichment
const buildNormalizedUser = async (authUser: SupabaseUser): Promise<User> => {
  let profileData: any = null;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();
    profileData = data;
  } catch { /* profile table may not exist yet */ }

  let merchantData: any = null;
  let riderData: any = null;
  try {
    const { data: m } = await supabase.from('merchants').select('*').eq('id', authUser.id).maybeSingle();
    merchantData = m || null;
  } catch { /* not a merchant */ }
  try {
    const { data: r } = await supabase.from('riders').select('*').eq('id', authUser.id).maybeSingle();
    riderData = r || null;
  } catch { /* not a rider */ }

  const isAdmin = authUser.email === 'admin@muncheez.co.ke' ||
                  authUser.email?.endsWith('@muncheez.co.ke') ||
                  authUser.user_metadata?.role === 'admin' ||
                  (profileData?.roles && profileData.roles.includes('admin'));

  let primaryRole: AppRole = 'customer';
  if (isAdmin) {
    primaryRole = 'admin';
  } else if (merchantData || profileData?.roles?.includes('merchant') || authUser.user_metadata?.role === 'merchant') {
    primaryRole = 'merchant';
  } else if (riderData || profileData?.roles?.includes('courier') || profileData?.roles?.includes('rider') || authUser.user_metadata?.role === 'courier' || authUser.user_metadata?.role === 'rider') {
    primaryRole = 'courier';
  } else {
    primaryRole = 'customer';
  }

  const isPartner = primaryRole === 'merchant' || primaryRole === 'courier';
  // Customers NEVER undergo onboarding. Only merchants and couriers can be pending_onboarding.
  let accountStatus: string = 'active';
  if (isPartner) {
    if (merchantData?.status === 'APPROVED' || riderData?.status === 'APPROVED' || profileData?.account_status === 'active') {
      accountStatus = 'active';
    } else if (merchantData?.status === 'REJECTED' || riderData?.status === 'REJECTED' || profileData?.account_status === 'rejected') {
      accountStatus = 'rejected';
    } else if (merchantData?.status === 'SUSPENDED' || riderData?.status === 'SUSPENDED' || profileData?.account_status === 'suspended') {
      accountStatus = 'suspended';
    } else if (merchantData?.onboarding_completed || riderData?.onboarding_completed) {
      accountStatus = profileData?.account_status || 'pending_approval';
    } else {
      accountStatus = profileData?.account_status || (authUser.email_confirmed_at ? 'pending_onboarding' : 'pending_email_verification');
    }
  } else {
    accountStatus = authUser.email_confirmed_at ? 'active' : 'pending_email_verification';
  }

  const roles = [primaryRole];

  const resolvedPhone = authUser.phone || authUser.user_metadata?.phone || profileData?.phone;
  const resolvedFullName = authUser.user_metadata?.full_name || profileData?.full_name || authUser.email?.split('@')[0] || 'User';

  // If profile in DB is missing phone but auth has it, persist it back to profiles
  if (!profileData?.phone && resolvedPhone) {
    Promise.resolve(supabase.from('profiles').update({ phone: resolvedPhone, full_name: resolvedFullName }).eq('id', authUser.id)).catch(() => {});
  }

  return {
    id: authUser.id,
    email: authUser.email || '',
    fullName: resolvedFullName,
    phone: resolvedPhone,
    emailVerified: Boolean(authUser.email_confirmed_at),
    loyaltyTier: profileData?.loyalty_tier || 'bronze',
    accountStatus,
    merchant: merchantData,
    rider: riderData,
    profile: profileData ? {
      ...profileData,
      phone: profileData.phone || resolvedPhone,
      full_name: profileData.full_name || resolvedFullName,
      roles,
      account_status: accountStatus
    } : {
      id: authUser.id,
      full_name: resolvedFullName,
      phone: resolvedPhone,
      email: authUser.email,
      roles,
      status: 'ACTIVE',
      account_status: accountStatus
    }
  };
};

// Build minimal user from auth metadata only — zero DB queries, always instant
const buildMinimalUser = (authUser: SupabaseUser): User => {
  const isAdmin = authUser.email === 'admin@muncheez.co.ke' ||
                  authUser.email?.endsWith('@muncheez.co.ke') ||
                  authUser.user_metadata?.role === 'admin';
  const rawRole = isAdmin ? 'admin' : (authUser.user_metadata?.role || 'customer');
  const role = resolveRole(rawRole);
  const isPartner = role === 'merchant' || role === 'courier';

  // Customers are ALWAYS active once verified. Only partners are pending_onboarding.
  const accountStatus = isPartner ? 'pending_onboarding' : 'active';
  const phone = authUser.phone || authUser.user_metadata?.phone;
  const fullName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User';

  return {
    id: authUser.id,
    email: authUser.email || '',
    fullName,
    phone,
    emailVerified: Boolean(authUser.email_confirmed_at),
    loyaltyTier: 'bronze',
    accountStatus,
    merchant: null,
    rider: null,
    profile: {
      id: authUser.id,
      full_name: fullName,
      phone,
      email: authUser.email,
      roles: [role],
      status: 'ACTIVE',
      account_status: accountStatus,
    }
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(localStorage.getItem('accessToken'));

  useEffect(() => {
    let isMounted = true;

    // Restore existing session on page load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      if (session?.user) {
        setToken(session.access_token);
        localStorage.setItem('accessToken', session.access_token);
        // Set minimal user immediately so app doesn't block, then enrich from DB
        const minimal = buildMinimalUser(session.user);
        setUser(minimal);
        setProfile(minimal.profile);
        setLoading(false);
        // Background DB enrichment
        buildNormalizedUser(session.user).then(full => {
          if (isMounted) { setUser(full); setProfile(full.profile); }
        }).catch(() => {});
      } else {
        setUser(null);
        setProfile(null);
        setToken(null);
        setLoading(false);
      }
    }).catch(err => {
      console.error('[AuthContext] Session init error:', err);
      if (isMounted) setLoading(false);
    });

    // Auth state listener — handles token refresh, sign out, etc.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setToken(null);
        localStorage.removeItem('accessToken');
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setToken(session.access_token);
        localStorage.setItem('accessToken', session.access_token);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { setUser(null); setProfile(null); return; }
      const normalizedUser = await buildNormalizedUser(authUser);
      setUser(normalizedUser);
      setProfile(normalizedUser.profile);
    } catch (err) {
      console.error('[AuthContext] refreshUser failed:', err);
      setUser(null);
      setProfile(null);
    }
  }, []);

  /**
   * signIn — NEVER queries the database.
   *
   * Returns immediately after Supabase auth with user built from auth metadata only.
   * DB profile/merchant/rider data loads asynchronously in the background AFTER
   * the login page has already navigated. This is what prevents button-stuck-loading.
   */
  const signIn = async (
    email: string,
    password: string,
    expectedRole?: AppRole
  ): Promise<SignInResult> => {
    // 1. Active Session Collision Guard: If already signed in, require explicit logout
    if (user) {
      const currentRole = profile?.roles?.[0] || user.profile?.roles?.[0] || 'customer';
      const currentRoleLabel = currentRole === 'courier' ? 'Rider' : currentRole === 'merchant' ? 'Merchant' : currentRole === 'admin' ? 'Admin' : 'Customer';
      return {
        error: `You are currently signed in as ${user.email} (${currentRoleLabel}). Please log out first before signing into another account.`,
        activeSessionConflict: true
      };
    }

    const cleanEmail = email.trim().toLowerCase();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        const msg = error.message || '';
        const lower = msg.toLowerCase();
        if (lower.includes('invalid login credentials') || lower.includes('invalid credentials') || lower.includes('wrong email or password')) {
          return { error: 'This account does not exist or the password is incorrect. If you do not have an account, please sign up.' };
        }
        if (msg.toLowerCase().includes('email not confirmed')) {
          return { error: "Your email hasn't been verified yet. Please check your inbox for the verification link." };
        }
        return { error: msg || 'Login failed. Please try again.' };
      }

      if (!data?.user) {
        return { error: 'Login failed. No account found.' };
      }

      // Block unverified users
      if (!data.user.email_confirmed_at) {
        supabase.auth.signOut().catch(() => {});
        return { error: "Your email hasn't been verified yet. Please check your inbox for the verification link before signing in." };
      }

      // 2. Resolve single role with strict DB checks
      const isAdmin = data.user.email === 'admin@muncheez.co.ke' ||
                      data.user.email?.endsWith('@muncheez.co.ke') ||
                      data.user.user_metadata?.role === 'admin';

      let resolvedRole: AppRole = isAdmin ? 'admin' : resolveRole(data.user.user_metadata?.role);

      if (!isAdmin) {
        try {
          const { data: prof } = await supabase.from('profiles').select('roles, role').eq('id', data.user.id).maybeSingle();
          if (prof?.roles && prof.roles.length > 0) resolvedRole = resolveRole(prof.roles[0]);
          else if (prof?.role) resolvedRole = resolveRole(prof.role);
        } catch {}
        try {
          const { data: m } = await supabase.from('merchants').select('id').eq('id', data.user.id).maybeSingle();
          if (m) resolvedRole = 'merchant';
        } catch {}
        try {
          const { data: r } = await supabase.from('riders').select('id').eq('id', data.user.id).maybeSingle();
          if (r) resolvedRole = 'courier';
        } catch {}
      }

      // 3. Role Mismatch Enforcement: One email = One role. Cannot log in to wrong portal!
      if (expectedRole && resolvedRole !== expectedRole && resolvedRole !== 'admin') {
        // Discard session immediately — never leave user authenticated in wrong portal
        await supabase.auth.signOut().catch(() => {});
        localStorage.removeItem('accessToken');
        setToken(null);
        setUser(null);
        setProfile(null);

        const roleLabel = resolvedRole === 'merchant' ? 'Merchant' : resolvedRole === 'courier' ? 'Rider' : 'Customer';
        const portalLabel = resolvedRole === 'merchant' ? 'Merchant Portal' : resolvedRole === 'courier' ? 'Fleet Terminal' : 'Customer App';
        const portalLink = resolvedRole === 'merchant' ? '/merchant/login' : resolvedRole === 'courier' ? '/rider/login' : '/login';

        return {
          error: `This account is registered as a ${roleLabel}. Please sign in via the ${portalLabel}.`,
          roleMismatch: {
            currentRole: resolvedRole,
            expectedRole,
            portalLabel,
            portalLink
          }
        };
      }

      // Set token immediately
      if (data.session) {
        localStorage.setItem('accessToken', data.session.access_token);
        setToken(data.session.access_token);
      }

      // Build user
      const minimalUser = buildMinimalUser(data.user);
      if (minimalUser.profile) {
        minimalUser.profile.roles = [resolvedRole];
      }
      setUser(minimalUser);
      setProfile(minimalUser.profile);

      // Background DB enrichment & serverless phone synchronization — non-blocking
      const sessionToken = data.session?.access_token || '';
      const userPhone = data.user.phone || data.user.user_metadata?.phone;
      const userFullName = data.user.user_metadata?.full_name || minimalUser.fullName;

      fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.user.id,
          email: cleanEmail,
          phone: userPhone,
          fullName: userFullName,
          role: resolvedRole
        })
      }).catch(() => {});

      buildNormalizedUser(data.user).then(fullUser => {
        setUser(fullUser);
        setProfile(fullUser.profile);
        supabase.from('active_sessions').upsert({
          user_id: data.user.id,
          session_token: sessionToken,
          primary_role: resolvedRole,
          all_roles: [resolvedRole],
          updated_at: new Date().toISOString()
        }).then(({ error: e }) => {
          if (e) console.warn('[AuthContext] active_sessions:', e.message);
        });
      }).catch(() => {});

      return { error: null, user: minimalUser, profile: minimalUser.profile };
    } catch (err: any) {
      return { error: err.message || 'Login failed. Please check your connection and try again.' };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    metadata?: Record<string, any>
  ): Promise<{ error: string | null; user?: User | null; profile?: any | null }> => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const role = metadata?.role || 'customer';
      const cleanPhone = metadata?.phone?.trim() || undefined;

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out. Please try again.')), 15000)
      );

      const { data, error } = await Promise.race([
        supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              full_name: metadata?.name || cleanEmail.split('@')[0],
              phone: cleanPhone,
              role,
              merchant_type: metadata?.merchantType || 'Restaurant',
              vehicle_type: metadata?.vehicleType || 'Motorbike',
            }
          }
        }),
        timeoutPromise
      ]);

        if (error) {
          const msg = (error as any)?.message || '';
          const lower = msg.toLowerCase();
          if (lower.includes('already registered') || lower.includes('already exists') || lower.includes('user already registered') || lower.includes('email in use')) {
            return { error: 'This email is already registered. Please proceed to login instead.' };
          }
          return { error: msg || 'Signup failed. Please try again.' };
        }

      if (!data?.user) {
        return { error: 'Signup failed. Please try again.' };
      }

      // Synchronize phone and profile directly to Supabase via admin sync endpoint
      if (data.user.id) {
        fetch('/api/auth/sync-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: data.user.id,
            email: cleanEmail,
            phone: cleanPhone,
            fullName: metadata?.name || cleanEmail.split('@')[0],
            role,
            merchantType: metadata?.merchantType,
            vehicleType: metadata?.vehicleType
          })
        }).catch(() => {});
      }

      // Standard flow: email confirmation required — navigate to verify immediately
      if (!data.user.email_confirmed_at) {
        supabase.auth.signOut().catch(() => {});
        localStorage.removeItem('accessToken');
        setToken(null);
        setUser(null);
        setProfile(null);
        return { error: null, user: null, profile: null };
      }

      // Rare: email confirmation disabled
      if (data.session) {
        localStorage.setItem('accessToken', data.session.access_token);
        setToken(data.session.access_token);
      }
      const normalizedUser = await buildNormalizedUser(data.user);
      setUser(normalizedUser);
      setProfile(normalizedUser.profile);
      return { error: null, user: normalizedUser, profile: normalizedUser.profile };
    } catch (err: any) {
      return { error: err?.message || 'Signup failed. Please try again.' };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[AuthContext] Logout error:', err);
    } finally {
      localStorage.removeItem('muncheez_admin_master');
      localStorage.removeItem('accessToken');
      sessionStorage.removeItem('muncheez_admin_session');
      setToken(null);
      setUser(null);
      setProfile(null);
    }
  };

  const resetPassword = async (email: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });
      return { error: error?.message || null };
    } catch (err: any) {
      return { error: err.message || 'Password reset failed.' };
    }
  };

  const addRole = async (_role: AppRole): Promise<{ error: string | null }> => {
    return { error: 'Each email can only be used for one role. Multi-role accounts are not permitted.' };
  };

  const updateToken = (newToken: string | null) => setToken(newToken);

  return (
    <AuthContext.Provider value={{ user, profile, loading, token, signIn, signUp, signOut, resetPassword, addRole, refreshUser, updateToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
