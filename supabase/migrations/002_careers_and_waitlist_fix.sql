-- 002: Careers tables + waitlist column alignment
-- Fixes:
--  - job_positions / job_applications did not exist (careersService fell back to localStorage)
--  - waitlist was missing full_name, phone, neighborhood columns used by the app
-- Idempotent: safe to re-run.

-- ─────────────────────────────────────────────────────────────
-- 1. WAITLIST column alignment
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ;

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert waitlist" ON public.waitlist;
CREATE POLICY "Anyone can insert waitlist" ON public.waitlist
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view waitlist" ON public.waitlist;
CREATE POLICY "Admins can view waitlist" ON public.waitlist
  FOR SELECT USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────
-- 2. JOB POSITIONS (public careers page)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_positions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  department  TEXT,
  location    TEXT,
  type        TEXT,
  summary     TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read job positions" ON public.job_positions;
CREATE POLICY "Public read job positions" ON public.job_positions
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Authenticated manage job positions" ON public.job_positions;
CREATE POLICY "Authenticated manage job positions" ON public.job_positions
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────
-- 3. JOB APPLICATIONS (public application form)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_applications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_title     TEXT,
  full_name          TEXT NOT NULL,
  email              TEXT NOT NULL,
  phone              TEXT,
  city_area          TEXT,
  notice_period      TEXT,
  years_experience   TEXT,
  education_level    TEXT,
  resume_link        TEXT,
  linkedin_url       TEXT,
  current_company    TEXT,
  current_title      TEXT,
  scenario_answer    TEXT,
  why_muncheez       TEXT,
  expected_salary    TEXT,
  cover_note         TEXT,
  status             TEXT NOT NULL DEFAULT 'NEW'
    CHECK (status IN ('NEW','REVIEWING','INTERVIEW','HIRED','REJECTED')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_applications_status ON public.job_applications(status);
CREATE INDEX idx_job_applications_email  ON public.job_applications(email);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can apply" ON public.job_applications;
CREATE POLICY "Anyone can apply" ON public.job_applications
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins manage job applications" ON public.job_applications;
CREATE POLICY "Admins manage job applications" ON public.job_applications
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
