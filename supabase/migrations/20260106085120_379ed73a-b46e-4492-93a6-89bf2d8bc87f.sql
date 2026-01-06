-- Buat enum untuk tipe langganan
CREATE TYPE public.subscription_type AS ENUM ('none', 'monthly', 'yearly', 'lifetime');

-- Buat tabel user_subscriptions
CREATE TABLE public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    subscription_type public.subscription_type NOT NULL DEFAULT 'none',
    started_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
ON public.user_subscriptions FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert subscriptions"
ON public.user_subscriptions FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update subscriptions"
ON public.user_subscriptions FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete subscriptions"
ON public.user_subscriptions FOR DELETE
USING (public.is_admin(auth.uid()));

-- Function untuk cek apakah user premium
CREATE OR REPLACE FUNCTION public.is_premium(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_subscriptions
    WHERE user_id = _user_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Trigger untuk auto-create subscription record saat user baru dibuat
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, subscription_type, is_active)
  VALUES (NEW.id, 'none', false);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- Trigger untuk update updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Buat subscription record untuk user yang sudah ada
INSERT INTO public.user_subscriptions (user_id, subscription_type, is_active)
SELECT id, 'none', false FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_subscriptions);