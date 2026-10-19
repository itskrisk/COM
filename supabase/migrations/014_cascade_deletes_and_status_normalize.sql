-- 014_cascade_deletes_and_status_normalize.sql
-- Fix "Database error deleting user" by cascading deletes from auth.users
-- through profiles and dependent merchant/rider records.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Merchants
ALTER TABLE public.merchants
  DROP CONSTRAINT IF EXISTS merchants_id_fkey;
ALTER TABLE public.merchants
  ADD CONSTRAINT merchants_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Riders
ALTER TABLE public.riders
  DROP CONSTRAINT IF EXISTS riders_id_fkey;
ALTER TABLE public.riders
  ADD CONSTRAINT riders_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Normalize any lowercase/pending-ish statuses to canonical PENDING
UPDATE public.merchants SET status = 'PENDING' WHERE lower(status::text) IN ('pending','under_review','submitted');
UPDATE public.riders SET status = 'PENDING' WHERE lower(status::text) IN ('pending','under_review','submitted');
UPDATE public.profiles SET status = 'PENDING', account_status = 'pending_approval'
  WHERE lower(status::text) IN ('pending','under_review','submitted');
