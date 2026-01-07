-- Add unique constraint on user_id for user_subscriptions to support upsert
-- First check if constraint exists, if not add it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_subscriptions_user_id_key'
  ) THEN
    ALTER TABLE public.user_subscriptions 
    ADD CONSTRAINT user_subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;