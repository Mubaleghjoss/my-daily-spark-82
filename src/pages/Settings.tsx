import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';
import { 
  User, 
  Mail, 
  Lock, 
  Palette,
  Loader2,
  Check,
  Moon,
  Sun,
  RefreshCw,
  Download,
  Smartphone
} from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    needRefresh, 
    offlineReady, 
    updateServiceWorker, 
    checkForUpdates, 
    isChecking, 
    lastChecked 
  } = usePWAUpdate();
  
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [isDark, setIsDark] = useState(true);

  async function handleUpdateApp() {
    await updateServiceWorker();
    toast({
      title: 'Mengupdate...',
      description: 'Aplikasi akan di-refresh untuk menerapkan update',
    });
  }

  async function handleCheckUpdates() {
    await checkForUpdates();
    if (!needRefresh) {
      toast({
        title: 'Tidak ada update',
        description: 'Aplikasi sudah versi terbaru',
      });
    }
  }

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setDisplayName(user.user_metadata?.full_name || '');
    }
    
    // Check current theme
    setIsDark(document.documentElement.classList.contains('dark'));
  }, [user]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      data: { full_name: displayName }
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Also update profiles table
      await supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('user_id', user!.id);

      toast({ title: 'Berhasil!', description: 'Profil berhasil diperbarui' });
    }
    setLoading(false);
  }

  async function handleUpdateEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ email });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ 
        title: 'Berhasil!', 
        description: 'Link konfirmasi telah dikirim ke email baru' 
      });
    }
    setLoading(false);
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({ 
        title: 'Error', 
        description: 'Password baru tidak cocok', 
        variant: 'destructive' 
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({ 
        title: 'Error', 
        description: 'Password minimal 6 karakter', 
        variant: 'destructive' 
      });
      return;
    }

    setPasswordLoading(true);

    const { error } = await supabase.auth.updateUser({ 
      password: newPassword 
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Berhasil!', description: 'Password berhasil diperbarui' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setPasswordLoading(false);
  }

  function toggleTheme() {
    const newTheme = !isDark;
    setIsDark(newTheme);
    
    // Add transition class for smooth animation
    document.documentElement.classList.add('theme-transition');
    
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    
    // Remove transition class after animation completes
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transition');
    }, 300);
  }

  const themeColors = [
    { name: 'Ungu', hue: '262' },
    { name: 'Biru', hue: '217' },
    { name: 'Hijau', hue: '142' },
    { name: 'Pink', hue: '330' },
    { name: 'Orange', hue: '25' },
  ];

  function setThemeColor(hue: string) {
    document.documentElement.style.setProperty('--neon-purple', `${hue} 83% 58%`);
    document.documentElement.style.setProperty('--primary', `${hue} 83% 58%`);
    document.documentElement.style.setProperty('--ring', `${hue} 83% 58%`);
    localStorage.setItem('themeHue', hue);
    toast({ title: 'Tema diperbarui!', description: 'Warna tema berhasil diubah' });
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Pengaturan</h1>
          <p className="text-muted-foreground">Kelola akun dan preferensimu</p>
        </div>

        {/* App Update Settings */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Update Aplikasi
            </CardTitle>
            <CardDescription>Kelola update aplikasi PWA</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/50">
              <div className="space-y-1">
                <p className="font-medium">Status Aplikasi</p>
                <p className="text-sm text-muted-foreground">
                  {needRefresh ? (
                    <span className="text-green-500 flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      Update tersedia!
                    </span>
                  ) : offlineReady ? (
                    <span className="text-blue-500">✓ Siap offline & terbaru</span>
                  ) : (
                    <span>Memeriksa...</span>
                  )}
                </p>
                {lastChecked && (
                  <p className="text-xs text-muted-foreground">
                    Terakhir dicek: {lastChecked.toLocaleTimeString('id-ID')}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={handleCheckUpdates}
                disabled={isChecking}
                className="flex-1"
              >
                {isChecking ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Cek Update
              </Button>
              
              {needRefresh && (
                <Button
                  onClick={handleUpdateApp}
                  className="flex-1 gradient-primary"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Update Sekarang
                </Button>
              )}
            </div>

            <div className="text-xs text-muted-foreground space-y-1 p-3 rounded bg-muted/30">
              <p>💡 Tips:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Aplikasi akan otomatis mengecek update setiap 30 menit</li>
                <li>Saat ada update, tekan "Update Sekarang" untuk menerapkan</li>
                <li>Tidak perlu uninstall atau hapus cache</li>
              </ul>
            </div>
          </CardContent>
        </Card>


        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Profil
            </CardTitle>
            <CardDescription>Perbarui informasi profilmu</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Nama</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nama lengkap"
                />
              </div>
              <Button type="submit" disabled={loading} className="gradient-primary">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Simpan Profil
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Email
            </CardTitle>
            <CardDescription>Ubah alamat email akunmu</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              <Button type="submit" disabled={loading} className="gradient-primary">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Perbarui Email
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password Settings */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Password
            </CardTitle>
            <CardDescription>Ubah password akunmu</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Password Baru</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" disabled={passwordLoading} className="gradient-primary">
                {passwordLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Perbarui Password
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Tampilan
            </CardTitle>
            <CardDescription>Sesuaikan tampilan aplikasi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dark/Light Mode */}
            <div className="space-y-3">
              <Label>Mode Tema</Label>
              <div className="flex gap-2">
                <Button
                  variant={isDark ? 'default' : 'outline'}
                  onClick={() => { if (!isDark) toggleTheme(); }}
                  className={isDark ? 'gradient-primary' : ''}
                >
                  <Moon className="h-4 w-4 mr-2" />
                  Dark
                </Button>
                <Button
                  variant={!isDark ? 'default' : 'outline'}
                  onClick={() => { if (isDark) toggleTheme(); }}
                  className={!isDark ? 'gradient-primary' : ''}
                >
                  <Sun className="h-4 w-4 mr-2" />
                  Light
                </Button>
              </div>
            </div>

            {/* Color Theme */}
            <div className="space-y-3">
              <Label>Warna Aksen</Label>
              <div className="flex flex-wrap gap-3">
                {themeColors.map((color) => (
                  <button
                    key={color.hue}
                    onClick={() => setThemeColor(color.hue)}
                    className="w-10 h-10 rounded-full border-2 border-border hover:scale-110 transition-transform"
                    style={{ 
                      backgroundColor: `hsl(${color.hue}, 83%, 58%)` 
                    }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
