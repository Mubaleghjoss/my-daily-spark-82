import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'user';

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRole(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching role:', error);
          setRole('user');
          setIsAdmin(false);
        } else {
          const userRole = data?.role as AppRole;
          setRole(userRole);
          setIsAdmin(userRole === 'admin');
        }
      } catch (err) {
        console.error('Error:', err);
        setRole('user');
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [user]);

  return { role, isAdmin, loading };
}
