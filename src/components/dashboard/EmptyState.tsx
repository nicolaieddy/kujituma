
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  searchQuery: string;
  onClearSearch: () => void;
  isAuthenticated: boolean;
}

export const EmptyState = ({ searchQuery, onClearSearch, isAuthenticated }: EmptyStateProps) => {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 sm:p-8 max-w-md mx-auto text-center">
      {searchQuery ? (
        <>
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Results Found</h3>
          <p className="text-white/70 mb-4 text-sm sm:text-base">
            Try different keywords or clear your search.
          </p>
          <Button
            variant="ghost"
            onClick={onClearSearch}
            className="text-white hover:bg-white/20"
          >
            Clear Search
          </Button>
        </>
      ) : (
        <>
          <div className="text-5xl sm:text-6xl mb-4">🚀</div>
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Ready to Share?</h3>
          <p className="text-white/70 mb-4 text-sm sm:text-base">
            No progress posts in the selected time period. {
              isAuthenticated 
                ? 'Click "Share Progress" to get started!' 
                : 'Sign in to share your first progress post!'
            }
          </p>
        </>
      )}
    </div>
  );
};
