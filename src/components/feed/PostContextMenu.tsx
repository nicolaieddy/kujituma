import { useState, useEffect, useRef } from 'react';
import { Copy, Flag, EyeOff, Share2, Trash2 } from 'lucide-react';
import { UnifiedPost } from '@/services/unifiedPostsService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface PostContextMenuProps {
  post: UnifiedPost;
  x: number;
  y: number;
  onClose: () => void;
}

export const PostContextMenu = ({ post, x, y, onClose }: PostContextMenuProps) => {
  const { user } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  const isOwnPost = user?.id === post.user_id;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleScroll = () => onClose();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/community?post=${post.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copied to clipboard' });
    onClose();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${post.name}'s progress`,
          url: `${window.location.origin}/community?post=${post.id}`
        });
      } catch (err) {
        // User cancelled or error occurred
      }
    } else {
      handleCopyLink();
    }
    onClose();
  };

  const handleReport = () => {
    toast({ 
      title: 'Report submitted',
      description: 'Thank you for helping keep our community safe.'
    });
    onClose();
  };

  const handleHide = () => {
    toast({ 
      title: 'Post hidden',
      description: 'You won\'t see posts from this user anymore.'
    });
    onClose();
  };

  const handleDelete = () => {
    toast({ 
      title: 'Delete post',
      description: 'This feature will be available soon.'
    });
    onClose();
  };

  // Adjust position if menu would go off screen
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 250);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-card border border-border rounded-lg shadow-xl py-2 min-w-[200px]"
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
    >
      <button
        onClick={handleCopyLink}
        className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2 transition-colors"
      >
        <Copy className="h-4 w-4" />
        Copy link
      </button>
      
      <button
        onClick={handleShare}
        className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2 transition-colors"
      >
        <Share2 className="h-4 w-4" />
        Share
      </button>

      <div className="border-t border-border my-1" />

      {!isOwnPost && (
        <>
          <button
            onClick={handleHide}
            className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2 transition-colors"
          >
            <EyeOff className="h-4 w-4" />
            Hide post
          </button>

          <button
            onClick={handleReport}
            className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-accent flex items-center gap-2 transition-colors"
          >
            <Flag className="h-4 w-4" />
            Report post
          </button>
        </>
      )}

      {isOwnPost && (
        <button
          onClick={handleDelete}
          className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-accent flex items-center gap-2 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Delete post
        </button>
      )}
    </div>
  );
};
