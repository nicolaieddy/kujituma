
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface WeeklyProgressNotesSectionProps {
  progressNotes: string;
  isWeekCompleted: boolean;
  onNotesChange: (notes: string) => void;
}

export const WeeklyProgressNotesSection = ({
  progressNotes,
  isWeekCompleted,
  onNotesChange,
}: WeeklyProgressNotesSectionProps) => {
  return (
    <div>
      <Label className="text-white font-medium text-lg">
        📝 Progress Notes & Reflections
      </Label>
      <p className="text-white/60 text-sm mt-1 mb-3">
        What did you accomplish? Any blockers or areas where you need help?
      </p>
      <Textarea
        value={progressNotes}
        onChange={(e) => onNotesChange(e.target.value)}
        disabled={isWeekCompleted}
        className="bg-white/10 border-white/20 text-white placeholder:text-white/60 min-h-[120px] disabled:opacity-50"
        placeholder="Share your progress, accomplishments, challenges, and any help you need..."
      />
    </div>
  );
};
