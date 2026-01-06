import { useState, useEffect, useCallback } from 'react';

interface PWAUpdateState {
  needRefresh: boolean;
  offlineReady: boolean;
  updateServiceWorker: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  isChecking: boolean;
  lastChecked: Date | null;
}

export function usePWAUpdate(): PWAUpdateState {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);
        setOfflineReady(true);
      });

      // Listen for new service worker updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // New service worker has taken control, reload the page
        window.location.reload();
      });

      // Check for waiting service worker on load
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          setNeedRefresh(true);
        }
      });
    }

    // Listen for custom event from vite-plugin-pwa
    const handleSWUpdate = () => {
      setNeedRefresh(true);
    };

    window.addEventListener('swUpdated', handleSWUpdate);

    return () => {
      window.removeEventListener('swUpdated', handleSWUpdate);
    };
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (!registration) {
      // Try to get registration if not available
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          setRegistration(reg);
          setIsChecking(true);
          try {
            await reg.update();
            setLastChecked(new Date());
            // Check if there's a waiting worker after update
            if (reg.waiting) {
              setNeedRefresh(true);
            }
          } catch (error) {
            console.error('Failed to check for updates:', error);
          } finally {
            setIsChecking(false);
          }
        }
      }
      return;
    }

    setIsChecking(true);
    try {
      await registration.update();
      setLastChecked(new Date());
      // Check if there's a waiting worker after update
      if (registration.waiting) {
        setNeedRefresh(true);
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    } finally {
      setIsChecking(false);
    }
  }, [registration]);

  const updateServiceWorker = useCallback(async () => {
    if (!registration?.waiting) {
      // No waiting worker, try to check for updates first
      await checkForUpdates();
      if (!registration?.waiting) {
        return;
      }
    }

    // Tell the waiting service worker to take control
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }, [registration, checkForUpdates]);

  // Auto-check for updates periodically (every 30 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      checkForUpdates();
    }, 30 * 60 * 1000); // 30 minutes

    // Check on mount
    checkForUpdates();

    return () => clearInterval(interval);
  }, [checkForUpdates]);

  return {
    needRefresh,
    offlineReady,
    updateServiceWorker,
    checkForUpdates,
    isChecking,
    lastChecked,
  };
}
