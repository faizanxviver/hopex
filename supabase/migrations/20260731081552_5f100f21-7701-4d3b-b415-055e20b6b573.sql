UPDATE public.settings SET site_name = 'HopeX', updated_at = now() WHERE id = 1;

UPDATE public.notifications SET title = replace(title, 'Aurum Capital', 'HopeX') WHERE title LIKE '%Aurum Capital%';
UPDATE public.notifications SET body = replace(body, 'Aurum Capital', 'HopeX') WHERE body LIKE '%Aurum Capital%';
UPDATE public.chat_messages SET text = replace(text, 'Aurum Capital', 'HopeX') WHERE text LIKE '%Aurum Capital%';

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
    100
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN lower(NEW.email) IN ('admin@hopex.io', 'admin@aurum.io') THEN 'admin'::public.app_role ELSE 'user'::public.app_role END);

  INSERT INTO public.transactions (user_id, type, amount, method, status)
  VALUES (NEW.id, 'bonus', 100, 'Welcome bonus', 'completed');

  INSERT INTO public.notifications (user_id, title, body, kind, popup)
  VALUES (NEW.id, 'Welcome to HopeX 🎉', 'Your $100 welcome bonus is ready. Pick a plan to start earning daily.', 'success', true);

  INSERT INTO public.chat_messages (user_id, sender, text)
  VALUES (NEW.id, 'support', 'Hi 👋 Welcome to HopeX support. How can we help today?');

  RETURN NEW;
END;
$$;