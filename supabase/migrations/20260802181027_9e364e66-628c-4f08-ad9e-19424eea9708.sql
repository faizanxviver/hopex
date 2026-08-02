CREATE OR REPLACE FUNCTION public.leaderboard()
 RETURNS TABLE(display_name text, earnings numeric, invested numeric, referral_earnings numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    p.name,
    round(p.earnings, 2),
    round(p.invested, 2),
    round(p.referral_earnings, 2)
  FROM public.profiles p
  WHERE NOT p.blocked AND (p.earnings > 0 OR p.referral_earnings > 0 OR p.invested > 0)
  ORDER BY p.referral_earnings DESC, p.earnings DESC
  LIMIT 25;
$function$;