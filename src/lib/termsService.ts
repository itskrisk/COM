import { supabase } from './supabaseClient';
import { adminSupabase } from './adminSupabase';
import {
    AgreementDocument,
    AgreementType,
    TermsAcceptanceRecord,
    UserRoleType
} from '../types/agreements';
import { getAgreementForRole, AGREEMENT_REGISTRY } from './agreements';

const STORAGE_PREFIX = 'muncheez_terms_accepted_';
export const TERMS_ACCEPTED_EVENT = 'muncheez_terms_accepted_changed';

class TermsService {
    private cachedStatus: Record<string, { version: string; acceptedAt: string }> = {};

    /**
     * Checks if a user has accepted the current version of their role-specific agreement.
     */
    public async checkAcceptance(
        userId: string,
        role: string
    ): Promise<{
        hasAccepted: boolean;
        requiredAgreement: AgreementDocument;
        record?: TermsAcceptanceRecord | null;
    }> {
        const requiredAgreement = getAgreementForRole(role);
        if (!userId) {
            return { hasAccepted: false, requiredAgreement };
        }

        // 1. Check in-memory / local storage cache for instant evaluation
        const localKey = `${STORAGE_PREFIX}${userId}_${requiredAgreement.id}`;
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem(localKey);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed.version === requiredAgreement.version) {
                        return {
                            hasAccepted: true,
                            requiredAgreement,
                            record: parsed
                        };
                    }
                }
            } catch {
                // Ignore parse errors
            }
        }

        // 2. Query Supabase terms_acceptance registry
        try {
            const { data, error } = await supabase
                .from('terms_acceptance')
                .select('*')
                .eq('user_id', userId)
                .eq('agreement_id', requiredAgreement.id)
                .eq('agreement_version', requiredAgreement.version)
                .order('accepted_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!error && data) {
                // Cache locally
                if (typeof window !== 'undefined') {
                    localStorage.setItem(localKey, JSON.stringify(data));
                }
                return {
                    hasAccepted: true,
                    requiredAgreement,
                    record: data
                };
            }
        } catch (err) {
            console.warn('[TermsService] Registry query notice:', err);
        }

        // 3. Fallback: check profile metadata if terms_acceptance table is pending migration
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('notification_settings, account_status')
                .eq('id', userId)
                .maybeSingle();

            const profileAgreements = (profile?.notification_settings as any)?.accepted_agreements;
            if (profileAgreements && profileAgreements[requiredAgreement.id]?.version === requiredAgreement.version) {
                const fallbackRecord = profileAgreements[requiredAgreement.id];
                if (typeof window !== 'undefined') {
                    localStorage.setItem(localKey, JSON.stringify(fallbackRecord));
                }
                return {
                    hasAccepted: true,
                    requiredAgreement,
                    record: fallbackRecord
                };
            }
        } catch {
            // Profile fallback check failed
        }

        return {
            hasAccepted: false,
            requiredAgreement,
            record: null
        };
    }

    /**
     * Records acceptance of an agreement with server-verifiable audit parameters.
     */
    public async recordAcceptance(params: {
        userId: string;
        role: string;
        agreementId?: AgreementType;
        source: 'signup' | 'gate' | 'onboarding' | 'checkout';
        metadata?: Record<string, any>;
    }): Promise<{ success: boolean; record: TermsAcceptanceRecord }> {
        const agreement = params.agreementId
            ? AGREEMENT_REGISTRY[params.agreementId]
            : getAgreementForRole(params.role);

        const acceptedAt = new Date().toISOString();
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';

        const record: TermsAcceptanceRecord = {
            user_id: params.userId,
            agreement_id: agreement.id,
            agreement_version: agreement.version,
            document_hash: agreement.documentHash,
            role: (params.role || 'customer') as UserRoleType,
            accepted_at: acceptedAt,
            user_agent: userAgent,
            acceptance_source: params.source,
            metadata: params.metadata || {}
        };

        // 1. Immediately cache locally so user is never blocked while server reconciles
        const localKey = `${STORAGE_PREFIX}${params.userId}_${agreement.id}`;
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(localKey, JSON.stringify(record));
            } catch (err) {
                console.warn('[TermsService] Local storage write warning:', err);
            }
        }

        // 2. Write to Supabase terms_acceptance registry
        let persisted = false;
        try {
            const client = adminSupabase || supabase;
            const { error: insertError } = await client
                .from('terms_acceptance')
                .insert([record]);

            if (!insertError) {
                persisted = true;
            } else {
                console.warn('[TermsService] Insert error (table may be pending migration):', insertError.message);
            }
        } catch (e) {
            console.warn('[TermsService] Network error recording acceptance:', e);
        }

        // 3. Fallback: also persist inside profiles.notification_settings JSONB
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('notification_settings')
                .eq('id', params.userId)
                .maybeSingle();

            const existingSettings = (profile?.notification_settings as Record<string, any>) || {};
            const acceptedMap = existingSettings.accepted_agreements || {};
            acceptedMap[agreement.id] = {
                version: agreement.version,
                document_hash: agreement.documentHash,
                accepted_at: acceptedAt,
                source: params.source
            };

            await supabase
                .from('profiles')
                .update({
                    notification_settings: {
                        ...existingSettings,
                        accepted_agreements: acceptedMap
                    }
                })
                .eq('id', params.userId);
        } catch (e) {
            console.warn('[TermsService] Profile fallback update notice:', e);
        }

        // 4. Notify reactive UI components
        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent(TERMS_ACCEPTED_EVENT, {
                    detail: { userId: params.userId, agreementId: agreement.id, version: agreement.version }
                })
            );
        }

        return { success: true, record };
    }

    /**
     * Clears local cache (used upon logout).
     */
    public clearCache(userId?: string): void {
        if (typeof window === 'undefined') return;
        try {
            if (userId) {
                Object.keys(localStorage).forEach((key) => {
                    if (key.startsWith(`${STORAGE_PREFIX}${userId}`)) {
                        localStorage.removeItem(key);
                    }
                });
            }
        } catch {
            // Ignore storage clearing error
        }
    }
}

export const termsService = new TermsService();
