import { useState, useEffect, useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

interface UserSuggestion {
  id: string;
  full_name: string;
  avatar_url?: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyPress?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const MentionInput = ({
  value,
  onChange,
  onKeyPress,
  placeholder = "Write a comment...",
  className,
  disabled = false
}: MentionInputProps) => {
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  const debouncedMentionQuery = useDebounce(mentionQuery, 300);

  // Fetch user suggestions
  const fetchUserSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .ilike('full_name', `%${query}%`)
        .limit(10);

      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error('Error fetching user suggestions:', error);
      setSuggestions([]);
    }
  }, []);

  // Debounced fetch
  useEffect(() => {
    if (debouncedMentionQuery) {
      fetchUserSuggestions(debouncedMentionQuery);
    }
  }, [debouncedMentionQuery, fetchUserSuggestions]);

  // Handle textarea change and detect mentions
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    onChange(newValue);

    // Find the last @ before cursor position
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      // Check if there's a space between @ and cursor (which would end the mention)
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionStartPos(lastAtIndex);
        setMentionQuery(textAfterAt);
        setShowSuggestions(true);
        setSelectedSuggestionIndex(0);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection
  const selectSuggestion = (suggestion: UserSuggestion) => {
    const beforeMention = value.substring(0, mentionStartPos);
    const afterMention = value.substring(mentionStartPos + mentionQuery.length + 1);
    const newValue = `${beforeMention}@${suggestion.full_name} ${afterMention}`;
    
    onChange(newValue);
    setShowSuggestions(false);
    
    // Focus back to textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      // Set cursor position after the mention
      const newCursorPos = beforeMention.length + suggestion.full_name.length + 2;
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case 'Enter':
          if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
            e.preventDefault();
            selectSuggestion(suggestions[selectedSuggestionIndex]);
            return;
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowSuggestions(false);
          break;
      }
    }
    
    // Pass through other key events
    onKeyPress?.(e);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="relative w-full">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextareaChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        rows={3}
      />
      
      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                index === selectedSuggestionIndex 
                  ? 'bg-gray-700' 
                  : 'hover:bg-gray-700'
              }`}
              onClick={() => selectSuggestion(suggestion)}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={suggestion.avatar_url || undefined} />
                <AvatarFallback className="bg-purple-500 text-white text-xs">
                  {getInitials(suggestion.full_name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-white font-medium">
                {suggestion.full_name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};