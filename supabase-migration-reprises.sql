-- Migration pour créer la table reprises dans Supabase
-- À exécuter dans Supabase SQL Editor

-- Création de la table reprises
CREATE TABLE IF NOT EXISTS public.reprises (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  mileage integer NOT NULL,
  fuel_type text NOT NULL,
  registration text NOT NULL,
  vin text,
  seller_name text NOT NULL,
  seller_phone text,
  seller_email text,
  seller_address text,
  purchase_price numeric NOT NULL,
  purchase_date date NOT NULL,
  status text NOT NULL DEFAULT 'En cours d''expertise',
  technical_control text,
  maintenance_book text,
  documents text[],
  condition text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Activer RLS (Row Level Security)
ALTER TABLE public.reprises ENABLE ROW LEVEL SECURITY;

-- Créer une politique pour permettre toutes les opérations (pour l'admin)
CREATE POLICY "Allow all operations on reprises"
  ON public.reprises
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Créer un index sur la date de rachat pour les requêtes
CREATE INDEX IF NOT EXISTS idx_reprises_purchase_date ON public.reprises(purchase_date DESC);

-- Créer un index sur le statut pour filtrer rapidement
CREATE INDEX IF NOT EXISTS idx_reprises_status ON public.reprises(status);
