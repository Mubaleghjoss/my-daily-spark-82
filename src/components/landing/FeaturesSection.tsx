import { 
  CheckSquare, 
  Timer, 
  Wallet, 
  StickyNote, 
  Heart, 
  CalendarDays,
  Crown,
  BarChart3,
  RefreshCw,
  Globe
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const features = [
  {
    icon: CheckSquare,
    title: 'Aktivitas Harian',
    description: 'Kelola rutinitas dan to-do list harian dengan mudah. Atur prioritas dan pantau progress aktivitasmu.',
    premium: false,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: Timer,
    title: 'Focus Timer',
    description: 'Teknik Pomodoro untuk meningkatkan fokus dan produktivitas. Dilengkapi statistik sesi kerja.',
    premium: true,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    icon: Wallet,
    title: 'Keuangan',
    description: 'Catat pemasukan dan pengeluaran. Kelola budget dan lihat laporan keuangan lengkap.',
    premium: 'partial',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    premiumFeatures: ['Budget', 'Export', 'Transaksi Berulang'],
  },
  {
    icon: StickyNote,
    title: 'Catatan',
    description: 'Simpan ide, catatan penting, dan memo dalam format yang terorganisir dengan baik.',
    premium: true,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    icon: Heart,
    title: 'Doa & Nasehat',
    description: 'Koleksi doa harian dan nasehat islami. Simpan favorit dan akses koleksi publik.',
    premium: 'partial',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    premiumFeatures: ['Koleksi Publik'],
  },
  {
    icon: CalendarDays,
    title: 'Kalender',
    description: 'Lihat semua aktivitas dalam tampilan kalender. Rencanakan harimu dengan lebih baik.',
    premium: false,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
  {
    icon: BarChart3,
    title: 'Analitik',
    description: 'Pantau statistik produktivitas dan aktivitasmu dengan grafik yang informatif.',
    premium: false,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
  },
  {
    icon: RefreshCw,
    title: 'Transaksi Berulang',
    description: 'Atur transaksi rutin seperti gaji, tagihan, atau langganan yang otomatis tercatat.',
    premium: true,
    color: 'text-teal-500',
    bgColor: 'bg-teal-500/10',
  },
  {
    icon: Globe,
    title: 'Doa Publik',
    description: 'Akses ribuan doa dan nasehat dari komunitas tanpa perlu membuat sendiri.',
    premium: true,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 px-4 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Fitur Lengkap
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Semua yang Kamu Butuhkan
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Dari manajemen aktivitas hingga keuangan, semuanya ada dalam satu aplikasi yang terintegrasi.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="group hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${feature.bgColor}`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  {feature.premium === true && (
                    <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                      <Crown className="w-3 h-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                  {feature.premium === 'partial' && (
                    <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                      <Crown className="w-3 h-3 mr-1" />
                      Sebagian
                    </Badge>
                  )}
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {feature.description}
                </p>
                {feature.premiumFeatures && (
                  <div className="flex flex-wrap gap-1">
                    {feature.premiumFeatures.map((pf, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        <Crown className="w-2.5 h-2.5 mr-1 text-amber-500" />
                        {pf}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
