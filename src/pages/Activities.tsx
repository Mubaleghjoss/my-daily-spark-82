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
  PlusCircle,
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
  isCompletedToday?: boolean;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

// Get today's date string in local timezone
function getTodayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function Activities() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [todayCompletions, setTodayCompletions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newParentId, setNewParentId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'sub'>('add');
  const [selectedParentTitle, setSelectedParentTitle] = useState('');

  useEffect(() => {
    if (user) {
      fetchActivities();
      fetchCategories();
      fetchTodayCompletions();
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

  // Fetch today's completions to determine which activities are done today
  async function fetchTodayCompletions() {
    const today = getTodayString();
    const startOfDay = `${today}T00:00:00`;
    const endOfDay = `${today}T23:59:59`;
    
    const { data } = await supabase
      .from('activity_completions')
      .select('activity_id')
      .eq('user_id', user!.id)
      .gte('completed_at', startOfDay)
      .lte('completed_at', endOfDay);
    
    const completedIds = new Set((data || []).map(c => c.activity_id));
    setTodayCompletions(completedIds);
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
      parent_id: newParentId || null,
      status: 'todo',
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Berhasil!', description: dialogMode === 'sub' ? 'Sub-aktivitas berhasil ditambahkan' : 'Aktivitas berhasil ditambahkan' });
      resetForm();
      fetchActivities();
      // Auto expand parent if adding sub-activity
      if (newParentId) {
        setExpandedIds((prev) => new Set([...prev, newParentId]));
      }
    }
    setSubmitting(false);
  }

  function resetForm() {
    setNewTitle('');
    setNewDescription('');
    setNewParentId('');
    setIsDialogOpen(false);
    setDialogMode('add');
    setSelectedParentTitle('');
  }

  function openAddSubActivity(parentId: string, parentTitle: string) {
    setNewParentId(parentId);
    setSelectedParentTitle(parentTitle);
    setDialogMode('sub');
    setIsDialogOpen(true);
  }

  // Toggle completion for today only
  async function toggleTodayCompletion(activity: Activity) {
    const isCompleted = todayCompletions.has(activity.id);
    
    if (isCompleted) {
      // Remove today's completion
      const today = getTodayString();
      const startOfDay = `${today}T00:00:00`;
      const endOfDay = `${today}T23:59:59`;
      
      await supabase
        .from('activity_completions')
        .delete()
        .eq('user_id', user!.id)
        .eq('activity_id', activity.id)
        .gte('completed_at', startOfDay)
        .lte('completed_at', endOfDay);
      
      setTodayCompletions(prev => {
        const next = new Set(prev);
        next.delete(activity.id);
        return next;
      });
    } else {
      // Add completion for today
      await supabase.from('activity_completions').insert({
        user_id: user!.id,
        activity_id: activity.id,
      });
      
      setTodayCompletions(prev => new Set([...prev, activity.id]));
      
      toast({ 
        title: 'Selesai! ✓', 
        description: `${activity.title} tercatat selesai hari ini`
      });
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

  function getStatusBadge(isCompletedToday: boolean) {
    if (isCompletedToday) {
      return <Badge className="bg-neon-green/20 text-neon-green border-neon-green/50 shrink-0">Selesai</Badge>;
    }
    return null;
  }

  function ActivityItem({ activity, depth = 0 }: { activity: Activity; depth?: number }) {
    const hasChildren = activity.children && activity.children.length > 0;
    const isExpanded = expandedIds.has(activity.id);
    const category = categories.find((c) => c.id === activity.category_id);
    const isCompletedToday = todayCompletions.has(activity.id);

    return (
      <div className="space-y-1">
        <div
          className={`flex items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors group ${
            isCompletedToday ? 'opacity-70' : ''
          }`}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          {/* Expand/collapse button */}
          <div className="w-6 shrink-0">
            {hasChildren && (
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
            )}
          </div>

          {/* Checkbox */}
          <Checkbox
            checked={isCompletedToday}
            onCheckedChange={() => toggleTodayCompletion(activity)}
            className="shrink-0 data-[state=checked]:bg-neon-green data-[state=checked]:border-neon-green"
          />

          {/* Title and details */}
          <div className="flex-1 min-w-0 mr-2">
            <span
              className={`font-medium block truncate ${
                isCompletedToday ? 'line-through text-muted-foreground' : ''
              }`}
            >
              {activity.title}
            </span>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {category && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: `${category.color}20`,
                    color: category.color,
                  }}
                >
                  {category.name}
                </span>
              )}
              {(activity.scheduled_date || activity.scheduled_time) && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {activity.scheduled_date} {activity.scheduled_time}
                </span>
              )}
            </div>
          </div>

          {/* Status badge */}
          {getStatusBadge(isCompletedToday)}

          {/* Add Sub-Activity Button - Always visible */}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={() => openAddSubActivity(activity.id, activity.title)}
            title="Tambah sub-aktivitas"
          >
            <PlusCircle className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => openAddSubActivity(activity.id, activity.title)}
                className="text-primary"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Tambah Sub-Aktivitas
              </DropdownMenuItem>
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

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) resetForm();
            setIsDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary glow-primary" onClick={() => setDialogMode('add')}>
                <Plus className="w-4 h-4 mr-2" />
                Tambah Aktivitas
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {dialogMode === 'sub' 
                    ? `Tambah Sub-Aktivitas untuk "${selectedParentTitle}"` 
                    : 'Tambah Aktivitas Baru'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddActivity} className="space-y-4">
                {dialogMode === 'add' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="title">Nama Aktivitas</Label>
                      <Input
                        id="title"
                        placeholder="Contoh: Olahraga pagi 🏃"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        required
                        autoFocus
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
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="subTitle">Nama Sub-Aktivitas</Label>
                    <Input
                      id="subTitle"
                      placeholder="Contoh: Push up 20x"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                )}

                <Button type="submit" className="w-full gradient-primary" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : dialogMode === 'sub' ? (
                    'Tambah Sub-Aktivitas'
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