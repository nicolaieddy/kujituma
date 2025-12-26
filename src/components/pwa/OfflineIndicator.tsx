import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Keep showing briefly to indicate connection restored
      setTimeout(() => setShowIndicator(false), 2000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowIndicator(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    if (!navigator.onLine) {
      setShowIndicator(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showIndicator) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium transition-colors",
        isOffline 
          ? "bg-destructive text-destructive-foreground" 
          : "bg-primary text-primary-foreground"
      )}
    >
      {isOffline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span>You're offline. Some features may be unavailable.</span>
        </>
      ) : (
        <span>Back online!</span>
      )}
    </div>
  );
};
