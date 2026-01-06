import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserRole } from './useUserRole';
import { useToast } from './use-toast';

interface ExportData {
  activities: any[];
  activity_completions: any[];
  categories: any[];
  notes: any[];
  transactions: any[];
  transaction_categories: any[];
  budgets: any[];
  recurring_transactions: any[];
  pomodoro_sessions: any[];
  prayers_advices: any[];
  prayer_categories: any[];
  profiles: any[];
  reminders: any[];
}

export function useDataExport() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  async function exportUserData(userId?: string) {
    if (!user) return null;

    const targetUserId = userId || user.id;
    
    // If trying to export other user's data, must be admin
    if (targetUserId !== user.id && !isAdmin) {
      toast({
        title: 'Akses Ditolak',
        description: 'Hanya admin yang dapat mengexport data user lain',
        variant: 'destructive'
      });
      return null;
    }

    setExporting(true);

    try {
      const [
        activities,
        activity_completions,
        categories,
        notes,
        transactions,
        transaction_categories,
        budgets,
        recurring_transactions,
        pomodoro_sessions,
        prayers_advices,
        prayer_categories,
        profiles,
        reminders
      ] = await Promise.all([
        supabase.from('activities').select('*').eq('user_id', targetUserId),
        supabase.from('activity_completions').select('*').eq('user_id', targetUserId),
        supabase.from('categories').select('*').eq('user_id', targetUserId),
        supabase.from('notes').select('*').eq('user_id', targetUserId),
        supabase.from('transactions').select('*').eq('user_id', targetUserId),
        supabase.from('transaction_categories').select('*').eq('user_id', targetUserId),
        supabase.from('budgets').select('*').eq('user_id', targetUserId),
        supabase.from('recurring_transactions').select('*').eq('user_id', targetUserId),
        supabase.from('pomodoro_sessions').select('*').eq('user_id', targetUserId),
        supabase.from('prayers_advices').select('*').eq('user_id', targetUserId),
        supabase.from('prayer_categories').select('*').eq('user_id', targetUserId),
        supabase.from('profiles').select('*').eq('user_id', targetUserId),
        supabase.from('reminders').select('*').eq('user_id', targetUserId),
      ]);

      const exportData: ExportData = {
        activities: activities.data || [],
        activity_completions: activity_completions.data || [],
        categories: categories.data || [],
        notes: notes.data || [],
        transactions: transactions.data || [],
        transaction_categories: transaction_categories.data || [],
        budgets: budgets.data || [],
        recurring_transactions: recurring_transactions.data || [],
        pomodoro_sessions: pomodoro_sessions.data || [],
        prayers_advices: prayers_advices.data || [],
        prayer_categories: prayer_categories.data || [],
        profiles: profiles.data || [],
        reminders: reminders.data || [],
      };

      return exportData;
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengexport data',
        variant: 'destructive'
      });
      return null;
    } finally {
      setExporting(false);
    }
  }

  async function exportAllUsersData() {
    if (!isAdmin) {
      toast({
        title: 'Akses Ditolak',
        description: 'Hanya admin yang dapat mengexport semua data',
        variant: 'destructive'
      });
      return null;
    }

    setExporting(true);

    try {
      // Get all users from profiles
      const { data: allProfiles } = await supabase.from('profiles').select('user_id');
      
      if (!allProfiles || allProfiles.length === 0) {
        toast({
          title: 'Tidak ada data',
          description: 'Tidak ada user yang ditemukan',
          variant: 'destructive'
        });
        return null;
      }

      const allData: { [userId: string]: ExportData } = {};

      for (const profile of allProfiles) {
        const [
          activities,
          activity_completions,
          categories,
          notes,
          transactions,
          transaction_categories,
          budgets,
          recurring_transactions,
          pomodoro_sessions,
          prayers_advices,
          prayer_categories,
          profiles,
          reminders
        ] = await Promise.all([
          supabase.from('activities').select('*').eq('user_id', profile.user_id),
          supabase.from('activity_completions').select('*').eq('user_id', profile.user_id),
          supabase.from('categories').select('*').eq('user_id', profile.user_id),
          supabase.from('notes').select('*').eq('user_id', profile.user_id),
          supabase.from('transactions').select('*').eq('user_id', profile.user_id),
          supabase.from('transaction_categories').select('*').eq('user_id', profile.user_id),
          supabase.from('budgets').select('*').eq('user_id', profile.user_id),
          supabase.from('recurring_transactions').select('*').eq('user_id', profile.user_id),
          supabase.from('pomodoro_sessions').select('*').eq('user_id', profile.user_id),
          supabase.from('prayers_advices').select('*').eq('user_id', profile.user_id),
          supabase.from('prayer_categories').select('*').eq('user_id', profile.user_id),
          supabase.from('profiles').select('*').eq('user_id', profile.user_id),
          supabase.from('reminders').select('*').eq('user_id', profile.user_id),
        ]);

        allData[profile.user_id] = {
          activities: activities.data || [],
          activity_completions: activity_completions.data || [],
          categories: categories.data || [],
          notes: notes.data || [],
          transactions: transactions.data || [],
          transaction_categories: transaction_categories.data || [],
          budgets: budgets.data || [],
          recurring_transactions: recurring_transactions.data || [],
          pomodoro_sessions: pomodoro_sessions.data || [],
          prayers_advices: prayers_advices.data || [],
          prayer_categories: prayer_categories.data || [],
          profiles: profiles.data || [],
          reminders: reminders.data || [],
        };
      }

      return allData;
    } catch (error) {
      console.error('Export all error:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengexport semua data',
        variant: 'destructive'
      });
      return null;
    } finally {
      setExporting(false);
    }
  }

  function downloadAsJson(data: any, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Berhasil!',
      description: `File ${filename} berhasil didownload`,
    });
  }

  return {
    exportUserData,
    exportAllUsersData,
    downloadAsJson,
    exporting
  };
}
