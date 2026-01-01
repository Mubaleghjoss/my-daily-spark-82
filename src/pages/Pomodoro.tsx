import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Bell, BellOff, Pause, Play, RotateCcw, Timer, Coffee, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

type SessionType = 'focus' | 'short_break' | 'long_break';

const DURATIONS: Record<SessionType, number> = {
  focus: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
};

const LABELS: Record<SessionType, string> = {
  focus: 'Fokus',
  short_break: 'Istirahat Pendek',
  long_break: 'Istirahat Panjang',
};

const STORAGE_KEY = 'pomodoro_timer_state';

interface TimerState {
  sessionType: SessionType;
  startTime: number; // timestamp when timer started
  duration: number; // total duration in seconds
  isRunning: boolean;
  sessionsCompleted: number;
}

export default function Pomodoro() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [sessionType, setSessionType] = useState<SessionType>('focus');
  const [timeLeft, setTimeLeft] = useState(DURATIONS.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCompletedRef = useRef(false);

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
          // Calculate remaining time based on when it was started
          const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
          const remaining = state.duration - elapsed;
          
          if (remaining > 0) {
            setTimeLeft(remaining);
            setIsRunning(true);
          } else {
            // Timer has completed while away
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

  // Save state whenever it changes
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

      // Play sound
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdXuHiYyLh4F4cGhgW1lbYGdudHmBgoF/gYWHg4F9d3Fral9ZVlhbY2tze4CChYiIiIeGg3x0bGdjXllXWl5la3N7gYSIi4qKh4N/eXJraGNdWFZXWl5ka3J3fIKFh4qLioqHg394cGtmYFpXV1hcYmhudnuAhYiKjIuLiYaBeXJsZ2FcWFZXWmBmbnV8gYWIioyLi4mFgXp0bmllX1pXVlhcYmlvdnyChYiKjIyLiYV/eHFrZmBbV1ZXWl5lbHR7gIWIioyMi4mGgXp0bmllX1pWVlhbYmludXuBhomLjIyKiYaCfHZvamRfWldWV1peZWxze4CFiIqMjIuKh4J8dnBqZF9bV1ZYW19mbHR6gIWIiouMjIqIg356c21oY15aV1dZXGJpbnV7gIWIiouMjIqIhIF7dXBqZWBcWFdYW15kanuAhIeKi4yLioiFgHp0b2plYFtYV1hbX2VsdHqAhIiKi4yMioiEgHp1cGtmYV1ZWFlbXmVrcnl/hIeKi4yMi4mGgXx2cWxnYl5aWFlbXmRqcXh+g4eJi4yMi4mHg356dXBrZmJeWlhYWl1jand+g4aJi4yMjIqIhYB7dnFsZ2NeWlhYWlxiaG93fYKGiYuMjYyKiIWAfXhzcGtnY19bWVlbXWJobnV7gIWIiovMjIqIhYF9eHNua2djX1tZWVtdYmdtdHqAhIiKi4yNjImHhIF9eHRwa2djX1tZWVpbYGZsc3l/g4eKi4yNjYqIhYF+eXRxbGhlYFxZWVlbXmNpb3Z8gYWIi4yNjYuJhoJ/endycW1pZGBeW1laWlxhZmxzeoCAhIiKjI2NjIqHhIF/endzcW5qZmFeW1pZWVteY2lvdXuAgYSHiovMjYyKiIWBf3t3c3FuamdiXltaWVlbX2Nnb3V6gIGEiIqLjI2Mi4mGg4B8eHZycW1pZWFeW1pZWVteYmhudXuAgYSHiovMjI2MioiGg39/end0cnBsaGRgXVtaWVpbXmNpb3Z7gIGEh4qLjI2NjIqIhoN/fHh1c3FuamZjX1xaWlpaXGFnbnR6f4GEh4qLjI2NjIqIhoOAfXl2c3FuamZjX1xaWllaW19kaXB2fICDhoqLjI2NjYuJh4SBfnp3dHJwa2djYF1bWlpaW1xhaG51e4CBhIeKi4yNjYyKiIaEgH15dnNwbmpmYl9cW1paWlteY2lwdnuAgYSHiouMjY2MioiGg4B9eXZzcW5qZmJfXFtaWlpbX2RpcHZ7gIGEh4qLjI2NjIqIhoSAfXl2c3BuamZiX1xbWlpaW19kaXB2fICDhoqLjI2NjYuJh4SBfnp3dHJwa2djYF1bWlpaXF5jaG91e4CBhIeKi4yNjYyKiIaEgH15dnNwbmpmYl9cW1paWltfZGpwdnuAgYSHiouMjY2Mi4mHhIF+end0cnBramZjYF1bWlpaW19ka3F3fICDhoqLjI2NjYuJh4SBfnp3dHJwbGlmY2BdW1paWlxfZGtxd3yAgYSHiouMjY2MioiGg4B9end0cnBsamdiX1xbWlpaW19ka3F3fICDhoqLjI2NjIuJh4SBfnp3dHJwbGlmY2BdW1paWlxfZGtxd3yAgYSHiouMjY2Mi4mHhIF+end0cnBsamdiX1xbWlpaXF9ka3F3fICDhoqLjI2NjIuJhoSBfnp3dHJwbGhmY2BdW1paWlxfZGtxd3yAgYSHiouMjY2Mi4mHhIF+end0cnBsamdiX1xbWlpaW19ka3J3fICDhoqLjI2NjIuJh4SBfnp3dHJwbGlmY2BdW1paWlxgZWxxd3yAgYSHiouMjY2Mi4mHhIF+end0cnBramZjYF1bWlpaW19ka3F3fICDhoqLjI2NjIuJh4SBfnp3dHJwbGlmY2BdW1paWlxfZGtxd3yAgYSHiouMjY2Mi4mHhIF+endz');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch (e) {}

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }, []);

  const handleSessionComplete = useCallback(async (type?: SessionType, sessions?: number) => {
    const currentType = type || sessionType;
    const currentSessions = sessions ?? sessionsCompleted;
    
    hasCompletedRef.current = true;
    setIsRunning(false);

    if (currentType === 'focus') {
      // Save session to database
      if (user) {
        await supabase.from('pomodoro_sessions').insert({
          user_id: user.id,
          duration_minutes: DURATIONS.focus / 60,
          session_type: 'focus',
        });
      }

      const newSessions = currentSessions + 1;
      setSessionsCompleted(newSessions);

      // Send notification
      sendNotification('🎉 Sesi Fokus Selesai!', 'Waktunya istirahat sebentar.');

      toast({
        title: 'Sesi Fokus Selesai! 🎉',
        description: 'Waktunya istirahat sebentar.',
      });

      // Auto switch to break
      let nextType: SessionType;
      if (newSessions % 4 === 0) {
        nextType = 'long_break';
      } else {
        nextType = 'short_break';
      }
      setSessionType(nextType);
      setTimeLeft(DURATIONS[nextType]);
      saveState(false, nextType, DURATIONS[nextType], newSessions);
    } else {
      sendNotification('💪 Istirahat Selesai!', 'Siap untuk sesi fokus berikutnya?');
      
      toast({
        title: 'Istirahat Selesai! 💪',
        description: 'Siap untuk sesi fokus berikutnya?',
      });
      setSessionType('focus');
      setTimeLeft(DURATIONS.focus);
      saveState(false, 'focus', DURATIONS.focus, currentSessions);
    }
  }, [sessionType, sessionsCompleted, user, toast, sendNotification, saveState]);

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
      // Starting timer - save start time
      saveState(true, sessionType, timeLeft, sessionsCompleted, Date.now());
    } else {
      // Pausing timer - save remaining time
      saveState(false, sessionType, timeLeft, sessionsCompleted);
    }
  }

  function resetTimer() {
    setIsRunning(false);
    const duration = DURATIONS[sessionType];
    setTimeLeft(duration);
    saveState(false, sessionType, duration, sessionsCompleted);
  }

  function switchSession(type: SessionType) {
    setIsRunning(false);
    setSessionType(type);
    const duration = DURATIONS[type];
    setTimeLeft(duration);
    saveState(false, type, duration, sessionsCompleted);
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  const progress = ((DURATIONS[sessionType] - timeLeft) / DURATIONS[sessionType]) * 100;

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

        {/* Notification Permission */}
        {notificationPermission !== 'granted' && (
          <div className="flex justify-center">
            <Button 
              variant="outline" 
              onClick={requestNotificationPermission}
              className="gap-2"
            >
              <Bell className="h-4 w-4" />
              Aktifkan Notifikasi
            </Button>
          </div>
        )}

        {/* Session Type Tabs */}
        <div className="flex justify-center gap-2">
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
                {sessionsCompleted * 25} min
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
            <p>⏱️ 1 Sesi = 25 menit fokus penuh</p>
            <p>☕ Istirahat 5 menit setelah setiap sesi</p>
            <p>🌟 Istirahat panjang 15 menit setelah 4 sesi</p>
            <p>🔔 Aktifkan notifikasi agar tidak ketinggalan</p>
            <p>✨ Timer tetap berjalan meski pindah halaman</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
