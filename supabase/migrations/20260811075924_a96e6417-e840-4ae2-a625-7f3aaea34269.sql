ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS per_user_limit integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.promo_redemptions TO authenticated;
GRANT ALL ON public.promo_redemptions TO service_role;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own redemptions" ON public.promo_redemptions;
CREATE POLICY "Users read own redemptions" ON public.promo_redemptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins read all redemptions" ON public.promo_redemptions;
CREATE POLICY "Admins read all redemptions" ON public.promo_redemptions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.redeem_promo(_code text, _amount numeric DEFAULT 0)
RETURNS TABLE(bonus numeric, code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  p public.promo_codes%ROWTYPE;
  uid uuid := auth.uid();
  mine int;
  b numeric;
  has_dep boolean;
  has_plan boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO p FROM public.promo_codes
    WHERE lower(promo_codes.code) = lower(trim(_code))
      AND active AND used < usage_limit
      AND (expires_at IS NULL OR expires_at >= current_date)
    FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT count(*) INTO mine FROM public.promo_redemptions r
    WHERE r.promo_id = p.id AND r.user_id = uid;
  IF mine >= greatest(p.per_user_limit, 1) THEN RETURN; END IF;

  SELECT EXISTS (SELECT 1 FROM public.transactions t
                 WHERE t.user_id = uid AND t.type = 'deposit' AND t.status = 'completed')
    INTO has_dep;
  SELECT EXISTS (SELECT 1 FROM public.investments i
                 WHERE i.user_id = uid AND i.status = 'active')
    INTO has_plan;

  IF p.audience = 'depositors' AND NOT has_dep THEN RETURN; END IF;
  IF p.audience = 'new' AND has_dep THEN RETURN; END IF;
  IF p.audience = 'active_plan' AND NOT has_plan THEN RETURN; END IF;

  b := CASE WHEN p.type = 'percent'
            THEN round(COALESCE(_amount, 0) * p.value / 100.0, 2)
            ELSE round(p.value, 2) END;
  IF b <= 0 THEN RETURN; END IF;

  UPDATE public.promo_codes SET used = used + 1 WHERE id = p.id;
  INSERT INTO public.promo_redemptions (promo_id, user_id, amount) VALUES (p.id, uid, b);
  UPDATE public.profiles SET balance = COALESCE(balance, 0) + b WHERE id = uid;
  INSERT INTO public.transactions (user_id, type, amount, method, status, note)
    VALUES (uid, 'bonus', b, 'Promo ' || p.code, 'completed', 'Promo code bonus');

  RETURN QUERY SELECT b, p.code;
END;
$function$;