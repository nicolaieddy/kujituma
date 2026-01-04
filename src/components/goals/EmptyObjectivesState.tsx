interface EmptyObjectivesStateProps {
  isEmpty: boolean;
}

export const EmptyObjectivesState = ({ isEmpty }: EmptyObjectivesStateProps) => {
  if (!isEmpty) {
    return null;
  }

  return (
    <div className="bg-accent rounded-lg p-6 border border-border mb-6">
      <div className="text-center space-y-4">
        <div className="space-y-2">
          <h3 className="text-foreground font-semibold text-lg">
            Plan Your Week for Success
          </h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Use your weekly plan to list your top priorities for the week. Focus on what matters most and make meaningful progress.
          </p>
        </div>
        <p className="text-muted-foreground text-xs">
          Start by adding your first objective below ⬇️
        </p>
      </div>
    </div>
  );
};
