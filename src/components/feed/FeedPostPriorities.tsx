import { UnifiedPost } from "@/services/unifiedPostsService";

interface FeedPostPrioritiesProps {
  post: UnifiedPost;
}

export const FeedPostPriorities = ({ post }: FeedPostPrioritiesProps) => {
  if (!post.priorities) return null;

  return (
    <div className="bg-purple-500/10 rounded-lg p-5 border border-purple-500/20">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
        <h4 className="text-purple-300 font-semibold text-lg">Next Priorities</h4>
      </div>
      <div className="space-y-3">
        {post.priorities.split('\n').map((line, index) => {
          if (line.trim() === '' || line.includes('Remaining objectives for next week:')) return null;
          
          if (line.startsWith('• ')) {
            const objectiveText = line.substring(2);
            return (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-purple-400 bg-transparent mt-0.5" />
                <p className="text-foreground font-medium leading-relaxed">{objectiveText}</p>
              </div>
            );
          }
          
          return (
            <p key={index} className="text-foreground/90 leading-relaxed">
              {line}
            </p>
          );
        }).filter(Boolean)}
      </div>
    </div>
  );
};