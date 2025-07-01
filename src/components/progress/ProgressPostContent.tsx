import { ProgressPostType } from "@/types/progress";

interface ProgressPostContentProps {
  post: ProgressPostType;
}

export const ProgressPostContent = ({ post }: ProgressPostContentProps) => {
  return (
    <div className="space-y-1">
      {/* Accomplishments */}
      {post.accomplishments && (
        <div>
          <h4 className="text-white font-medium mb-1 flex items-center text-xs">
            🎉 Wins
          </h4>
          <p className="text-white/80 whitespace-pre-wrap text-xs leading-relaxed">{post.accomplishments}</p>
        </div>
      )}

      {post.priorities && (
        <div>
          <h4 className="text-white font-medium mb-1 flex items-center text-xs">
            🎯 Focus
          </h4>
          <p className="text-white/80 whitespace-pre-wrap text-xs leading-relaxed">{post.priorities}</p>
        </div>
      )}

      {post.help && (
        <div>
          <h4 className="text-white font-medium mb-1 flex items-center text-xs">
            🤝 Help
          </h4>
          <p className="text-white/80 whitespace-pre-wrap text-xs leading-relaxed">{post.help}</p>
        </div>
      )}
    </div>
  );
};