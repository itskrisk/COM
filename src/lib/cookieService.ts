/**
 * Muncheez Centralized Cookie & Consent Service
 *
 * Single source of truth for cookie management, user privacy preferences,
 * and compliance with Kenya Data Protection Act 2019 and GDPR.
 */

export type CookieCategory = 'essential' | 'analytics' | 'personalization' | 'marketing';

export interface CookieConsentPreferences {
    essential: true;
    analytics: boolean;
    personalization: boolean;
    marketing: boolean;
    hasChosen: boolean;
    consentDate?: string;
    expiryDate?: string;
    version: number;
}

const STORAGE_KEY = 'muncheez_cookie_preferences';
const CURRENT_POLICY_VERSION = 1;
const CONSENT_VALIDITY_DAYS = 180; // 6 months per data protection standards

const DEFAULT_PREFERENCES: CookieConsentPreferences = {
    essential: true,
    analytics: false,
    personalization: false,
    marketing: false,
    hasChosen: false,
    version: CURRENT_POLICY_VERSION,
};

// Event fired when consent preferences change in-tab
export const COOKIE_CONSENT_EVENT = 'muncheez_cookie_consent_changed';

function isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function getSecurityFlags(): string {
    if (!isBrowser()) return '';
    const isHttps = window.location.protocol === 'https:';
    return `; path=/; SameSite=Lax${isHttps ? '; Secure' : ''}`;
}

function setCookie(name: string, value: string, maxAgeSeconds: number): void {
    if (!isBrowser()) return;
    document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAgeSeconds}${getSecurityFlags()}`;
}

function deleteCookie(name: string): void {
    if (!isBrowser()) return;
    // Must include same security flags used when setting, so browser matches and deletes the cookie
    const isHttps = window.location.protocol === 'https:';
    const secure = isHttps ? '; Secure' : '';
    document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secure}`;
}

class CookieService {
    private cachedPreferences: CookieConsentPreferences | null = null;
    private listeners: Set<(prefs: CookieConsentPreferences) => void> = new Set();

    constructor() {
        if (isBrowser()) {
            // Listen for changes from other browser tabs
            window.addEventListener('storage', (event) => {
                if (event.key === STORAGE_KEY && event.newValue) {
                    try {
                        const parsed = JSON.parse(event.newValue);
                        this.cachedPreferences = this.validateAndNormalize(parsed);
                        this.notifyListeners();
                    } catch {
                        // ignore malformed storage
                    }
                }
            });
        }
    }

    /**
     * Normalizes and validates stored consent, respecting expiration policy.
     */
    private validateAndNormalize(raw: any): CookieConsentPreferences {
        if (!raw || typeof raw !== 'object') {
            return { ...DEFAULT_PREFERENCES };
        }

        const now = new Date();
        const expiry = raw.expiryDate ? new Date(raw.expiryDate) : null;
        const isExpired = expiry && !isNaN(expiry.getTime()) && now > expiry;
        const isOldVersion = Number(raw.version || 0) < CURRENT_POLICY_VERSION;

        // If consent has expired or policy changed, require renewal
        if (isExpired || isOldVersion) {
            return {
                ...DEFAULT_PREFERENCES,
                hasChosen: false,
            };
        }

        return {
            essential: true,
            analytics: Boolean(raw.analytics),
            personalization: Boolean(raw.personalization),
            marketing: Boolean(raw.marketing),
            hasChosen: Boolean(raw.hasChosen ?? true),
            consentDate: raw.consentDate || now.toISOString(),
            expiryDate: raw.expiryDate || new Date(now.getTime() + CONSENT_VALIDITY_DAYS * 86400000).toISOString(),
            version: CURRENT_POLICY_VERSION,
        };
    }

    /**
     * Reads current consent preferences. Safe for SSR and client.
     */
    public getPreferences(): CookieConsentPreferences {
        if (this.cachedPreferences) {
            return this.cachedPreferences;
        }

        if (!isBrowser()) {
            return { ...DEFAULT_PREFERENCES };
        }

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                this.cachedPreferences = this.validateAndNormalize(parsed);
                return this.cachedPreferences;
            }
        } catch (e) {
            console.warn('[CookieService] Failed to read stored preferences:', e);
        }

        this.cachedPreferences = { ...DEFAULT_PREFERENCES };
        return this.cachedPreferences;
    }

    /**
     * Checks if user has given consent for a specific category.
     */
    public hasConsent(category: CookieCategory): boolean {
        if (category === 'essential') return true;
        const prefs = this.getPreferences();
        return Boolean(prefs.hasChosen && prefs[category]);
    }

    /**
     * Updates consent preferences, syncs document.cookie with security attributes,
     * purges revoked cookies, and notifies all reactive subscribers.
     */
    public savePreferences(updates: {
        analytics?: boolean;
        personalization?: boolean;
        marketing?: boolean;
    }): CookieConsentPreferences {
        if (!isBrowser()) return { ...DEFAULT_PREFERENCES, ...updates, essential: true, hasChosen: true };

        const now = new Date();
        const expiryDate = new Date(now.getTime() + CONSENT_VALIDITY_DAYS * 86400000).toISOString();

        const newPrefs: CookieConsentPreferences = {
            essential: true,
            analytics: Boolean(updates.analytics),
            personalization: Boolean(updates.personalization),
            marketing: Boolean(updates.marketing),
            hasChosen: true,
            consentDate: now.toISOString(),
            expiryDate,
            version: CURRENT_POLICY_VERSION,
        };

        // 1. Persist to localStorage
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
        } catch (e) {
            console.error('[CookieService] Failed to persist preferences:', e);
        }

        this.cachedPreferences = newPrefs;

        // 2. Mirror to document.cookie with proper security flags
        const maxAge = CONSENT_VALIDITY_DAYS * 86400; // in seconds
        setCookie('muncheez_essential', 'true', maxAge);

        if (newPrefs.analytics) {
            setCookie('muncheez_analytics', 'true', maxAge);
        } else {
            deleteCookie('muncheez_analytics');
            // Purge third-party analytics tokens if present
            ['_ga', '_gid', '_gat', '_gat_gtag'].forEach(deleteCookie);
        }

        if (newPrefs.personalization) {
            setCookie('muncheez_personalization', 'true', maxAge);
            // If personalization is approved, migrate any session-only delivery address to localStorage
            const sessionAddress = sessionStorage.getItem('muncheez_delivery_address');
            if (sessionAddress && !localStorage.getItem('muncheez_delivery_address')) {
                localStorage.setItem('muncheez_delivery_address', sessionAddress);
            }
        } else {
            deleteCookie('muncheez_personalization');
            // If personalization is revoked, clear persistent delivery address and retain in session only
            const persistentAddress = localStorage.getItem('muncheez_delivery_address');
            if (persistentAddress) {
                sessionStorage.setItem('muncheez_delivery_address', persistentAddress);
                localStorage.removeItem('muncheez_delivery_address');
            }
        }

        if (newPrefs.marketing) {
            setCookie('muncheez_marketing', 'true', maxAge);
        } else {
            deleteCookie('muncheez_marketing');
        }

        // 3. Dispatch in-tab event & notify subscribers
        window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: newPrefs }));
        this.notifyListeners();

        return newPrefs;
    }

    /**
     * User accepts all categories.
     */
    public acceptAll(): CookieConsentPreferences {
        return this.savePreferences({
            analytics: true,
            personalization: true,
            marketing: true,
        });
    }

    /**
     * User rejects optional categories (Essential only).
     */
    public rejectOptional(): CookieConsentPreferences {
        return this.savePreferences({
            analytics: false,
            personalization: false,
            marketing: false,
        });
    }

    /**
     * Returns a human-readable summary badge for UI display.
     */
    public getConsentStatusLabel(): 'All Enabled' | 'Essential Only' | 'Customized' | 'Not Set' {
        const prefs = this.getPreferences();
        if (!prefs.hasChosen) return 'Not Set';
        if (prefs.analytics && prefs.personalization && prefs.marketing) return 'All Enabled';
        if (!prefs.analytics && !prefs.personalization && !prefs.marketing) return 'Essential Only';
        return 'Customized';
    }

    /**
     * Helper for Personalization-Aware Delivery Address storage:
     * - If personalization is consented, stores in localStorage.
     * - If not, stores in sessionStorage (active tab session only).
     */
    public setDeliveryAddress(address: string): void {
        if (!isBrowser()) return;
        const trimmed = address.trim();
        if (!trimmed) {
            localStorage.removeItem('muncheez_delivery_address');
            sessionStorage.removeItem('muncheez_delivery_address');
            return;
        }

        if (this.hasConsent('personalization')) {
            localStorage.setItem('muncheez_delivery_address', trimmed);
        } else {
            sessionStorage.setItem('muncheez_delivery_address', trimmed);
            localStorage.removeItem('muncheez_delivery_address');
        }
    }

    /**
     * Helper to read delivery address across storage tiers.
     */
    public getDeliveryAddress(): string {
        if (!isBrowser()) return '';
        return localStorage.getItem('muncheez_delivery_address') ||
               sessionStorage.getItem('muncheez_delivery_address') ||
               '';
    }

    /**
     * Telemetry & Analytics Gate:
     * Dispatches analytics only when user has granted consent.
     */
    public trackEvent(eventName: string, payload?: Record<string, any>): boolean {
        if (!this.hasConsent('analytics')) {
            return false;
        }

        // When analytics is active, emit telemetry event or push to window dataLayer
        if (isBrowser()) {
            window.dispatchEvent(new CustomEvent('muncheez_telemetry_event', {
                detail: { event: eventName, payload, timestamp: new Date().toISOString() }
            }));
            const dataLayer = (window as any).dataLayer;
            if (Array.isArray(dataLayer)) {
                dataLayer.push({ event: eventName, ...payload });
            }
        }
        return true;
    }

    /**
     * Subscribes to consent updates. Returns an unsubscribe function.
     */
    public subscribe(listener: (prefs: CookieConsentPreferences) => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notifyListeners(): void {
        const current = this.getPreferences();
        this.listeners.forEach((listener) => {
            try {
                listener(current);
            } catch (err) {
                console.error('[CookieService] Listener error:', err);
            }
        });
    }
}

// Global Singleton Instance
export const cookieService = new CookieService();
