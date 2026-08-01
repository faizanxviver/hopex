ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS site_title TEXT NOT NULL DEFAULT 'HopeX — Investment Platform',
  ADD COLUMN IF NOT EXISTS site_logo TEXT;