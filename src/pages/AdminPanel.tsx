import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole, AppRole } from '@/hooks/useUserRole';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Users, 
  Loader2,
  Crown,
  User,
  RefreshCw,
  Trash2,
  Eye,
  ListTodo,
  StickyNote,
  Wallet,
  BookOpen,
  Timer,
  Calendar,
  ArrowLeft,
  X,
  Plus,
  Ticket,
  Clock,
  CalendarDays
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type SubscriptionType = 'none' | 'monthly' | 'yearly' | 'lifetime';

interface UserSubscription {
  subscription_type: SubscriptionType;
  is_active: boolean;
  expires_at: string | null;
}

interface UserWithRole {
  user_id: string;
  display_name: string | null;
  role: AppRole;
  created_at: string;
  subscription?: UserSubscription;
}

interface UserData {
  activities: any[];
  notes: any[];
  transactions: any[];
  prayers_advices: any[];
  pomodoro_sessions: any[];
}

interface PromoCode {
  id: string;
  code: string;
  subscription_type: SubscriptionType;
  duration_hours: number;
  duration_days: number;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [updatingSubscription, setUpdatingSubscription] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserWithRole | null>(null);
  
  // Preview state
  const [previewUser, setPreviewUser] = useState<UserWithRole | null>(null);
  const [previewData, setPreviewData] = useState<UserData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  // Promo codes state
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loadingPromos, setLoadingPromos] = useState(false);
  const [creatingPromo, setCreatingPromo] = useState(false);
  const [deletingPromo, setDeletingPromo] = useState<string | null>(null);
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'promos'>('users');
  const [newPromo, setNewPromo] = useState({
    code: '',
    subscription_type: 'monthly' as SubscriptionType,
    duration_days: 0,
    duration_hours: 24,
    max_uses: 1,
    expires_at: ''
  });

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate('/');
      toast({
        title: 'Akses Ditolak',
        description: 'Halaman ini hanya untuk Admin',
        variant: 'destructive'
      });
    }
  }, [isAdmin, roleLoading, navigate, toast]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchPromoCodes();
    }
  }, [isAdmin]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, created_at')
        .order('created_at', { ascending: true });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from('user_subscriptions')
        .select('user_id, subscription_type, is_active, expires_at');

      if (subscriptionsError) throw subscriptionsError;

      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        const userSub = subscriptions?.find(s => s.user_id === profile.user_id);
        return {
          user_id: profile.user_id,
          display_name: profile.display_name,
          role: (userRole?.role as AppRole) || 'user',
          created_at: profile.created_at,
          subscription: userSub ? {
            subscription_type: userSub.subscription_type as SubscriptionType,
            is_active: userSub.is_active,
            expires_at: userSub.expires_at
          } : undefined
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat daftar user',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchPromoCodes() {
    setLoadingPromos(true);
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromoCodes((data || []) as PromoCode[]);
    } catch (error) {
      console.error('Error fetching promo codes:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat daftar kode promo',
        variant: 'destructive'
      });
    } finally {
      setLoadingPromos(false);
    }
  }

  async function handleCreatePromo() {
    if (!newPromo.code.trim()) {
      toast({
        title: 'Error',
        description: 'Kode promo wajib diisi',
        variant: 'destructive'
      });
      return;
    }

    setCreatingPromo(true);
    try {
      const { error } = await supabase.from('promo_codes').insert({
        code: newPromo.code.toUpperCase(),
        subscription_type: newPromo.subscription_type,
        duration_days: newPromo.duration_days,
        duration_hours: newPromo.duration_hours,
        max_uses: newPromo.max_uses || null,
        expires_at: newPromo.expires_at ? new Date(newPromo.expires_at).toISOString() : null,
        is_active: true
      });

      if (error) throw error;

      toast({
        title: 'Berhasil!',
        description: `Kode promo ${newPromo.code.toUpperCase()} berhasil dibuat`
      });

      setNewPromo({
        code: '',
        subscription_type: 'monthly',
        duration_days: 0,
        duration_hours: 24,
        max_uses: 1,
        expires_at: ''
      });
      fetchPromoCodes();
    } catch (error: any) {
      console.error('Error creating promo code:', error);
      toast({
        title: 'Error',
        description: error.message?.includes('duplicate') ? 'Kode promo sudah ada' : 'Gagal membuat kode promo',
        variant: 'destructive'
      });
    } finally {
      setCreatingPromo(false);
    }
  }

  async function handleTogglePromoStatus(promo: PromoCode) {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: !promo.is_active })
        .eq('id', promo.id);

      if (error) throw error;

      setPromoCodes(prev => prev.map(p => 
        p.id === promo.id ? { ...p, is_active: !p.is_active } : p
      ));

      toast({
        title: 'Berhasil!',
        description: `Kode promo ${promo.is_active ? 'dinonaktifkan' : 'diaktifkan'}`
      });
    } catch (error) {
      console.error('Error toggling promo status:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengubah status kode promo',
        variant: 'destructive'
      });
    }
  }

  async function handleDeletePromo(promoId: string) {
    setDeletingPromo(promoId);
    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', promoId);

      if (error) throw error;

      setPromoCodes(prev => prev.filter(p => p.id !== promoId));

      toast({
        title: 'Berhasil!',
        description: 'Kode promo berhasil dihapus'
      });
    } catch (error) {
      console.error('Error deleting promo code:', error);
      toast({
        title: 'Error',
        description: 'Gagal menghapus kode promo',
        variant: 'destructive'
      });
    } finally {
      setDeletingPromo(null);
    }
  }

  async function handleRoleChange(userId: string, newRole: AppRole) {
    setUpdating(userId);
    try {
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }

      setUsers(prev => prev.map(u => 
        u.user_id === userId ? { ...u, role: newRole } : u
      ));

      toast({
        title: 'Berhasil!',
        description: `Role berhasil diubah menjadi ${newRole}`
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengubah role',
        variant: 'destructive'
      });
    } finally {
      setUpdating(null);
    }
  }

  async function handleSubscriptionChange(userId: string, newType: SubscriptionType) {
    setUpdatingSubscription(userId);
    try {
      let expiresAt: string | null = null;
      const isActive = newType !== 'none';
      const startedAt = isActive ? new Date().toISOString() : null;

      if (newType === 'monthly') {
        const date = new Date();
        date.setMonth(date.getMonth() + 1);
        expiresAt = date.toISOString();
      } else if (newType === 'yearly') {
        const date = new Date();
        date.setFullYear(date.getFullYear() + 1);
        expiresAt = date.toISOString();
      }

      // Check if subscription exists
      const { data: existing } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_subscriptions')
          .update({ 
            subscription_type: newType,
            is_active: isActive,
            started_at: startedAt,
            expires_at: expiresAt
          })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_subscriptions')
          .insert({ 
            user_id: userId, 
            subscription_type: newType,
            is_active: isActive,
            started_at: startedAt,
            expires_at: expiresAt
          });

        if (error) throw error;
      }

      setUsers(prev => prev.map(u => 
        u.user_id === userId ? { 
          ...u, 
          subscription: { 
            subscription_type: newType, 
            is_active: isActive, 
            expires_at: expiresAt 
          } 
        } : u
      ));

      const typeLabels: Record<SubscriptionType, string> = {
        none: 'Gratis',
        monthly: 'Bulanan',
        yearly: 'Tahunan',
        lifetime: 'Selamanya'
      };

      toast({
        title: 'Berhasil!',
        description: `Langganan berhasil diubah menjadi ${typeLabels[newType]}`
      });
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengubah langganan',
        variant: 'destructive'
      });
    } finally {
      setUpdatingSubscription(null);
    }
  }

  async function handleDeleteUser() {
    if (!deleteConfirmUser) return;
    
    setDeleting(deleteConfirmUser.user_id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('delete-user', {
        body: { userId: deleteConfirmUser.user_id }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setUsers(prev => prev.filter(u => u.user_id !== deleteConfirmUser.user_id));
      
      toast({
        title: 'Berhasil!',
        description: `User ${deleteConfirmUser.display_name || 'Unnamed'} berhasil dihapus`
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus user',
        variant: 'destructive'
      });
    } finally {
      setDeleting(null);
      setDeleteConfirmUser(null);
    }
  }

  async function handlePreviewUser(user: UserWithRole) {
    setPreviewUser(user);
    setLoadingPreview(true);
    
    try {
      // Fetch all user data - admin can see all via RLS policies
      const [activities, notes, transactions, prayers_advices, pomodoro_sessions] = await Promise.all([
        supabase.from('activities').select('*').eq('user_id', user.user_id).order('created_at', { ascending: false }),
        supabase.from('notes').select('*').eq('user_id', user.user_id).order('created_at', { ascending: false }),
        supabase.from('transactions').select('*, transaction_categories(name, color)').eq('user_id', user.user_id).order('transaction_date', { ascending: false }),
        supabase.from('prayers_advices').select('*').eq('user_id', user.user_id).order('created_at', { ascending: false }),
        supabase.from('pomodoro_sessions').select('*').eq('user_id', user.user_id).order('completed_at', { ascending: false }),
      ]);

      setPreviewData({
        activities: activities.data || [],
        notes: notes.data || [],
        transactions: transactions.data || [],
        prayers_advices: prayers_advices.data || [],
        pomodoro_sessions: pomodoro_sessions.data || [],
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat data user',
        variant: 'destructive'
      });
    } finally {
      setLoadingPreview(false);
    }
  }

  function getInitials(name: string | null): string {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  if (roleLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Admin Panel
            </h1>
            <p className="text-muted-foreground">Kelola user, role, dan kode promo</p>
          </div>
          <Button variant="outline" onClick={() => { fetchUsers(); fetchPromoCodes(); }} disabled={loading || loadingPromos}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading || loadingPromos ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Admin Tabs */}
        <Tabs value={activeAdminTab} onValueChange={(v) => setActiveAdminTab(v as 'users' | 'promos')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Manajemen User
            </TabsTrigger>
            <TabsTrigger value="promos" className="flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Kode Promo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6 mt-6">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="glass border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-sm text-muted-foreground">Total User</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-amber-500/10">
                  <Crown className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {users.filter(u => u.role === 'admin').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Admin</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-500/10">
                  <User className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {users.filter(u => u.role === 'user').length}
                  </p>
                  <p className="text-sm text-muted-foreground">User Biasa</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Daftar User
            </CardTitle>
            <CardDescription>
              Lihat data, ubah role, atau hapus user
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Langganan</TableHead>
                      <TableHead>Bergabung</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border-2 border-primary/30">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {getInitials(user.display_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {user.display_name || 'Unnamed User'}
                              </p>
                              <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {user.user_id.slice(0, 8)}...
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={user.role === 'admin' ? 'default' : 'secondary'}
                            className={user.role === 'admin' 
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' 
                              : ''
                            }
                          >
                            {user.role === 'admin' ? (
                              <Crown className="h-3 w-3 mr-1" />
                            ) : (
                              <User className="h-3 w-3 mr-1" />
                            )}
                            {user.role === 'admin' ? 'Admin' : 'User'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.subscription?.subscription_type || 'none'}
                            onValueChange={(value) => handleSubscriptionChange(user.user_id, value as SubscriptionType)}
                            disabled={updatingSubscription === user.user_id}
                          >
                            <SelectTrigger className="w-28">
                              {updatingSubscription === user.user_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Gratis</SelectItem>
                              <SelectItem value="monthly">Bulanan</SelectItem>
                              <SelectItem value="yearly">Tahunan</SelectItem>
                              <SelectItem value="lifetime">Selamanya</SelectItem>
                            </SelectContent>
                          </Select>
                          {user.subscription?.expires_at && user.subscription.subscription_type !== 'lifetime' && (
                            <p className="text-xs text-muted-foreground mt-1">
                              s.d {formatDate(user.subscription.expires_at)}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(user.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            {/* Preview Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePreviewUser(user)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {/* Role Select */}
                            <Select
                              value={user.role}
                              onValueChange={(value) => handleRoleChange(user.user_id, value as AppRole)}
                              disabled={updating === user.user_id}
                            >
                              <SelectTrigger className="w-24">
                                {updating === user.user_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <SelectValue />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                              </SelectContent>
                            </Select>

                            {/* Delete Button */}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteConfirmUser(user)}
                              disabled={deleting === user.user_id}
                            >
                              {deleting === user.user_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          {/* Promo Codes Tab */}
          <TabsContent value="promos" className="space-y-6 mt-6">
            {/* Create Promo Form */}
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  Buat Kode Promo Baru
                </CardTitle>
                <CardDescription>
                  Buat kode promo untuk memberikan akses premium sementara
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="promo-code">Kode Promo *</Label>
                    <Input
                      id="promo-code"
                      placeholder="Contoh: PROMO2026"
                      value={newPromo.code}
                      onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tipe Langganan</Label>
                    <Select
                      value={newPromo.subscription_type}
                      onValueChange={(value: SubscriptionType) => setNewPromo({ ...newPromo, subscription_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Bulanan</SelectItem>
                        <SelectItem value="yearly">Tahunan</SelectItem>
                        <SelectItem value="lifetime">Selamanya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration-days">Durasi (Hari)</Label>
                    <Input
                      id="duration-days"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={newPromo.duration_days}
                      onChange={(e) => setNewPromo({ ...newPromo, duration_days: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration-hours">Durasi (Jam)</Label>
                    <Input
                      id="duration-hours"
                      type="number"
                      min="0"
                      placeholder="24"
                      value={newPromo.duration_hours}
                      onChange={(e) => setNewPromo({ ...newPromo, duration_hours: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-uses">Maks. Penggunaan</Label>
                    <Input
                      id="max-uses"
                      type="number"
                      min="1"
                      placeholder="1"
                      value={newPromo.max_uses}
                      onChange={(e) => setNewPromo({ ...newPromo, max_uses: parseInt(e.target.value) || 1 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expires-at">Berlaku Sampai (Opsional)</Label>
                    <Input
                      id="expires-at"
                      type="datetime-local"
                      value={newPromo.expires_at}
                      onChange={(e) => setNewPromo({ ...newPromo, expires_at: e.target.value })}
                    />
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Durasi Premium:</p>
                  <p>
                    {newPromo.duration_days > 0 && `${newPromo.duration_days} hari `}
                    {newPromo.duration_hours > 0 && `${newPromo.duration_hours} jam`}
                    {newPromo.duration_days === 0 && newPromo.duration_hours === 0 && 'Belum diatur'}
                  </p>
                </div>

                <Button 
                  onClick={handleCreatePromo} 
                  disabled={creatingPromo} 
                  className="mt-4 gradient-primary"
                >
                  {creatingPromo ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Buat Kode Promo
                </Button>
              </CardContent>
            </Card>

            {/* Promo Codes List */}
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-primary" />
                  Daftar Kode Promo
                </CardTitle>
                <CardDescription>
                  {promoCodes.length} kode promo • {promoCodes.filter(p => p.is_active).length} aktif
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPromos ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : promoCodes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Belum ada kode promo</p>
                    <p className="text-sm">Buat kode promo pertama di atas</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kode</TableHead>
                          <TableHead>Tipe</TableHead>
                          <TableHead>Durasi</TableHead>
                          <TableHead>Penggunaan</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Berlaku s.d</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {promoCodes.map((promo) => {
                          const typeLabels: Record<SubscriptionType, string> = {
                            none: 'Gratis',
                            monthly: 'Bulanan',
                            yearly: 'Tahunan',
                            lifetime: 'Selamanya'
                          };

                          return (
                            <TableRow key={promo.id}>
                              <TableCell>
                                <code className="px-2 py-1 rounded bg-primary/10 text-primary font-mono text-sm">
                                  {promo.code}
                                </code>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{typeLabels[promo.subscription_type]}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-sm">
                                  {promo.duration_days > 0 && (
                                    <span className="flex items-center gap-1">
                                      <CalendarDays className="h-3 w-3" />
                                      {promo.duration_days}h
                                    </span>
                                  )}
                                  {promo.duration_hours > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {promo.duration_hours}j
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className={promo.max_uses && promo.current_uses >= promo.max_uses ? 'text-destructive' : ''}>
                                  {promo.current_uses}/{promo.max_uses || '∞'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={promo.is_active ? 'default' : 'secondary'}
                                  className={promo.is_active ? 'bg-green-500/20 text-green-600 border-green-500/30' : ''}
                                >
                                  {promo.is_active ? 'Aktif' : 'Nonaktif'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {promo.expires_at ? formatDate(promo.expires_at) : '-'}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleTogglePromoStatus(promo)}
                                  >
                                    {promo.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeletePromo(promo.id)}
                                    disabled={deletingPromo === promo.id}
                                  >
                                    {deletingPromo === promo.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmUser} onOpenChange={() => setDeleteConfirmUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Hapus User?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin menghapus user <strong>{deleteConfirmUser?.display_name || 'Unnamed'}</strong>?
              <br /><br />
              <span className="text-destructive font-medium">
                ⚠️ Semua data user ini akan dihapus permanen termasuk aktivitas, catatan, transaksi, dan data lainnya.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Data Preview Dialog */}
      <Dialog open={!!previewUser} onOpenChange={() => { setPreviewUser(null); setPreviewData(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          {/* Sticky Header */}
          <div className="sticky top-0 z-50 bg-background border-b p-4 flex items-center justify-between">
            <DialogHeader className="flex-1">
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="h-8 w-8 border-2 border-primary/30">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getInitials(previewUser?.display_name || null)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <span>Data User: {previewUser?.display_name || 'Unnamed'}</span>
                  <Badge 
                    variant="secondary" 
                    className={`ml-2 ${previewUser?.role === 'admin' ? 'bg-amber-500/20 text-amber-500' : ''}`}
                  >
                    {previewUser?.role}
                  </Badge>
                </div>
              </DialogTitle>
            </DialogHeader>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setPreviewUser(null); setPreviewData(null); }}
              className="ml-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali ke Admin
            </Button>
          </div>

          {loadingPreview ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : previewData && (
            <ScrollArea className="h-[calc(90vh-80px)]">
              <div className="p-4">
                <Tabs defaultValue="activities" className="w-full">
                  <TabsList className="grid w-full grid-cols-5 mb-4">
                    <TabsTrigger value="activities" className="flex items-center gap-1">
                      <ListTodo className="h-4 w-4" />
                      <span className="hidden sm:inline">Aktivitas</span>
                      <Badge variant="secondary" className="ml-1">{previewData.activities.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="flex items-center gap-1">
                      <StickyNote className="h-4 w-4" />
                      <span className="hidden sm:inline">Catatan</span>
                      <Badge variant="secondary" className="ml-1">{previewData.notes.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="transactions" className="flex items-center gap-1">
                      <Wallet className="h-4 w-4" />
                      <span className="hidden sm:inline">Transaksi</span>
                      <Badge variant="secondary" className="ml-1">{previewData.transactions.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="prayers" className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span className="hidden sm:inline">Doa</span>
                      <Badge variant="secondary" className="ml-1">{previewData.prayers_advices.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="pomodoro" className="flex items-center gap-1">
                      <Timer className="h-4 w-4" />
                      <span className="hidden sm:inline">Pomodoro</span>
                      <Badge variant="secondary" className="ml-1">{previewData.pomodoro_sessions.length}</Badge>
                    </TabsTrigger>
                  </TabsList>

                  {/* Activities Tab */}
                  <TabsContent value="activities" className="space-y-2">
                    {previewData.activities.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Tidak ada aktivitas</p>
                    ) : (
                      previewData.activities.map((item) => (
                        <Card key={item.id} className="p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{item.title}</p>
                              {item.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                              )}
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {item.status || 'todo'}
                                </Badge>
                                {item.scheduled_date && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {formatDate(item.scheduled_date)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </TabsContent>

                  {/* Notes Tab */}
                  <TabsContent value="notes" className="space-y-2">
                    {previewData.notes.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Tidak ada catatan</p>
                    ) : (
                      previewData.notes.map((item) => (
                        <Card key={item.id} className="p-3">
                          <p className="font-medium">{item.title}</p>
                          {item.content && (
                            <p className="text-sm text-muted-foreground line-clamp-3 mt-1">{item.content}</p>
                          )}
                          <Badge variant="outline" className="text-xs mt-2">{item.status}</Badge>
                        </Card>
                      ))
                    )}
                  </TabsContent>

                  {/* Transactions Tab */}
                  <TabsContent value="transactions" className="space-y-2">
                    {previewData.transactions.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Tidak ada transaksi</p>
                    ) : (
                      previewData.transactions.map((item) => (
                        <Card key={item.id} className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{item.description || 'Transaksi'}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(item.transaction_date)}</p>
                            </div>
                            <p className={`font-bold ${item.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                              {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                            </p>
                          </div>
                        </Card>
                      ))
                    )}
                  </TabsContent>

                  {/* Prayers Tab */}
                  <TabsContent value="prayers" className="space-y-2">
                    {previewData.prayers_advices.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Tidak ada doa/nasehat</p>
                    ) : (
                      previewData.prayers_advices.map((item) => (
                        <Card key={item.id} className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant={item.type === 'doa' ? 'default' : 'secondary'}>
                                  {item.type}
                                </Badge>
                                <p className="font-medium">{item.title}</p>
                              </div>
                              {item.content_arabic && (
                                <p className="text-right font-arabic text-lg mt-2">{item.content_arabic}</p>
                              )}
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.content_indonesian}</p>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </TabsContent>

                  {/* Pomodoro Tab */}
                  <TabsContent value="pomodoro" className="space-y-2">
                    {previewData.pomodoro_sessions.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Tidak ada sesi pomodoro</p>
                    ) : (
                      previewData.pomodoro_sessions.map((item) => (
                        <Card key={item.id} className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Timer className="h-4 w-4 text-primary" />
                              <span className="font-medium">{item.duration_minutes} menit</span>
                              <Badge variant="outline">{item.session_type || 'focus'}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(item.completed_at)}
                            </p>
                          </div>
                        </Card>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Sticky Footer Button */}
              <div className="sticky bottom-0 p-4 bg-background border-t">
                <Button
                  className="w-full gradient-primary"
                  onClick={() => { setPreviewUser(null); setPreviewData(null); }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Kembali ke Admin Panel
                </Button>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
