import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useSubscription } from '@/hooks/useSubscription';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  CheckSquare,
  LayoutDashboard,
  ListTodo,
  Calendar,
  BarChart3,
  Timer,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Wallet,
  StickyNote,
  BookOpen,
  Shield,
  Crown,
} from 'lucide-react';
import { useState, useEffect } from 'react';

// Grouped navigation items
const activityItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: ListTodo, label: 'Aktivitas', href: '/activities' },
  { icon: Calendar, label: 'Kalender', href: '/calendar' },
  { icon: Timer, label: 'Focus Timer', href: '/pomodoro' },
  { icon: BarChart3, label: 'Analytics', href: '/analytics' },
];

const financeItems = [
  { icon: Wallet, label: 'Keuangan', href: '/finance' },
];

const notesItems = [
  { icon: StickyNote, label: 'Catatan', href: '/notes' },
  { icon: BookOpen, label: 'Doa & Nasehat', href: '/prayers-advices' },
];

const settingsItems = [
  { icon: Settings, label: 'Pengaturan', href: '/settings' },
];

const adminItems = [
  { icon: Shield, label: 'Admin Panel', href: '/admin' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { isPremium } = useSubscription();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const userInitials = user?.user_metadata?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || user?.email?.[0].toUpperCase() || 'U';

  const NavContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-border/50 px-4">
        <Link to="/" className="flex items-center gap-3" onClick={() => isMobile && setMobileOpen(false)}>
          <div className="p-2 rounded-lg gradient-primary glow-primary">
            <CheckSquare className="w-5 h-5 text-primary-foreground" />
          </div>
          {(isMobile || !collapsed) && (
            <span className="font-bold text-lg gradient-text">Aktivitas-Ku</span>
          )}
        </Link>
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hidden md:flex"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <Menu className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        {/* Activity Section */}
        {(isMobile || !collapsed) && (
          <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Aktivitas
          </p>
        )}
        <div className="space-y-1">
          {activityItems.map((item) => {
            const isActive = location.pathname === item.href;
            const isPremiumFeature = item.href === '/pomodoro';
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => isMobile && setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary/10 text-primary glow-primary/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
                {(isMobile || !collapsed) && (
                  <span className="flex items-center gap-2">
                    {item.label}
                    {isPremiumFeature && !isPremium && (
                      <Crown className="h-3.5 w-3.5 text-amber-500" />
                    )}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <Separator className="my-3" />

        {/* Finance Section */}
        {(isMobile || !collapsed) && (
          <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Keuangan
          </p>
        )}
        <div className="space-y-1">
          {financeItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => isMobile && setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary/10 text-primary glow-primary/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
                {(isMobile || !collapsed) && (
                  <span className="flex items-center gap-2">
                    {item.label}
                    {!isPremium && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <Separator className="my-3" />

        {/* Notes Section */}
        {(isMobile || !collapsed) && (
          <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Catatan
          </p>
        )}
        <div className="space-y-1">
          {notesItems.map((item) => {
            const isActive = location.pathname === item.href;
            const isPremiumFeature = item.href === '/notes';
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => isMobile && setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary/10 text-primary glow-primary/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
                {(isMobile || !collapsed) && (
                  <span className="flex items-center gap-2">
                    {item.label}
                    {isPremiumFeature && !isPremium && (
                      <Crown className="h-3.5 w-3.5 text-amber-500" />
                    )}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <Separator className="my-3" />

        {/* Settings Section */}
        <div className="space-y-1">
          {settingsItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => isMobile && setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary/10 text-primary glow-primary/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
                {(isMobile || !collapsed) && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Admin Section - Only visible to admins */}
        {isAdmin && (
          <>
            <Separator className="my-3" />
            {(isMobile || !collapsed) && (
              <p className="px-3 py-1.5 text-xs font-semibold text-amber-500 uppercase tracking-wider">
                Admin
              </p>
            )}
            <div className="space-y-1">
              {adminItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => isMobile && setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                      isActive
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-amber-500')} />
                    {(isMobile || !collapsed) && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-border/50 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start gap-3 px-3 py-2.5 h-auto',
                !isMobile && collapsed && 'justify-center px-0'
              )}
            >
              <Avatar className="h-8 w-8 border-2 border-primary/50">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {(isMobile || !collapsed) && (
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium truncate max-w-[140px]">
                    {user?.user_metadata?.full_name || 'User'}
                  </span>
                  <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                    {user?.email}
                  </span>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
            <DropdownMenuItem asChild>
              <Link to="/settings" className="cursor-pointer" onClick={() => isMobile && setMobileOpen(false)}>
                <Settings className="mr-2 h-4 w-4" />
                Pengaturan
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-background/95 backdrop-blur border-b border-border/50 flex items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg gradient-primary">
            <CheckSquare className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold gradient-text">Aktivitas-Ku</span>
        </Link>
        
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar">
            <NavContent isMobile />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen border-r border-border/50 bg-sidebar transition-all duration-300 hidden md:block',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        <NavContent />
      </aside>
    </>
  );
}
