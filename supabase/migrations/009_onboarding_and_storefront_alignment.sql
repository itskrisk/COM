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
  ADD COLUMN IF NOT EXISTS bulk_limit           INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS pack_time_min        INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS delivery_radius_km   INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS low_stock_threshold  INTEGER NOT NULL DEFAULT 10;

-- Merchants RLS Alignment: Allow authenticated merchants to insert, update and read their own records
DO $$
BEGIN
  ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Merchant reads own" ON public.merchants;
  CREATE POLICY "Merchant reads own"
    ON public.merchants FOR SELECT
    USING (auth.uid() = id);

  DROP POLICY IF EXISTS "Merchant inserts own" ON public.merchants;
  CREATE POLICY "Merchant inserts own"
    ON public.merchants FOR INSERT
    WITH CHECK (auth.uid() = id);

  DROP POLICY IF EXISTS "Merchant updates own" ON public.merchants;
  CREATE POLICY "Merchant updates own"
    ON public.merchants FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

  DROP POLICY IF EXISTS "Admin manages merchants" ON public.merchants;
  CREATE POLICY "Admin manages merchants"
    ON public.merchants FOR ALL
    USING (
      coalesce(
        (SELECT (roles @> ARRAY['admin']::text[] OR roles @> ARRAY['superadmin']::text[])
         FROM public.profiles WHERE id = auth.uid()),
        false
      )
    );
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

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

-- Riders RLS Alignment: Allow authenticated riders to insert, update and read their own records
DO $$
BEGIN
  ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Rider reads own" ON public.riders;
  CREATE POLICY "Rider reads own"
    ON public.riders FOR SELECT
    USING (auth.uid() = id);

  DROP POLICY IF EXISTS "Rider inserts own" ON public.riders;
  CREATE POLICY "Rider inserts own"
    ON public.riders FOR INSERT
    WITH CHECK (auth.uid() = id);

  DROP POLICY IF EXISTS "Rider updates own" ON public.riders;
  CREATE POLICY "Rider updates own"
    ON public.riders FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 3. Products table alignment: add category text name & compare price support
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category             TEXT,
  ADD COLUMN IF NOT EXISTS compare_price        NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS is_available         BOOLEAN DEFAULT true;

-- 4. Categories table alignment: ensure is_active exists
DO $$
BEGIN
  IF to_regclass('public.categories') IS NOT NULL THEN
    ALTER TABLE public.categories
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- 5. Fix RLS on products: Merchants can always manage their own products
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

-- 6. Fix RLS on categories: Merchants can manage their own categories
DO $$
BEGIN
  IF to_regclass('public.categories') IS NOT NULL THEN
    ALTER TABLE public.categories
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

    DROP POLICY IF EXISTS "Merchant manages own categories" ON public.categories;
    CREATE POLICY "Merchant manages own categories"
      ON public.categories FOR ALL
      USING (merchant_id = auth.uid())
      WITH CHECK (merchant_id = auth.uid());

    DROP POLICY IF EXISTS "Active categories public" ON public.categories;
    CREATE POLICY "Active categories public"
      ON public.categories FOR SELECT
      USING (true);
  END IF;
END $$;

-- 7. Storage bucket 'documents' alignment
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('documents', 'documents', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

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
