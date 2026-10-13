-- 003: Onboarding completion flags
-- ENFORCES THE EVENT ORDER:
--   signup -> email confirmation -> login -> onboarding (ONCE) -> admin approval -> dashboard
-- onboarding_completed = true means the merchant/rider has submitted onboarding
-- and must now wait for admin approval. The onboarding form is no longer shown.

ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.riders   ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- Indexes for approval workflows
CREATE INDEX IF NOT EXISTS idx_merchants_status ON public.merchants(status);
CREATE INDEX IF NOT EXISTS idx_riders_status    ON public.riders(status);
