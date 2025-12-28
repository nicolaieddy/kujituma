import { useState, useEffect, useRef, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  blurDataUrl?: string;
  placeholderColor?: string;
}

export const LazyImage = ({
  src,
  alt,
  className,
  blurDataUrl,
  placeholderColor = "hsl(var(--muted))",
  ...props
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(undefined);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate a simple blur placeholder
  const blurPlaceholder = blurDataUrl || 
    `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><filter id="b"><feGaussianBlur stdDeviation="12"/></filter></defs><rect fill="${placeholderColor.replace(/[()]/g, '')}" filter="url(#b)" width="100%" height="100%"/></svg>`)}`;

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "200px",
        threshold: 0.01,
      }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isInView && src) {
      const img = new Image();
      img.onload = () => {
        setCurrentSrc(src);
        // Small delay for smooth transition
        requestAnimationFrame(() => {
          setIsLoaded(true);
        });
      };
      img.onerror = () => {
        setHasError(true);
      };
      img.src = src;
    }
  }, [isInView, src]);

  if (hasError) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "bg-muted flex items-center justify-center text-muted-foreground text-sm",
          className
        )}
        {...props}
      >
        Failed to load
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)}>
      {/* Blur placeholder */}
      <div
        className={cn(
          "absolute inset-0 bg-cover bg-center transition-opacity duration-500",
          isLoaded ? "opacity-0" : "opacity-100"
        )}
        style={{
          backgroundImage: `url(${blurPlaceholder})`,
          filter: "blur(8px)",
          transform: "scale(1.05)",
        }}
      />
      
      {/* Shimmer effect while loading */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
      )}
      
      {/* Actual image */}
      {currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-500",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          {...props}
        />
      )}
    </div>
  );
};
