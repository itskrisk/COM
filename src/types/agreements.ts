/**
 * Muncheez Terms & Agreements Type Definitions
 * Structured for compliance with Kenya Data Protection Act 2019 and KICA 2009.
 */

export type AgreementType = 'customer_tos' | 'merchant_sla' | 'courier_agreement';

export type UserRoleType = 'customer' | 'merchant' | 'courier' | 'admin';

export interface AgreementSection {
    id: string;
    title: string;
    body: string;
}

export interface AgreementDocument {
    id: AgreementType;
    role: UserRoleType;
    title: string;
    subtitle: string;
    version: string;
    lastUpdated: string;
    documentHash: string; // SHA-256 hash of document text
    summaryPoints: string[];
    sections: AgreementSection[];
    fullDocumentPath: string;
}

export interface TermsAcceptanceRecord {
    id?: string;
    user_id: string;
    agreement_id: AgreementType;
    agreement_version: string;
    document_hash: string;
    role: UserRoleType;
    accepted_at: string;
    user_agent?: string;
    ip_address?: string;
    acceptance_source: 'signup' | 'gate' | 'onboarding' | 'checkout';
    metadata?: Record<string, any>;
}

export interface AcceptanceCheckResult {
    hasAccepted: boolean;
    requiredAgreement: AgreementDocument | null;
    currentRecord?: TermsAcceptanceRecord | null;
}
