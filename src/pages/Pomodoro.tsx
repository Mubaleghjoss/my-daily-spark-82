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
import { useToast } from '@/hooks/use-toast';
import { Bell, BellOff, Pause, Play, RotateCcw, Timer, Coffee, Target, Settings, Volume2 } from 'lucide-react';
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
}

interface TimerSettings {
  focus: number;
  short_break: number;
  long_break: number;
}

// Notification sound as base64
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdXuHiYyLh4F4cGhgW1lbYGdudHmBgoF/gYWHg4F9d3Fral9ZVlhbY2tze4CChYiIiIeGg3x0bGdjXllXWl5la3N7gYSIi4qKh4N/eXJraGNdWFZXWl5ka3J3fIKFh4qLioqHg394cGtmYFpXV1hcYmhudnuAhYiKjIuLiYaBeXJsZ2FcWFZXWmBmbnV8gYWIioyLi4mFgXp0bmllX1pXVlhcYmlvdnyChYiKjIyLiYV/eHFrZmBbV1ZXWl5lbHR7gIWIioyMi4mGgXp0bmllX1pWVlhbYmludXuBhomLjIyKiYaCfHZvamRfWldWV1peZWxze4CFiIqMjIuKh4J8dnBqZF9bV1ZYW19mbHR6gIWIiouMjIqIg356c21oY15aV1dZXGJpbnV7gIWIiouMjIqIhIF7dXBqZWBcWFdYW15kanuAhIeKi4yLioiFgHp0b2plYFtYV1hbX2VsdHqAhIiKi4yMioiEgHp1cGtmYV1ZWFlbXmVrcnl/hIeKi4yMi4mGgXx2cWxnYl5aWFlbXmRqcXh+g4eJi4yMi4mHg356dXBrZmJeWlhYWl1jand+g4aJi4yMjIqIhYB7dnFsZ2NeWlhYWlxiaG93fYKGiYuMjYyKiIWAfXhzcGtnY19bWVlbXWJobnV7gIWIiovMjIqIhYF9eHNua2djX1tZWVtdYmdtdHqAhIiKi4yNjImHhIF9eHRwa2djX1tZWVpbYGZsc3l/g4eKi4yNjYqIhYF+eXRxbGhlYFxZWVlbXmNpb3Z8gYWIi4yNjYuJhoJ/endycW1pZGBeW1laWlxhZmxzeoCAhIiKjI2NjIqHhIF/endzcW5qZmFeW1pZWVteY2lvdXuAgYSHiovMjYyKiIWBf3t3c3FuamdiXltaWVlbX2Nnb3V6gIGEiIqLjI2Mi4mGg4B8eHZycW1pZWFeW1pZWVteYmhudXuAgYSHiovMjI2MioiGg39/end0cnBsaGRgXVtaWVpbXmNpb3Z7gIGEh4qLjI2NjIqIhoN/fHh1c3FuamZjX1xaWlpaXGFnbnR6f4GEh4qLjI2NjIqIhoOAfXl2c3FuamZjX1xaWllaW19kaXB2fICDhoqLjI2NjYuJh4SBfnp3dHJwa2djYF1bWlpaW1xhaG51e4CBhIeKi4yNjYyKiIaEgH15dnNwbmpmYl9cW1paWlteY2lwdnuAgYSHiouMjY2MioiGg4B9eXZzcW5qZmJfXFtaWlpbX2RpcHZ7gIGEh4qLjI2NjIqIhoSAfXl2c3BuamZiX1xbWlpaW19kaXB2fICDhoqLjI2NjYuJh4SBfnp3dHJwa2djYF1bWlpaXF5jaG91e4CBhIeKi4yNjYyKiIaEgH15dnNwbmpmYl9cW1paWltfZGpwdnuAgYSHiouMjY2Mi4mHhIF+end0cnBramZjYF1bWlpaW19ka3F3fICDhoqLjI2NjYuJh4SBfnp3dHJwbGlmY2BdW1paWlxfZGtxd3yAgYSHiouMjY2MioiGg4B9end0cnBsamdiX1xbWlpaW19ka3F3fICDhoqLjI2NjIuJh4SBfnp3dHJwbGlmY2BdW1paWlxfZGtxd3yAgYSHiouMjY2Mi4mHhIF+end0cnBsamdiX1xbWlpaXF9ka3F3fICDhoqLjI2NjIuJhoSBfnp3dHJwbGhmY2BdW1paWlxfZGtxd3yAgYSHiouMjY2Mi4mHhIF+end0cnBsamdiX1xbWlpaW19ka3J3fICDhoqLjI2NjIuJh4SBfnp3dHJwbGlmY2BdW1paWlxgZWxxd3yAgYSHiouMjY2Mi4mHhIF+end0cnBramZjYF1bWlpaW19ka3F3fICDhoqLjI2NjIuJh4SBfnp3dHJwbGlmY2BdW1paWlxfZGtxd3yAgYSHiouMjY2Mi4mHhIF+endz';

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
  const [tempSettings, setTempSettings] = useState<TimerSettings>(settings);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCompletedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.volume = 0.5;
  }, []);

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
        
        if (state.isRunning) {
          const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
          const remaining = state.duration - elapsed;
          
          if (remaining > 0) {
            setTimeLeft(remaining);
            setIsRunning(true);
          } else {
            setTimeLeft(0);
            handleSessionComplete(state.sessionType, state.sessionsCompleted);
          }
        } else {
          setTimeLeft(state.duration);
        }
      } catch (e) {
        console.error('Failed to parse saved timer state');
      }
    }
  }, []);

  const saveState = useCallback((running: boolean, type: SessionType, duration: number, sessions: number, startTime?: number) => {
    const state: TimerState = {
      sessionType: type,
      startTime: startTime || Date.now(),
      duration: duration,
      isRunning: running,
      sessionsCompleted: sessions,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, []);

  // Play notification sound
  const playSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, []);

  // Test notification sound
  const testNotificationSound = () => {
    playSound();
    toast({
      title: '🔔 Tes Suara',
      description: 'Suara notifikasi berhasil diputar!',
    });
  };

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

      playSound();

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }, [playSound]);

  const handleSessionComplete = useCallback(async (type?: SessionType, sessions?: number) => {
    const currentType = type || sessionType;
    const currentSessions = sessions ?? sessionsCompleted;
    
    hasCompletedRef.current = true;
    setIsRunning(false);

    if (currentType === 'focus') {
      if (user) {
        await supabase.from('pomodoro_sessions').insert({
          user_id: user.id,
          duration_minutes: settings.focus,
          session_type: 'focus',
        });
      }

      const newSessions = currentSessions + 1;
      setSessionsCompleted(newSessions);

      sendNotification('🎉 Sesi Fokus Selesai!', 'Waktunya istirahat sebentar.');

      toast({
        title: 'Sesi Fokus Selesai! 🎉',
        description: 'Waktunya istirahat sebentar.',
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
  }, [sessionType, sessionsCompleted, user, toast, sendNotification, saveState, settings]);

  // Timer tick effect
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else if (timeLeft === 0 && isRunning && !hasCompletedRef.current) {
      handleSessionComplete();
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft, handleSessionComplete]);

  // Reset completion flag when starting new session
  useEffect(() => {
    if (timeLeft > 0) {
      hasCompletedRef.current = false;
    }
  }, [timeLeft]);

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
    const newIsRunning = !isRunning;
    setIsRunning(newIsRunning);
    
    if (newIsRunning) {
      saveState(true, sessionType, timeLeft, sessionsCompleted, Date.now());
    } else {
      saveState(false, sessionType, timeLeft, sessionsCompleted);
    }
  }

  function resetTimer() {
    setIsRunning(false);
    const duration = settings[sessionType] * 60;
    setTimeLeft(duration);
    saveState(false, sessionType, duration, sessionsCompleted);
  }

  function switchSession(type: SessionType) {
    setIsRunning(false);
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

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  const totalDuration = settings[sessionType] * 60;
  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;

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
          
          <Button 
            variant="outline" 
            onClick={testNotificationSound}
            className="gap-2"
          >
            <Volume2 className="h-4 w-4" />
            Tes Suara
          </Button>

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
              <div className="text-3xl font-bold text-neon-pink">{sessionsCompleted}</div>
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
                {sessionsCompleted * settings.focus} min
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
            <p>🔔 Aktifkan notifikasi agar tidak ketinggalan</p>
            <p>✨ Timer tetap berjalan meski pindah halaman</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
