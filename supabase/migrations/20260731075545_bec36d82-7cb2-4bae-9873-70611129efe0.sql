REVOKE EXECUTE ON FUNCTION public.redeem_promo(text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_promo(text, numeric) TO authenticated;

DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.redeem_promo(text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_network_codes() TO authenticated;