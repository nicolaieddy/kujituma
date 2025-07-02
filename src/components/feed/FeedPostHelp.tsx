import { UnifiedPost } from "@/services/unifiedPostsService";

interface FeedPostHelpProps {
  post: UnifiedPost;
}

export const FeedPostHelp = ({ post }: FeedPostHelpProps) => {
  if (!post.help) return null;

  return (
    <div>
      <h4 className="text-white font-medium mb-2">🤝 Help Needed</h4>
      <div className="text-white/80 whitespace-pre-line">{post.help}</div>
    </div>
  );
};