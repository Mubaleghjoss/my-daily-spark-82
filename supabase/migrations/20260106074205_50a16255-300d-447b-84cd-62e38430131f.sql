-- Create prayers_advices table for storing prayers and advices
CREATE TABLE public.prayers_advices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('doa', 'nasehat')),
  title TEXT NOT NULL,
  content_arabic TEXT,
  content_indonesian TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prayers_advices ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage their own prayers and advices"
  ON public.prayers_advices
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_prayers_advices_updated_at
  BEFORE UPDATE ON public.prayers_advices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();