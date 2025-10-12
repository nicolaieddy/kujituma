import { UnifiedPost } from "@/services/unifiedPostsService";

interface FeedPostHelpProps {
  post: UnifiedPost;
}

export const FeedPostHelp = ({ post }: FeedPostHelpProps) => {
  if (!post.help) return null;

  return (
    <div className="bg-rose-500/10 rounded-lg p-5 border border-rose-500/20">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 bg-rose-400 rounded-full"></div>
        <h4 className="text-rose-300 font-semibold text-lg">Help Needed</h4>
      </div>
      <p className="text-foreground/90 whitespace-pre-line leading-relaxed">{post.help}</p>
    </div>
  );
};