-- ═══════════════════════════════════════════════════════════════
-- ZENOCCAZ — Migration : Système de Fidélité + VIP
-- À exécuter dans Supabase > SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Offres créées par l'admin (page fidelite.html) ──────────
CREATE TABLE IF NOT EXISTS fidelite_offres (
  id          bigint        PRIMARY KEY DEFAULT extract(epoch from now())::bigint,
  titre       text          NOT NULL,
  description text          NOT NULL,
  emoji       text          DEFAULT '🎁',
  condition   text,                         -- ex: "Valable 6 mois"
  date_fin    date,                         -- NULL = sans limite
  active      boolean       DEFAULT true,
  created_at  timestamptz   DEFAULT now()
);

-- ── 2. Colonne vip_status sur la table clients ─────────────────
-- Ajout de la colonne si elle n'existe pas déjà
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS vip_status     boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS vip_validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS vip_note       text;        -- note admin optionnelle

-- ── 3. Table carte de fidélité par client ──────────────────────
CREATE TABLE IF NOT EXISTS fidelite_carte (
  id              bigserial     PRIMARY KEY,
  client_id       bigint        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  client_name     text,
  client_email    text,

  -- Compteurs services (incrémentés par l'admin)
  nb_vehicules_achetes    int  DEFAULT 0,
  nb_vidanges             int  DEFAULT 0,
  nb_distributions        int  DEFAULT 0,
  nb_montages_pneus       int  DEFAULT 0,
  nb_zenscan              int  DEFAULT 0,
  nb_parrainages_valides  int  DEFAULT 0,

  -- Avantages débloqués (validés par l'admin)
  vidange_offerte         boolean DEFAULT false,
  vidange_offerte_used    boolean DEFAULT false,
  service_apres_distrib   boolean DEFAULT false,
  service_apres_distrib_used boolean DEFAULT false,
  remise_15_pneus         boolean DEFAULT false,
  remise_15_pneus_used    boolean DEFAULT false,
  zenscan_offert          boolean DEFAULT false,
  zenscan_offert_used     boolean DEFAULT false,

  -- Notes admin
  notes_admin     text,

  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Index pour lookup rapide par client
CREATE INDEX IF NOT EXISTS idx_fidelite_carte_client ON fidelite_carte(client_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fidelite_carte_unique ON fidelite_carte(client_id);

-- ── 4. RLS (Row Level Security) ───────────────────────────────
-- fidelite_offres : lecture publique, écriture admin uniquement
ALTER TABLE fidelite_offres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "offres_read_all"  ON fidelite_offres;
DROP POLICY IF EXISTS "offres_write_all" ON fidelite_offres;
CREATE POLICY "offres_read_all"  ON fidelite_offres FOR SELECT USING (true);
CREATE POLICY "offres_write_all" ON fidelite_offres FOR ALL   USING (true); -- restreindre si auth Supabase activée

-- fidelite_carte : chaque client lit la sienne, admin lit tout
ALTER TABLE fidelite_carte ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "carte_read_all"  ON fidelite_carte;
DROP POLICY IF EXISTS "carte_write_all" ON fidelite_carte;
CREATE POLICY "carte_read_all"  ON fidelite_carte FOR SELECT USING (true);
CREATE POLICY "carte_write_all" ON fidelite_carte FOR ALL   USING (true);

-- ── 5. Trigger updated_at sur fidelite_carte ─────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_fidelite_carte_updated ON fidelite_carte;
CREATE TRIGGER trig_fidelite_carte_updated
  BEFORE UPDATE ON fidelite_carte
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 6. Données de test (optionnel — à supprimer en prod) ──────
-- INSERT INTO fidelite_offres (titre, description, emoji, condition, date_fin)
-- VALUES (
--   'Offre de lancement',
--   '−10% sur votre premier ZenScan pour tout nouveau client inscrit avant le 31 juillet.',
--   '🚀',
--   'Pour tout nouveau client inscrit en 2025.',
--   '2025-07-31'
-- );

-- ═══════════════════════════════════════════════════════════════
-- FIN DU SCRIPT
-- ═══════════════════════════════════════════════════════════════
