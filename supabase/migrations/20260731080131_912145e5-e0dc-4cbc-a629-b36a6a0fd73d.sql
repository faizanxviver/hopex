DROP FUNCTION IF EXISTS public.buy_plan(uuid, numeric);

CREATE OR REPLACE FUNCTION public.buy_plan(_plan_id text, _amount numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  me public.profiles%ROWTYPE;
  pl public.plans%ROWTYPE;
  inv_id uuid;
  rates integer[];
  up public.profiles%ROWTYPE;
  code text;
  lvl int;
  commission numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO me FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF me.blocked THEN RAISE EXCEPTION 'Account suspended'; END IF;

  SELECT * INTO pl FROM public.plans WHERE id = _plan_id AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan unavailable'; END IF;
  IF _amount < pl.min_amount OR _amount > pl.max_amount THEN
    RAISE EXCEPTION 'Amount outside plan range';
  END IF;
  IF me.balance < _amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  UPDATE public.profiles
    SET balance = balance - _amount, invested = invested + _amount
    WHERE id = me.id;

  INSERT INTO public.investments (user_id, plan_id, plan_name, amount, daily_roi, duration_days)
  VALUES (me.id, pl.id, pl.name, _amount, pl.daily_roi, pl.duration_days)
  RETURNING id INTO inv_id;

  INSERT INTO public.transactions (user_id, type, amount, method, status)
  VALUES (me.id, 'investment', _amount, pl.name || ' Plan', 'completed');

  SELECT s.levels INTO rates FROM public.settings s WHERE s.id = 1;
  rates := COALESCE(rates, ARRAY[10,2,1,4]);

  code := me.referred_by;
  lvl := 1;
  WHILE code IS NOT NULL AND lvl <= 4 LOOP
    SELECT * INTO up FROM public.profiles WHERE referral_code = code FOR UPDATE;
    EXIT WHEN NOT FOUND;
    commission := round(_amount * COALESCE(rates[lvl], 0)::numeric / 100.0, 2);
    IF commission > 0 THEN
      UPDATE public.profiles
        SET balance = balance + commission,
            referral_earnings = referral_earnings + commission
        WHERE id = up.id;
      INSERT INTO public.transactions (user_id, type, amount, method, status)
      VALUES (up.id, 'commission', commission, 'Level ' || lvl || ' — ' || me.name, 'completed');
      INSERT INTO public.notifications (user_id, title, body, kind)
      VALUES (up.id, 'Commission received',
              'You earned $' || commission || ' from a Level ' || lvl || ' investment.', 'success');
    END IF;
    code := up.referred_by;
    lvl := lvl + 1;
  END LOOP;

  RETURN inv_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.buy_plan(text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buy_plan(text, numeric) TO authenticated;