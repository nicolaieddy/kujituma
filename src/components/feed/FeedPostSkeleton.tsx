import { SkeletonPost } from '@/components/ui/skeleton-loader';

export const FeedPostSkeleton = () => {
  return <SkeletonPost className="mb-6" />;
};

export const FeedSkeletonList = ({ count = 3 }: { count?: number }) => {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <FeedPostSkeleton key={i} />
      ))}
    </div>
  );
};