-- ==============================================================================
-- Migration: 021_terms_acceptance_registry.sql
-- Description: Centralized legal agreements & clickwrap acceptance registry
-- Compliance: Kenya Data Protection Act 2019 (Section 32) & KICA 2009
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.terms_acceptance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agreement_id TEXT NOT NULL,          -- e.g., 'customer_tos', 'merchant_sla', 'courier_agreement'
    agreement_version TEXT NOT NULL,     -- e.g., '1.0.0'
    document_hash TEXT NOT NULL,         -- SHA-256 hash of the exact agreement text accepted
    role TEXT NOT NULL DEFAULT 'customer',-- 'customer' | 'merchant' | 'courier' | 'admin'
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    user_agent TEXT,
    ip_address TEXT,
    acceptance_source TEXT NOT NULL DEFAULT 'web', -- 'signup' | 'gate' | 'onboarding'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Compound index for fast acceptance verification lookups
CREATE INDEX IF NOT EXISTS idx_terms_acceptance_lookup 
ON public.terms_acceptance (user_id, agreement_id, agreement_version);

-- Index for audit reporting by agreement version
CREATE INDEX IF NOT EXISTS idx_terms_acceptance_audit
ON public.terms_acceptance (agreement_id, agreement_version, accepted_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.terms_acceptance ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own accepted agreements
CREATE POLICY "Users can read own terms acceptance"
ON public.terms_acceptance
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own acceptance records
CREATE POLICY "Users can record own terms acceptance"
ON public.terms_acceptance
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Service role has full access for administrative audits and signup hooks
CREATE POLICY "Service role full access on terms acceptance"
ON public.terms_acceptance
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON TABLE public.terms_acceptance IS 'Immutable server-verifiable audit log of contractual agreement acceptances per Kenya Data Protection Act 2019 (ODPC) Section 32.';
