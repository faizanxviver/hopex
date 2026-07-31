-- ============ enums ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.tx_type AS ENUM ('deposit','withdraw','investment','commission','bonus','payout');
CREATE TYPE public.tx_status AS ENUM ('pending','processing','approved','completed','rejected');
CREATE TYPE public.kyc_status AS ENUM ('not_submitted','pending','verified');

-- ============ profiles ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Investor',
  email text NOT NULL,
  phone text,
  verified boolean NOT NULL DEFAULT true,
  blocked boolean NOT NULL DEFAULT false,
  kyc public.kyc_status NOT NULL DEFAULT 'not_submitted',
  two_factor boolean NOT NULL DEFAULT false,
  language text NOT NULL DEFAULT 'en',
  referral_code text NOT NULL UNIQUE,
  referred_by text,
  balance numeric(14,2) NOT NULL DEFAULT 0,
  invested numeric(14,2) NOT NULL DEFAULT 0,
  earnings numeric(14,2) NOT NULL DEFAULT 0,
  referral_earnings numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ roles ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

-- returns the referral codes of the caller plus 4 downline levels
CREATE OR REPLACE FUNCTION public.my_network_codes()
RETURNS text[] LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_codes text[];
  all_codes text[] := '{}';
  i int;
BEGIN
  SELECT ARRAY[referral_code] INTO current_codes FROM public.profiles WHERE id = auth.uid();
  IF current_codes IS NULL THEN RETURN '{}'; END IF;
  FOR i IN 1..4 LOOP
    SELECT COALESCE(array_agg(referral_code), '{}') INTO current_codes
    FROM public.profiles WHERE referred_by = ANY(current_codes);
    EXIT WHEN array_length(current_codes, 1) IS NULL;
    all_codes := all_codes || current_codes;
  END LOOP;
  RETURN all_codes;
END;
$$;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_select_admin" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "profiles_select_downline" ON public.profiles FOR SELECT TO authenticated
  USING (referred_by IS NOT NULL AND referred_by = ANY(public.my_network_codes()));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "profiles_delete_admin" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- ============ plans ============
CREATE TABLE public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  min_amount numeric(14,2) NOT NULL,
  max_amount numeric(14,2) NOT NULL,
  daily_roi numeric(6,2) NOT NULL,
  duration_days int NOT NULL,
  features text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_public_read" ON public.plans FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "plans_admin_write" ON public.plans FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============ investments ============
CREATE TABLE public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL,
  plan_name text NOT NULL,
  amount numeric(14,2) NOT NULL,
  daily_roi numeric(6,2) NOT NULL,
  duration_days int NOT NULL,
  earned numeric(14,2) NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investments TO authenticated;
GRANT ALL ON public.investments TO service_role;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "investments_own" ON public.investments FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "investments_admin" ON public.investments FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============ transactions ============
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.tx_type NOT NULL,
  amount numeric(14,2) NOT NULL,
  method text,
  status public.tx_status NOT NULL DEFAULT 'pending',
  note text,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tx_own" ON public.transactions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "tx_admin" ON public.transactions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============ notifications ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  kind text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  popup boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_own" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif_admin" ON public.notifications FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============ chat ============
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('user','support')),
  text text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  attachment jsonb,
  reply_to jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_own" ON public.chat_messages FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "chat_admin" ON public.chat_messages FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============ promo codes ============
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'percent' CHECK (type IN ('percent','fixed')),
  value numeric(12,2) NOT NULL,
  usage_limit int NOT NULL DEFAULT 100,
  used int NOT NULL DEFAULT 0,
  expires_at date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.promo_codes TO authenticated;
GRANT INSERT, DELETE ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promo_read" ON public.promo_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "promo_use" ON public.promo_codes FOR UPDATE TO authenticated USING (active) WITH CHECK (true);
CREATE POLICY "promo_admin" ON public.promo_codes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============ settings ============
CREATE TABLE public.settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_name text NOT NULL DEFAULT 'Aurum Capital',
  min_deposit numeric(12,2) NOT NULL DEFAULT 50,
  min_withdraw numeric(12,2) NOT NULL DEFAULT 25,
  levels int[] NOT NULL DEFAULT ARRAY[10,2,1,4],
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settings TO anon;
GRANT SELECT, UPDATE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_read" ON public.settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "settings_admin" ON public.settings FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============ updated_at trigger ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ new user bootstrap ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  gen_code text;
BEGIN
  LOOP
    gen_code := 'AUR' || upper(substr(md5(random()::text), 1, 5));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = gen_code);
  END LOOP;

  INSERT INTO public.profiles (id, name, email, phone, referral_code, referred_by, balance)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'name', ''), split_part(NEW.email, '@', 1)),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data ->> 'phone', ''),
    gen_code,
    NULLIF(upper(NEW.raw_user_meta_data ->> 'referred_by'), ''),
    100
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN lower(NEW.email) = 'admin@aurum.io' THEN 'admin'::public.app_role ELSE 'user'::public.app_role END);

  INSERT INTO public.transactions (user_id, type, amount, method, status)
  VALUES (NEW.id, 'bonus', 100, 'Welcome bonus', 'completed');

  INSERT INTO public.notifications (user_id, title, body, kind, popup)
  VALUES (NEW.id, 'Welcome to Aurum Capital 🎉', 'Your $100 welcome bonus is ready. Pick a plan to start earning daily.', 'success', true);

  INSERT INTO public.chat_messages (user_id, sender, text)
  VALUES (NEW.id, 'support', 'Hi 👋 Welcome to Aurum Capital support. How can we help today?');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ seed reference data ============
INSERT INTO public.plans (id, name, min_amount, max_amount, daily_roi, duration_days, features, sort_order) VALUES
  ('starter','Starter',50,999,1.2,30,ARRAY['Daily payouts','Principal returned','Email support'],1),
  ('growth','Growth',1000,4999,1.8,45,ARRAY['Daily payouts','Priority support','Referral boost 5%'],2),
  ('premium','Premium',5000,19999,2.4,60,ARRAY['Daily payouts','Dedicated manager','Referral boost 10%'],3),
  ('vip','VIP',20000,250000,3.1,90,ARRAY['Daily payouts','Private desk','Custom exit terms','VIP events'],4);

INSERT INTO public.promo_codes (code, type, value, usage_limit, used, expires_at) VALUES
  ('WELCOME10','percent',10,500,0,'2026-12-31'),
  ('BOOST50','fixed',50,100,0,'2026-10-01');

INSERT INTO public.settings (id) VALUES (1);