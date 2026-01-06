import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckSquare, ArrowRight, Sparkles } from 'lucide-react';

export function HeroSection() {
  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] animate-pulse-slow delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg gradient-primary">
                <CheckSquare className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold gradient-text">Aktivitas-Ku</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <button 
                onClick={scrollToFeatures}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Fitur
              </button>
              <button 
                onClick={scrollToPricing}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Harga
              </button>
              <Link to="/auth">
                <Button variant="outline" size="sm">
                  Masuk
                </Button>
              </Link>
            </div>
            <div className="md:hidden">
              <Link to="/auth">
                <Button variant="outline" size="sm">
                  Masuk
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center pt-20">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-sm text-muted-foreground">Aplikasi Produktivitas #1 untuk Muslim</span>
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
          Tingkatkan{' '}
          <span className="gradient-text">Produktivitas</span>
          <br />& <span className="gradient-text">Spiritualitas</span> Anda
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Kelola aktivitas harian, keuangan, dan kumpulkan doa & nasehat islami dalam satu aplikasi yang modern dan mudah digunakan.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/auth">
            <Button size="lg" className="gradient-primary glow-primary text-lg px-8 h-14">
              Gunakan Gratis
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <Button 
            size="lg" 
            variant="outline" 
            className="text-lg px-8 h-14"
            onClick={scrollToFeatures}
          >
            Lihat Fitur
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 mt-16 max-w-lg mx-auto">
          <div>
            <div className="text-3xl md:text-4xl font-bold gradient-text">100+</div>
            <div className="text-sm text-muted-foreground">Pengguna Aktif</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold gradient-text">6+</div>
            <div className="text-sm text-muted-foreground">Fitur Lengkap</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold gradient-text">4.9</div>
            <div className="text-sm text-muted-foreground">Rating</div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
          <div className="w-1.5 h-3 rounded-full bg-muted-foreground/50" />
        </div>
      </div>
    </section>
  );
}
