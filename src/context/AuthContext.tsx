import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { authService, profileService } from '../lib/supabaseService';
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
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  addRole: (role: AppRole) => Promise<{ error: string | null }>;
  refreshUser: () => Promise<void>;
  updateToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const buildNormalizedUser = async (authUser: SupabaseUser): Promise<User> => {
  const { data: profileData } = await profileService.getProfile(authUser.id);

  let merchantData: any = null;
  let riderData: any = null;
  try {
    const { data: m } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', authUser.id)
      .single();
    merchantData = m || null;
  } catch { /* not a merchant yet */ }
  try {
    const { data: r } = await supabase
      .from('riders')
      .select('*')
      .eq('id', authUser.id)
      .single();
    riderData = r || null;
  } catch { /* not a rider yet */ }

  const isAdminUser = authUser.email === 'admin@muncheez.co.ke' ||
                      authUser.email?.endsWith('@muncheez.co.ke') ||
                      authUser.user_metadata?.role === 'admin' ||
                      (profileData?.roles && profileData.roles.includes('admin'));
  const defaultRole = isAdminUser ? 'admin' : (authUser.user_metadata?.role || 'customer');
  const roles = isAdminUser
    ? ['admin']
    : (profileData?.roles && profileData.roles.length > 0 ? profileData.roles : [defaultRole]);

  return {
    id: authUser.id,
    email: authUser.email || '',
    fullName: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
    phone: authUser.user_metadata?.phone,
    emailVerified: Boolean(authUser.email_confirmed_at),
    loyaltyTier: 'bronze',
    accountStatus: profileData?.account_status || 'pending_email_verification',
    merchant: merchantData,
    rider: riderData,
    profile: profileData ? {
      ...profileData,
      roles
    } : {
      id: authUser.id,
      roles,
      status: 'ACTIVE',
      account_status: 'pending_email_verification'
    }
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(localStorage.getItem('accessToken'));

  // SINGLE SESSION ENFORCEMENT & SESSION HYDRATION
  useEffect(() => {
    let isMounted = true;

    const hydrate = async (authUser: SupabaseUser) => {
      const normalizedUser = await buildNormalizedUser(authUser);
      if (isMounted) {
        setUser(normalizedUser);
        setProfile(normalizedUser.profile);
      }
    };

    // Get current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setToken(session.access_token);
        localStorage.setItem('accessToken', session.access_token);
        hydrate(session.user);
      } else {
        if (isMounted) {
          setUser(null);
          setProfile(null);
          setToken(null);
          setLoading(false);
        }
      }
    }).catch(err => {
      console.error('[AuthContext] Session init error:', err);
      if (isMounted) setLoading(false);
    });

    // Listen to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setToken(session.access_token);
        localStorage.setItem('accessToken', session.access_token);
        await hydrate(session.user);
      } else if (event === 'SIGNED_OUT') {
        if (isMounted) {
          setUser(null);
          setProfile(null);
          setToken(null);
          localStorage.removeItem('accessToken');
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await authService.getUser();
      
      if (!authUser) {
        setUser(null);
        setProfile(null);
        return;
      }

      const normalizedUser = await buildNormalizedUser(authUser);
      setUser(normalizedUser);
      setProfile(normalizedUser.profile);
    } catch (err) {
      console.error('[AuthContext] Failed to refresh user:', err);
      localStorage.removeItem('accessToken');
      setUser(null);
      setProfile(null);
    }
  }, [buildNormalizedUser]);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await authService.signIn(email, password);
      
      if (error) {
        return { error: error.message || 'Login failed.' };
      }

      if (!data.user) {
        return { error: 'Login failed. No user data returned.' };
      }

      // EMAIL CONFIRMATION GATE: one CANNOT log in until the email is confirmed.
      // If Supabase issued a session for an unconfirmed account, clear it and block login.
      if (!data.user.email_confirmed_at) {
        try {
          await authService.signOut();
        } catch (e) {
          console.warn('[AuthContext] Signout after unconfirmed login failed:', e);
        }
        localStorage.removeItem('accessToken');
        setToken(null);
        setUser(null);
        setProfile(null);
        return { error: 'Email not confirmed. Please check your inbox and confirm your email address before logging in.' };
      }

      if (data.session) {
        localStorage.setItem('accessToken', data.session.access_token);
        setToken(data.session.access_token);
      }

      // Safely record active session if available
      try {
        const isAdminUser = data.user.email === 'admin@muncheez.co.ke' ||
                            data.user.email?.endsWith('@muncheez.co.ke') ||
                            data.user.user_metadata?.role === 'admin';
        const primaryRole = isAdminUser ? 'admin' : (data.user.user_metadata?.role || 'customer');
        await supabase
          .from('active_sessions')
          .upsert({
            user_id: data.user.id,
            session_token: data.session?.access_token || '',
            primary_role: primaryRole,
            all_roles: [primaryRole],
            updated_at: new Date().toISOString()
          });
      } catch (sessionErr) {
        console.warn('[AuthContext] Session tracking record warning:', sessionErr);
      }

      // Get profile and build normalized user (also loads linked merchant/rider rows)
      const normalizedUser = await buildNormalizedUser(data.user);

      setUser(normalizedUser);
      setProfile(normalizedUser.profile);
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Login failed.' };
    }
  };

const signUp = async (
        email: string,
        password: string,
        metadata?: Record<string, any>
    ): Promise<{ error: string | null }> => {
        try {
            const role = metadata?.role || 'customer';

            const cleanPhone = metadata?.phone?.trim() ? metadata.phone.trim() : undefined;
            const { data, error } = await authService.signUp(email, password, {
                full_name: metadata?.name || email.split('@')[0],
                phone: cleanPhone,
                role: role,
                merchant_type: metadata?.merchantType || 'Restaurant',
                vehicle_type: metadata?.vehicleType || 'Motorbike'
            });

            if (error) {
                console.error('[AuthContext] signUp error:', error);
                return { error: (error as any)?.message || JSON.stringify(error) || 'Signup failed.' };
            }

            if (data.session) {
                localStorage.setItem('accessToken', data.session.access_token);
                setToken(data.session.access_token);
            }

            if (!data.user) {
                return { error: 'Signup failed. No user data returned.' };
            }

            // Build normalized user (loads profile + linked merchant/rider rows)
            const normalizedUser = await buildNormalizedUser(data.user);

            setUser(normalizedUser);
            setProfile(normalizedUser.profile);
            return { error: null };
        } catch (err: any) {
            console.error('[AuthContext] signUp exception:', err);
            return { error: err?.message || JSON.stringify(err) || 'Signup failed.' };
        }
    };

  const signOut = async () => {
    try {
      await authService.signOut();
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
      const { error } = await authService.resetPassword(email);
      return { error: error?.message || null };
    } catch (err: any) {
      return { error: err.message || 'Password reset failed.' };
    }
  };

  const addRole = async (role: AppRole): Promise<{ error: string | null }> => {
    try {
      // ONE EMAIL = ONE ROLE: Cannot add a role if user already has one
      const currentRoles = profile?.roles || [];
      if (currentRoles.length > 0) {
        const currentRole = currentRoles[0];
        if (currentRole !== role) {
          return { error: `Your account already has the "${currentRole}" role. One email can only have one role. Please use a different email for ${role} access, or log out and sign up with a new email.` };
        }
        return { error: `You already have the "${role}" role.` };
      }

      if (!user) {
        return { error: 'You must be logged in to add a role.' };
      }

      // Add the role to the profile
      const { error: updateError } = await profileService.updateProfile(user.id, {
        roles: [role]
      });

      if (updateError) {
        return { error: updateError.message || 'Failed to add role.' };
      }

      // Refresh user data
      await refreshUser();
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Failed to add role.' };
    }
  };

  const updateToken = (newToken: string | null) => {
    setToken(newToken);
  };

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
