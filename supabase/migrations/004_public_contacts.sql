-- 004: Public contact messages (footer /contact form)
-- Anonymous visitors can send inquiries; admin views them in the Support page.

CREATE TABLE IF NOT EXISTS public.contacts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'GENERAL',
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_email  ON public.contacts(email);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can send a message" ON public.contacts;
CREATE POLICY "Anyone can send a message" ON public.contacts
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view messages" ON public.contacts;
CREATE POLICY "Admins can view messages" ON public.contacts
  FOR SELECT USING (auth.role() = 'authenticated');
