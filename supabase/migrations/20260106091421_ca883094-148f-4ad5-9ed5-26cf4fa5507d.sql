-- Add RLS policy for public read access to prayers_advices (premium feature)
-- This allows premium users to read all prayers/advices from all users

CREATE POLICY "Premium users can view all public prayers and advices"
ON public.prayers_advices
FOR SELECT
USING (
  public.is_premium(auth.uid()) = true
);