-- Migration pour ajouter la colonne status aux véhicules
-- À exécuter dans Supabase SQL Editor

-- Ajouter la colonne status à la table vehicles
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Disponible';

-- Mettre à jour les véhicules existants sans statut
UPDATE public.vehicles 
SET status = 'Disponible' 
WHERE status IS NULL;

-- Commentaire
COMMENT ON COLUMN public.vehicles.status IS 'Statut du véhicule: Disponible, Vendu, Archivé';
