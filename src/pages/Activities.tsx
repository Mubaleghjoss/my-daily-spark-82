import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  Loader2,
  MoreHorizontal,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Activity {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  scheduled_date: string | null;
  scheduled_time: string | null;
  parent_id: string | null;
  category_id: string | null;
  sort_order: number;
  children?: Activity[];
}

interface Category {
  id: string;
  name: string;
  color: string;
}

export default function Activities() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newCategoryId, setNewCategoryId] = useState<string>('');
  const [newParentId, setNewParentId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchActivities();
      fetchCategories();
    }
  }, [user]);

  async function fetchActivities() {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', user!.id)
      .order('sort_order', { ascending: true });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Build nested structure
      const nested = buildNestedActivities((data || []) as Activity[]);
      setActivities(nested);
    }
    setLoading(false);
  }

  async function fetchCategories() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user!.id);
    setCategories(data || []);
  }

  function buildNestedActivities(flat: Activity[]): Activity[] {
    const map = new Map<string, Activity>();
    const roots: Activity[] = [];

    flat.forEach((item) => {
      map.set(item.id, { ...item, children: [] });
    });

    flat.forEach((item) => {
      const current = map.get(item.id)!;
      if (item.parent_id && map.has(item.parent_id)) {
        map.get(item.parent_id)!.children!.push(current);
      } else {
        roots.push(current);
      }
    });

    return roots;
  }

  async function handleAddActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSubmitting(true);
    const { error } = await supabase.from('activities').insert({
      user_id: user!.id,
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      scheduled_date: newDate || null,
      scheduled_time: newTime || null,
      category_id: newCategoryId || null,
      parent_id: newParentId || null,
      status: 'todo',
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Berhasil!', description: 'Aktivitas berhasil ditambahkan' });
      setNewTitle('');
      setNewDescription('');
      setNewDate('');
      setNewTime('');
      setNewCategoryId('');
      setNewParentId('');
      setIsDialogOpen(false);
      fetchActivities();
    }
    setSubmitting(false);
  }

  async function toggleStatus(activity: Activity) {
    const nextStatus = activity.status === 'done' ? 'todo' : 'done';
    const { error } = await supabase
      .from('activities')
      .update({ status: nextStatus })
      .eq('id', activity.id);

    if (!error) {
      fetchActivities();
    }
  }

  async function deleteActivity(id: string) {
    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (!error) {
      toast({ title: 'Dihapus', description: 'Aktivitas berhasil dihapus' });
      fetchActivities();
    }
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'done':
        return <Badge className="bg-neon-green/20 text-neon-green border-neon-green/50">Selesai</Badge>;
      case 'in_progress':
        return <Badge className="bg-accent/20 text-accent border-accent/50">Dikerjakan</Badge>;
      default:
        return <Badge variant="outline">To Do</Badge>;
    }
  }

  function ActivityItem({ activity, depth = 0 }: { activity: Activity; depth?: number }) {
    const hasChildren = activity.children && activity.children.length > 0;
    const isExpanded = expandedIds.has(activity.id);
    const category = categories.find((c) => c.id === activity.category_id);

    return (
      <div className="space-y-1">
        <div
          className={`flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group ${
            activity.status === 'done' ? 'opacity-60' : ''
          }`}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(activity.id)}
              className="p-1 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          <Checkbox
            checked={activity.status === 'done'}
            onCheckedChange={() => toggleStatus(activity)}
            className="data-[state=checked]:bg-neon-green data-[state=checked]:border-neon-green"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`font-medium ${
                  activity.status === 'done' ? 'line-through text-muted-foreground' : ''
                }`}
              >
                {activity.title}
              </span>
              {category && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${category.color}20`,
                    color: category.color,
                  }}
                >
                  {category.name}
                </span>
              )}
            </div>
            {(activity.scheduled_date || activity.scheduled_time) && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Clock className="h-3 w-3" />
                {activity.scheduled_date} {activity.scheduled_time}
              </div>
            )}
          </div>

          {getStatusBadge(activity.status)}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => deleteActivity(activity.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {activity.children!.map((child) => (
              <ActivityItem key={child.id} activity={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Flatten activities for parent selection
  function flattenActivities(acts: Activity[]): Activity[] {
    const result: Activity[] = [];
    function recurse(items: Activity[]) {
      items.forEach((item) => {
        result.push(item);
        if (item.children) recurse(item.children);
      });
    }
    recurse(acts);
    return result;
  }

  const flatActivities = flattenActivities(activities);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Aktivitas</h1>
            <p className="text-muted-foreground">Kelola semua kegiatan harianmu</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary glow-primary">
                <Plus className="w-4 h-4 mr-2" />
                Tambah Aktivitas
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Tambah Aktivitas Baru</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddActivity} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Judul</Label>
                  <Input
                    id="title"
                    placeholder="Nama aktivitas..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi (opsional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Detail aktivitas..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Tanggal</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Waktu</Label>
                    <Input
                      id="time"
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Parent Aktivitas (untuk nested)</Label>
                  <Select value={newParentId} onValueChange={setNewParentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih parent (opsional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tidak ada parent</SelectItem>
                      {flatActivities.map((act) => (
                        <SelectItem key={act.id} value={act.id}>
                          {act.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full gradient-primary" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Tambah Aktivitas'
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Activities List */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Circle className="w-5 h-5 text-primary" />
              Daftar Aktivitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-12">
                <Circle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Belum ada aktivitas</p>
                <p className="text-sm text-muted-foreground">
                  Klik tombol "Tambah Aktivitas" untuk memulai
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {activities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}