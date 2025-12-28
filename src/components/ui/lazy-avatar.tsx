import * as React from "react";
import { useState, useEffect, useRef } from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

interface LazyAvatarImageProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> {
  blurDataUrl?: string;
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
));
Avatar.displayName = "LazyAvatar";

const LazyAvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  LazyAvatarImageProps
>(({ className, src, blurDataUrl, ...props }, ref) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate a blur placeholder as base64 SVG
  const blurPlaceholder = blurDataUrl || 
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGZpbHRlciBpZD0iYiI+PGZlR2F1c3NpYW5CbHVyIHN0ZERldmlhdGlvbj0iMTAiLz48L2ZpbHRlcj48L2RlZnM+PHJlY3QgZmlsbD0iI2UyZThlYyIgZmlsdGVyPSJ1cmwoI2IpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+";

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
        rootMargin: "100px", // Start loading 100px before visible
        threshold: 0.01,
      }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isInView && src) {
      // Preload image
      const img = new Image();
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
      img.onerror = () => {
        setImageSrc(undefined);
      };
      img.src = src;
    }
  }, [isInView, src]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Blur placeholder */}
      <div
        className={cn(
          "absolute inset-0 bg-cover bg-center transition-opacity duration-300",
          isLoaded ? "opacity-0" : "opacity-100"
        )}
        style={{ 
          backgroundImage: `url(${blurPlaceholder})`,
          filter: "blur(4px)",
          transform: "scale(1.1)",
        }}
      />
      
      {/* Actual image */}
      {imageSrc && (
        <AvatarPrimitive.Image
          ref={ref}
          src={imageSrc}
          className={cn(
            "aspect-square h-full w-full transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
          {...props}
        />
      )}
    </div>
  );
});
LazyAvatarImage.displayName = "LazyAvatarImage";

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = "LazyAvatarFallback";

export { Avatar as LazyAvatar, LazyAvatarImage, AvatarFallback as LazyAvatarFallback };
