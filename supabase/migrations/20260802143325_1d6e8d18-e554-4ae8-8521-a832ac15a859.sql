ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS announcement_text text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS announcement_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_message text NOT NULL DEFAULT 'HopeX is under scheduled maintenance. Please check back shortly.',
  ADD COLUMN IF NOT EXISTS salary_tiers jsonb NOT NULL DEFAULT '[
    {"rank":"Bronze","team":3,"invested":5000,"salary":500},
    {"rank":"Silver","team":10,"invested":25000,"salary":2500},
    {"rank":"Gold","team":25,"invested":75000,"salary":8000},
    {"rank":"Platinum","team":60,"invested":200000,"salary":25000}
  ]'::jsonb;

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  admin_name text NOT NULL DEFAULT '',
  action text NOT NULL,
  target_id uuid,
  target_name text NOT NULL DEFAULT '',
  detail text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_admin_read ON public.audit_log;
CREATE POLICY audit_log_admin_read ON public.audit_log
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS audit_log_admin_write ON public.audit_log;
CREATE POLICY audit_log_admin_write ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (public.is_admin() AND admin_id = auth.uid());

CREATE OR REPLACE FUNCTION public.leaderboard()
RETURNS TABLE(display_name text, earnings numeric, invested numeric, referral_earnings numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    left(p.name, 2) || repeat('*', greatest(length(p.name) - 3, 2)) || right(p.name, 1),
    round(p.earnings, 2),
    round(p.invested, 2),
    round(p.referral_earnings, 2)
  FROM public.profiles p
  WHERE NOT p.blocked AND p.earnings > 0
  ORDER BY p.earnings DESC
  LIMIT 25;
$$;

GRANT EXECUTE ON FUNCTION public.leaderboard() TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_salary()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  me public.profiles%ROWTYPE;
  tiers jsonb;
  tier jsonb;
  best jsonb := NULL;
  team_count int;
  last_claim timestamptz;
  amount numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO me FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF me.blocked THEN RAISE EXCEPTION 'Account suspended'; END IF;

  SELECT COUNT(*) INTO team_count FROM public.profiles WHERE referred_by = me.referral_code;
  SELECT s.salary_tiers INTO tiers FROM public.settings s WHERE s.id = 1;

  FOR tier IN SELECT * FROM jsonb_array_elements(COALESCE(tiers, '[]'::jsonb)) LOOP
    IF team_count >= (tier->>'team')::int AND me.invested >= (tier->>'invested')::numeric THEN
      IF best IS NULL OR (tier->>'salary')::numeric > (best->>'salary')::numeric THEN
        best := tier;
      END IF;
    END IF;
  END LOOP;

  IF best IS NULL THEN RAISE EXCEPTION 'You have not reached a salary rank yet'; END IF;

  SELECT max(created_at) INTO last_claim FROM public.transactions
    WHERE user_id = me.id AND type = 'bonus' AND method LIKE 'Salary%';
  IF last_claim IS NOT NULL AND last_claim > now() - interval '30 days' THEN
    RAISE EXCEPTION 'Salary already claimed this month';
  END IF;

  amount := (best->>'salary')::numeric;

  UPDATE public.profiles SET balance = balance + amount, earnings = earnings + amount
    WHERE id = me.id;

  INSERT INTO public.transactions (user_id, type, amount, method, status)
  VALUES (me.id, 'bonus', amount, 'Salary — ' || (best->>'rank'), 'completed');

  INSERT INTO public.notifications (user_id, title, body, kind)
  VALUES (me.id, 'Salary credited',
          (best->>'rank') || ' rank salary of Rs ' || amount || ' added to your balance.', 'success');

  RETURN amount;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_salary() TO authenticated;