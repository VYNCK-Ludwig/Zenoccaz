-- Migration pour créer la table reviews (avis clients)
-- À exécuter dans Supabase SQL Editor

-- Création de la table reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id bigint PRIMARY KEY,
  client_name text NOT NULL,
  comment text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now()
);

-- Activer RLS (Row Level Security)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Créer une politique pour permettre la lecture publique des avis
CREATE POLICY "Public read access for reviews"
  ON public.reviews
  FOR SELECT
  USING (true);

-- Créer une politique pour permettre l'insertion (authentifié uniquement si besoin)
CREATE POLICY "Allow insert for reviews"
  ON public.reviews
  FOR INSERT
  WITH CHECK (true);

-- Créer une politique pour permettre la suppression (pour l'admin)
CREATE POLICY "Allow delete for reviews"
  ON public.reviews
  FOR DELETE
  USING (true);

-- Créer un index sur la date de création pour les requêtes
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);

-- Créer un index sur la note pour filtrer
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);
