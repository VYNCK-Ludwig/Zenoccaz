-- Ajout de la colonne status pour gérer l'archivage des chat leads
-- Valeurs possibles : 'active' (par défaut), 'archived'

ALTER TABLE public.chat_leads 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Index pour filtrer par status
CREATE INDEX IF NOT EXISTS idx_chat_leads_status ON public.chat_leads (status);
