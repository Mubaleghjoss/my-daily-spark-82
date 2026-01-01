import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Flame, 
  Loader2,
  Target,
  TrendingUp 
} from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth, subDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

interface Activity {
  id: string;
  title: string;
  status: string;
}

interface Completion {
  id: string;
  activity_id: string;
  completed_at: string;
}

interface DailyStats {
  date: string;
  count: number;
}

export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [recentCompletions, setRecentCompletions] = useState<(Completion & { activity_title: string })[]>([]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  async function fetchData() {
    setLoading(true);

    const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

    const [actRes, compRes] = await Promise.all([
      supabase.from('activities').select('id, title, status').eq('user_id', user!.id).is('parent_id', null),
      supabase.from('activity_completions').select('*').eq('user_id', user!.id).gte('completed_at', thirtyDaysAgo).order('completed_at', { ascending: false })
    ]);

    setActivities(actRes.data || []);
    setCompletions(compRes.data || []);

    // Build recent completions with activity titles
    const activityMap = new Map((actRes.data || []).map(a => [a.id, a.title]));
    const recent = (compRes.data || []).slice(0, 20).map(c => ({
      ...c,
      activity_title: activityMap.get(c.activity_id) || 'Aktivitas'
    }));
    setRecentCompletions(recent);

    setLoading(false);
  }

  // Calculate stats
  const today = startOfDay(new Date());
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const monthStart = startOfMonth(new Date());

  const todayCompletions = completions.filter(c => 
    new Date(c.completed_at) >= today
  );
  const weekCompletions = completions.filter(c => 
    new Date(c.completed_at) >= weekStart
  );
  const monthCompletions = completions.filter(c => 
    new Date(c.completed_at) >= monthStart
  );

  // Get unique activities completed
  const uniqueTodayActivities = new Set(todayCompletions.map(c => c.activity_id)).size;
  const uniqueWeekActivities = new Set(weekCompletions.map(c => c.activity_id)).size;
  const uniqueMonthActivities = new Set(monthCompletions.map(c => c.activity_id)).size;

  // Progress per activity
  const activityProgress = activities.map(activity => {
    const activityCompletions = completions.filter(c => c.activity_id === activity.id);
    const last7Days = activityCompletions.filter(c => 
      new Date(c.completed_at) >= subDays(new Date(), 7)
    ).length;
    return {
      ...activity,
      totalCompletions: activityCompletions.length,
      last7Days,
      percentage: Math.min(100, (last7Days / 7) * 100)
    };
  }).sort((a, b) => b.totalCompletions - a.totalCompletions);

  // Daily chart data (last 7 days)
  const chartData: DailyStats[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dayStart = startOfDay(date);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    
    const count = completions.filter(c => {
      const completedDate = new Date(c.completed_at);
      return completedDate >= dayStart && completedDate <= dayEnd;
    }).length;

    chartData.push({
      date: format(date, 'EEE', { locale: localeId }),
      count
    });
  }

  // Calculate streak
  let streak = 0;
  let currentDate = new Date();
  while (true) {
    const dayStart = startOfDay(currentDate);
    const dayCompletions = completions.filter(c => {
      const completedDate = new Date(c.completed_at);
      return completedDate >= dayStart && completedDate < new Date(dayStart.getTime() + 86400000);
    });
    
    if (dayCompletions.length > 0) {
      streak++;
      currentDate = subDays(currentDate, 1);
    } else if (format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) {
      // Skip today if no completions yet
      currentDate = subDays(currentDate, 1);
    } else {
      break;
    }
    
    if (streak > 365) break; // Safety limit
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Statistik dan progress aktivitasmu</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="glass border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Hari Ini
              </CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{uniqueTodayActivities}</div>
              <p className="text-xs text-muted-foreground">aktivitas selesai</p>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Minggu Ini
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">{uniqueWeekActivities}</div>
              <p className="text-xs text-muted-foreground">aktivitas selesai</p>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Bulan Ini
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-neon-pink" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-neon-pink">{uniqueMonthActivities}</div>
              <p className="text-xs text-muted-foreground">aktivitas selesai</p>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Streak 🔥
              </CardTitle>
              <Flame className="h-4 w-4 text-neon-green" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-neon-green">{streak}</div>
              <p className="text-xs text-muted-foreground">hari berturut-turut</p>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Aktivitas 7 Hari Terakhir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="url(#colorGradient)" 
                    radius={[4, 4, 0, 0]}
                  />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--neon-purple))" />
                      <stop offset="100%" stopColor="hsl(var(--neon-cyan))" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Activity Progress */}
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Progress Per Aktivitas (7 hari)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activityProgress.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Belum ada aktivitas</p>
              ) : (
                activityProgress.slice(0, 8).map(activity => (
                  <div key={activity.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate max-w-[200px]">{activity.title}</span>
                      <span className="text-muted-foreground">
                        {activity.last7Days}/7 hari
                      </span>
                    </div>
                    <Progress value={activity.percentage} className="h-2" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Completions */}
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Riwayat Penyelesaian
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {recentCompletions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Belum ada aktivitas yang diselesaikan
                  </p>
                ) : (
                  recentCompletions.map(completion => (
                    <div 
                      key={completion.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-neon-green" />
                        <span className="truncate max-w-[180px]">{completion.activity_title}</span>
                      </div>
                      <div className="text-xs text-muted-foreground text-right">
                        <div>{format(new Date(completion.completed_at), 'd MMM yyyy', { locale: localeId })}</div>
                        <div>{format(new Date(completion.completed_at), 'HH:mm')}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* All Activities Summary */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Ringkasan Semua Aktivitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {activityProgress.map(activity => (
                <div 
                  key={activity.id}
                  className="p-4 rounded-lg border bg-card/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium truncate max-w-[180px]">{activity.title}</h4>
                    <Badge variant="secondary" className="ml-2">
                      {activity.totalCompletions}x
                    </Badge>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {activity.last7Days} kali dalam 7 hari terakhir
                  </div>
                  <Progress value={activity.percentage} className="h-1.5 mt-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
