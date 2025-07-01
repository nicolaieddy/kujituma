import { FeedPost } from "@/services/feedService";

interface FeedPostHelpProps {
  post: FeedPost;
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