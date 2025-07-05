import { CheckCircle, Clock, Save } from "lucide-react";

interface AutoSaveIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
}

export const AutoSaveIndicator = ({ isSaving, lastSaved, hasUnsavedChanges }: AutoSaveIndicatorProps) => {
  if (isSaving) {
    return (
      <div className="flex items-center text-white/60 text-xs">
        <Save className="h-3 w-3 mr-1 animate-pulse" />
        Saving...
      </div>
    );
  }

  if (lastSaved) {
    return (
      <div className="flex items-center text-green-400 text-xs">
        <CheckCircle className="h-3 w-3 mr-1" />
        Saved {formatTimeAgo(lastSaved)}
      </div>
    );
  }

  if (hasUnsavedChanges) {
    return (
      <div className="flex items-center text-yellow-400 text-xs">
        <Clock className="h-3 w-3 mr-1" />
        Auto-saving...
      </div>
    );
  }

  return null;
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  }
}