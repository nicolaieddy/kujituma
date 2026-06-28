import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity } from "lucide-react";
import { SocialIcon, SOCIAL_PLATFORMS } from "./SocialLinkPicker";
import { useSocialPlatformSettings } from "@/hooks/useSocialPlatformSettings";
import type { SocialPlatform } from "@/lib/social";

const PROFILE_FIELD_TO_PLATFORM: Record<string, SocialPlatform> = {
  linkedin_url: "linkedin",
  twitter_url: "x",
  instagram_url: "instagram",
  tiktok_url: "tiktok",
};

interface SocialLinksDisplayProps {
  socialLinks: Record<string, string>;
  linkOrder?: string[];
  size?: 'sm' | 'md';
}

const getHref = (platformId: string, value: string): string => {
  const platform = SOCIAL_PLATFORMS.find(p => p.id === platformId);
  if (!platform) return value;
  
  // Handle different types
  if (platform.type === 'email') {
    return `mailto:${encodeURIComponent(value)}`;
  }
  
  // WhatsApp - convert phone number to wa.me link
  if (platformId === 'whatsapp_url') {
    const cleanNumber = value.replace(/\D/g, '');
    return `https://wa.me/${cleanNumber}`;
  }
  
  // Telegram - handle @username format
  if (platformId === 'telegram_url') {
    if (value.startsWith('@')) {
      return `https://t.me/${value.slice(1)}`;
    }
    if (!value.startsWith('http://') && !value.startsWith('https://')) {
      return `https://${value}`;
    }
    return value;
  }
  
  // Signal - phone number link
  if (platformId === 'signal_url') {
    const cleanNumber = value.replace(/\D/g, '');
    return `https://signal.me/#p/+${cleanNumber}`;
  }
  
  // Phone numbers
  if (platform.type === 'phone') {
    return `tel:${value}`;
  }
  
  // URLs - ensure they have protocol
  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    return `https://${value}`;
  }
  return value;
};

const getPlatformName = (platformId: string): string => {
  const platform = SOCIAL_PLATFORMS.find(p => p.id === platformId);
  return platform?.name || platformId;
};

export const SocialLinksDisplay = ({ socialLinks, linkOrder = [], size = 'md' }: SocialLinksDisplayProps) => {
  const { data: settings = [] } = useSocialPlatformSettings();
  const trackedSet = useMemo(() => {
    const set = new Set<SocialPlatform>();
    for (const s of settings) if (s.enabled) set.add(s.platform);
    return set;
  }, [settings]);

  // Get ordered list of active platforms
  const orderedPlatforms = useMemo(() => {
    const activePlatforms = Object.entries(socialLinks)
      .filter(([_, value]) => value && value.trim())
      .map(([id]) => id);
    
    const safeOrder = linkOrder || [];
    return activePlatforms.sort((a, b) => {
      const indexA = safeOrder.indexOf(a);
      const indexB = safeOrder.indexOf(b);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [socialLinks, linkOrder]);
  
  if (orderedPlatforms.length === 0) return null;
  
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const buttonSize = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
  
  return (
    <div className="flex flex-wrap gap-1">
      {orderedPlatforms.map((platformId) => {
        const trackedPlatform = PROFILE_FIELD_TO_PLATFORM[platformId];
        const isTracked = trackedPlatform ? trackedSet.has(trackedPlatform) : false;
        const platformName = getPlatformName(platformId);
        return (
          <Tooltip key={platformId}>
            <TooltipTrigger asChild>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`${buttonSize} hover:bg-accent`}
                  onClick={() => window.open(getHref(platformId, socialLinks[platformId]), '_blank', 'noopener,noreferrer')}
                >
                  <SocialIcon platformId={platformId} className={iconSize} />
                </Button>
                {isTracked && (
                  <span
                    className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-background"
                    aria-label="Tracked in Social analytics"
                  >
                    <Activity className="h-2 w-2" strokeWidth={3} />
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{platformName}{isTracked ? " · tracked in Social analytics" : ""}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};