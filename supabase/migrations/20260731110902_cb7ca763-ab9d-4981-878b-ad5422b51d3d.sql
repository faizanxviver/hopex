ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS account_name text,
  ADD COLUMN IF NOT EXISTS account_number text;

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS quick_amounts numeric[] NOT NULL DEFAULT ARRAY[1000, 3000, 5000, 10000, 25000, 50000];

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'wallet',
  account_name text NOT NULL DEFAULT '',
  account_number text NOT NULL DEFAULT '',
  image_url text,
  instructions text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_methods TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_methods_public_read" ON public.payment_methods
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "payment_methods_admin_write" ON public.payment_methods
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER payment_methods_touch BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.payment_methods (name, kind, account_name, account_number, instructions, sort_order)
VALUES
  ('Easypaisa', 'wallet', 'HopeX Finance', '0300-1234567', 'Send the exact amount to this Easypaisa wallet, then upload your screenshot.', 1),
  ('JazzCash', 'wallet', 'HopeX Finance', '0301-7654321', 'Send the exact amount to this JazzCash wallet, then upload your screenshot.', 2),
  ('Bank Transfer', 'bank', 'HopeX Finance Pvt Ltd', 'PK36SCBL0000001123456702', 'Transfer to this account (Standard Chartered), then upload your receipt.', 3);

ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.investments REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.plans REPLICA IDENTITY FULL;
ALTER TABLE public.payment_methods REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.investments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_methods;