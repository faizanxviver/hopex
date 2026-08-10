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
  team_invested numeric;
  last_claim timestamptz;
  amount numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO me FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF me.blocked THEN RAISE EXCEPTION 'Account suspended'; END IF;

  SELECT COALESCE(SUM(invested), 0) INTO team_invested
    FROM public.profiles WHERE referred_by = me.referral_code;

  SELECT s.salary_tiers INTO tiers FROM public.settings s WHERE s.id = 1;

  FOR tier IN SELECT * FROM jsonb_array_elements(COALESCE(tiers, '[]'::jsonb)) LOOP
    IF team_invested >= (tier->>'invested')::numeric THEN
      IF best IS NULL OR (tier->>'salary')::numeric > (best->>'salary')::numeric THEN
        best := tier;
      END IF;
    END IF;
  END LOOP;

  IF best IS NULL THEN RAISE EXCEPTION 'You have not reached a salary rank yet'; END IF;

  SELECT max(created_at) INTO last_claim FROM public.transactions
    WHERE user_id = me.id AND type = 'bonus' AND method LIKE 'Salary%';
  IF last_claim IS NOT NULL AND last_claim > now() - interval '7 days' THEN
    RAISE EXCEPTION 'Salary already claimed this week';
  END IF;

  amount := (best->>'salary')::numeric;

  UPDATE public.profiles SET balance = balance + amount, earnings = earnings + amount, updated_at = now()
    WHERE id = me.id;

  INSERT INTO public.transactions (user_id, type, amount, method, status, note)
  VALUES (me.id, 'bonus', amount, 'Salary ' || COALESCE(best->>'rank', ''), 'approved', 'Weekly rank salary');

  RETURN amount;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_salary() TO authenticated;