import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Bell, 
  BellOff, 
  Pause, 
  Play, 
  RotateCcw, 
  Timer, 
  Coffee, 
  Target, 
  Settings, 
  Volume2,
  VolumeX,
  ListTodo,
  History
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SessionType = 'focus' | 'short_break' | 'long_break';

const DEFAULT_DURATIONS: Record<SessionType, number> = {
  focus: 25,
  short_break: 5,
  long_break: 15,
};

const LABELS: Record<SessionType, string> = {
  focus: 'Fokus',
  short_break: 'Istirahat Pendek',
  long_break: 'Istirahat Panjang',
};

const STORAGE_KEY = 'pomodoro_timer_state';
const SETTINGS_KEY = 'pomodoro_settings';

interface TimerState {
  sessionType: SessionType;
  startTime: number;
  duration: number;
  isRunning: boolean;
  sessionsCompleted: number;
  selectedActivityId: string | null;
  selectedActivityTitle: string | null;
}

interface TimerSettings {
  focus: number;
  short_break: number;
  long_break: number;
}

interface Activity {
  id: string;
  title: string;
  parent_id: string | null;
}

interface SessionHistory {
  id: string;
  activity_id: string | null;
  activity_title: string;
  duration_minutes: number;
  completed_at: string;
  session_type: string | null;
}

// Alarm sound - louder and more attention-grabbing
const createAlarmSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 880; // A5 note
  oscillator.type = 'square';
  gainNode.gain.value = 0.5;
  
  return { oscillator, gainNode, audioContext };
};

export default function Pomodoro() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Load settings from localStorage
  const loadSettings = (): TimerSettings => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return { ...DEFAULT_DURATIONS };
      }
    }
    return { ...DEFAULT_DURATIONS };
  };

  const [settings, setSettings] = useState<TimerSettings>(loadSettings);
  const [sessionType, setSessionType] = useState<SessionType>('focus');
  const [timeLeft, setTimeLeft] = useState(settings.focus * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isActivitySelectOpen, setIsActivitySelectOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [tempSettings, setTempSettings] = useState<TimerSettings>(settings);
  
  // Activity selection
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<{ id: string; title: string } | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionHistory[]>([]);
  
  // Alarm state
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCompletedRef = useRef(false);
  const workerRef = useRef<Worker | null>(null);

  // Create Web Worker for background timing
  useEffect(() => {
    const workerCode = `
      let interval = null;
      let endTime = null;
      
      self.onmessage = function(e) {
        if (e.data.type === 'start') {
          endTime = e.data.endTime;
          if (interval) clearInterval(interval);
          interval = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
            self.postMessage({ type: 'tick', remaining });
            if (remaining <= 0) {
              clearInterval(interval);
              self.postMessage({ type: 'complete' });
            }
          }, 1000);
        } else if (e.data.type === 'stop') {
          if (interval) clearInterval(interval);
        } else if (e.data.type === 'sync') {
          endTime = e.data.endTime;
        }
      };
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    workerRef.current = new Worker(workerUrl);
    
    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'tick') {
        setTimeLeft(e.data.remaining);
      } else if (e.data.type === 'complete') {
        handleSessionComplete();
      }
    };
    
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
      URL.revokeObjectURL(workerUrl);
    };
  }, []);

  // Fetch activities on mount
  useEffect(() => {
    if (user) {
      fetchActivities();
      fetchTodayHistory();
    }
  }, [user]);

  async function fetchActivities() {
    const { data } = await supabase
      .from('activities')
      .select('id, title, parent_id')
      .eq('user_id', user!.id);
    setActivities(data || []);
  }

  async function fetchTodayHistory() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data } = await supabase
      .from('pomodoro_sessions')
      .select('*')
      .eq('user_id', user!.id)
      .gte('completed_at', today.toISOString())
      .order('completed_at', { ascending: false });
    
    // Map activity titles
    const historyWithTitles = (data || []).map(session => ({
      ...session,
      activity_title: session.activity_id 
        ? activities.find(a => a.id === session.activity_id)?.title || 'Aktivitas'
        : 'Tanpa aktivitas'
    }));
    
    setSessionHistory(historyWithTitles);
  }

  // Re-fetch history when activities change
  useEffect(() => {
    if (activities.length > 0) {
      fetchTodayHistory();
    }
  }, [activities]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Load saved state on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state: TimerState = JSON.parse(saved);
        setSessionType(state.sessionType);
        setSessionsCompleted(state.sessionsCompleted);
        
        if (state.selectedActivityId && state.selectedActivityTitle) {
          setSelectedActivity({ 
            id: state.selectedActivityId, 
            title: state.selectedActivityTitle 
          });
        }
        
        if (state.isRunning) {
          const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
          const remaining = state.duration - elapsed;
          
          if (remaining > 0) {
            setTimeLeft(remaining);
            setIsRunning(true);
            // Start worker with correct end time
            const endTime = state.startTime + state.duration * 1000;
            workerRef.current?.postMessage({ type: 'start', endTime });
          } else {
            setTimeLeft(0);
            handleSessionComplete(state.sessionType, state.sessionsCompleted, state.selectedActivityId);
          }
        } else {
          setTimeLeft(state.duration);
        }
      } catch (e) {
        console.error('Failed to parse saved timer state');
      }
    }
  }, []);

  const saveState = useCallback((
    running: boolean, 
    type: SessionType, 
    duration: number, 
    sessions: number, 
    startTime?: number,
    activityId?: string | null,
    activityTitle?: string | null
  ) => {
    const state: TimerState = {
      sessionType: type,
      startTime: startTime || Date.now(),
      duration: duration,
      isRunning: running,
      sessionsCompleted: sessions,
      selectedActivityId: activityId ?? selectedActivity?.id ?? null,
      selectedActivityTitle: activityTitle ?? selectedActivity?.title ?? null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [selectedActivity]);

  // Play loud alarm
  const playAlarm = useCallback(() => {
    setIsAlarmPlaying(true);
    
    const playBeep = () => {
      try {
        const { oscillator, gainNode, audioContext } = createAlarmSound();
        audioContextRef.current = audioContext;
        
        oscillator.start();
        
        // Beep pattern: on-off-on-off
        setTimeout(() => {
          gainNode.gain.value = 0;
        }, 200);
        setTimeout(() => {
          gainNode.gain.value = 0.5;
        }, 400);
        setTimeout(() => {
          gainNode.gain.value = 0;
          oscillator.stop();
        }, 600);
      } catch (e) {
        console.error('Audio error:', e);
      }
    };
    
    // Play immediately
    playBeep();
    
    // Continue playing every 1.5 seconds until stopped
    alarmIntervalRef.current = setInterval(playBeep, 1500);
  }, []);

  const stopAlarm = useCallback(() => {
    setIsAlarmPlaying(false);
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  // Send notification
  const sendNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'pomodoro-timer',
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        stopAlarm();
      };
    }
  }, [stopAlarm]);

  const handleSessionComplete = useCallback(async (
    type?: SessionType, 
    sessions?: number,
    activityId?: string | null
  ) => {
    const currentType = type || sessionType;
    const currentSessions = sessions ?? sessionsCompleted;
    const currentActivityId = activityId ?? selectedActivity?.id ?? null;
    
    hasCompletedRef.current = true;
    setIsRunning(false);
    workerRef.current?.postMessage({ type: 'stop' });

    // Play loud alarm
    playAlarm();

    if (currentType === 'focus') {
      if (user) {
        await supabase.from('pomodoro_sessions').insert({
          user_id: user.id,
          duration_minutes: settings.focus,
          session_type: 'focus',
          activity_id: currentActivityId,
        });
        fetchTodayHistory();
      }

      const newSessions = currentSessions + 1;
      setSessionsCompleted(newSessions);

      const activityText = selectedActivity?.title 
        ? ` (${selectedActivity.title})` 
        : '';
      
      sendNotification(
        '🎉 Sesi Fokus Selesai!', 
        `${settings.focus} menit fokus${activityText} tercatat. Klik untuk mematikan alarm.`
      );

      toast({
        title: 'Sesi Fokus Selesai! 🎉',
        description: `Waktunya istirahat. Klik "Stop Alarm" untuk mematikan.`,
      });

      let nextType: SessionType;
      if (newSessions % 4 === 0) {
        nextType = 'long_break';
      } else {
        nextType = 'short_break';
      }
      setSessionType(nextType);
      setTimeLeft(settings[nextType] * 60);
      saveState(false, nextType, settings[nextType] * 60, newSessions);
    } else {
      sendNotification('💪 Istirahat Selesai!', 'Siap untuk sesi fokus berikutnya?');
      
      toast({
        title: 'Istirahat Selesai! 💪',
        description: 'Siap untuk sesi fokus berikutnya?',
      });
      setSessionType('focus');
      setTimeLeft(settings.focus * 60);
      saveState(false, 'focus', settings.focus * 60, currentSessions);
    }
  }, [sessionType, sessionsCompleted, user, toast, sendNotification, saveState, settings, playAlarm, selectedActivity]);

  // Cleanup alarm on unmount
  useEffect(() => {
    return () => {
      stopAlarm();
    };
  }, [stopAlarm]);

  async function requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast({ title: 'Notifikasi diaktifkan!', description: 'Kamu akan menerima notifikasi saat timer selesai.' });
      }
    }
  }

  function toggleTimer() {
    if (isAlarmPlaying) {
      stopAlarm();
      return;
    }
    
    const newIsRunning = !isRunning;
    setIsRunning(newIsRunning);
    
    if (newIsRunning) {
      hasCompletedRef.current = false;
      const startTime = Date.now();
      const endTime = startTime + timeLeft * 1000;
      workerRef.current?.postMessage({ type: 'start', endTime });
      saveState(true, sessionType, timeLeft, sessionsCompleted, startTime);
    } else {
      workerRef.current?.postMessage({ type: 'stop' });
      saveState(false, sessionType, timeLeft, sessionsCompleted);
    }
  }

  function resetTimer() {
    setIsRunning(false);
    stopAlarm();
    workerRef.current?.postMessage({ type: 'stop' });
    const duration = settings[sessionType] * 60;
    setTimeLeft(duration);
    saveState(false, sessionType, duration, sessionsCompleted);
  }

  function switchSession(type: SessionType) {
    setIsRunning(false);
    stopAlarm();
    workerRef.current?.postMessage({ type: 'stop' });
    setSessionType(type);
    const duration = settings[type] * 60;
    setTimeLeft(duration);
    saveState(false, type, duration, sessionsCompleted);
  }

  function saveSettings() {
    setSettings(tempSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(tempSettings));
    
    // Update current timer if not running
    if (!isRunning) {
      setTimeLeft(tempSettings[sessionType] * 60);
      saveState(false, sessionType, tempSettings[sessionType] * 60, sessionsCompleted);
    }
    
    setIsSettingsOpen(false);
    toast({
      title: 'Pengaturan Disimpan!',
      description: 'Durasi timer berhasil diperbarui.',
    });
  }

  function selectActivity(activity: Activity | null) {
    if (activity) {
      setSelectedActivity({ id: activity.id, title: activity.title });
    } else {
      setSelectedActivity(null);
    }
    setIsActivitySelectOpen(false);
  }

  function getActivityLabel(activity: Activity): string {
    if (activity.parent_id) {
      const parent = activities.find(a => a.id === activity.parent_id);
      return parent ? `${parent.title} → ${activity.title}` : activity.title;
    }
    return activity.title;
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  const totalDuration = settings[sessionType] * 60;
  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;
  const totalFocusMinutes = sessionHistory
    .filter(s => s.session_type === 'focus')
    .reduce((sum, s) => sum + s.duration_minutes, 0);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold gradient-text">Focus Timer</h1>
          <p className="text-muted-foreground mt-2">
            Fokus lebih baik dengan teknik waktu terfokus
          </p>
        </div>

        {/* Alarm Stop Button - Shows when alarm is playing */}
        {isAlarmPlaying && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <Card className="glass border-destructive animate-pulse">
              <CardContent className="p-8 text-center space-y-4">
                <div className="text-6xl">🔔</div>
                <h2 className="text-2xl font-bold">Waktu Habis!</h2>
                <p className="text-muted-foreground">
                  {selectedActivity?.title || 'Sesi fokus'} selesai!
                </p>
                <Button 
                  size="lg" 
                  className="gradient-primary glow-primary"
                  onClick={stopAlarm}
                >
                  <VolumeX className="h-5 w-5 mr-2" />
                  Stop Alarm
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Activity Selection */}
        <Card className="glass border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTodo className="h-5 w-5 text-primary" />
                <span className="font-medium">Mengerjakan:</span>
              </div>
              <Dialog open={isActivitySelectOpen} onOpenChange={setIsActivitySelectOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    {selectedActivity ? (
                      <span className="truncate max-w-[200px]">{selectedActivity.title}</span>
                    ) : (
                      <span className="text-muted-foreground">Pilih aktivitas...</span>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Pilih Aktivitas</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-muted-foreground"
                      onClick={() => selectActivity(null)}
                    >
                      Tanpa aktivitas
                    </Button>
                    {activities.map(activity => (
                      <Button
                        key={activity.id}
                        variant={selectedActivity?.id === activity.id ? 'secondary' : 'ghost'}
                        className="w-full justify-start"
                        onClick={() => selectActivity(activity)}
                      >
                        {activity.parent_id && <span className="text-muted-foreground mr-2">↳</span>}
                        {getActivityLabel(activity)}
                      </Button>
                    ))}
                    {activities.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        Belum ada aktivitas. Buat di halaman Aktivitas.
                      </p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Notification & Settings */}
        <div className="flex justify-center gap-2 flex-wrap">
          {notificationPermission !== 'granted' && (
            <Button 
              variant="outline" 
              onClick={requestNotificationPermission}
              className="gap-2"
            >
              <Bell className="h-4 w-4" />
              Aktifkan Notifikasi
            </Button>
          )}

          <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <History className="h-4 w-4" />
                Riwayat Hari Ini
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Riwayat Sesi Hari Ini
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {sessionHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Belum ada sesi hari ini
                  </p>
                ) : (
                  sessionHistory.map((session, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">
                          {session.activity_id 
                            ? activities.find(a => a.id === session.activity_id)?.title || 'Aktivitas'
                            : 'Tanpa aktivitas'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(session.completed_at).toLocaleTimeString('id-ID', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{session.duration_minutes} menit</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => setTempSettings(settings)}
              >
                <Settings className="h-4 w-4" />
                Atur Waktu
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Timer className="h-5 w-5 text-primary" />
                  Pengaturan Waktu
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="focus-time" className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Waktu Fokus (menit)
                  </Label>
                  <Input
                    id="focus-time"
                    type="number"
                    min={1}
                    max={120}
                    value={tempSettings.focus}
                    onChange={(e) => setTempSettings({ ...tempSettings, focus: parseInt(e.target.value) || 25 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="short-break" className="flex items-center gap-2">
                    <Coffee className="h-4 w-4 text-accent" />
                    Istirahat Pendek (menit)
                  </Label>
                  <Input
                    id="short-break"
                    type="number"
                    min={1}
                    max={30}
                    value={tempSettings.short_break}
                    onChange={(e) => setTempSettings({ ...tempSettings, short_break: parseInt(e.target.value) || 5 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="long-break" className="flex items-center gap-2">
                    <Coffee className="h-4 w-4 text-neon-green" />
                    Istirahat Panjang (menit)
                  </Label>
                  <Input
                    id="long-break"
                    type="number"
                    min={1}
                    max={60}
                    value={tempSettings.long_break}
                    onChange={(e) => setTempSettings({ ...tempSettings, long_break: parseInt(e.target.value) || 15 })}
                  />
                </div>
                <Button onClick={saveSettings} className="w-full gradient-primary">
                  Simpan Pengaturan
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Session Type Tabs */}
        <div className="flex justify-center gap-2 flex-wrap">
          {(['focus', 'short_break', 'long_break'] as SessionType[]).map((type) => (
            <Button
              key={type}
              variant={sessionType === type ? 'default' : 'outline'}
              onClick={() => switchSession(type)}
              className={cn(
                'transition-all',
                sessionType === type && 'gradient-primary glow-primary'
              )}
            >
              {type === 'focus' && <Target className="w-4 h-4 mr-2" />}
              {type === 'short_break' && <Coffee className="w-4 h-4 mr-2" />}
              {type === 'long_break' && <Coffee className="w-4 h-4 mr-2" />}
              {LABELS[type]}
            </Button>
          ))}
        </div>

        {/* Timer Display */}
        <Card className="glass border-border/50">
          <CardContent className="pt-8 pb-8">
            <div className="relative flex flex-col items-center">
              {/* Circular Progress */}
              <div className="relative w-64 h-64 mb-8">
                <svg className="w-full h-full transform -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="128"
                    cy="128"
                    r="120"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="8"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="128"
                    cy="128"
                    r="120"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 120}
                    strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="hsl(var(--neon-purple))" />
                      <stop offset="100%" stopColor="hsl(var(--neon-cyan))" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Time display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-6xl font-bold gradient-text">
                    {formatTime(timeLeft)}
                  </span>
                  <span className="text-muted-foreground mt-2">{LABELS[sessionType]}</span>
                  {selectedActivity && (
                    <span className="text-xs text-primary mt-1 truncate max-w-[150px]">
                      {selectedActivity.title}
                    </span>
                  )}
                  {isRunning && (
                    <span className="text-xs text-neon-green mt-1 animate-pulse">● Berjalan</span>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12"
                  onClick={resetTimer}
                >
                  <RotateCcw className="h-5 w-5" />
                </Button>

                <Button
                  size="lg"
                  className={cn(
                    'h-16 w-16 rounded-full',
                    isRunning ? 'bg-destructive hover:bg-destructive/90' : 'gradient-primary glow-primary'
                  )}
                  onClick={toggleTimer}
                >
                  {isRunning ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6 ml-1" />
                  )}
                </Button>

                <div className="h-12 w-12 flex items-center justify-center">
                  {notificationPermission === 'granted' ? (
                    <Bell className="h-5 w-5 text-neon-green" />
                  ) : (
                    <BellOff className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="glass border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sesi Hari Ini
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-neon-pink">
                {sessionHistory.filter(s => s.session_type === 'focus').length}
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Waktu Fokus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">
                {totalFocusMinutes} min
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tips */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-primary" />
              Tips Focus Timer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>⏱️ 1 Sesi = {settings.focus} menit fokus penuh</p>
            <p>☕ Istirahat {settings.short_break} menit setelah setiap sesi</p>
            <p>🌟 Istirahat panjang {settings.long_break} menit setelah 4 sesi</p>
            <p>🔔 Timer tetap berjalan meski pindah halaman atau minimize</p>
            <p>📊 Pilih aktivitas untuk mencatat waktu fokus per tugas</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
