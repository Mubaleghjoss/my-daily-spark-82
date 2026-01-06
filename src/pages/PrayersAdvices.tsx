import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, Copy, BookOpen, MessageCircle, Filter, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface PrayerAdvice {
  id: string;
  type: 'doa' | 'nasehat';
  title: string;
  content_arabic: string | null;
  content_indonesian: string;
  source: string | null;
  created_at: string;
  updated_at: string;
}

type ItemType = 'all' | 'doa' | 'nasehat';

export default function PrayersAdvices() {
  const { user } = useAuth();
  const [items, setItems] = useState<PrayerAdvice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<PrayerAdvice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ItemType>('all');
  const [newItem, setNewItem] = useState({
    type: 'doa' as 'doa' | 'nasehat',
    title: '',
    content_arabic: '',
    content_indonesian: '',
    source: '',
  });

  useEffect(() => {
    if (user) {
      fetchItems();
    }
  }, [user]);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('prayers_advices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems((data || []) as PrayerAdvice[]);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!user || !newItem.title.trim() || !newItem.content_indonesian.trim()) {
      toast.error('Judul dan konten Indonesia wajib diisi');
      return;
    }

    try {
      const { error } = await supabase.from('prayers_advices').insert({
        user_id: user.id,
        type: newItem.type,
        title: newItem.title,
        content_arabic: newItem.content_arabic || null,
        content_indonesian: newItem.content_indonesian,
        source: newItem.source || null,
      });

      if (error) throw error;
      toast.success('Berhasil ditambahkan');
      setNewItem({ type: 'doa', title: '', content_arabic: '', content_indonesian: '', source: '' });
      setShowAddDialog(false);
      fetchItems();
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Gagal menambahkan');
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from('prayers_advices')
        .update({
          type: editingItem.type,
          title: editingItem.title,
          content_arabic: editingItem.content_arabic,
          content_indonesian: editingItem.content_indonesian,
          source: editingItem.source,
        })
        .eq('id', editingItem.id);

      if (error) throw error;
      toast.success('Berhasil diperbarui');
      setEditingItem(null);
      fetchItems();
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Gagal memperbarui');
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const { error } = await supabase.from('prayers_advices').delete().eq('id', id);
      if (error) throw error;
      toast.success('Berhasil dihapus');
      fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Gagal menghapus');
    }
  };

  const handleCopyToWhatsApp = (item: PrayerAdvice) => {
    let text = `*${item.title}*\n\n`;
    
    if (item.content_arabic) {
      text += `${item.content_arabic}\n\n`;
    }
    
    text += `${item.content_indonesian}`;
    
    if (item.source) {
      text += `\n\n_Sumber: ${item.source}_`;
    }

    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
    toast.success('Membuka WhatsApp...');
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content_indonesian.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.content_arabic?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.source?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = filterType === 'all' || item.type === filterType;
    
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold gradient-text">Doa & Nasehat</h1>
            <p className="text-muted-foreground">Kumpulan doa dan nasehat islami</p>
          </div>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Tambah
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tambah Doa / Nasehat</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Tipe</label>
                  <Select 
                    value={newItem.type} 
                    onValueChange={(value: 'doa' | 'nasehat') => setNewItem({ ...newItem, type: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="doa">Doa</SelectItem>
                      <SelectItem value="nasehat">Nasehat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Judul *</label>
                  <Input
                    placeholder="Contoh: Doa Sebelum Makan"
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Teks Arab (opsional)</label>
                  <Textarea
                    placeholder="اللَّهُمَّ بَارِكْ لَنَا..."
                    value={newItem.content_arabic}
                    onChange={(e) => setNewItem({ ...newItem, content_arabic: e.target.value })}
                    className="mt-1 text-right font-arabic text-lg"
                    dir="rtl"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Teks Indonesia *</label>
                  <Textarea
                    placeholder="Ya Allah, berkahilah kami..."
                    value={newItem.content_indonesian}
                    onChange={(e) => setNewItem({ ...newItem, content_indonesian: e.target.value })}
                    className="mt-1"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Sumber / Perawi (opsional)</label>
                  <Input
                    placeholder="Contoh: HR. Bukhari, Syaikh Uthaymeen"
                    value={newItem.source}
                    onChange={(e) => setNewItem({ ...newItem, source: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleAddItem} className="w-full">
                  Simpan
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari doa atau nasehat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={(value: ItemType) => setFilterType(value)}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="doa">Doa</SelectItem>
              <SelectItem value="nasehat">Nasehat</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {item.type === 'doa' ? (
                      <BookOpen className="w-4 h-4 text-primary" />
                    ) : (
                      <MessageCircle className="w-4 h-4 text-secondary" />
                    )}
                    <Badge variant={item.type === 'doa' ? 'default' : 'secondary'}>
                      {item.type === 'doa' ? 'Doa' : 'Nasehat'}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditingItem(item)}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <h3 className="font-semibold text-sm">{item.title}</h3>

                {item.content_arabic && (
                  <p className="text-right font-arabic text-base leading-loose text-foreground/90" dir="rtl">
                    {item.content_arabic}
                  </p>
                )}

                <p className="text-sm text-muted-foreground line-clamp-3">
                  {item.content_indonesian}
                </p>

                {item.source && (
                  <p className="text-xs text-muted-foreground italic">
                    Sumber: {item.source}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(item.created_at), 'dd MMM yyyy', { locale: idLocale })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handleCopyToWhatsApp(item)}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Share WA
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Belum ada doa atau nasehat</p>
            <p className="text-sm">Tambahkan doa atau nasehat pertama Anda</p>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Doa / Nasehat</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Tipe</label>
                <Select 
                  value={editingItem.type} 
                  onValueChange={(value: 'doa' | 'nasehat') => setEditingItem({ ...editingItem, type: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doa">Doa</SelectItem>
                    <SelectItem value="nasehat">Nasehat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Judul</label>
                <Input
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Teks Arab</label>
                <Textarea
                  value={editingItem.content_arabic || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, content_arabic: e.target.value })}
                  className="mt-1 text-right font-arabic text-lg"
                  dir="rtl"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Teks Indonesia</label>
                <Textarea
                  value={editingItem.content_indonesian}
                  onChange={(e) => setEditingItem({ ...editingItem, content_indonesian: e.target.value })}
                  className="mt-1"
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Sumber / Perawi</label>
                <Input
                  value={editingItem.source || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, source: e.target.value })}
                  className="mt-1"
                />
              </div>
              <Button onClick={handleUpdateItem} className="w-full">
                Simpan Perubahan
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
