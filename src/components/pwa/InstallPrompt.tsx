import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Share, Plus, MoreVertical, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Robust iOS detection that works across all iOS browsers
const isIOSDevice = (): boolean => {
  // Check for iPhone/iPad/iPod in user agent
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    return true;
  }
  
  // Check for iPadOS 13+ (reports as Mac but has touch)
  if (navigator.userAgent.includes('Mac') && 'ontouchend' in document) {
    return true;
  }
  
  // Check platform with touch points (works for Firefox on iOS)
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
    return true;
  }
  
  // Check for iOS in the platform string
  if (/iPhone|iPad|iPod/.test(navigator.platform)) {
    return true;
  }
  
  return false;
};

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // Check if iOS with robust detection
    setIsIOS(isIOSDevice());

    // Listen for the install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if we should show the prompt (not installed, first visit, etc.)
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (!dismissed && !standalone) {
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:bottom-4 md:left-auto md:right-4 md:w-96 md:p-0">
      <Card className="shadow-lg border-primary/20 bg-card">
        <CardHeader className="pb-2 p-3 md:p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Download className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm md:text-base truncate">Install Kujituma</CardTitle>
                <CardDescription className="text-xs truncate">Add to your home screen</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 p-3 md:p-4 md:pt-0">
          {isIOS ? (
            <div className="space-y-2 md:space-y-3">
              <p className="text-xs md:text-sm text-muted-foreground">
                Install this app on your iPhone:
              </p>
              <ol className="text-xs md:text-sm space-y-1.5 md:space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-medium flex-shrink-0">1</span>
                  <span className="flex items-center gap-1 flex-wrap">Tap the <Share className="inline h-4 w-4 flex-shrink-0" /> Share button</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-medium flex-shrink-0">2</span>
                  <span className="flex items-center gap-1 flex-wrap">Scroll and tap <Plus className="inline h-4 w-4 flex-shrink-0" /> Add to Home Screen</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-medium flex-shrink-0">3</span>
                  <span>Tap "Add" to install</span>
                </li>
              </ol>
            </div>
          ) : deferredPrompt ? (
            <Button onClick={handleInstallClick} className="w-full h-10 md:h-auto text-sm">
              <Download className="h-4 w-4 mr-2" />
              Install App
            </Button>
          ) : (
            <div className="space-y-2 md:space-y-3">
              <p className="text-xs md:text-sm text-muted-foreground">
                Install this app on your device:
              </p>
              <ol className="text-xs md:text-sm space-y-1.5 md:space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-medium flex-shrink-0">1</span>
                  <span className="flex items-center gap-1 flex-wrap">Tap <MoreVertical className="inline h-4 w-4 flex-shrink-0" /> menu in your browser</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-medium flex-shrink-0">2</span>
                  <span>Select "Install app" or "Add to Home Screen"</span>
                </li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
