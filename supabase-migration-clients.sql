-- Migration pour créer la table clients (comptes clients)
-- À exécuter dans Supabase SQL Editor

-- Création de la table clients
CREATE TABLE IF NOT EXISTS public.clients (
  id bigint PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Activer RLS (Row Level Security)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Créer une politique pour permettre l'insertion (inscription)
CREATE POLICY "Allow insert for clients"
  ON public.clients
  FOR INSERT
  WITH CHECK (true);

-- Créer une politique pour permettre la lecture (connexion)
CREATE POLICY "Allow select for clients"
  ON public.clients
  FOR SELECT
  USING (true);

-- Créer un index sur l'email pour les connexions rapides
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);

-- Commentaires
COMMENT ON TABLE public.clients IS 'Comptes clients pour laisser des avis';
COMMENT ON COLUMN public.clients.password IS 'Mot de passe en clair (à hasher en production)';
