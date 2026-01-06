import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Crown, X, AlertTriangle, Clock } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { PremiumDialog } from './PremiumDialog';

export function SubscriptionReminder() {
  const { subscription, isPremium, daysRemaining } = useSubscription();
  const [dismissed, setDismissed] = useState(false);
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);

  // Don't show if:
  // - Not premium
  // - Lifetime subscription (never expires)
  // - No expiration date
  // - More than 7 days remaining
  // - Already dismissed
  if (!isPremium || subscription?.subscription_type === 'lifetime' || daysRemaining === null || daysRemaining > 7 || dismissed) {
    return null;
  }

  const getReminderStyle = () => {
    if (daysRemaining <= 1) {
      return {
        variant: 'destructive' as const,
        icon: AlertTriangle,
        title: 'Langganan Berakhir Hari Ini!',
        message: 'Langganan premium kamu akan berakhir hari ini. Perpanjang sekarang agar tidak kehilangan akses.',
        bgClass: 'bg-destructive/10 border-destructive/30',
      };
    } else if (daysRemaining <= 3) {
      return {
        variant: 'default' as const,
        icon: AlertTriangle,
        title: `${daysRemaining} Hari Lagi!`,
        message: `Langganan premium kamu akan berakhir dalam ${daysRemaining} hari. Perpanjang sekarang untuk harga spesial.`,
        bgClass: 'bg-orange-500/10 border-orange-500/30',
      };
    } else {
      return {
        variant: 'default' as const,
        icon: Clock,
        title: `${daysRemaining} Hari Tersisa`,
        message: 'Langganan premium kamu akan segera berakhir. Pertimbangkan untuk memperpanjang.',
        bgClass: 'bg-amber-500/10 border-amber-500/30',
      };
    }
  };

  const style = getReminderStyle();
  const IconComponent = style.icon;

  return (
    <>
      <Alert className={`mb-4 ${style.bgClass} relative`}>
        <IconComponent className={`h-4 w-4 ${daysRemaining <= 1 ? 'text-destructive' : daysRemaining <= 3 ? 'text-orange-500' : 'text-amber-500'}`} />
        <AlertTitle className="pr-8">{style.title}</AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
          <span className="flex-1">{style.message}</span>
          <Button 
            size="sm" 
            className="gradient-primary glow-primary shrink-0"
            onClick={() => setShowPremiumDialog(true)}
          >
            <Crown className="w-4 h-4 mr-1" />
            Perpanjang
          </Button>
        </AlertDescription>
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-background/50 transition-colors"
          aria-label="Tutup"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </Alert>

      <PremiumDialog 
        open={showPremiumDialog} 
        onOpenChange={setShowPremiumDialog}
        featureName="Perpanjangan Langganan"
      />
    </>
  );
}
