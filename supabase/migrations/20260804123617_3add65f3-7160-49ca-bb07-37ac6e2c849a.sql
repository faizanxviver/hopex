CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'imgbb',
  label text NOT NULL DEFAULT 'Key',
  api_key text NOT NULL,
  purpose text NOT NULL DEFAULT 'all',
  active boolean NOT NULL DEFAULT true,
  uploads integer NOT NULL DEFAULT 0,
  failures integer NOT NULL DEFAULT 0,
  bytes bigint NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER api_keys_touch BEFORE UPDATE ON public.api_keys
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();