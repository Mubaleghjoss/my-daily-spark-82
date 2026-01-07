import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  Plus,
  Target,
  TrendingUp,
  TrendingDown,
  Wallet,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { startOfMonth, endOfMonth, format } from 'date-fns';

interface DashboardStats {
  totalActivities: number;
  totalSubActivities: number;
  completedActivities: number;
  pomodoroSessions: number;
}

interface FinanceStats {
  income: number;
  expense: number;
  balance: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalActivities: 0,
    totalSubActivities: 0,
    completedActivities: 0,
    pomodoroSessions: 0,
  });
  const [financeStats, setFinanceStats] = useState<FinanceStats>({
    income: 0,
    expense: 0,
    balance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      const [activitiesRes, subActivitiesRes, completedRes, pomodoroRes, transactionsRes] = await Promise.all([
        supabase.from('activities').select('id', { count: 'exact' }).eq('user_id', user.id).is('parent_id', null),
        supabase.from('activities').select('id', { count: 'exact' }).eq('user_id', user.id).not('parent_id', 'is', null),
        supabase.from('activities').select('id', { count: 'exact' }).eq('user_id', user.id).eq('status', 'done'),
        supabase.from('pomodoro_sessions').select('id', { count: 'exact' }).eq('user_id', user.id).gte('completed_at', today),
        supabase.from('transactions').select('type, amount').eq('user_id', user.id).gte('transaction_date', monthStart).lte('transaction_date', monthEnd),
      ]);

      setStats({
        totalActivities: activitiesRes.count || 0,
        totalSubActivities: subActivitiesRes.count || 0,
        completedActivities: completedRes.count || 0,
        pomodoroSessions: pomodoroRes.count || 0,
      });

      // Calculate finance stats
      const transactions = transactionsRes.data || [];
      const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
      setFinanceStats({
        income,
        expense,
        balance: income - expense,
      });

      setLoading(false);
    }

    fetchStats();
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 18) return 'Selamat Siang';
    return 'Selamat Malam';
  };

  const userName = user?.user_metadata?.full_name?.split(' ')[0] || 'Kamu';

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {greeting()}, <span className="gradient-text">{userName}</span>! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Siap untuk hari yang produktif?
            </p>
          </div>
          <Button asChild className="gradient-primary glow-primary">
            <Link to="/activities">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Aktivitas
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="glass border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Aktivitas
              </CardTitle>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalActivities}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Aktivitas terdaftar
              </p>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sub Kegiatan
              </CardTitle>
              <Circle className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">{stats.totalSubActivities}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total sub aktivitas
              </p>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sudah Selesai
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-neon-green" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-neon-green">{stats.completedActivities}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Aktivitas selesai
              </p>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sesi Fokus
              </CardTitle>
              <Flame className="h-4 w-4 text-neon-pink" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-neon-pink">{stats.pomodoroSessions}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Sesi hari ini
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Finance Summary */}
        <Card className="glass border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                Ringkasan Keuangan Bulan Ini
              </span>
              <Button asChild variant="ghost" size="sm">
                <Link to="/finance">Lihat Detail →</Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 mx-auto text-green-500 mb-1" />
                <p className="text-xs text-muted-foreground">Pemasukan</p>
                <p className="text-lg font-bold text-green-500">{formatCurrency(financeStats.income)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-500/10">
                <TrendingDown className="h-5 w-5 mx-auto text-red-500 mb-1" />
                <p className="text-xs text-muted-foreground">Pengeluaran</p>
                <p className="text-lg font-bold text-red-500">{formatCurrency(financeStats.expense)}</p>
              </div>
              <div className={`text-center p-3 rounded-lg ${financeStats.balance >= 0 ? 'bg-blue-500/10' : 'bg-red-500/10'}`}>
                <Wallet className={`h-5 w-5 mx-auto mb-1 ${financeStats.balance >= 0 ? 'text-blue-500' : 'text-red-500'}`} />
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className={`text-lg font-bold ${financeStats.balance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>{formatCurrency(financeStats.balance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="glass border-border/50 hover:border-primary/50 transition-colors cursor-pointer group">
            <Link to="/pomodoro">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-3 rounded-xl bg-neon-pink/20 group-hover:glow-accent transition-all">
                  <Zap className="w-6 h-6 text-neon-pink" />
                </div>
                <div>
                  <h3 className="font-semibold">Mulai Focus Timer</h3>
                  <p className="text-sm text-muted-foreground">Fokus 25 menit</p>
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="glass border-border/50 hover:border-primary/50 transition-colors cursor-pointer group">
            <Link to="/activities">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-3 rounded-xl bg-primary/20 group-hover:glow-primary transition-all">
                  <Circle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Lihat Aktivitas</h3>
                  <p className="text-sm text-muted-foreground">Kelola tugas harian</p>
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="glass border-border/50 hover:border-primary/50 transition-colors cursor-pointer group">
            <Link to="/analytics">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-3 rounded-xl bg-accent/20 group-hover:glow-accent transition-all">
                  <TrendingUp className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold">Lihat Progress</h3>
                  <p className="text-sm text-muted-foreground">Statistik & analytics</p>
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Progress Keseluruhan */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Progress Keseluruhan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {stats.completedActivities} dari {stats.totalActivities + stats.totalSubActivities} aktivitas selesai
                </span>
                <span className="font-medium">
                  {(stats.totalActivities + stats.totalSubActivities) > 0 
                    ? Math.round((stats.completedActivities / (stats.totalActivities + stats.totalSubActivities)) * 100) 
                    : 0}%
                </span>
              </div>
              <Progress 
                value={(stats.totalActivities + stats.totalSubActivities) > 0 
                  ? (stats.completedActivities / (stats.totalActivities + stats.totalSubActivities)) * 100 
                  : 0
                } 
                className="h-3"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}