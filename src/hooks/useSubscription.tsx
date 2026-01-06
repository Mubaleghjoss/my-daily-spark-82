import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type SubscriptionType = 'none' | 'monthly' | 'yearly' | 'lifetime';

interface Subscription {
  id: string;
  user_id: string;
  subscription_type: SubscriptionType;
  started_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    async function fetchSubscription() {
      if (!user) {
        setSubscription(null);
        setIsPremium(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching subscription:', error);
          setSubscription(null);
          setIsPremium(false);
        } else if (data) {
          const sub = data as Subscription;
          setSubscription(sub);
          
          // Check if premium
          const isActive = sub.is_active;
          const notExpired = !sub.expires_at || new Date(sub.expires_at) > new Date();
          setIsPremium(isActive && notExpired);
        }
      } catch (err) {
        console.error('Error:', err);
        setSubscription(null);
        setIsPremium(false);
      } finally {
        setLoading(false);
      }
    }

    fetchSubscription();
  }, [user]);

  // Calculate days remaining
  const daysRemaining = (() => {
    if (!subscription?.expires_at) return null;
    const now = new Date();
    const expiresAt = new Date(subscription.expires_at);
    const diff = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  })();

  // Get subscription label
  const subscriptionLabel = (() => {
    if (!subscription || subscription.subscription_type === 'none') return 'Gratis';
    switch (subscription.subscription_type) {
      case 'monthly': return 'Bulanan';
      case 'yearly': return 'Tahunan';
      case 'lifetime': return 'Selamanya';
      default: return 'Gratis';
    }
  })();

  return { 
    subscription, 
    isPremium, 
    loading, 
    daysRemaining,
    subscriptionLabel
  };
}
