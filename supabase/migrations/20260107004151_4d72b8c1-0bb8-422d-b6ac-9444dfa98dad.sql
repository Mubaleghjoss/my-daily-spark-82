-- Create promo_codes table
CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  subscription_type public.subscription_type NOT NULL DEFAULT 'monthly',
  duration_hours INTEGER NOT NULL DEFAULT 24,
  duration_days INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create promo_code_redemptions table to track usage
CREATE TABLE public.promo_code_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(promo_code_id, user_id)
);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for promo_codes
-- Admin can see all promo codes
CREATE POLICY "Admins can manage promo codes"
ON public.promo_codes
FOR ALL
USING (public.is_admin(auth.uid()));

-- All authenticated users can view active promo codes (for validation)
CREATE POLICY "Users can view active promo codes"
ON public.promo_codes
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

-- RLS policies for promo_code_redemptions
CREATE POLICY "Users can view their own redemptions"
ON public.promo_code_redemptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own redemptions"
ON public.promo_code_redemptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all redemptions"
ON public.promo_code_redemptions
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_promo_codes_updated_at
BEFORE UPDATE ON public.promo_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();