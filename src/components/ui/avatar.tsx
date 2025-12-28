import * as React from "react";
import { useState, useEffect, useRef } from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

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
Avatar.displayName = AvatarPrimitive.Root.displayName;

interface AvatarImageProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> {
  enableLazyLoading?: boolean;
}

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  AvatarImageProps
>(({ className, src, enableLazyLoading = true, ...props }, ref) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!enableLazyLoading);
  const [imageSrc, setImageSrc] = useState<string | undefined>(
    enableLazyLoading ? undefined : src
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Blur placeholder as base64 SVG
  const blurPlaceholder =
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGZpbHRlciBpZD0iYiI+PGZlR2F1c3NpYW5CbHVyIHN0ZERldmlhdGlvbj0iMTAiLz48L2ZpbHRlcj48L2RlZnM+PHJlY3QgZmlsbD0iI2UyZThlYyIgZmlsdGVyPSJ1cmwoI2IpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+";

  useEffect(() => {
    if (!enableLazyLoading || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: "100px", threshold: 0.01 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [enableLazyLoading]);

  useEffect(() => {
    if (isInView && src) {
      const img = new Image();
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
      img.onerror = () => setImageSrc(undefined);
      img.src = src;
    }
  }, [isInView, src]);

  if (!enableLazyLoading) {
    return (
      <AvatarPrimitive.Image
        ref={ref}
        src={src}
        className={cn("aspect-square h-full w-full", className)}
        {...props}
      />
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden rounded-full">
      {/* Blur placeholder */}
      <div
        className={cn(
          "absolute inset-0 bg-cover bg-center transition-opacity duration-300 rounded-full",
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
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

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
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
