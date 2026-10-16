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

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  token: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null; user?: User | null; profile?: any | null }>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ error: string | null; user?: User | null; profile?: any | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  addRole: (role: AppRole) => Promise<{ error: string | null }>;
  refreshUser: () => Promise<void>;
  updateToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Full DB hydration — used for session restore on page load (user already waiting) and background enrichment
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
  const defaultRole = isAdmin ? 'admin' : (authUser.user_metadata?.role || 'customer');
  const roles = isAdmin
    ? ['admin']
    : (profileData?.roles && profileData.roles.length > 0 ? profileData.roles : [defaultRole]);

  return {
    id: authUser.id,
    email: authUser.email || '',
    fullName: authUser.user_metadata?.full_name || profileData?.full_name || authUser.email?.split('@')[0] || 'User',
    phone: authUser.user_metadata?.phone || profileData?.phone,
    emailVerified: Boolean(authUser.email_confirmed_at),
    loyaltyTier: profileData?.loyalty_tier || 'bronze',
    accountStatus: profileData?.account_status || (authUser.email_confirmed_at ? 'pending_onboarding' : 'pending_email_verification'),
    merchant: merchantData,
    rider: riderData,
    profile: profileData ? { ...profileData, roles } : {
      id: authUser.id,
      roles,
      status: 'ACTIVE',
      account_status: authUser.email_confirmed_at ? 'pending_onboarding' : 'pending_email_verification'
    }
  };
};

// Build minimal user from auth metadata only — zero DB queries, always instant
const buildMinimalUser = (authUser: SupabaseUser): User => {
  const isAdmin = authUser.email === 'admin@muncheez.co.ke' ||
                  authUser.email?.endsWith('@muncheez.co.ke') ||
                  authUser.user_metadata?.role === 'admin';
  const role = isAdmin ? 'admin' : (authUser.user_metadata?.role || 'customer');
  return {
    id: authUser.id,
    email: authUser.email || '',
    fullName: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
    phone: authUser.user_metadata?.phone,
    emailVerified: Boolean(authUser.email_confirmed_at),
    loyaltyTier: 'bronze',
    accountStatus: 'pending_onboarding',
    merchant: null,
    rider: null,
    profile: {
      id: authUser.id,
      roles: [role],
      status: 'ACTIVE',
      account_status: 'pending_onboarding',
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
    password: string
  ): Promise<{ error: string | null; user?: User | null; profile?: any | null }> => {
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

      // Set token immediately
      if (data.session) {
        localStorage.setItem('accessToken', data.session.access_token);
        setToken(data.session.access_token);
      }

      // Build user from auth metadata ONLY — zero DB queries — always instant
      const minimalUser = buildMinimalUser(data.user);
      setUser(minimalUser);
      setProfile(minimalUser.profile);

      // Background DB enrichment — non-blocking, runs after login page navigates
      const sessionToken = data.session?.access_token || '';
      const role = minimalUser.profile!.roles[0];
      buildNormalizedUser(data.user).then(fullUser => {
        setUser(fullUser);
        setProfile(fullUser.profile);
        supabase.from('active_sessions').upsert({
          user_id: data.user.id,
          session_token: sessionToken,
          primary_role: role,
          all_roles: [role],
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

  const addRole = async (role: AppRole): Promise<{ error: string | null }> => {
    try {
      const currentRoles = profile?.roles || [];
      if (currentRoles.length > 0) {
        const currentRole = currentRoles[0];
        if (currentRole !== role) {
          return { error: `Your account already has the "${currentRole}" role. One email can only have one role.` };
        }
        return { error: `You already have the "${role}" role.` };
      }
      if (!user) return { error: 'You must be logged in to add a role.' };
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ roles: [role] })
        .eq('id', user.id)
        .select()
        .single();
      if (updateError) return { error: updateError.message || 'Failed to add role.' };
      await refreshUser();
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Failed to add role.' };
    }
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
