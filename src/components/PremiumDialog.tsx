import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Crown, Check, MessageCircle, CreditCard, Star, Ticket, Loader2,
  Timer, FileText, Wallet, Calendar, ListTodo, BarChart3, BookOpen, Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface PremiumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName?: string;
}

const plans = [
  {
    id: 'monthly',
    name: 'Bulanan',
    price: 5000,
    priceLabel: 'Rp 5.000',
    period: '/bulan',
    features: ['Akses Focus Timer', 'Akses Catatan', 'Akses Budget & Export'],
    popular: false,
  },
  {
    id: 'yearly',
    name: 'Tahunan',
    price: 50000,
    priceLabel: 'Rp 50.000',
    period: '/tahun',
    features: ['Semua fitur Bulanan', 'Hemat 17%', 'Prioritas support'],
    popular: true,
  },
  {
    id: 'lifetime',
    name: 'Selamanya',
    price: 250000,
    priceLabel: 'Rp 250.000',
    period: 'sekali bayar',
    features: ['Akses selamanya', 'Semua fitur premium', 'Update gratis selamanya'],
    popular: false,
  },
];

// Premium features explanation
const premiumFeatures = [
  {
    icon: Timer,
    name: 'Focus Timer (Pomodoro)',
    description: 'Tingkatkan produktivitas dengan teknik Pomodoro. Fokus 25 menit, istirahat 5 menit. Dilengkapi statistik sesi untuk melacak progres kerja Anda.',
  },
  {
    icon: FileText,
    name: 'Catatan Pribadi',
    description: 'Simpan catatan penting dengan mudah. Tulis ide, memo, atau reminder. Catatan tersimpan aman dan bisa diakses kapan saja.',
  },
  {
    icon: Wallet,
    name: 'Kelola Budget',
    description: 'Atur budget pengeluaran bulanan untuk setiap kategori. Pantau apakah pengeluaran masih dalam batas yang sudah ditentukan.',
  },
  {
    icon: BarChart3,
    name: 'Export Data',
    description: 'Download data transaksi keuangan ke format Excel. Cocok untuk analisis lebih lanjut atau arsip pribadi.',
  },
  {
    icon: BookOpen,
    name: 'Koleksi Doa Publik',
    description: 'Akses koleksi doa dan nasehat dari pengguna lain. Salin ke koleksi pribadi untuk dipelajari dan diamalkan.',
  },
  {
    icon: Calendar,
    name: 'Analitik Lengkap',
    description: 'Lihat statistik aktivitas dan keuangan dalam bentuk grafik. Pahami pola produktivitas dan kebiasaan finansial Anda.',
  },
];

interface ActivePromo {
  code: string;
  subscription_type: string;
  duration_days: number;
  duration_hours: number;
}

export function PremiumDialog({ open, onOpenChange, featureName }: PremiumDialogProps) {
  const { user } = useAuth();
  const [promoCode, setPromoCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [activePromo, setActivePromo] = useState<ActivePromo | null>(null);

  // Fetch one active promo code to display
  useEffect(() => {
    async function fetchActivePromo() {
      const { data } = await supabase
        .from('promo_codes')
        .select('code, subscription_type, duration_days, duration_hours')
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data) {
        setActivePromo(data as ActivePromo);
      }
    }
    
    if (open) {
      fetchActivePromo();
    }
  }, [open]);

  const handleWhatsApp = (planName: string) => {
    const message = encodeURIComponent(
      `Halo Admin, saya ingin berlangganan paket ${planName} untuk Aktivitas-Ku. Berikut bukti transfer saya.`
    );
    window.open(`https://wa.me/6283818393029?text=${message}`, '_blank');
  };

  const handleRedeemPromo = async () => {
    if (!user || !promoCode.trim()) {
      toast.error('Masukkan kode promo');
      return;
    }

    setIsRedeeming(true);
    try {
      // Use atomic server-side RPC function for secure promo redemption
      const { data, error } = await supabase.rpc('redeem_promo_code', {
        p_code: promoCode.trim().toUpperCase()
      });

      // Cast the response to expected type
      const result = data as { duration_days?: number; duration_hours?: number; subscription_type?: string } | null;

      if (error) {
        // Map known error codes to user-friendly messages
        const errorMessages: Record<string, string> = {
          'PROMO_NOT_FOUND': 'Kode promo tidak valid',
          'PROMO_INACTIVE': 'Kode promo sudah tidak aktif',
          'PROMO_EXPIRED': 'Kode promo sudah kedaluwarsa',
          'PROMO_MAX_USES': 'Kode promo sudah mencapai batas penggunaan',
          'ALREADY_REDEEMED': 'Anda sudah pernah menggunakan kode promo ini',
          'NOT_AUTHENTICATED': 'Anda harus login terlebih dahulu'
        };
        const message = errorMessages[error.message] || 'Gagal menggunakan kode promo. Silakan coba lagi.';
        toast.error(message);
        return;
      }

      // Calculate duration text for success message
      const durationParts: string[] = [];
      const promoResult = data as { duration_days?: number; duration_hours?: number } | null;
      if (promoResult?.duration_days && promoResult.duration_days > 0) {
        durationParts.push(`${promoResult.duration_days} hari`);
      }
      if (promoResult?.duration_hours && promoResult.duration_hours > 0) {
        durationParts.push(`${promoResult.duration_hours} jam`);
      }
      const durationText = durationParts.join(' ') || 'selamanya';

      toast.success(`🎉 Selamat! Premium Anda bertambah ${durationText}!`);
      setPromoCode('');
      onOpenChange(false);
      
      // Reload to update subscription status
      window.location.reload();
    } catch (error: any) {
      console.error('Error redeeming promo:', error);
      toast.error('Gagal menggunakan kode promo. Silakan coba lagi.');
    } finally {
      setIsRedeeming(false);
    }
  };

  const formatPromoDuration = (promo: ActivePromo) => {
    const parts = [];
    if (promo.duration_days > 0) parts.push(`${promo.duration_days} hari`);
    if (promo.duration_hours > 0) parts.push(`${promo.duration_hours} jam`);
    if (promo.subscription_type === 'lifetime') return 'selamanya';
    return parts.join(' ') || '24 jam';
  };

  const getSubscriptionLabel = (type: string) => {
    switch (type) {
      case 'monthly': return 'Bulanan';
      case 'yearly': return 'Tahunan';
      case 'lifetime': return 'Selamanya';
      default: return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            <DialogHeader className="text-center">
              <div className="flex justify-center mb-2">
                <div className="p-3 rounded-full bg-amber-500/20">
                  <Crown className="h-8 w-8 text-amber-500" />
                </div>
              </div>
              <DialogTitle className="text-2xl">Upgrade ke Premium</DialogTitle>
              <DialogDescription>
                {featureName 
                  ? `Fitur "${featureName}" hanya tersedia untuk member premium.`
                  : 'Dapatkan akses ke semua fitur premium!'}
              </DialogDescription>
            </DialogHeader>

            {/* Active Promo Code Display */}
            {activePromo && (
              <Card className="mt-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-green-500" />
                      <span className="font-medium">Promo Aktif!</span>
                    </div>
                    <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-300">
                      {getSubscriptionLabel(activePromo.subscription_type)} - {formatPromoDuration(activePromo)}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="px-3 py-1 bg-background rounded border font-mono text-lg font-bold">
                      {activePromo.code}
                    </code>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setPromoCode(activePromo.code);
                        toast.success('Kode promo disalin!');
                      }}
                    >
                      Gunakan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Promo Code Input Section */}
            <Card className="mt-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Ticket className="h-5 w-5 text-amber-500" />
                  <h4 className="font-semibold">Punya Kode Promo?</h4>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Masukkan kode promo"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    className="flex-1 uppercase font-mono"
                    onKeyDown={(e) => e.key === 'Enter' && handleRedeemPromo()}
                  />
                  <Button 
                    onClick={handleRedeemPromo} 
                    disabled={isRedeeming || !promoCode.trim()}
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    {isRedeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Redeem'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Separator className="my-6" />

            {/* Premium Features Explanation */}
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                Fitur Premium yang Akan Kamu Dapatkan
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {premiumFeatures.map((feature, index) => (
                  <Card key={index} className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <feature.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{feature.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator className="my-6" />

            {/* Pricing Plans */}
            <h3 className="font-semibold text-lg mb-4">Pilih Paket Langganan</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`relative ${plan.popular ? 'border-amber-500 border-2' : 'border-border'}`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white">
                      <Star className="h-3 w-3 mr-1" />
                      Populer
                    </Badge>
                  )}
                  <CardContent className="p-4 pt-6 text-center">
                    <h3 className="font-semibold text-lg">{plan.name}</h3>
                    <div className="mt-2">
                      <span className="text-2xl font-bold">{plan.priceLabel}</span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                    <ul className="mt-4 space-y-2 text-sm text-left">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Payment Info */}
            <Card className="mt-6 bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Informasi Pembayaran</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bank</span>
                    <span className="font-medium">BCA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Atas Nama</span>
                    <span className="font-medium">Putra Kamulyan</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">No. Rekening</span>
                    <span className="font-mono font-medium">6044499716</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* WhatsApp Button */}
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground text-center">
                Setelah transfer, kirim bukti pembayaran via WhatsApp:
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleWhatsApp('Bulanan (Rp 5.000)')}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Bulanan - Rp 5.000
                </Button>
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleWhatsApp('Tahunan (Rp 50.000)')}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Tahunan - Rp 50.000
                </Button>
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleWhatsApp('Selamanya (Rp 250.000)')}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Selamanya - Rp 250.000
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Admin akan memproses langganan Anda dalam 1x24 jam setelah konfirmasi pembayaran.
            </p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}