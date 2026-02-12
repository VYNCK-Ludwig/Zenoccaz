-- Migration: Ajouter les colonnes détaillées à la table vehicles
-- Exécutez ce SQL dans Supabase SQL Editor

-- Ajouter les colonnes si elles n'existent pas
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS images text[],
ADD COLUMN IF NOT EXISTS mileage integer,
ADD COLUMN IF NOT EXISTS fuel_type text,
ADD COLUMN IF NOT EXISTS transmission text,
ADD COLUMN IF NOT EXISTS color text,
ADD COLUMN IF NOT EXISTS doors integer,
ADD COLUMN IF NOT EXISTS seats integer,
ADD COLUMN IF NOT EXISTS horsepower integer,
ADD COLUMN IF NOT EXISTS features text[],
ADD COLUMN IF NOT EXISTS condition text,
ADD COLUMN IF NOT EXISTS vin text,
ADD COLUMN IF NOT EXISTS registration_date date,
ADD COLUMN IF NOT EXISTS previous_owners integer,
ADD COLUMN IF NOT EXISTS technical_control_date date,
ADD COLUMN IF NOT EXISTS warranty_months integer;

-- Vérifier que toutes les colonnes ont été ajoutées
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'vehicles'
ORDER BY ordinal_position;
