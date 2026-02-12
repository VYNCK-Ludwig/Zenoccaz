-- Migration pour créer la table des archives mensuelles de finances
-- À exécuter dans Supabase SQL Editor

-- Créer la table des archives mensuelles
CREATE TABLE IF NOT EXISTS public.finance_archives (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  month text NOT NULL, -- Format: "2025-12" (année-mois)
  month_name text NOT NULL, -- Format: "Décembre 2025"
  total_revenue numeric DEFAULT 0,
  total_expenses numeric DEFAULT 0,
  total_profit numeric DEFAULT 0,
  vehicle_revenue numeric DEFAULT 0,
  zenscan_revenue numeric DEFAULT 0,
  vehicle_count integer DEFAULT 0,
  zenscan_count integer DEFAULT 0,
  reprise_count integer DEFAULT 0,
  parts_count integer DEFAULT 0,
  urssaf_vehicle_tax numeric DEFAULT 0,
  urssaf_zenscan_tax numeric DEFAULT 0,
  net_margin_vehicle numeric DEFAULT 0,
  net_margin_zenscan numeric DEFAULT 0,
  net_margin_total numeric DEFAULT 0,
  pdf_generated boolean DEFAULT false,
  archived_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Index pour recherche rapide par mois
CREATE INDEX IF NOT EXISTS idx_finance_archives_month ON public.finance_archives(month);

-- Commentaires
COMMENT ON TABLE public.finance_archives IS 'Archives mensuelles des finances pour archivage et contrôle';
COMMENT ON COLUMN public.finance_archives.month IS 'Mois au format YYYY-MM';
COMMENT ON COLUMN public.finance_archives.pdf_generated IS 'Indique si le PDF a été généré pour ce mois';
