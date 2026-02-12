-- Migration: Ajouter la colonne reward_type à la table parrainages
-- Exécutez ce script dans Supabase SQL Editor si la table existe déjà

-- Ajouter la colonne reward_type si elle n'existe pas
ALTER TABLE public.parrainages 
ADD COLUMN IF NOT EXISTS reward_type text;

-- Mettre à jour les lignes existantes avec une valeur par défaut
UPDATE public.parrainages 
SET reward_type = 'bon_125' 
WHERE reward_type IS NULL;

-- Message de confirmation
SELECT 'Migration terminée: colonne reward_type ajoutée à la table parrainages' as status;
