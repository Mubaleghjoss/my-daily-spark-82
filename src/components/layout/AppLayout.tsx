import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { SubscriptionReminder } from '@/components/SubscriptionReminder';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      {/* Mobile: add top padding for header. Desktop: add left padding for sidebar */}
      <main className="pt-14 md:pt-0 md:pl-64 min-h-screen transition-all duration-300">
        <div className="p-4 md:p-6 lg:p-8">
          <SubscriptionReminder />
          {children}
        </div>
      </main>
    </div>
  );
}
