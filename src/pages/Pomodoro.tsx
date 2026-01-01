import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Pause, Play, RotateCcw, Timer, Coffee, Target } from 'lucide-react';
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

export default function Pomodoro() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [sessionType, setSessionType] = useState<SessionType>('focus');
  const [timeLeft, setTimeLeft] = useState(DURATIONS.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleSessionComplete();
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft]);

  async function handleSessionComplete() {
    setIsRunning(false);

    if (sessionType === 'focus') {
      // Save session to database
      if (user) {
        await supabase.from('pomodoro_sessions').insert({
          user_id: user.id,
          duration_minutes: DURATIONS.focus / 60,
          session_type: 'focus',
        });
      }

      setSessionsCompleted((prev) => prev + 1);

      toast({
        title: 'Sesi Fokus Selesai! 🎉',
        description: 'Waktunya istirahat sebentar.',
      });

      // Auto switch to break
      if ((sessionsCompleted + 1) % 4 === 0) {
        setSessionType('long_break');
        setTimeLeft(DURATIONS.long_break);
      } else {
        setSessionType('short_break');
        setTimeLeft(DURATIONS.short_break);
      }
    } else {
      toast({
        title: 'Istirahat Selesai! 💪',
        description: 'Siap untuk sesi fokus berikutnya?',
      });
      setSessionType('focus');
      setTimeLeft(DURATIONS.focus);
    }
  }

  function toggleTimer() {
    setIsRunning(!isRunning);
  }

  function resetTimer() {
    setIsRunning(false);
    setTimeLeft(DURATIONS[sessionType]);
  }

  function switchSession(type: SessionType) {
    setIsRunning(false);
    setSessionType(type);
    setTimeLeft(DURATIONS[type]);
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
          <h1 className="text-3xl font-bold gradient-text">Pomodoro Timer</h1>
          <p className="text-muted-foreground mt-2">
            Fokus lebih baik dengan teknik Pomodoro
          </p>
        </div>

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

                <div className="h-12 w-12" /> {/* Spacer for alignment */}
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
              Tips Pomodoro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>🍅 1 Pomodoro = 25 menit fokus penuh</p>
            <p>☕ Istirahat 5 menit setelah setiap sesi</p>
            <p>🌟 Istirahat panjang 15 menit setelah 4 sesi</p>
            <p>📵 Matikan notifikasi selama sesi fokus</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}