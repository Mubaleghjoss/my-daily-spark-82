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
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalActivities: number;
  completedToday: number;
  inProgress: number;
  pomodoroSessions: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalActivities: 0,
    completedToday: 0,
    inProgress: 0,
    pomodoroSessions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];

      const [activitiesRes, completedRes, progressRes, pomodoroRes] = await Promise.all([
        supabase.from('activities').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('activities').select('id', { count: 'exact' }).eq('user_id', user.id).eq('status', 'done').gte('updated_at', today),
        supabase.from('activities').select('id', { count: 'exact' }).eq('user_id', user.id).eq('status', 'in_progress'),
        supabase.from('pomodoro_sessions').select('id', { count: 'exact' }).eq('user_id', user.id).gte('completed_at', today),
      ]);

      setStats({
        totalActivities: activitiesRes.count || 0,
        completedToday: completedRes.count || 0,
        inProgress: progressRes.count || 0,
        pomodoroSessions: pomodoroRes.count || 0,
      });
      setLoading(false);
    }

    fetchStats();
  }, [user]);

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
                Selesai Hari Ini
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-neon-green" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-neon-green">{stats.completedToday}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Aktivitas diselesaikan
              </p>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sedang Dikerjakan
              </CardTitle>
              <Clock className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">{stats.inProgress}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Dalam progres
              </p>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sesi Pomodoro
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

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="glass border-border/50 hover:border-primary/50 transition-colors cursor-pointer group">
            <Link to="/pomodoro">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-3 rounded-xl bg-neon-pink/20 group-hover:glow-accent transition-all">
                  <Zap className="w-6 h-6 text-neon-pink" />
                </div>
                <div>
                  <h3 className="font-semibold">Mulai Pomodoro</h3>
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

        {/* Today's Progress */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Progress Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {stats.completedToday} dari {stats.totalActivities} aktivitas selesai
                </span>
                <span className="font-medium">
                  {stats.totalActivities > 0 
                    ? Math.round((stats.completedToday / stats.totalActivities) * 100) 
                    : 0}%
                </span>
              </div>
              <Progress 
                value={stats.totalActivities > 0 
                  ? (stats.completedToday / stats.totalActivities) * 100 
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