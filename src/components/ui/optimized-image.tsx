import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  quality?: number;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const OptimizedImage = ({
  src,
  alt,
  className,
  width,
  height,
  quality = 75,
  priority = false,
  placeholder = 'empty',
  blurDataURL,
  onLoad,
  onError
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);

  // Generate optimized image sources with different formats
  const generateSources = (originalSrc: string) => {
    // For external URLs, we can't optimize them, so return as-is
    if (originalSrc.startsWith('http') && !originalSrc.includes(window.location.hostname)) {
      return {
        webp: originalSrc,
        avif: originalSrc,
        fallback: originalSrc
      };
    }

    // For local images, we would typically use a service like Cloudinary or similar
    // For now, we'll simulate this with query parameters that could be handled by a backend service
    const baseUrl = originalSrc.split('?')[0];
    const params = new URLSearchParams();
    
    if (width) params.set('w', width.toString());
    if (height) params.set('h', height.toString());
    if (quality) params.set('q', quality.toString());

    return {
      avif: `${baseUrl}?${params}&f=avif`,
      webp: `${baseUrl}?${params}&f=webp`,
      fallback: originalSrc
    };
  };

  const sources = generateSources(src);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority) {
      setCurrentSrc(src);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setCurrentSrc(src);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src, priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const showPlaceholder = placeholder === 'blur' && !isLoaded && !hasError;
  const showEmpty = placeholder === 'empty' && !isLoaded && !hasError;

  return (
    <div className={cn('relative overflow-hidden', className)} ref={imgRef}>
      {/* Blur placeholder */}
      {showPlaceholder && (
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-sm scale-110"
          style={{
            backgroundImage: blurDataURL ? `url(${blurDataURL})` : 'linear-gradient(45deg, hsl(var(--muted)) 0%, hsl(var(--muted-foreground) / 0.1) 100%)'
          }}
        />
      )}

      {/* Empty placeholder */}
      {showEmpty && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <span className="text-muted-foreground text-sm">Failed to load image</span>
        </div>
      )}

      {/* Main image with picture element for format optimization */}
      {currentSrc && !hasError && (
        <picture>
          {/* AVIF format - best compression */}
          <source srcSet={sources.avif} type="image/avif" />
          
          {/* WebP format - good compression with wide support */}
          <source srcSet={sources.webp} type="image/webp" />
          
          {/* Fallback to original format */}
          <img
            src={sources.fallback}
            alt={alt}
            width={width}
            height={height}
            className={cn(
              'transition-opacity duration-300',
              isLoaded ? 'opacity-100' : 'opacity-0',
              'w-full h-full object-cover'
            )}
            onLoad={handleLoad}
            onError={handleError}
            loading={priority ? 'eager' : 'lazy'}
          />
        </picture>
      )}
    </div>
  );
};