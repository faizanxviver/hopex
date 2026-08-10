UPDATE public.settings SET withdraw_open_hour = 8, withdraw_close_hour = 19, updated_at = now() WHERE id = 1;
ALTER TABLE public.settings ALTER COLUMN withdraw_close_hour SET DEFAULT 19;