-- ===== settings =====
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS reward_amount numeric NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS reward_cooldown_hours integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS reward_active boolean NOT NULL DEFAULT true;

-- ===== reward claims =====
CREATE TABLE IF NOT EXISTS public.reward_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  whatsapp_proof text,
  facebook_proof text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text NOT NULL DEFAULT '',
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reward_claims TO authenticated;
GRANT ALL ON public.reward_claims TO service_role;

ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY reward_claims_own ON public.reward_claims FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY reward_claims_admin ON public.reward_claims FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER reward_claims_touch BEFORE UPDATE ON public.reward_claims
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS reward_claims_user_idx ON public.reward_claims(user_id, created_at DESC);

-- ===== leader plans =====
CREATE TABLE IF NOT EXISTS public.leader_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_id uuid,
  plan_id text NOT NULL,
  plan_name text NOT NULL,
  amount numeric NOT NULL,
  check_hours integer NOT NULL DEFAULT 24,
  required_investment numeric NOT NULL DEFAULT 0,
  deadline_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leader_plans TO authenticated;
GRANT ALL ON public.leader_plans TO service_role;

ALTER TABLE public.leader_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY leader_plans_own ON public.leader_plans FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY leader_plans_admin ON public.leader_plans FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER leader_plans_touch BEFORE UPDATE ON public.leader_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== submit reward task =====
CREATE OR REPLACE FUNCTION public.submit_reward_claim(_whatsapp text, _facebook text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  s public.settings%ROWTYPE;
  last_ok timestamptz;
  pending_id uuid;
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO s FROM public.settings WHERE id = 1;
  IF NOT COALESCE(s.reward_active, true) THEN RAISE EXCEPTION 'Reward task is currently closed'; END IF;
  IF _whatsapp IS NULL OR _facebook IS NULL OR _whatsapp = '' OR _facebook = '' THEN
    RAISE EXCEPTION 'Both screenshots are required';
  END IF;

  SELECT id INTO pending_id FROM public.reward_claims
    WHERE user_id = auth.uid() AND status = 'pending' LIMIT 1;
  IF pending_id IS NOT NULL THEN RAISE EXCEPTION 'Your previous task is still under review'; END IF;

  SELECT max(reviewed_at) INTO last_ok FROM public.reward_claims
    WHERE user_id = auth.uid() AND status = 'approved';
  IF last_ok IS NOT NULL AND last_ok > now() - make_interval(hours => COALESCE(s.reward_cooldown_hours, 24)) THEN
    RAISE EXCEPTION 'You can do this task again after the cooldown ends';
  END IF;

  INSERT INTO public.reward_claims (user_id, amount, whatsapp_proof, facebook_proof)
  VALUES (auth.uid(), COALESCE(s.reward_amount, 0), _whatsapp, _facebook)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- ===== admin review reward task =====
CREATE OR REPLACE FUNCTION public.review_reward_claim(_id uuid, _approve boolean, _note text DEFAULT '')
RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  c public.reward_claims%ROWTYPE;
  pay numeric := 0;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO c FROM public.reward_claims WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Task not found'; END IF;
  IF c.status <> 'pending' THEN RAISE EXCEPTION 'Task already reviewed'; END IF;

  IF _approve THEN
    SELECT COALESCE(reward_amount, 0) INTO pay FROM public.settings WHERE id = 1;
    UPDATE public.reward_claims
      SET status = 'approved', amount = pay, reviewed_at = now(), admin_note = COALESCE(_note, '')
      WHERE id = c.id;
    UPDATE public.profiles
      SET balance = balance + pay, earnings = earnings + pay
      WHERE id = c.user_id;
    INSERT INTO public.transactions (user_id, type, amount, method, status)
    VALUES (c.user_id, 'bonus', pay, 'Free Reward Task', 'completed');
    INSERT INTO public.notifications (user_id, title, body, kind, popup)
    VALUES (c.user_id, 'Reward approved 🎉',
      'Rs ' || pay || ' reward has been added to your withdrawable balance.', 'success', true);
  ELSE
    UPDATE public.reward_claims
      SET status = 'rejected', reviewed_at = now(), admin_note = COALESCE(_note, '')
      WHERE id = c.id;
    INSERT INTO public.notifications (user_id, title, body, kind, popup)
    VALUES (c.user_id, 'Reward task rejected',
      COALESCE(NULLIF(_note, ''), 'Your proof was not accepted. You can submit the task again.'), 'error', true);
  END IF;

  RETURN pay;
END;
$$;

-- ===== admin balance adjust =====
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(_user_id uuid, _amount numeric, _kind text, _note text DEFAULT '')
RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  p public.profiles%ROWTYPE;
  delta numeric;
  tx public.tx_type;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than zero'; END IF;
  SELECT * INTO p FROM public.profiles WHERE id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;

  IF _kind = 'deposit' THEN
    delta := _amount; tx := 'deposit';
  ELSIF _kind = 'withdraw' THEN
    IF p.balance < _amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
    delta := -_amount; tx := 'withdraw';
  ELSE
    RAISE EXCEPTION 'Invalid adjustment type';
  END IF;

  UPDATE public.profiles SET balance = balance + delta WHERE id = _user_id;

  INSERT INTO public.transactions (user_id, type, amount, method, status, note)
  VALUES (_user_id, tx, _amount, 'Admin adjustment', 'completed', COALESCE(_note, ''));

  INSERT INTO public.notifications (user_id, title, body, kind, popup)
  VALUES (_user_id,
    CASE WHEN delta > 0 THEN 'Balance credited' ELSE 'Balance deducted' END,
    'Rs ' || _amount || CASE WHEN delta > 0 THEN ' was added to' ELSE ' was deducted from' END || ' your account by support.',
    CASE WHEN delta > 0 THEN 'success' ELSE 'info' END, true);

  RETURN p.balance + delta;
END;
$$;

-- ===== admin activate leader plan (no upline commission) =====
CREATE OR REPLACE FUNCTION public.admin_activate_leader_plan(
  _user_id uuid, _plan_id text, _amount numeric, _check_hours integer, _required numeric)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  pl public.plans%ROWTYPE;
  inv_id uuid;
  lp_id uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN RAISE EXCEPTION 'User not found'; END IF;
  SELECT * INTO pl FROM public.plans WHERE id = _plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found'; END IF;

  INSERT INTO public.investments (user_id, plan_id, plan_name, amount, daily_roi, duration_days, earned, last_payout_at)
  VALUES (_user_id, pl.id, pl.name, _amount, pl.daily_roi, pl.duration_days, 0, now())
  RETURNING id INTO inv_id;

  UPDATE public.profiles SET invested = invested + _amount WHERE id = _user_id;

  INSERT INTO public.leader_plans (user_id, investment_id, plan_id, plan_name, amount, check_hours, required_investment, deadline_at, created_by)
  VALUES (_user_id, inv_id, pl.id, pl.name, _amount, _check_hours, COALESCE(_required, 0),
          now() + make_interval(hours => GREATEST(_check_hours, 1)), auth.uid())
  RETURNING id INTO lp_id;

  INSERT INTO public.notifications (user_id, title, body, kind, popup)
  VALUES (_user_id, 'Leader plan activated 🏆',
    pl.name || ' plan has been activated for you. Bring Rs ' || COALESCE(_required, 0) ||
    ' of level-1 team investment within ' || _check_hours || ' hours to keep it.', 'success', true);

  RETURN lp_id;
END;
$$;

-- ===== admin remove leader plan =====
CREATE OR REPLACE FUNCTION public.admin_remove_leader_plan(_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  lp public.leader_plans%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO lp FROM public.leader_plans WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Leader plan not found'; END IF;

  IF lp.investment_id IS NOT NULL THEN
    DELETE FROM public.investments WHERE id = lp.investment_id;
  END IF;
  UPDATE public.profiles SET invested = GREATEST(invested - lp.amount, 0) WHERE id = lp.user_id;
  UPDATE public.leader_plans SET status = 'removed' WHERE id = lp.id;

  INSERT INTO public.notifications (user_id, title, body, kind, popup)
  VALUES (lp.user_id, 'Leader plan removed',
    'Your ' || lp.plan_name || ' leader plan has been removed by support.', 'error', true);
END;
$$;

-- ===== leader plan requirement check =====
CREATE OR REPLACE FUNCTION public.run_leader_plan_checks()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  lp public.leader_plans%ROWTYPE;
  my_code text;
  team_amount numeric;
  removed int := 0;
BEGIN
  FOR lp IN SELECT * FROM public.leader_plans WHERE status = 'active' AND deadline_at <= now() LOOP
    SELECT referral_code INTO my_code FROM public.profiles WHERE id = lp.user_id;

    SELECT COALESCE(sum(i.amount), 0) INTO team_amount
    FROM public.investments i
    JOIN public.profiles p ON p.id = i.user_id
    WHERE p.referred_by = my_code AND i.created_at >= lp.created_at;

    IF team_amount >= lp.required_investment THEN
      UPDATE public.leader_plans SET status = 'passed' WHERE id = lp.id;
      INSERT INTO public.notifications (user_id, title, body, kind, popup)
      VALUES (lp.user_id, 'Leader plan secured ✅',
        'You met the team requirement. Your ' || lp.plan_name || ' plan stays active.', 'success', true);
    ELSE
      IF lp.investment_id IS NOT NULL THEN
        DELETE FROM public.investments WHERE id = lp.investment_id;
      END IF;
      UPDATE public.profiles SET invested = GREATEST(invested - lp.amount, 0) WHERE id = lp.user_id;
      UPDATE public.leader_plans SET status = 'failed' WHERE id = lp.id;
      INSERT INTO public.notifications (user_id, title, body, kind, popup)
      VALUES (lp.user_id, 'Leader plan expired',
        'Your ' || lp.plan_name || ' leader plan was removed because the required Rs ' ||
        lp.required_investment || ' level-1 team investment was not completed in time.', 'error', true);
      removed := removed + 1;
    END IF;
  END LOOP;
  RETURN removed;
END;
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.reward_claims;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leader_plans;