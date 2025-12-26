import { useState, useEffect } from 'react';

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

export const usePWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(standalone);

    // Check if iOS with robust detection
    setIsIOS(isIOSDevice());

    // Listen for the install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return false;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    setDeferredPrompt(null);
    setIsInstallable(false);

    return outcome === 'accepted';
  };

  return {
    isInstallable,
    isInstalled,
    isIOS,
    promptInstall,
  };
};
