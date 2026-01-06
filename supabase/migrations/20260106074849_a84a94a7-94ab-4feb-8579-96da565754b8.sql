-- Add is_favorite column to prayers_advices
ALTER TABLE public.prayers_advices 
ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT false;

-- Add category column to prayers_advices
ALTER TABLE public.prayers_advices 
ADD COLUMN category TEXT;

-- Create categories table for prayers/advices
CREATE TABLE public.prayer_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prayer_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage their own prayer categories"
  ON public.prayer_categories
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);