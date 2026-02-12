-- Migration pour ajouter la colonne buyer_name dans la table reprises
-- À exécuter dans Supabase SQL Editor

-- Ajouter la colonne buyer_name (acheteur)
ALTER TABLE public.reprises 
ADD COLUMN IF NOT EXISTS buyer_name text;

-- Mettre une valeur par défaut pour les anciennes entrées
UPDATE public.reprises 
SET buyer_name = 'ZENOCCAZ'
WHERE buyer_name IS NULL;

-- Rendre la colonne obligatoire après la mise à jour
ALTER TABLE public.reprises 
ALTER COLUMN buyer_name SET NOT NULL;

-- Commentaire pour documentation
COMMENT ON COLUMN public.reprises.buyer_name IS 'Nom de l''acheteur (garage/entreprise qui rachète le véhicule)';
