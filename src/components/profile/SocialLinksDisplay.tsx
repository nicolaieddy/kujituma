import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SocialIcon, SOCIAL_PLATFORMS } from "./SocialLinkPicker";

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
    return `mailto:${value}`;
  }
  if (platform.type === 'phone' || platformId === 'whatsapp_url') {
    // WhatsApp specific
    if (platformId === 'whatsapp_url') {
      const cleanNumber = value.replace(/\D/g, '');
      return `https://wa.me/${cleanNumber}`;
    }
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
  // Get ordered list of active platforms
  const orderedPlatforms = useMemo(() => {
    const activePlatforms = Object.entries(socialLinks)
      .filter(([_, value]) => value && value.trim())
      .map(([id]) => id);
    
    // Sort by linkOrder, putting unknown items at the end
    return activePlatforms.sort((a, b) => {
      const indexA = linkOrder.indexOf(a);
      const indexB = linkOrder.indexOf(b);
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
    <TooltipProvider>
      <div className="flex flex-wrap gap-1">
        {orderedPlatforms.map((platformId) => (
          <Tooltip key={platformId}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`${buttonSize} hover:bg-accent`}
                onClick={() => window.open(getHref(platformId, socialLinks[platformId]), '_blank', 'noopener,noreferrer')}
              >
                <SocialIcon platformId={platformId} className={iconSize} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{getPlatformName(platformId)}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};