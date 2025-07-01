import { FeedPost } from "@/services/feedService";

interface FeedPostPrioritiesProps {
  post: FeedPost;
}

export const FeedPostPriorities = ({ post }: FeedPostPrioritiesProps) => {
  if (!post.priorities) return null;

  return (
    <div>
      <h4 className="text-white font-medium mb-2">🎯 Next Priorities</h4>
      <div className="space-y-2">
        {post.priorities.split('\n').map((line, index) => {
          if (line.trim() === '' || line.includes('Remaining objectives for next week:')) return null;
          
          if (line.startsWith('• ')) {
            const objectiveText = line.substring(2);
            return (
              <div key={index} className="flex items-start gap-3 text-white/80">
                <div className="flex-shrink-0 w-5 h-5 rounded border-2 border-white/40 bg-transparent mt-0.5" />
                <span className="text-white/60">{objectiveText}</span>
              </div>
            );
          }
          
          return (
            <div key={index} className="text-white/80">
              {line}
            </div>
          );
        }).filter(Boolean)}
      </div>
    </div>
  );
};