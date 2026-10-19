-- 015: job_positions responsibilities & requirements columns
-- Adds editable responsibilities and requirements arrays to job_positions
-- so admin can manage them instead of hardcoding in Careers.tsx

ALTER TABLE public.job_positions
  ADD COLUMN IF NOT EXISTS responsibilities TEXT[] DEFAULT '{}';

ALTER TABLE public.job_positions
  ADD COLUMN IF NOT EXISTS requirements TEXT[] DEFAULT '{}';