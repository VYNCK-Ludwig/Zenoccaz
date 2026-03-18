-- Migration: Create learned_diagnostics table for client feedback
-- Cette table enregistre les diagnostics appris des clients

CREATE TABLE IF NOT EXISTS learned_diagnostics (
  id BIGINT PRIMARY KEY DEFAULT NEXTVAL('public.id_seq'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Info du diagnostic appris
  symptom VARCHAR(500) NOT NULL,  -- Le symptôme décrit (ex: "moteur ne démarre pas")
  diagnosis VARCHAR(500) NOT NULL,  -- Le diagnostic découvert (ex: "fusible cramé")
  
  -- Détails du véhicule
  vehicle_brand VARCHAR(100),  -- Marque (ex: Peugeot)
  vehicle_model VARCHAR(100),  -- Modèle (ex: 307)
  vehicle_year INT,  -- Année
  fuel_type VARCHAR(20),  -- essence/diesel
  
  -- Validation et priorité
  confidence_score INT DEFAULT 1,  -- Score de confiance (1-10)
  validation_count INT DEFAULT 1,  -- Nombre de fois confirmé
  is_validated BOOLEAN DEFAULT FALSE,  -- Validé par admin ?
  
  -- Tracabilité
  session_id VARCHAR(100),  -- Session du client
  client_notes TEXT,  -- Notes additionnelles du client
  
  -- Index
  UNIQUE(symptom, diagnosis)
);

-- Index pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_learned_diagnostics_symptom 
ON learned_diagnostics(symptom);

CREATE INDEX IF NOT EXISTS idx_learned_diagnostics_fuel_type 
ON learned_diagnostics(fuel_type);

CREATE INDEX IF NOT EXISTS idx_learned_diagnostics_created_at 
ON learned_diagnostics(created_at DESC);
