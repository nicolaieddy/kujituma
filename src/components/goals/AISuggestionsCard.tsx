import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface ObjectiveSuggestion {
  text: string;
  reason: string;
  priority: "high" | "medium" | "low";
  source: "carryover" | "goal-aligned" | "new";
}

interface AISuggestionsCardProps {
  suggestions: ObjectiveSuggestion[];
  isLoading: boolean;
  onAddSuggestion: (text: string) => void;
  onRefresh: () => void;
}

export const AISuggestionsCard = ({ 
  suggestions, 
  isLoading, 
  onAddSuggestion, 
  onRefresh 
}: AISuggestionsCardProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [addedTexts, setAddedTexts] = useState<Set<string>>(new Set());

  const handleAdd = (text: string) => {
    onAddSuggestion(text);
    setAddedTexts(prev => new Set(prev).add(text));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "secondary";
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case "carryover": return "Carry forward";
      case "goal-aligned": return "Goal aligned";
      case "new": return "Fresh start";
      default: return source;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 rounded-full p-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating personalized suggestions...
          </div>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 rounded-full p-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">AI Suggestions</p>
            <p className="text-xs text-muted-foreground">
              {suggestions.length} objective{suggestions.length !== 1 ? 's' : ''} suggested for you
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {suggestions.map((suggestion, index) => (
            <div 
              key={index} 
              className="bg-background/50 rounded-lg p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium flex-1">{suggestion.text}</p>
                <Button
                  size="sm"
                  variant={addedTexts.has(suggestion.text) ? "secondary" : "default"}
                  className="h-7 text-xs shrink-0"
                  onClick={() => handleAdd(suggestion.text)}
                  disabled={addedTexts.has(suggestion.text)}
                >
                  {addedTexts.has(suggestion.text) ? (
                    "Added"
                  ) : (
                    <>
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
              <div className="flex gap-2">
                <Badge variant={getPriorityColor(suggestion.priority) as any} className="text-xs">
                  {suggestion.priority}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {getSourceLabel(suggestion.source)}
                </Badge>
              </div>
            </div>
          ))}

          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs" 
            onClick={onRefresh}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Regenerate suggestions
          </Button>
        </div>
      )}
    </div>
  );
};
