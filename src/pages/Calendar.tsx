import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Check,
  Clock,
  Loader2 
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  addWeeks,
  subWeeks,
  addYears,
  subYears
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type ViewMode = 'day' | 'week' | 'month' | 'year';

interface Activity {
  id: string;
  title: string;
  parent_id: string | null;
}

interface Completion {
  id: string;
  activity_id: string;
  completed_at: string;
}

interface CompletionDetail {
  activity: Activity;
  completions: Completion[];
}

export default function Calendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Popup state
  const [selectedActivity, setSelectedActivity] = useState<CompletionDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, currentDate, viewMode]);

  async function fetchData() {
    setLoading(true);
    
    // Fetch ALL activities (including sub-activities)
    const { data: actData } = await supabase
      .from('activities')
      .select('id, title, parent_id')
      .eq('user_id', user!.id);
    
    setActivities(actData || []);

    // Fetch completions for the current view range
    let startDate: Date, endDate: Date;
    
    if (viewMode === 'year') {
      startDate = startOfYear(currentDate);
      endDate = endOfYear(currentDate);
    } else if (viewMode === 'month') {
      startDate = startOfMonth(currentDate);
      endDate = endOfMonth(currentDate);
    } else if (viewMode === 'week') {
      startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
      endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else {
      startDate = new Date(currentDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(currentDate);
      endDate.setHours(23, 59, 59, 999);
    }

    const { data: compData } = await supabase
      .from('activity_completions')
      .select('*')
      .eq('user_id', user!.id)
      .gte('completed_at', startDate.toISOString())
      .lte('completed_at', endDate.toISOString());

    setCompletions(compData || []);
    setLoading(false);
  }

  function navigate(direction: 'prev' | 'next') {
    if (viewMode === 'year') {
      setCurrentDate(direction === 'prev' ? subYears(currentDate, 1) : addYears(currentDate, 1));
    } else if (viewMode === 'month') {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + (direction === 'prev' ? -1 : 1));
      setCurrentDate(newDate);
    }
  }

  function getCompletionsForDate(date: Date) {
    return completions.filter(c => {
      const completedDate = new Date(c.completed_at);
      return isSameDay(completedDate, date);
    });
  }

  function getCompletedActivitiesForDate(date: Date): CompletionDetail[] {
    const dateCompletions = getCompletionsForDate(date);
    const activityIds = [...new Set(dateCompletions.map(c => c.activity_id))];
    
    return activityIds.map(actId => {
      const activity = activities.find(a => a.id === actId);
      const actCompletions = dateCompletions.filter(c => c.activity_id === actId);
      return {
        activity: activity || { id: actId, title: 'Aktivitas', parent_id: null },
        completions: actCompletions
      };
    });
  }

  function getActivityLabel(activity: Activity): string {
    if (activity.parent_id) {
      const parent = activities.find(a => a.id === activity.parent_id);
      return parent ? `${parent.title} → ${activity.title}` : activity.title;
    }
    return activity.title;
  }

  function openDetail(detail: CompletionDetail) {
    setSelectedActivity(detail);
    setIsDetailOpen(true);
  }

  function renderDayView() {
    const completedDetails = getCompletedActivitiesForDate(currentDate);
    
    // Get all activities to show (both main and sub)
    const allActivitiesToShow = activities;
    
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-center">
          {format(currentDate, 'EEEE, d MMMM yyyy', { locale: localeId })}
        </h2>
        
        <div className="grid gap-3">
          {allActivitiesToShow.map(activity => {
            const detail = completedDetails.find(d => d.activity.id === activity.id);
            const isCompleted = !!detail;
            const isSubActivity = !!activity.parent_id;
            
            return (
              <div 
                key={activity.id}
                onClick={() => detail && openDetail(detail)}
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border transition-colors",
                  isCompleted 
                    ? "bg-neon-green/10 border-neon-green/30 cursor-pointer hover:bg-neon-green/20" 
                    : "bg-muted/30 border-border",
                  isSubActivity && "ml-6"
                )}
              >
                <div className="flex items-center gap-2">
                  {isSubActivity && (
                    <span className="text-muted-foreground text-sm">↳</span>
                  )}
                  <span className={isCompleted ? "text-neon-green" : "text-muted-foreground"}>
                    {activity.title}
                  </span>
                  {isSubActivity && (
                    <Badge variant="outline" className="text-xs">sub</Badge>
                  )}
                </div>
                {isCompleted && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(detail.completions[0].completed_at), 'HH:mm')}
                    </span>
                    <Check className="h-5 w-5 text-neon-green" />
                  </div>
                )}
              </div>
            );
          })}
          
          {activities.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Belum ada aktivitas
            </p>
          )}
        </div>
      </div>
    );
  }

  function renderWeekView() {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-center">
          Minggu {format(start, 'd MMM', { locale: localeId })} - {format(end, 'd MMM yyyy', { locale: localeId })}
        </h2>
        
        <div className="grid grid-cols-7 gap-2">
          {days.map(day => {
            const dayDetails = getCompletedActivitiesForDate(day);
            const isToday = isSameDay(day, new Date());
            
            return (
              <div 
                key={day.toISOString()}
                className={cn(
                  "p-3 rounded-lg border min-h-[120px]",
                  isToday ? "border-primary bg-primary/5" : "border-border bg-card"
                )}
              >
                <div className="text-sm font-medium mb-2">
                  {format(day, 'EEE d', { locale: localeId })}
                </div>
                <div className="space-y-1">
                  {dayDetails.slice(0, 3).map(detail => (
                    <div 
                      key={detail.activity.id}
                      onClick={() => openDetail(detail)}
                      className="flex items-center gap-1 text-xs text-neon-green truncate cursor-pointer hover:underline"
                    >
                      <Check className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{detail.activity.title}</span>
                    </div>
                  ))}
                  {dayDetails.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{dayDetails.length - 3} lainnya
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderMonthView() {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const weekDays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-center">
          {format(currentDate, 'MMMM yyyy', { locale: localeId })}
        </h2>

        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
          
          {days.map(day => {
            const dayDetails = getCompletedActivitiesForDate(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentDate);
            
            return (
              <div 
                key={day.toISOString()}
                className={cn(
                  "aspect-square p-1 rounded-lg border flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-muted/50 transition-colors",
                  isToday && "border-primary bg-primary/10",
                  !isCurrentMonth && "opacity-30"
                )}
                onClick={() => {
                  setCurrentDate(day);
                  setViewMode('day');
                }}
              >
                <span className={cn(
                  "text-sm",
                  isToday && "font-bold text-primary"
                )}>
                  {format(day, 'd')}
                </span>
                {dayDetails.length > 0 && (
                  <div className="flex gap-0.5">
                    {dayDetails.slice(0, 3).map((detail, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                    ))}
                    {dayDetails.length > 3 && (
                      <span className="text-[8px] text-muted-foreground">+</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderYearView() {
    const months = eachMonthOfInterval({
      start: startOfYear(currentDate),
      end: endOfYear(currentDate)
    });

    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-center">
          {format(currentDate, 'yyyy')}
        </h2>

        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
          {months.map(month => {
            const monthCompletions = completions.filter(c => {
              const completedDate = new Date(c.completed_at);
              return isSameMonth(completedDate, month);
            });
            const uniqueDays = new Set(
              monthCompletions.map(c => format(new Date(c.completed_at), 'yyyy-MM-dd'))
            ).size;

            return (
              <Card 
                key={month.toISOString()}
                className={cn(
                  "cursor-pointer hover:border-primary/50 transition-colors",
                  isSameMonth(month, new Date()) && "border-primary"
                )}
                onClick={() => {
                  setCurrentDate(month);
                  setViewMode('month');
                }}
              >
                <CardContent className="p-4 text-center">
                  <h3 className="font-medium">
                    {format(month, 'MMMM', { locale: localeId })}
                  </h3>
                  {uniqueDays > 0 && (
                    <Badge variant="secondary" className="mt-2">
                      {uniqueDays} hari aktif
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Kalender</h1>
            <p className="text-muted-foreground">Lihat riwayat penyelesaian aktivitas</p>
          </div>
        </div>

        <Card className="glass border-border/50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => navigate('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigate('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
                  Hari Ini
                </Button>
              </div>

              <div className="flex gap-1">
                {(['day', 'week', 'month', 'year'] as ViewMode[]).map(mode => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode(mode)}
                    className={viewMode === mode ? 'gradient-primary' : ''}
                  >
                    {mode === 'day' && 'Hari'}
                    {mode === 'week' && 'Minggu'}
                    {mode === 'month' && 'Bulan'}
                    {mode === 'year' && 'Tahun'}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {viewMode === 'day' && renderDayView()}
                {viewMode === 'week' && renderWeekView()}
                {viewMode === 'month' && renderMonthView()}
                {viewMode === 'year' && renderYearView()}
              </>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-neon-green" />
            <span>Aktivitas selesai</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border border-primary" />
            <span>Hari ini</span>
          </div>
        </div>
      </div>

      {/* Detail Popup */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-neon-green" />
              Detail Penyelesaian
            </DialogTitle>
          </DialogHeader>
          
          {selectedActivity && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-neon-green/10 border border-neon-green/30">
                <h3 className="font-semibold text-lg">
                  {getActivityLabel(selectedActivity.activity)}
                </h3>
                {selectedActivity.activity.parent_id && (
                  <Badge variant="outline" className="mt-2">Sub-aktivitas</Badge>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Waktu Penyelesaian
                </h4>
                
                {selectedActivity.completions.map((comp) => (
                  <div 
                    key={comp.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-neon-green" />
                      <span>
                        {format(new Date(comp.completed_at), 'EEEE, d MMMM yyyy', { locale: localeId })}
                      </span>
                    </div>
                    <span className="font-mono text-primary">
                      {format(new Date(comp.completed_at), 'HH:mm:ss')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
