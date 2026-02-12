-- Supabase / Postgres schema for ZENOCCAZ
-- Run these SQL statements in Supabase SQL editor (Dashboard -> SQL Editor)

-- Contacts
CREATE TABLE IF NOT EXISTS public.contacts (
  id bigint PRIMARY KEY,
  name text,
  first_name text,
  last_name text,
  email text,
  phone text,
  address text,
  plates text[],
  created_at timestamptz DEFAULT now()
);

-- ZenScan requests
CREATE TABLE IF NOT EXISTS public.zenscan_requests (
  id bigint PRIMARY KEY,
  contact_id bigint REFERENCES public.contacts(id) ON DELETE SET NULL,
  services text[],
  breakdown text,
  total text,
  dest text,
  confirmed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Reprises (Véhicules rachetés)
CREATE TABLE IF NOT EXISTS public.reprises (
  id bigint PRIMARY KEY,
  make text NOT NULL, -- Marque
  model text NOT NULL, -- Modèle
  year integer NOT NULL, -- Année
  mileage integer NOT NULL, -- Kilométrage
  fuel_type text NOT NULL, -- Type de carburant
  registration text NOT NULL, -- Immatriculation
  vin text, -- Numéro de série (VIN)
  seller_name text NOT NULL, -- Nom du vendeur
  seller_phone text, -- Téléphone du vendeur
  seller_email text, -- Email du vendeur
  seller_address text, -- Adresse du vendeur
  buyer_name text NOT NULL, -- Nom de l'acheteur (garage/entreprise)
  purchase_price numeric NOT NULL, -- Prix d'achat
  purchase_date date NOT NULL, -- Date de rachat
  status text NOT NULL, -- Statut (Acheté, En réparation, Prêt à la vente, Vendu)
  technical_control text, -- État du contrôle technique
  maintenance_book text, -- État du carnet d'entretien
  documents text[], -- Documents fournis
  condition text, -- État général
  notes text, -- Notes et observations
  created_at timestamptz DEFAULT now()
);

-- Vehicles
CREATE TABLE IF NOT EXISTS public.vehicles (
  id bigint PRIMARY KEY,
  make text,
  model text,
  year text,
  price numeric,
  description text,
  image text,
  images text[], -- Array d'URLs d'images
  mileage integer, -- Kilométrage
  fuel_type text, -- Type de carburant (Essence, Diesel, Électrique, Hybride)
  transmission text, -- Boîte de vitesses (Manuelle, Automatique)
  color text, -- Couleur
  doors integer, -- Nombre de portes
  seats integer, -- Nombre de places
  horsepower integer, -- Puissance (chevaux)
  features text[], -- Équipements (GPS, Climatisation, etc.)
  condition text, -- État (Excellent, Bon, Correct)
  vin text, -- Numéro de série
  registration_date date, -- Date de première immatriculation
  previous_owners integer, -- Nombre de propriétaires précédents
  technical_control_date date, -- Date du contrôle technique
  warranty_months integer, -- Garantie en mois
  status text DEFAULT 'Disponible', -- Statut (Disponible, Vendu, Archivé)
  created_at timestamptz DEFAULT now()
);

-- Pieces
CREATE TABLE IF NOT EXISTS public.pieces (
  id bigint PRIMARY KEY,
  name text,
  reference text,
  price numeric,
  stock integer,
  created_at timestamptz DEFAULT now()
);

-- Parrainages
CREATE TABLE IF NOT EXISTS public.parrainages (
  id bigint PRIMARY KEY,
  parrain text,
  parrain_email text,
  filleul text,
  reward_type text, -- Type de récompense (bon_125, vidange_75)
  status text,
  commission numeric,
  created_at timestamptz DEFAULT now()
);

-- Finances
CREATE TABLE IF NOT EXISTS public.finances (
  id bigint PRIMARY KEY,
  description text,
  type text,
  amount numeric,
  category text,
  vehicle_id bigint, -- ID du véhicule vendu (pour revenus de vente)
  piece_id bigint, -- ID de la pièce achetée (pour dépenses de pièces)
  zenscan_id bigint, -- ID de la demande ZenScan confirmée (pour revenus ZenScan)
  reprise_id bigint, -- ID du véhicule repris (pour dépenses d'achat)
  created_at timestamptz DEFAULT now()
);

-- Events / Sales
CREATE TABLE IF NOT EXISTS public.events (
  id bigint PRIMARY KEY,
  client text,
  vehicle text,
  price numeric,
  status text,
  created_at timestamptz DEFAULT now()
);

-- Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id bigint PRIMARY KEY,
  title text,
  description text,
  priority text,
  status text,
  due_date date,
  created_at timestamptz DEFAULT now()
);

-- Clients (Comptes clients)
CREATE TABLE IF NOT EXISTS public.clients (
  id bigint PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Reviews (Avis clients)
CREATE TABLE IF NOT EXISTS public.reviews (
  id bigint PRIMARY KEY,
  client_name text NOT NULL,
  comment text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now()
);

-- Simple indices
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts (lower(email));
CREATE INDEX IF NOT EXISTS idx_zenscan_contact ON public.zenscan_requests (contact_id);

-- Storage bucket for vehicle images
-- Run this in Supabase Dashboard -> Storage
-- Or via SQL (requires appropriate permissions):
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vehicle-images', 'vehicle-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: allow public read access to vehicle images
CREATE POLICY "Public Access for vehicle images"
ON storage.objects FOR SELECT
USING (bucket_id = 'vehicle-images');

-- Storage policy: allow anon/authenticated users to upload vehicle images
CREATE POLICY "Anon/Authenticated can upload vehicle images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'vehicle-images');
