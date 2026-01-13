import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Sun, Zap, Target, BookOpen } from "lucide-react";
import { format, parseISO } from "date-fns";

const moodEmojis = ['😔', '😕', '😐', '🙂', '😊'];
const moodLabels = ['Very Low', 'Low', 'Neutral', 'Good', 'Great'];

interface CheckIn {
  id: string;
  check_in_date: string;
  mood_rating?: number | null;
  energy_level?: number | null;
  focus_today?: string | null;
  quick_win?: string | null;
  blocker?: string | null;
  journal_entry?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface CheckInDetailModalProps {
  checkIn: CheckIn | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CheckInDetailModal = ({ checkIn, open, onOpenChange }: CheckInDetailModalProps) => {
  if (!checkIn) return null;

  const date = parseISO(checkIn.check_in_date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-amber-500" />
              Daily Check-in
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-sm">{format(date, 'EEEE, MMMM d, yyyy')}</span>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mood & Energy */}
          <div className="flex items-center gap-6">
            {checkIn.mood_rating && (
              <div className="flex flex-col items-center gap-1">
                <span className="text-4xl">{moodEmojis[checkIn.mood_rating - 1]}</span>
                <span className="text-sm text-muted-foreground">{moodLabels[checkIn.mood_rating - 1]}</span>
              </div>
            )}
            {checkIn.energy_level && (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1">
                  <Zap className="h-6 w-6 text-yellow-500" />
                  <span className="text-2xl font-bold">{checkIn.energy_level}/5</span>
                </div>
                <span className="text-sm text-muted-foreground">Energy Level</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Journal Entry - Private */}
          {checkIn.journal_entry && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <BookOpen className="h-4 w-4 text-primary" />
                Journal
                <span className="text-xs text-muted-foreground font-normal">(private)</span>
              </div>
              <p className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">
                {checkIn.journal_entry}
              </p>
            </div>
          )}

          {/* Focus Today */}
          {checkIn.focus_today && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Target className="h-4 w-4 text-primary" />
                Today's Focus
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                {checkIn.focus_today}
              </p>
            </div>
          )}

          {/* No content message */}
          {!checkIn.focus_today && !checkIn.journal_entry && !checkIn.mood_rating && !checkIn.energy_level && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No details recorded for this check-in.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
