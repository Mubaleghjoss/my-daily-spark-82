import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, MessageCircle, Heart, ExternalLink, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface PrayerAdvice {
  id: string;
  type: 'doa' | 'nasehat';
  title: string;
  content_arabic: string | null;
  content_indonesian: string;
  source: string | null;
  is_favorite: boolean;
  category: string | null;
  created_at: string;
}

interface PrayerDetailDialogProps {
  item: PrayerAdvice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getCategoryColor: (category: string | null) => string;
  onShare?: (item: PrayerAdvice) => void;
}

export function PrayerDetailDialog({ 
  item, 
  open, 
  onOpenChange, 
  getCategoryColor,
  onShare 
}: PrayerDetailDialogProps) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {item.type === 'doa' ? (
              <BookOpen className="w-5 h-5 text-primary" />
            ) : (
              <MessageCircle className="w-5 h-5 text-secondary" />
            )}
            <Badge variant={item.type === 'doa' ? 'default' : 'secondary'}>
              {item.type === 'doa' ? 'Doa' : 'Nasehat'}
            </Badge>
            {item.category && (
              <Badge 
                variant="outline" 
                style={{ borderColor: getCategoryColor(item.category), color: getCategoryColor(item.category) }}
              >
                {item.category}
              </Badge>
            )}
            {item.is_favorite && (
              <Heart className="w-4 h-4 text-red-500 fill-current" />
            )}
          </div>
          <DialogTitle className="text-xl">{item.title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Arabic Content */}
            {item.type === 'doa' && item.content_arabic && (
              <div className="bg-muted/30 rounded-lg p-4">
                <p 
                  className="text-right font-arabic text-xl leading-[2.5] text-foreground" 
                  dir="rtl"
                >
                  {item.content_arabic}
                </p>
              </div>
            )}

            {/* Indonesian Content */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                {item.type === 'doa' ? 'Arti / Terjemahan:' : 'Isi Nasehat:'}
              </h4>
              <p className="text-base leading-relaxed whitespace-pre-wrap">
                {item.content_indonesian}
              </p>
            </div>

            {/* Source */}
            {item.source && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground italic">
                  📚 Sumber: {item.source}
                </p>
              </div>
            )}

            {/* Date */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>Ditambahkan: {format(new Date(item.created_at), 'dd MMMM yyyy', { locale: idLocale })}</span>
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        {onShare && (
          <div className="flex-shrink-0 pt-4 border-t">
            <Button className="w-full" variant="outline" onClick={() => onShare(item)}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Bagikan ke WhatsApp
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}