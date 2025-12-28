import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Search,
  Linkedin,
  Youtube,
  Mail,
  Globe,
  Github,
  Phone,
  MessageCircle,
  GripVertical,
  Trash2
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Social platform definitions with validation
export const SOCIAL_PLATFORMS = [
  { 
    id: 'linkedin_url', 
    name: 'LinkedIn', 
    icon: Linkedin,
    placeholder: 'https://linkedin.com/in/username',
    example: 'linkedin.com/in/yourprofile',
    type: 'url',
    pattern: /^(https?:\/\/)?(www\.)?(linkedin\.com\/)/i,
    errorMessage: 'Must be a LinkedIn URL (linkedin.com/...)'
  },
  { 
    id: 'tiktok_url', 
    name: 'TikTok', 
    icon: 'tiktok',
    placeholder: 'https://tiktok.com/@username',
    example: '@yourusername or tiktok.com/@username',
    type: 'url',
    pattern: /^(https?:\/\/)?(www\.)?(tiktok\.com\/|@[\w.]+$)/i,
    errorMessage: 'Must be a TikTok URL or @username'
  },
  { 
    id: 'youtube_url', 
    name: 'YouTube', 
    icon: Youtube,
    placeholder: 'https://youtube.com/@channel',
    example: 'youtube.com/@yourchannel',
    type: 'url',
    pattern: /^(https?:\/\/)?(www\.)?(youtube\.com\/|youtu\.be\/)/i,
    errorMessage: 'Must be a YouTube URL (youtube.com/...)'
  },
  { 
    id: 'instagram_url', 
    name: 'Instagram', 
    icon: 'instagram',
    placeholder: 'https://instagram.com/username',
    example: '@yourusername or instagram.com/username',
    type: 'url',
    pattern: /^(https?:\/\/)?(www\.)?(instagram\.com\/|@[\w.]+$)/i,
    errorMessage: 'Must be an Instagram URL or @username'
  },
  { 
    id: 'twitter_url', 
    name: 'X (Twitter)', 
    icon: 'x',
    placeholder: 'https://x.com/username',
    example: '@yourusername or x.com/username',
    type: 'url',
    pattern: /^(https?:\/\/)?(www\.)?(x\.com\/|twitter\.com\/|@[\w]+$)/i,
    errorMessage: 'Must be an X/Twitter URL or @username'
  },
  { 
    id: 'email_contact', 
    name: 'Email', 
    icon: Mail,
    placeholder: 'your@email.com',
    example: 'your@email.com',
    type: 'email',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    errorMessage: 'Must be a valid email address'
  },
  { 
    id: 'website_url', 
    name: 'Personal Website', 
    icon: Globe,
    placeholder: 'https://yourwebsite.com',
    example: 'yourwebsite.com',
    type: 'url',
    pattern: /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}/i,
    errorMessage: 'Must be a valid website URL'
  },
  { 
    id: 'github_url', 
    name: 'GitHub', 
    icon: Github,
    placeholder: 'https://github.com/username',
    example: 'github.com/yourusername',
    type: 'url',
    pattern: /^(https?:\/\/)?(www\.)?(github\.com\/)/i,
    errorMessage: 'Must be a GitHub URL (github.com/...)'
  },
  { 
    id: 'snapchat_url', 
    name: 'Snapchat', 
    icon: 'snapchat',
    placeholder: 'https://snapchat.com/add/username',
    example: '@yourusername or snapchat.com/add/username',
    type: 'url',
    pattern: /^(https?:\/\/)?(www\.)?(snapchat\.com\/|@[\w.]+$)/i,
    errorMessage: 'Must be a Snapchat URL or @username'
  },
  { 
    id: 'medium_url', 
    name: 'Medium', 
    icon: 'medium',
    placeholder: 'https://medium.com/@username',
    example: 'medium.com/@yourusername',
    type: 'url',
    pattern: /^(https?:\/\/)?(www\.)?(medium\.com\/)/i,
    errorMessage: 'Must be a Medium URL (medium.com/...)'
  },
  { 
    id: 'substack_url', 
    name: 'Substack', 
    icon: 'substack',
    placeholder: 'https://username.substack.com',
    example: 'yourname.substack.com',
    type: 'url',
    pattern: /^(https?:\/\/)?([\w-]+\.)?substack\.com/i,
    errorMessage: 'Must be a Substack URL (*.substack.com)'
  },
  { 
    id: 'whatsapp_url', 
    name: 'WhatsApp', 
    icon: 'whatsapp',
    placeholder: '+1234567890',
    example: '+1 234 567 890',
    type: 'phone',
    pattern: /^\+?[\d\s\-().]{7,20}$/,
    errorMessage: 'Must be a valid phone number'
  },
  { 
    id: 'telegram_url', 
    name: 'Telegram', 
    icon: MessageCircle,
    placeholder: 'https://t.me/username',
    example: 't.me/yourusername or @username',
    type: 'url',
    pattern: /^(https?:\/\/)?(www\.)?(t\.me\/|telegram\.me\/|@[\w]+$)/i,
    errorMessage: 'Must be a Telegram URL or @username'
  },
  { 
    id: 'signal_url', 
    name: 'Signal', 
    icon: 'signal',
    placeholder: '+1234567890',
    example: '+1 234 567 890',
    type: 'phone',
    pattern: /^\+?[\d\s\-().]{7,20}$/,
    errorMessage: 'Must be a valid phone number'
  },
  { 
    id: 'phone_number', 
    name: 'Phone Number', 
    icon: Phone,
    placeholder: '+1234567890',
    example: '+1 234 567 890',
    type: 'phone',
    pattern: /^\+?[\d\s\-().]{7,20}$/,
    errorMessage: 'Must be a valid phone number'
  },
] as const;

export type SocialPlatformId = typeof SOCIAL_PLATFORMS[number]['id'];

// Validation function
export const validateSocialLink = (platformId: string, value: string): { isValid: boolean; error?: string } => {
  if (!value.trim()) {
    return { isValid: false, error: 'This field is required' };
  }
  
  const platform = SOCIAL_PLATFORMS.find(p => p.id === platformId);
  if (!platform) {
    return { isValid: true };
  }
  
  if (!platform.pattern.test(value.trim())) {
    return { isValid: false, error: platform.errorMessage };
  }
  
  return { isValid: true };
};

// Custom icon component for platforms that need custom SVGs
const CustomSocialIcon = ({ platform, className = "h-5 w-5" }: { platform: string; className?: string }) => {
  switch (platform) {
    case 'tiktok':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
      );
    case 'instagram':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      );
    case 'x':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      );
    case 'snapchat':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301a.99.99 0 0 1 .42-.091c.276 0 .523.105.689.315a.758.758 0 0 1 .149.555c-.038.164-.15.361-.404.477-.29.142-.615.237-.96.322l-.074.018c-.164.039-.321.078-.463.123-.239.078-.421.186-.495.312-.098.159-.037.345.061.554l.018.042c.008.018.018.039.028.058.35.732.918 1.401 1.691 1.989.329.251.7.47 1.102.659.258.123.477.213.558.31.082.098.123.178.15.264a.76.76 0 0 1 .009.469c-.105.349-.519.609-1.268.795-.146.036-.323.072-.519.108l-.089.018c-.231.048-.464.096-.716.18-.107.036-.226.09-.35.15-.151.075-.302.135-.458.197-.283.109-.558.219-.819.335a6.49 6.49 0 0 1-2.271.474c-2.94 0-4.949-2.107-5.093-2.26l-.016-.018c-.06-.045-.117-.09-.178-.135-.149-.11-.301-.165-.466-.165-.165 0-.323.055-.495.165l-.016.012c-.061.045-.133.09-.211.135-.149.12-.371.294-.706.459-.39.195-.826.33-1.306.405-.254.045-.494.075-.72.09-.225.015-.435.018-.63.018-.27 0-.529-.006-.771-.024-1.127-.078-2.128-.39-2.998-.93a6.38 6.38 0 0 1-.819-.645.992.992 0 0 1-.164-.525c.012-.15.078-.285.18-.39.075-.075.164-.135.268-.18.075-.036.15-.063.227-.09.076-.024.15-.048.225-.072.225-.072.449-.15.659-.24a6.356 6.356 0 0 0 1.372-.82 5.07 5.07 0 0 0 1.102-1.181c.195-.285.372-.599.525-.945.012-.024.021-.048.033-.072.098-.209.159-.395.06-.554-.074-.126-.256-.234-.495-.312a8.47 8.47 0 0 0-.463-.123l-.074-.018c-.345-.085-.67-.18-.96-.322-.254-.116-.366-.313-.404-.477a.758.758 0 0 1 .149-.555c.166-.21.413-.315.689-.315.15 0 .285.03.42.091.374.181.733.285 1.033.301.198 0 .326-.045.401-.09a7.566 7.566 0 0 1-.033-.57c-.104-1.628-.23-3.654.299-4.847C7.859 1.069 11.216.793 12.206.793z"/>
        </svg>
      );
    case 'medium':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/>
        </svg>
      );
    case 'substack':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/>
        </svg>
      );
    case 'whatsapp':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      );
    case 'signal':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1.5C6.201 1.5 1.5 6.201 1.5 12S6.201 22.5 12 22.5 22.5 17.799 22.5 12 17.799 1.5 12 1.5zm0 2.25a8.25 8.25 0 110 16.5 8.25 8.25 0 010-16.5zm-.75 3v7.5h1.5v-7.5h-1.5zm0 9v1.5h1.5v-1.5h-1.5z"/>
        </svg>
      );
    default:
      return <Globe className={className} />;
  }
};

// Render icon for a platform (handles both Lucide and custom icons)
export const SocialIcon = ({ platformId, className = "h-5 w-5" }: { platformId: string; className?: string }) => {
  const platform = SOCIAL_PLATFORMS.find(p => p.id === platformId);
  if (!platform) return <Globe className={className} />;
  
  if (typeof platform.icon === 'string') {
    return <CustomSocialIcon platform={platform.icon} className={className} />;
  }
  
  const IconComponent = platform.icon;
  return <IconComponent className={className} />;
};

// Sortable item for drag-and-drop
interface SortableSocialItemProps {
  id: string;
  onEdit: () => void;
  onRemove: () => void;
}

const SortableSocialItem = ({ id, onEdit, onRemove }: SortableSocialItemProps) => {
  const platform = SOCIAL_PLATFORMS.find(p => p.id === id);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!platform) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-3 py-2 bg-background border rounded-lg ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <SocialIcon platformId={id} className="h-5 w-5" />
      <span className="flex-1 text-sm font-medium">{platform.name}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onEdit}
        className="h-7 px-2 text-xs"
      >
        Edit
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

interface SocialLinkPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  socialLinks: Record<string, string>;
  onSocialLinksChange: (links: Record<string, string>) => void;
  linkOrder: string[];
  onLinkOrderChange: (order: string[]) => void;
}

export const SocialLinkPicker = ({ 
  open, 
  onOpenChange, 
  socialLinks, 
  onSocialLinksChange,
  linkOrder,
  onLinkOrderChange,
}: SocialLinkPickerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<typeof SOCIAL_PLATFORMS[number] | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'add' | 'edit'>('list');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get ordered list of added platforms
  const orderedAddedPlatforms = useMemo(() => {
    const addedIds = Object.keys(socialLinks).filter(id => socialLinks[id]?.trim());
    const safeOrder = linkOrder || [];
    // Sort by linkOrder, putting unknown items at the end
    return addedIds.sort((a, b) => {
      const indexA = safeOrder.indexOf(a);
      const indexB = safeOrder.indexOf(b);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [socialLinks, linkOrder]);

  const filteredPlatforms = SOCIAL_PLATFORMS.filter(platform =>
    platform.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectPlatform = (platform: typeof SOCIAL_PLATFORMS[number]) => {
    setSelectedPlatform(platform);
    setInputValue(socialLinks[platform.id] || "");
    setView('edit');
  };

  const handleBack = () => {
    setSelectedPlatform(null);
    setInputValue("");
    setValidationError(null);
    setView('list');
    setSearchQuery("");
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    // Clear error on input change
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleAdd = () => {
    if (selectedPlatform && inputValue.trim()) {
      // Validate before adding
      const validation = validateSocialLink(selectedPlatform.id, inputValue);
      if (!validation.isValid) {
        setValidationError(validation.error || 'Invalid input');
        return;
      }
      
      const isNew = !socialLinks[selectedPlatform.id];
      onSocialLinksChange({
        ...socialLinks,
        [selectedPlatform.id]: inputValue.trim()
      });
      // Add to order if new
      if (isNew && !linkOrder.includes(selectedPlatform.id)) {
        onLinkOrderChange([...linkOrder, selectedPlatform.id]);
      }
      handleBack();
    }
  };

  const handleRemove = (platformId?: string) => {
    const idToRemove = platformId || selectedPlatform?.id;
    if (idToRemove) {
      const newLinks = { ...socialLinks };
      delete newLinks[idToRemove];
      onSocialLinksChange(newLinks);
      // Remove from order
      onLinkOrderChange(linkOrder.filter(id => id !== idToRemove));
      if (view === 'edit') {
        handleBack();
      }
    }
  };

  const handleClose = () => {
    setSelectedPlatform(null);
    setInputValue("");
    setSearchQuery("");
    setView('list');
    onOpenChange(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = orderedAddedPlatforms.indexOf(active.id as string);
      const newIndex = orderedAddedPlatforms.indexOf(over.id as string);
      const newOrder = arrayMove(orderedAddedPlatforms, oldIndex, newIndex);
      onLinkOrderChange(newOrder);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        {view === 'edit' && selectedPlatform ? (
          // Input view for selected platform
          <>
            <DialogHeader className="px-4 py-3 border-b flex flex-row items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <DialogTitle className="flex-1 text-center pr-8">
                {socialLinks[selectedPlatform.id] ? 'Edit' : 'Add'} {selectedPlatform.name}
              </DialogTitle>
              <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
                <X className="h-5 w-5" />
              </Button>
            </DialogHeader>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="social-input">
                  {selectedPlatform.type === 'email' ? 'Email Address' : 
                   selectedPlatform.type === 'phone' ? 'Phone Number' : 'URL'}
                </Label>
                <Input
                  id="social-input"
                  type={selectedPlatform.type === 'email' ? 'email' : 'text'}
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={selectedPlatform.placeholder}
                  className={`text-base ${validationError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  autoFocus
                />
                {validationError ? (
                  <p className="text-xs text-destructive">{validationError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Example: {selectedPlatform.example}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {socialLinks[selectedPlatform.id] && (
                  <Button
                    variant="outline"
                    onClick={() => handleRemove()}
                    className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    Remove
                  </Button>
                )}
                <Button
                  onClick={handleAdd}
                  disabled={!inputValue.trim()}
                  className="flex-1"
                >
                  {socialLinks[selectedPlatform.id] ? 'Update' : 'Add'}
                </Button>
              </div>
            </div>
          </>
        ) : view === 'add' ? (
          // Platform selection view
          <>
            <DialogHeader className="px-4 py-3 border-b flex flex-row items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <DialogTitle className="flex-1 text-center pr-8">Add Social Link</DialogTitle>
              <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
                <X className="h-5 w-5" />
              </Button>
            </DialogHeader>
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search platforms..."
                  className="pl-10"
                />
              </div>
            </div>
            <ScrollArea className="max-h-[400px]">
              <div className="divide-y divide-border">
                {filteredPlatforms.map((platform) => {
                  const hasValue = Boolean(socialLinks[platform.id]);
                  return (
                    <button
                      key={platform.id}
                      onClick={() => handleSelectPlatform(platform)}
                      className={`w-full flex items-center gap-4 px-4 py-3 hover:bg-accent transition-colors text-left ${
                        hasValue ? 'bg-primary/5' : ''
                      }`}
                    >
                      <SocialIcon platformId={platform.id} className="h-6 w-6 flex-shrink-0" />
                      <span className="flex-1 font-medium">{platform.name}</span>
                      {hasValue && (
                        <span className="text-xs text-primary font-medium px-2 py-0.5 bg-primary/10 rounded-full">
                          Added
                        </span>
                      )}
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        ) : (
          // Main list view with reordering
          <>
            <DialogHeader className="px-4 py-3 border-b flex flex-row items-center justify-between">
              <div className="w-8" />
              <DialogTitle className="text-center">Social Links</DialogTitle>
              <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
                <X className="h-5 w-5" />
              </Button>
            </DialogHeader>
            <div className="p-4 space-y-4">
              {orderedAddedPlatforms.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Drag to reorder
                  </Label>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={orderedAddedPlatforms}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {orderedAddedPlatforms.map((platformId) => (
                          <SortableSocialItem
                            key={platformId}
                            id={platformId}
                            onEdit={() => {
                              const platform = SOCIAL_PLATFORMS.find(p => p.id === platformId);
                              if (platform) handleSelectPlatform(platform);
                            }}
                            onRemove={() => handleRemove(platformId)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">No social links added yet.</p>
                  <p className="text-xs mt-1">Add links to display on your profile.</p>
                </div>
              )}
              <Button
                onClick={() => setView('add')}
                variant="outline"
                className="w-full"
              >
                Add Social Link
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};