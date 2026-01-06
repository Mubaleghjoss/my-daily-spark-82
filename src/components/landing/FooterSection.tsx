import { CheckSquare, Heart } from 'lucide-react';

export function FooterSection() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-12 px-4 border-t border-border bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg gradient-primary">
              <CheckSquare className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold gradient-text">Aktivitas-Ku</span>
          </div>

          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>Dibuat dengan</span>
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            <span>untuk produktivitas umat</span>
          </div>

          <div className="text-sm text-muted-foreground">
            © {currentYear} Aktivitas-Ku. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
