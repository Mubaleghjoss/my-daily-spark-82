import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Crown, Zap } from 'lucide-react';

const plans = [
  {
    id: 'free',
    name: 'Gratis',
    price: 'Rp 0',
    period: 'selamanya',
    description: 'Untuk mulai produktif',
    features: [
      'Aktivitas Harian',
      'Kalender',
      'Analitik Dasar',
      'Keuangan (Dasar)',
      'Doa & Nasehat Pribadi',
    ],
    limitations: [
      'Tanpa Focus Timer',
      'Tanpa Catatan',
      'Tanpa Budget & Export',
    ],
    popular: false,
    cta: 'Mulai Gratis',
    ctaVariant: 'outline' as const,
  },
  {
    id: 'monthly',
    name: 'Bulanan',
    price: 'Rp 5.000',
    period: '/bulan',
    description: 'Fitur lengkap setiap bulan',
    features: [
      'Semua fitur Gratis',
      'Focus Timer (Pomodoro)',
      'Catatan Tak Terbatas',
      'Budget & Export',
      'Transaksi Berulang',
      'Koleksi Doa Publik',
    ],
    limitations: [],
    popular: false,
    cta: 'Pilih Bulanan',
    ctaVariant: 'outline' as const,
  },
  {
    id: 'yearly',
    name: 'Tahunan',
    price: 'Rp 50.000',
    period: '/tahun',
    description: 'Hemat lebih banyak',
    features: [
      'Semua fitur Premium',
      'Hemat 17% dari bulanan',
      'Prioritas Support',
      'Early Access Fitur Baru',
    ],
    limitations: [],
    popular: true,
    cta: 'Pilih Tahunan',
    ctaVariant: 'default' as const,
    savings: 'Hemat Rp 10.000',
  },
  {
    id: 'lifetime',
    name: 'Selamanya',
    price: 'Rp 250.000',
    period: 'sekali bayar',
    description: 'Investasi terbaik',
    features: [
      'Semua fitur Premium',
      'Akses Selamanya',
      'Update Gratis Selamanya',
      'VIP Support',
      'Bonus Fitur Eksklusif',
    ],
    limitations: [],
    popular: false,
    cta: 'Pilih Selamanya',
    ctaVariant: 'outline' as const,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            <Crown className="w-3 h-3 mr-1 text-amber-500" />
            Harga Terjangkau
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pilih Paket yang Sesuai
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Mulai gratis, upgrade kapan saja. Semua paket premium termasuk akses ke semua fitur.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`relative flex flex-col ${
                plan.popular 
                  ? 'border-primary border-2 shadow-lg shadow-primary/10' 
                  : 'border-border'
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-primary">
                  <Star className="w-3 h-3 mr-1" />
                  Paling Populer
                </Badge>
              )}
              {plan.savings && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-3 right-4 bg-green-500/10 text-green-500 border-green-500/20"
                >
                  {plan.savings}
                </Badge>
              )}
              
              <CardHeader className="text-center pb-2">
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col">
                <div className="text-center mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm ml-1">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {plan.limitations.map((limitation, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">—</span>
                      <span>{limitation}</span>
                    </li>
                  ))}
                </ul>

                <Link to={`/auth?plan=${plan.id}`}>
                  <Button 
                    className={`w-full ${plan.popular ? 'gradient-primary glow-primary' : ''}`}
                    variant={plan.ctaVariant}
                  >
                    {plan.id !== 'free' && <Zap className="w-4 h-4 mr-2" />}
                    {plan.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Payment Info */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Pembayaran via transfer bank. Akun aktif dalam 1x24 jam setelah konfirmasi.
          </p>
        </div>
      </div>
    </section>
  );
}
