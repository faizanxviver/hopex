ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS last_payout_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gen_code text;
BEGIN
  LOOP
    gen_code := 'HPX' || upper(substr(md5(random()::text), 1, 5));
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
    0
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN lower(NEW.email) IN ('admin@hopex.io', 'admin@aurum.io') THEN 'admin'::public.app_role ELSE 'user'::public.app_role END);

  INSERT INTO public.notifications (user_id, title, body, kind, popup)
  VALUES (NEW.id, 'Welcome to HopeX 🎉', 'Fund your wallet and activate a plan to start earning daily income.', 'success', true);

  INSERT INTO public.chat_messages (user_id, sender, text)
  VALUES (NEW.id, 'support', 'Hi 👋 Welcome to HopeX support. How can we help today?');

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.buy_plan(_plan_id text, _amount numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  first_income numeric;
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

  first_income := round(_amount * pl.daily_roi / 100.0, 2);

  UPDATE public.profiles
    SET balance = balance - _amount + first_income,
        invested = invested + _amount,
        earnings = earnings + first_income
    WHERE id = me.id;

  INSERT INTO public.investments (user_id, plan_id, plan_name, amount, daily_roi, duration_days, earned, last_payout_at)
  VALUES (me.id, pl.id, pl.name, _amount, pl.daily_roi, pl.duration_days, first_income, now())
  RETURNING id INTO inv_id;

  INSERT INTO public.transactions (user_id, type, amount, method, status)
  VALUES (me.id, 'investment', _amount, pl.name || ' Plan', 'completed');

  INSERT INTO public.transactions (user_id, type, amount, method, status)
  VALUES (me.id, 'payout', first_income, pl.name || ' — day 1 income', 'completed');

  INSERT INTO public.notifications (user_id, title, body, kind)
  VALUES (me.id, 'First income credited',
          'Your day 1 income of $' || first_income || ' was added to your withdrawable balance.', 'success');

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

CREATE OR REPLACE FUNCTION public.claim_earnings()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.investments%ROWTYPE;
  cycles int;
  daily numeric;
  payout numeric;
  total numeric := 0;
  max_cycles int;
  paid_cycles int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  FOR inv IN
    SELECT * FROM public.investments WHERE user_id = auth.uid() FOR UPDATE
  LOOP
    daily := round(inv.amount * inv.daily_roi / 100.0, 2);
    IF daily <= 0 THEN CONTINUE; END IF;

    paid_cycles := floor(inv.earned / daily);
    max_cycles := inv.duration_days - paid_cycles;
    IF max_cycles <= 0 THEN CONTINUE; END IF;

    cycles := floor(extract(epoch FROM (now() - inv.last_payout_at)) / 86400)::int;
    IF cycles <= 0 THEN CONTINUE; END IF;
    cycles := least(cycles, max_cycles);

    payout := daily * cycles;
    total := total + payout;

    UPDATE public.investments
      SET earned = earned + payout,
          last_payout_at = inv.last_payout_at + (cycles || ' days')::interval
      WHERE id = inv.id;

    INSERT INTO public.transactions (user_id, type, amount, method, status)
    VALUES (auth.uid(), 'payout', payout, inv.plan_name || ' — daily income', 'completed');
  END LOOP;

  IF total > 0 THEN
    UPDATE public.profiles
      SET balance = balance + total, earnings = earnings + total
      WHERE id = auth.uid();

    INSERT INTO public.notifications (user_id, title, body, kind)
    VALUES (auth.uid(), 'Daily income credited',
            '$' || total || ' of investment income was added to your withdrawable balance.', 'success');
  END IF;

  RETURN total;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_earnings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_earnings() TO authenticated;