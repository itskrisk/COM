-- 006: Rider Performance & Admin Dashboard Schema Alignment
-- Adds columns referenced by:
--   - src/pages/admin/Riders.tsx (CSV export, detail drawer, performance tab)
--   - src/pages/courier/Dashboard.tsx (performance metrics, settings save)
--   - src/pages/courier/Onboarding.tsx (document upload paths)
-- All columns use ADD COLUMN IF NOT EXISTS so the migration is idempotent.

ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS name                  TEXT,
  ADD COLUMN IF NOT EXISTS phone                 TEXT,
  ADD COLUMN IF NOT EXISTS email                 TEXT,
  ADD COLUMN IF NOT EXISTS transport_mode        TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact     JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS performance           JSONB NOT NULL DEFAULT '{
    "rating": 0,
    "acceptanceRate": 0,
    "completionRate": 0,
    "reliabilityScore": 0,
    "onTimeRate": 0,
    "ordersToday": 0,
    "totalOrders": 0
  }',
  ADD COLUMN IF NOT EXISTS earnings              JSONB NOT NULL DEFAULT '{"today": 0, "weekly": 0, "total": 0}',
  ADD COLUMN IF NOT EXISTS wallet                JSONB NOT NULL DEFAULT '{"balance": 0, "pending": 0}',
  ADD COLUMN IF NOT EXISTS id_doc_url            TEXT,
  ADD COLUMN IF NOT EXISTS license_url           TEXT,
  ADD COLUMN IF NOT EXISTS logbook_url           TEXT,
  ADD COLUMN IF NOT EXISTS insurance_url         TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_url     TEXT,
  ADD COLUMN IF NOT EXISTS operating_zone        TEXT,
  ADD COLUMN IF NOT EXISTS inspection_status     TEXT DEFAULT 'Pending Verification',
  ADD COLUMN IF NOT EXISTS helmet_verified       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS thermal_bag_verified  BOOLEAN NOT NULL DEFAULT false;

-- Backfill name/phone/email from linked profiles + auth.users for existing riders
UPDATE public.riders r
SET
  name  = COALESCE(r.name, p.full_name),
  phone = COALESCE(r.phone, p.phone),
  email = COALESCE(r.email, u.email)
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE r.id = p.id
  AND (r.name IS NULL OR r.phone IS NULL OR r.email IS NULL);

-- Ensure every rider row has a populated performance JSONB block.
-- Only preserves values already present in the JSONB column; does not reference
-- legacy scalar columns that may not exist in partially-applied databases.
UPDATE public.riders
SET performance = jsonb_build_object(
  'rating',           COALESCE((performance->>'rating')::numeric, 0),
  'acceptanceRate',   COALESCE((performance->>'acceptanceRate')::numeric, 0),
  'completionRate',   COALESCE((performance->>'completionRate')::numeric, 0),
  'reliabilityScore', COALESCE((performance->>'reliabilityScore')::numeric, 0),
  'onTimeRate',       COALESCE((performance->>'onTimeRate')::numeric, 0),
  'ordersToday',      COALESCE((performance->>'ordersToday')::numeric, 0),
  'totalOrders',      COALESCE((performance->>'totalOrders')::numeric, 0)
)
WHERE performance IS NULL
   OR performance = '{}'
   OR NOT (performance ? 'rating');

-- Ensure every rider row has a populated earnings JSONB block
UPDATE public.riders
SET earnings = COALESCE(earnings, '{"today": 0, "weekly": 0, "total": 0}')
WHERE earnings IS NULL OR earnings = '{}';

-- Ensure every rider row has a populated wallet JSONB block
UPDATE public.riders
SET wallet = COALESCE(wallet, '{"balance": 0, "pending": 0}')
WHERE wallet IS NULL OR wallet = '{}';

-- Helpful index for admin dashboard filtering by performance rating
CREATE INDEX IF NOT EXISTS idx_riders_performance_rating
  ON public.riders (((performance ->> 'rating')::numeric));