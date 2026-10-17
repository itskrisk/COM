-- ============================================================
-- MUNCHEEZ — MIGRATION 009: ONBOARDING, STORE SETTINGS & PRODUCT ALIGNMENT
-- ============================================================

-- 1. Merchants table alignment: add columns for direct document URLs & owner details
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS owner_name           TEXT,
  ADD COLUMN IF NOT EXISTS business_permit_url  TEXT,
  ADD COLUMN IF NOT EXISTS kra_pin_url          TEXT,
  ADD COLUMN IF NOT EXISTS health_permit_url    TEXT,
  ADD COLUMN IF NOT EXISTS bulk_purchase_limit  INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS bulk_limit           INTEGER DEFAULT 10;

-- 2. Riders table alignment: ensure personal details, IDs & document URLs exist
ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS name                 TEXT,
  ADD COLUMN IF NOT EXISTS phone                TEXT,
  ADD COLUMN IF NOT EXISTS email                TEXT,
  ADD COLUMN IF NOT EXISTS national_id          TEXT,
  ADD COLUMN IF NOT EXISTS mpesa_phone          TEXT,
  ADD COLUMN IF NOT EXISTS id_doc_url           TEXT,
  ADD COLUMN IF NOT EXISTS license_url          TEXT,
  ADD COLUMN IF NOT EXISTS logbook_url          TEXT,
  ADD COLUMN IF NOT EXISTS insurance_url        TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_url    TEXT;

-- 3. Products table alignment: add category text name & compare price support
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category             TEXT,
  ADD COLUMN IF NOT EXISTS compare_price        NUMERIC(10,2);

-- 4. Fix RLS on products: Merchants can always manage their own products
-- (previous policy blocked inventory management when store was paused/closed)
DO $$
BEGIN
  IF to_regclass('public.products') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Merchant manages own products" ON public.products;
    CREATE POLICY "Merchant manages own products"
      ON public.products FOR ALL
      USING (merchant_id = auth.uid())
      WITH CHECK (merchant_id = auth.uid());

    DROP POLICY IF EXISTS "Available products public" ON public.products;
    CREATE POLICY "Available products public"
      ON public.products FOR SELECT
      USING (is_available = true);
  END IF;
END $$;

-- 5. Fix RLS on categories: Merchants can manage their own categories
DO $$
BEGIN
  IF to_regclass('public.categories') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Merchant manages own categories" ON public.categories;
    CREATE POLICY "Merchant manages own categories"
      ON public.categories FOR ALL
      USING (merchant_id = auth.uid())
      WITH CHECK (merchant_id = auth.uid());

    DROP POLICY IF EXISTS "Active categories public" ON public.categories;
    CREATE POLICY "Active categories public"
      ON public.categories FOR SELECT
      USING (is_active = true);
  END IF;
END $$;

-- 6. Storage bucket 'documents' alignment
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for 'documents' bucket
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public document access" ON storage.objects;
  CREATE POLICY "Public document access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'documents');

  DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
  CREATE POLICY "Authenticated users can upload documents"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

  DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
  CREATE POLICY "Users can update own documents"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[2]);
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Guard for environments where storage schema policies differ
END $$;
