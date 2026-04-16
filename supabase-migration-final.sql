-- ============================================================
-- ZENOCCAZ — Migration finale d'automatisation complète
-- À exécuter dans Supabase → SQL Editor
-- ============================================================

-- 1. Table messages de contact (formulaire index.html)
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id bigint PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 2. Colonne sold_at sur vehicles (date de vente pour le ruban 7 jours)
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS sold_at timestamptz;

-- 3. Table sold_vehicles (archive des véhicules vendus)
CREATE TABLE IF NOT EXISTS public.sold_vehicles (
  id bigint PRIMARY KEY,
  make text,
  model text,
  year text,
  price text,
  mileage text,
  fuel_type text,
  description text,
  registration text,
  images jsonb,
  sold_at timestamptz DEFAULT now(),
  sold_price numeric
);

-- 4. Table zenscan_archives (interventions payées et archivées)
CREATE TABLE IF NOT EXISTS public.zenscan_archives (
  id bigint PRIMARY KEY,
  client_name text,
  client_email text,
  client_phone text,
  services text,
  breakdown text,
  dest text,
  total text,
  confirmed boolean DEFAULT true,
  paid boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  archived_at timestamptz DEFAULT now()
);

-- 5. Colonne paid sur zenscan_requests
ALTER TABLE public.zenscan_requests ADD COLUMN IF NOT EXISTS paid boolean DEFAULT false;

-- 6. Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_contact_messages_read ON public.contact_messages (read);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles (status);
CREATE INDEX IF NOT EXISTS idx_vehicles_sold_at ON public.vehicles (sold_at);
CREATE INDEX IF NOT EXISTS idx_zenscan_archives_archived_at ON public.zenscan_archives (archived_at);

-- 7. RLS policies (accès public en lecture pour les tables publiques)
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow insert contact_messages" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow read contact_messages" ON public.contact_messages FOR SELECT USING (true);
CREATE POLICY "Allow update contact_messages" ON public.contact_messages FOR UPDATE USING (true);
CREATE POLICY "Allow delete contact_messages" ON public.contact_messages FOR DELETE USING (true);

ALTER TABLE public.sold_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all sold_vehicles" ON public.sold_vehicles FOR ALL USING (true);

ALTER TABLE public.zenscan_archives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all zenscan_archives" ON public.zenscan_archives FOR ALL USING (true);
