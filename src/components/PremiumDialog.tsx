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
import { Crown, Check, MessageCircle, CreditCard, Star } from 'lucide-react';

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

export function PremiumDialog({ open, onOpenChange, featureName }: PremiumDialogProps) {
  const handleWhatsApp = (planName: string) => {
    const message = encodeURIComponent(
      `Halo Admin, saya ingin berlangganan paket ${planName} untuk Aktivitas-Ku. Berikut bukti transfer saya.`
    );
    window.open(`https://wa.me/6283818393029?text=${message}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

        <div className="grid gap-4 md:grid-cols-3 mt-4">
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
        <Card className="mt-4 bg-muted/50">
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
      </DialogContent>
    </Dialog>
  );
}
