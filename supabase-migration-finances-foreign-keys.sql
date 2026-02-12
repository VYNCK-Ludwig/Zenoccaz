-- Migration pour ajouter les colonnes de liaison dans la table finances et confirmed dans zenscan_requests
-- À exécuter dans Supabase SQL Editor

-- 1. Ajouter les colonnes pour lier les finances aux entités sources
ALTER TABLE public.finances 
ADD COLUMN IF NOT EXISTS vehicle_id bigint,
ADD COLUMN IF NOT EXISTS piece_id bigint,
ADD COLUMN IF NOT EXISTS zenscan_id bigint,
ADD COLUMN IF NOT EXISTS reprise_id bigint;

-- 2. Ajouter la colonne confirmed dans zenscan_requests
ALTER TABLE public.zenscan_requests
ADD COLUMN IF NOT EXISTS confirmed boolean DEFAULT false;

-- 3. Créer des index pour améliorer les performances des recherches
CREATE INDEX IF NOT EXISTS idx_finances_vehicle_id ON public.finances(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_finances_piece_id ON public.finances(piece_id);
CREATE INDEX IF NOT EXISTS idx_finances_zenscan_id ON public.finances(zenscan_id);
CREATE INDEX IF NOT EXISTS idx_finances_reprise_id ON public.finances(reprise_id);
CREATE INDEX IF NOT EXISTS idx_zenscan_confirmed ON public.zenscan_requests(confirmed);

-- 4. Commentaires pour documentation
COMMENT ON COLUMN public.finances.vehicle_id IS 'ID du véhicule vendu (pour les revenus de vente)';
COMMENT ON COLUMN public.finances.piece_id IS 'ID de la pièce achetée (pour les dépenses de pièces)';
COMMENT ON COLUMN public.finances.zenscan_id IS 'ID de la demande ZenScan confirmée (pour les revenus ZenScan)';
COMMENT ON COLUMN public.finances.reprise_id IS 'ID du véhicule repris (pour les dépenses d''achat de véhicule)';
COMMENT ON COLUMN public.zenscan_requests.confirmed IS 'Indique si la demande ZenScan a été confirmée et ajoutée aux finances';
