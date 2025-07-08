import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  animation?: 'pulse' | 'wave' | 'none';
  width?: string | number;
  height?: string | number;
}

const Skeleton = ({ 
  className, 
  variant = 'rectangular',
  animation = 'pulse',
  width,
  height,
  ...props 
}: SkeletonProps & React.HTMLAttributes<HTMLDivElement>) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded';
      case 'circular':
        return 'rounded-full';
      case 'rounded':
        return 'rounded-lg';
      case 'rectangular':
      default:
        return 'rounded-md';
    }
  };

  const getAnimationClasses = () => {
    switch (animation) {
      case 'wave':
        return 'animate-[wave_1.6s_ease-in-out_infinite]';
      case 'pulse':
        return 'animate-pulse';
      case 'none':
      default:
        return '';
    }
  };

  const styles = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={cn(
        "bg-muted",
        getVariantClasses(),
        getAnimationClasses(),
        className
      )}
      style={styles}
      {...props}
    />
  );
};

// Predefined skeleton components for common use cases
const SkeletonText = ({ lines = 1, className, ...props }: { lines?: number } & SkeletonProps) => (
  <div className={cn("space-y-2", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        variant="text"
        className={i === lines - 1 ? "w-3/4" : "w-full"}
        {...props}
      />
    ))}
  </div>
);

const SkeletonAvatar = ({ size = 40, className, ...props }: { size?: number } & SkeletonProps) => (
  <Skeleton
    variant="circular"
    width={size}
    height={size}
    className={className}
    {...props}
  />
);

const SkeletonCard = ({ className, ...props }: SkeletonProps) => (
  <div className={cn("p-6 bg-white/10 backdrop-blur-lg border-white/20 rounded-lg", className)}>
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <SkeletonAvatar size={32} />
        <div className="flex-1">
          <Skeleton variant="text" className="w-24 h-3 mb-2" />
          <Skeleton variant="text" className="w-16 h-2" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" className="w-full h-3" />
        <Skeleton variant="text" className="w-4/5 h-3" />
        <Skeleton variant="text" className="w-3/5 h-3" />
      </div>
    </div>
  </div>
);

const SkeletonPost = ({ className, ...props }: SkeletonProps) => (
  <div className={cn("bg-white/10 backdrop-blur-lg border-white/20 rounded-lg p-6", className)}>
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <SkeletonAvatar size={40} />
          <div>
            <Skeleton variant="text" className="w-24 h-4 mb-1" />
            <Skeleton variant="text" className="w-16 h-3" />
          </div>
        </div>
        <Skeleton variant="rectangular" className="w-6 h-6 rounded" />
      </div>
      
      {/* Content */}
      <div className="space-y-3">
        <Skeleton variant="text" className="w-full h-4" />
        <Skeleton variant="text" className="w-5/6 h-4" />
        <Skeleton variant="text" className="w-4/6 h-4" />
      </div>
      
      {/* Actions */}
      <div className="flex items-center space-x-4 pt-2">
        <Skeleton variant="rectangular" className="w-16 h-8 rounded" />
        <Skeleton variant="rectangular" className="w-20 h-8 rounded" />
        <Skeleton variant="rectangular" className="w-12 h-8 rounded" />
      </div>
    </div>
  </div>
);

const SkeletonList = ({ 
  items = 3, 
  itemComponent: ItemComponent = SkeletonCard,
  className,
  ...props 
}: { 
  items?: number;
  itemComponent?: React.ComponentType<any>;
} & SkeletonProps) => (
  <div className={cn("space-y-4", className)}>
    {Array.from({ length: items }).map((_, i) => (
      <ItemComponent key={i} {...props} />
    ))}
  </div>
);

export { 
  Skeleton, 
  SkeletonText, 
  SkeletonAvatar, 
  SkeletonCard, 
  SkeletonPost, 
  SkeletonList 
};