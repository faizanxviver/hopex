
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS proof_reward_amount numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS show_proofs_section boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.withdrawal_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id uuid,
  image_url text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  admin_note text NOT NULL DEFAULT '',
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.withdrawal_proofs TO authenticated;
GRANT SELECT ON public.withdrawal_proofs TO anon;
GRANT ALL ON public.withdrawal_proofs TO service_role;

ALTER TABLE public.withdrawal_proofs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wp_own ON public.withdrawal_proofs;
CREATE POLICY wp_own ON public.withdrawal_proofs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS wp_admin ON public.withdrawal_proofs;
CREATE POLICY wp_admin ON public.withdrawal_proofs FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS wp_public_approved ON public.withdrawal_proofs;
CREATE POLICY wp_public_approved ON public.withdrawal_proofs FOR SELECT TO anon, authenticated
  USING (status = 'approved');

DROP TRIGGER IF EXISTS withdrawal_proofs_touch ON public.withdrawal_proofs;
CREATE TRIGGER withdrawal_proofs_touch BEFORE UPDATE ON public.withdrawal_proofs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.review_withdrawal_proof(_id uuid, _approve boolean, _note text DEFAULT '')
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  p public.withdrawal_proofs%ROWTYPE;
  pay numeric := 0;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO p FROM public.withdrawal_proofs WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proof not found'; END IF;
  IF p.status <> 'pending' THEN RAISE EXCEPTION 'Proof already reviewed'; END IF;

  IF _approve THEN
    SELECT COALESCE(proof_reward_amount, 0) INTO pay FROM public.settings WHERE id = 1;
    UPDATE public.withdrawal_proofs
      SET status = 'approved', amount = pay, reviewed_at = now(), admin_note = COALESCE(_note, '')
      WHERE id = p.id;
    UPDATE public.profiles SET balance = balance + pay, earnings = earnings + pay WHERE id = p.user_id;
    INSERT INTO public.transactions (user_id, type, amount, method, status)
    VALUES (p.user_id, 'bonus', pay, 'Withdrawal proof reward', 'completed');
    INSERT INTO public.notifications (user_id, title, body, kind, popup)
    VALUES (p.user_id, 'Proof approved 🎉', 'Rs ' || pay || ' proof reward was added to your balance.', 'success', true);
  ELSE
    UPDATE public.withdrawal_proofs
      SET status = 'rejected', reviewed_at = now(), admin_note = COALESCE(_note, '')
      WHERE id = p.id;
    INSERT INTO public.notifications (user_id, title, body, kind, popup)
    VALUES (p.user_id, 'Proof rejected', COALESCE(NULLIF(_note, ''), 'Your payout screenshot was not accepted.'), 'error', true);
  END IF;

  RETURN pay;
END;
$function$;
