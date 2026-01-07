import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { PremiumDialog } from '@/components/PremiumDialog';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, BookOpen, MessageCircle, Filter, ExternalLink, Heart, Tag, X, Crown, Globe, Eye, Copy, Loader2 } from 'lucide-react';
import { PrayerDetailDialog } from '@/components/PrayerDetailDialog';
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
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

type ItemType = 'all' | 'doa' | 'nasehat';
type FavoriteFilter = 'all' | 'favorite';

const defaultCategories = [
  { name: 'Doa Harian', color: '#22c55e' },
  { name: 'Doa Pagi & Petang', color: '#3b82f6' },
  { name: 'Doa Makan', color: '#f59e0b' },
  { name: 'Doa Tidur', color: '#8b5cf6' },
  { name: 'Doa Perjalanan', color: '#06b6d4' },
  { name: 'Nasehat Ulama', color: '#ec4899' },
  { name: 'Motivasi', color: '#ef4444' },
];

export default function PrayersAdvices() {
  const { user } = useAuth();
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  const [items, setItems] = useState<PrayerAdvice[]>([]);
  const [publicItems, setPublicItems] = useState<PrayerAdvice[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);
  const [detailItem, setDetailItem] = useState<PrayerAdvice | null>(null);
  const [editingItem, setEditingItem] = useState<PrayerAdvice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ItemType>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterFavorite, setFilterFavorite] = useState<FavoriteFilter>('all');
  const [activeTab, setActiveTab] = useState<'my' | 'public'>('my');
  const [publicSearchQuery, setPublicSearchQuery] = useState('');
  const [publicFilterType, setPublicFilterType] = useState<ItemType>('all');
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', color: '#6366f1' });
  const [newItem, setNewItem] = useState({
    type: 'doa' as 'doa' | 'nasehat',
    title: '',
    content_arabic: '',
    content_indonesian: '',
    source: '',
    category: '',
  });

  useEffect(() => {
    if (user) {
      fetchItems();
      fetchCategories();
    }
  }, [user]);

  useEffect(() => {
    if (user && isPremium && activeTab === 'public') {
      fetchPublicItems();
    }
  }, [user, isPremium, activeTab]);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('prayers_advices')
        .select('*')
        .eq('user_id', user?.id)
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

  const fetchPublicItems = async () => {
    if (!isPremium) return;
    
    try {
      const { data, error } = await supabase
        .from('prayers_advices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPublicItems((data || []) as PrayerAdvice[]);
    } catch (error) {
      console.error('Error fetching public items:', error);
      toast.error('Gagal memuat data publik');
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('prayer_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories((data || []) as Category[]);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleAddCategory = async () => {
    if (!user || !newCategory.name.trim()) return;

    try {
      const { error } = await supabase.from('prayer_categories').insert({
        user_id: user.id,
        name: newCategory.name,
        color: newCategory.color,
      });

      if (error) throw error;
      toast.success('Kategori berhasil ditambahkan');
      setNewCategory({ name: '', color: '#6366f1' });
      fetchCategories();
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Gagal menambahkan kategori');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const { error } = await supabase.from('prayer_categories').delete().eq('id', id);
      if (error) throw error;
      toast.success('Kategori berhasil dihapus');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Gagal menghapus kategori');
    }
  };

  const initDefaultCategories = async () => {
    if (!user) return;
    
    try {
      const inserts = defaultCategories.map(cat => ({
        user_id: user.id,
        name: cat.name,
        color: cat.color,
      }));
      
      const { error } = await supabase.from('prayer_categories').insert(inserts);
      if (error) throw error;
      toast.success('Kategori default berhasil ditambahkan');
      fetchCategories();
    } catch (error) {
      console.error('Error adding default categories:', error);
      toast.error('Gagal menambahkan kategori default');
    }
  };

  const handleAddItem = async () => {
    if (!user || !newItem.title.trim() || !newItem.content_indonesian.trim()) {
      toast.error('Judul dan konten wajib diisi');
      return;
    }

    try {
      const { error } = await supabase.from('prayers_advices').insert({
        user_id: user.id,
        type: newItem.type,
        title: newItem.title,
        content_arabic: newItem.type === 'doa' ? (newItem.content_arabic || null) : null,
        content_indonesian: newItem.content_indonesian,
        source: newItem.source || null,
        category: newItem.category || null,
      });

      if (error) throw error;
      toast.success('Berhasil ditambahkan');
      setNewItem({ type: 'doa', title: '', content_arabic: '', content_indonesian: '', source: '', category: '' });
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
          content_arabic: editingItem.type === 'doa' ? editingItem.content_arabic : null,
          content_indonesian: editingItem.content_indonesian,
          source: editingItem.source,
          category: editingItem.category,
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

  const handleToggleFavorite = async (item: PrayerAdvice) => {
    try {
      const { error } = await supabase
        .from('prayers_advices')
        .update({ is_favorite: !item.is_favorite })
        .eq('id', item.id);

      if (error) throw error;
      setItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, is_favorite: !i.is_favorite } : i
      ));
      toast.success(item.is_favorite ? 'Dihapus dari favorit' : 'Ditambahkan ke favorit');
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Gagal memperbarui favorit');
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
    
    if (item.type === 'doa' && item.content_arabic) {
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

  const handleDuplicateToPrivate = async (item: PrayerAdvice) => {
    if (!user || !isPremium) return;

    setDuplicating(item.id);
    try {
      const { error } = await supabase.from('prayers_advices').insert({
        user_id: user.id,
        type: item.type,
        title: item.title,
        content_arabic: item.content_arabic,
        content_indonesian: item.content_indonesian,
        source: item.source,
        category: item.category,
        is_favorite: false,
      });

      if (error) throw error;
      toast.success('Berhasil disalin ke koleksi pribadi');
      fetchItems();
    } catch (error) {
      console.error('Error duplicating item:', error);
      toast.error('Gagal menyalin ke koleksi pribadi');
    } finally {
      setDuplicating(null);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content_indonesian.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.content_arabic?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.source?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    const matchesFavorite = filterFavorite === 'all' || item.is_favorite;
    
    return matchesSearch && matchesType && matchesCategory && matchesFavorite;
  });

  const filteredPublicItems = publicItems.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(publicSearchQuery.toLowerCase()) ||
      item.content_indonesian.toLowerCase().includes(publicSearchQuery.toLowerCase()) ||
      (item.content_arabic?.toLowerCase().includes(publicSearchQuery.toLowerCase())) ||
      (item.source?.toLowerCase().includes(publicSearchQuery.toLowerCase()));
    
    const matchesType = publicFilterType === 'all' || item.type === publicFilterType;
    
    return matchesSearch && matchesType;
  });

  const getCategoryColor = (categoryName: string | null) => {
    if (!categoryName) return '#6366f1';
    const cat = categories.find(c => c.name === categoryName);
    return cat?.color || '#6366f1';
  };

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
          
          <div className="flex gap-2">
            <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Tag className="w-4 h-4 mr-2" />
                  Kategori
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Kelola Kategori</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nama kategori"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                      className="flex-1"
                    />
                    <Input
                      type="color"
                      value={newCategory.color}
                      onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                      className="w-14 p-1 h-10"
                    />
                    <Button onClick={handleAddCategory} size="icon">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {categories.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground text-sm mb-2">Belum ada kategori</p>
                      <Button variant="outline" size="sm" onClick={initDefaultCategories}>
                        Tambahkan Kategori Default
                      </Button>
                    </div>
                  )}
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {categories.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="text-sm">{cat.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteCategory(cat.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

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
                    <label className="text-sm font-medium">Kategori</label>
                    <Select 
                      value={newItem.category || 'none'} 
                      onValueChange={(value) => setNewItem({ ...newItem, category: value === 'none' ? '' : value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Pilih kategori (opsional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Tanpa Kategori</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.name}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: cat.color }}
                              />
                              {cat.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Judul *</label>
                    <Input
                      placeholder={newItem.type === 'doa' ? "Contoh: Doa Sebelum Makan" : "Contoh: Keutamaan Sabar"}
                      value={newItem.title}
                      onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  {newItem.type === 'doa' ? (
                    <>
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
                        <label className="text-sm font-medium">Arti / Terjemahan *</label>
                        <Textarea
                          placeholder="Ya Allah, berkahilah kami..."
                          value={newItem.content_indonesian}
                          onChange={(e) => setNewItem({ ...newItem, content_indonesian: e.target.value })}
                          className="mt-1"
                          rows={4}
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="text-sm font-medium">Isi Nasehat *</label>
                      <p className="text-xs text-muted-foreground mb-1">
                        Tulis nasehat dalam format artikel. Anda bisa mencampur teks Arab dan Indonesia.
                      </p>
                      <Textarea
                        placeholder="Tulis nasehat di sini... Anda bisa menulis dalam bahasa Arab dan Indonesia secara bersamaan dalam satu teks."
                        value={newItem.content_indonesian}
                        onChange={(e) => setNewItem({ ...newItem, content_indonesian: e.target.value })}
                        className="mt-1"
                        rows={8}
                      />
                    </div>
                  )}

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
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'my' | 'public')}>
          <TabsList className="mb-4">
            <TabsTrigger value="my">Koleksi Saya</TabsTrigger>
            <TabsTrigger 
              value="public"
              onClick={(e) => {
                if (!isPremium) {
                  e.preventDefault();
                  setShowPremiumDialog(true);
                }
              }}
              className="relative"
            >
              <Globe className="w-4 h-4 mr-1" />
              Publik
              {!isPremium && <Crown className="h-3 w-3 ml-1 text-amber-500" />}
            </TabsTrigger>
          </TabsList>

          {/* Koleksi Saya Tab */}
          <TabsContent value="my" className="space-y-4">
            {/* Filters */}
            <div className="space-y-3">
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
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="doa">Doa</SelectItem>
                    <SelectItem value="nasehat">Nasehat</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Tag className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Tabs value={filterFavorite} onValueChange={(v) => setFilterFavorite(v as FavoriteFilter)}>
                <TabsList>
                  <TabsTrigger value="all">Semua</TabsTrigger>
                  <TabsTrigger value="favorite" className="gap-1">
                    <Heart className="w-3 h-3" />
                    Favorit
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.type === 'doa' ? (
                          <BookOpen className="w-4 h-4 text-primary flex-shrink-0" />
                        ) : (
                          <MessageCircle className="w-4 h-4 text-secondary flex-shrink-0" />
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
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 ${item.is_favorite ? 'text-red-500' : ''}`}
                          onClick={() => handleToggleFavorite(item)}
                        >
                          <Heart className={`w-3 h-3 ${item.is_favorite ? 'fill-current' : ''}`} />
                        </Button>
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

                    {item.type === 'doa' && item.content_arabic && (
                      <p className="text-right font-arabic text-base leading-loose text-foreground/90" dir="rtl">
                        {item.content_arabic}
                      </p>
                    )}

                    <p className={`text-sm text-muted-foreground ${item.type === 'nasehat' ? 'line-clamp-4 whitespace-pre-wrap' : 'line-clamp-3'}`}>
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
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => setDetailItem(item)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Selengkapnya
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => handleCopyToWhatsApp(item)}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
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
          </TabsContent>

          {/* Publik Tab */}
          <TabsContent value="public" className="space-y-4">
            {!isPremium ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Crown className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Fitur Premium</h3>
                  <p className="text-muted-foreground mb-4">
                    Akses kumpulan doa & nasehat dari semua pengguna dengan berlangganan premium
                  </p>
                  <Button onClick={() => setShowPremiumDialog(true)}>
                    Lihat Paket Berlangganan
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Public Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari doa atau nasehat publik..."
                      value={publicSearchQuery}
                      onChange={(e) => setPublicSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={publicFilterType} onValueChange={(value: ItemType) => setPublicFilterType(value)}>
                    <SelectTrigger className="w-full sm:w-[140px]">
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

                {/* Public Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPublicItems.map((item) => (
                    <Card key={item.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.type === 'doa' ? (
                              <BookOpen className="w-4 h-4 text-primary flex-shrink-0" />
                            ) : (
                              <MessageCircle className="w-4 h-4 text-secondary flex-shrink-0" />
                            )}
                            <Badge variant={item.type === 'doa' ? 'default' : 'secondary'}>
                              {item.type === 'doa' ? 'Doa' : 'Nasehat'}
                            </Badge>
                            {item.category && (
                              <Badge variant="outline">
                                {item.category}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <h3 className="font-semibold text-sm">{item.title}</h3>

                        {item.type === 'doa' && item.content_arabic && (
                          <p className="text-right font-arabic text-base leading-loose text-foreground/90" dir="rtl">
                            {item.content_arabic}
                          </p>
                        )}

                        <p className={`text-sm text-muted-foreground ${item.type === 'nasehat' ? 'line-clamp-4 whitespace-pre-wrap' : 'line-clamp-3'}`}>
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
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => setDetailItem(item)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Detail
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => handleDuplicateToPrivate(item)}
                              disabled={duplicating === item.id}
                            >
                              {duplicating === item.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 mr-1" />
                                  Salin
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => handleCopyToWhatsApp(item)}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {filteredPublicItems.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Belum ada doa atau nasehat publik</p>
                    <p className="text-sm">Doa dan nasehat dari semua pengguna akan muncul di sini</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Premium Dialog */}
        <PremiumDialog 
          open={showPremiumDialog} 
          onOpenChange={setShowPremiumDialog}
          featureName="Doa & Nasehat Publik"
        />

        {/* Detail Dialog */}
        <PrayerDetailDialog
          item={detailItem}
          open={!!detailItem}
          onOpenChange={(open) => !open && setDetailItem(null)}
          getCategoryColor={getCategoryColor}
          onShare={handleCopyToWhatsApp}
        />
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
                <label className="text-sm font-medium">Kategori</label>
                <Select 
                  value={editingItem.category || 'none'} 
                  onValueChange={(value) => setEditingItem({ ...editingItem, category: value === 'none' ? null : value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa Kategori</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
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

              {editingItem.type === 'doa' ? (
                <>
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
                    <label className="text-sm font-medium">Arti / Terjemahan</label>
                    <Textarea
                      value={editingItem.content_indonesian}
                      onChange={(e) => setEditingItem({ ...editingItem, content_indonesian: e.target.value })}
                      className="mt-1"
                      rows={4}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-sm font-medium">Isi Nasehat</label>
                  <Textarea
                    value={editingItem.content_indonesian}
                    onChange={(e) => setEditingItem({ ...editingItem, content_indonesian: e.target.value })}
                    className="mt-1"
                    rows={8}
                  />
                </div>
              )}

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
