import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface MentionTextProps {
  text: string;
  className?: string;
}

export const MentionText = ({ text, className }: MentionTextProps) => {
  const navigate = useNavigate();
  const [hoveredMention, setHoveredMention] = useState<string | null>(null);

  // Parse text and find mentions (users mentioned with @)
  const parseTextWithMentions = (text: string) => {
    // Split by @ mentions, keeping the @ symbol
    const parts = text.split(/(@[a-zA-Z\s]+)(?=\s|$)/);
    
    return parts.map((part, index) => {
      // Check if this part is a mention (starts with @)
      if (part.startsWith('@')) {
        const mentionedName = part.substring(1).trim();
        return (
          <span
            key={index}
            className={`text-blue-400 hover:text-blue-300 cursor-pointer font-medium transition-colors ${
              hoveredMention === mentionedName ? 'underline' : ''
            }`}
            onMouseEnter={() => setHoveredMention(mentionedName)}
            onMouseLeave={() => setHoveredMention(null)}
            onClick={() => {
              // Note: In a real implementation, you'd want to resolve the name to a user ID
              // For now, we'll just show a message
              console.log(`Navigate to profile of ${mentionedName}`);
            }}
          >
            @{mentionedName}
          </span>
        );
      }
      
      return part;
    });
  };

  return (
    <span className={className}>
      {parseTextWithMentions(text)}
    </span>
  );
};
