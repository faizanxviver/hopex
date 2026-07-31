DROP FUNCTION IF EXISTS public.redeem_promo(text);

CREATE OR REPLACE FUNCTION public.redeem_promo(_code text, _amount numeric DEFAULT 0)
RETURNS TABLE(bonus numeric, code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  p public.promo_codes%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO p FROM public.promo_codes
    WHERE lower(promo_codes.code) = lower(trim(_code))
      AND active AND used < usage_limit
      AND (expires_at IS NULL OR expires_at >= current_date)
    FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  UPDATE public.promo_codes SET used = used + 1 WHERE id = p.id;
  RETURN QUERY SELECT
    CASE WHEN p.type = 'percent' THEN round(COALESCE(_amount,0) * p.value / 100.0, 2) ELSE p.value END,
    p.code;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.redeem_promo(text, numeric) TO authenticated;