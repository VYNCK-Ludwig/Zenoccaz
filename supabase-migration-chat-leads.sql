-- Chat leads (choix de la chatbox)
CREATE TABLE IF NOT EXISTS public.chat_leads (
  id bigint PRIMARY KEY,
  session_id text NOT NULL,
  choice text NOT NULL,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_leads_created_at ON public.chat_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_leads_session_id ON public.chat_leads (session_id);
