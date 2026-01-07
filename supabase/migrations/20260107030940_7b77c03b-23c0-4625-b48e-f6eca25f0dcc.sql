-- Sync promo_codes.current_uses with actual redemption rows (fix inconsistent counters)
UPDATE public.promo_codes pc
SET current_uses = COALESCE(
  (
    SELECT COUNT(*)::int
    FROM public.promo_code_redemptions pcr
    WHERE pcr.promo_code_id = pc.id
  ),
  0
);

-- Ensure user_subscriptions has a unique index on user_id (required for upsert)
CREATE UNIQUE INDEX IF NOT EXISTS user_subscriptions_user_id_key
ON public.user_subscriptions (user_id);

-- Redeem promo code atomically and safely (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.redeem_promo_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_promo public.promo_codes%ROWTYPE;
  v_current_sub public.user_subscriptions%ROWTYPE;
  v_has_sub boolean := false;
  v_uses_count int := 0;
  v_base timestamptz;
  v_new_expires timestamptz;
  v_result_expires timestamptz;
  v_current_type public.subscription_type := 'none';
  v_promo_type public.subscription_type;
  v_new_type public.subscription_type;
  v_current_rank int;
  v_promo_rank int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- Lock promo row to prevent race conditions on usage checks
  SELECT *
  INTO v_promo
  FROM public.promo_codes
  WHERE upper(code) = upper(trim(p_code))
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROMO_NOT_FOUND';
  END IF;

  IF v_promo.is_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'PROMO_INACTIVE';
  END IF;

  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at <= now() THEN
    RAISE EXCEPTION 'PROMO_EXPIRED';
  END IF;

  -- Use real redemption rows as the source of truth (current_uses may be stale)
  SELECT COUNT(*)::int
  INTO v_uses_count
  FROM public.promo_code_redemptions
  WHERE promo_code_id = v_promo.id;

  IF v_promo.max_uses IS NOT NULL AND v_uses_count >= v_promo.max_uses THEN
    RAISE EXCEPTION 'PROMO_MAX_USES';
  END IF;

  -- Load current subscription (if any)
  SELECT *
  INTO v_current_sub
  FROM public.user_subscriptions
  WHERE user_id = v_user_id
  LIMIT 1;

  v_has_sub := FOUND;

  IF v_has_sub THEN
    v_current_type := COALESCE(v_current_sub.subscription_type, 'none');
  END IF;

  v_promo_type := v_promo.subscription_type;

  -- If already lifetime, keep lifetime forever but still record redemption
  IF v_has_sub AND v_current_sub.is_active = true AND v_current_type = 'lifetime' THEN
    v_new_type := 'lifetime';
    v_new_expires := NULL;
  ELSIF v_promo_type = 'lifetime' THEN
    v_new_type := 'lifetime';
    v_new_expires := NULL;
  ELSE
    -- Base time: extend from current expiry if still valid; otherwise from now
    IF v_has_sub AND v_current_sub.is_active = true AND v_current_sub.expires_at IS NOT NULL AND v_current_sub.expires_at > now() THEN
      v_base := v_current_sub.expires_at;
    ELSE
      v_base := now();
    END IF;

    v_new_expires := v_base + make_interval(days => COALESCE(v_promo.duration_days, 0), hours => COALESCE(v_promo.duration_hours, 0));

    -- Pick best subscription type (keep higher tier)
    v_current_rank := CASE v_current_type
      WHEN 'none' THEN 0
      WHEN 'monthly' THEN 1
      WHEN 'yearly' THEN 2
      WHEN 'lifetime' THEN 3
      ELSE 0
    END;

    v_promo_rank := CASE v_promo_type
      WHEN 'none' THEN 0
      WHEN 'monthly' THEN 1
      WHEN 'yearly' THEN 2
      WHEN 'lifetime' THEN 3
      ELSE 0
    END;

    v_new_type := CASE
      WHEN v_promo_rank >= v_current_rank THEN v_promo_type
      ELSE v_current_type
    END;
  END IF;

  -- Upsert subscription
  INSERT INTO public.user_subscriptions (user_id, subscription_type, is_active, started_at, expires_at, updated_at)
  VALUES (
    v_user_id,
    v_new_type,
    true,
    COALESCE((SELECT started_at FROM public.user_subscriptions WHERE user_id = v_user_id), now()),
    v_new_expires,
    now()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    subscription_type = EXCLUDED.subscription_type,
    is_active = true,
    expires_at = EXCLUDED.expires_at,
    updated_at = now();

  -- For redemption history, expires_at is NOT NULL in table; store far future for lifetime
  v_result_expires := COALESCE(v_new_expires, now() + interval '100 years');

  INSERT INTO public.promo_code_redemptions (promo_code_id, user_id, expires_at)
  VALUES (v_promo.id, v_user_id, v_result_expires);

  -- Update promo usage count (use real count)
  UPDATE public.promo_codes
  SET current_uses = v_uses_count + 1,
      updated_at = now()
  WHERE id = v_promo.id;

  RETURN jsonb_build_object(
    'code', v_promo.code,
    'subscription_type', v_new_type,
    'expires_at', v_new_expires,
    'duration_days', v_promo.duration_days,
    'duration_hours', v_promo.duration_hours
  );
END;
$$;

-- Allow authenticated users to redeem promos
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(text) TO authenticated;
