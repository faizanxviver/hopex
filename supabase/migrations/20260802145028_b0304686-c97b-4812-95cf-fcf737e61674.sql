ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS site_favicon text,
  ADD COLUMN IF NOT EXISTS seo_description text NOT NULL DEFAULT 'HopeX is a premium investment platform with daily ROI plans, instant deposits, fast payouts and a 4-level referral program.',
  ADD COLUMN IF NOT EXISTS seo_keywords text NOT NULL DEFAULT 'investment platform, daily roi, hopex, referral program, pakistan investment',
  ADD COLUMN IF NOT EXISTS og_image text,
  ADD COLUMN IF NOT EXISTS support_whatsapp text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS withdraw_open_hour integer NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS withdraw_close_hour integer NOT NULL DEFAULT 20;