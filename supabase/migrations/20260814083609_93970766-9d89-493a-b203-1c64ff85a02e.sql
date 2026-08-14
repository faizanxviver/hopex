ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS guidelines jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS guidelines_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS guidelines_title text NOT NULL DEFAULT 'Platform Guidelines';