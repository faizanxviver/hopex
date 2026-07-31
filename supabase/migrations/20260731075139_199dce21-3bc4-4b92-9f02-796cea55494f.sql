DROP POLICY IF EXISTS "promo_use" ON public.promo_codes;
REVOKE UPDATE, INSERT, DELETE ON public.promo_codes FROM authenticated;

CREATE OR REPLACE FUNCTION public.redeem_promo(_code text)
RETURNS TABLE (bonus numeric, code text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    CASE WHEN p.type = 'percent' THEN p.value ELSE p.value END,
    p.code;
END;
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_network_codes() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.redeem_promo(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_network_codes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_promo(text) TO authenticated;