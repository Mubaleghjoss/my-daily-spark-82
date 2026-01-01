-- Create activity_completions table to track completion history
CREATE TABLE public.activity_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_completions ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Users can manage their own completions"
ON public.activity_completions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);