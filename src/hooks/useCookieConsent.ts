import { useState, useEffect, useCallback } from 'react';
import {
    cookieService,
    CookieConsentPreferences,
    CookieCategory,
} from '../lib/cookieService';

export function useCookieConsent() {
    const [preferences, setPreferencesState] = useState<CookieConsentPreferences>(() =>
        cookieService.getPreferences()
    );

    useEffect(() => {
        // Sync immediately in case of hydration differences
        setPreferencesState(cookieService.getPreferences());

        // Subscribe to in-app updates and multi-tab storage sync
        const unsubscribe = cookieService.subscribe((updated) => {
            setPreferencesState(updated);
        });

        return unsubscribe;
    }, []);

    const acceptAll = useCallback(() => {
        const updated = cookieService.acceptAll();
        setPreferencesState(updated);
    }, []);

    const rejectOptional = useCallback(() => {
        const updated = cookieService.rejectOptional();
        setPreferencesState(updated);
    }, []);

    const savePreferences = useCallback(
        (custom: { analytics?: boolean; personalization?: boolean; marketing?: boolean }) => {
            const updated = cookieService.savePreferences(custom);
            setPreferencesState(updated);
        },
        []
    );

    const hasConsent = useCallback(
        (category: CookieCategory) => {
            return cookieService.hasConsent(category);
        },
        [preferences]
    );

    const statusLabel = cookieService.getConsentStatusLabel();

    return {
        preferences,
        hasChosen: preferences.hasChosen,
        hasConsent,
        statusLabel,
        acceptAll,
        rejectOptional,
        savePreferences,
    };
}
