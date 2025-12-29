import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, Lightbulb, Target, CheckCircle, Clock } from "lucide-react";
import { format, parseISO, getISOWeek } from "date-fns";

interface WeeklySession {
  id: string;
  week_start: string;
  is_completed: boolean;
  last_week_reflection: string | null;
  week_intention: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface WeeklySessionDetailModalProps {
  session: WeeklySession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WeeklySessionDetailModal = ({ session, open, onOpenChange }: WeeklySessionDetailModalProps) => {
  if (!session) return null;

  const startDate = parseISO(session.week_start);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  const weekNum = getISOWeek(startDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-500" />
              Week {weekNum} Planning
            </DialogTitle>
            <Badge variant={session.is_completed ? "default" : "secondary"}>
              {session.is_completed ? (
                <><CheckCircle className="h-3 w-3 mr-1" /> Completed</>
              ) : (
                <><Clock className="h-3 w-3 mr-1" /> Draft</>
              )}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-sm">
              {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Last Week Reflection */}
          {session.last_week_reflection && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                Last Week Reflection
              </div>
              <p className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">
                {session.last_week_reflection}
              </p>
            </div>
          )}

          {session.last_week_reflection && session.week_intention && <Separator />}

          {/* This Week's Intention */}
          {session.week_intention && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Target className="h-4 w-4 text-primary" />
                Week Intention
              </div>
              <p className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">
                {session.week_intention}
              </p>
            </div>
          )}

          {/* Completion info */}
          {session.completed_at && (
            <>
              <Separator />
              <p className="text-xs text-muted-foreground text-center">
                Completed on {format(new Date(session.completed_at), 'MMMM d, yyyy \'at\' h:mm a')}
              </p>
            </>
          )}

          {/* No content message */}
          {!session.last_week_reflection && !session.week_intention && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No details recorded for this planning session.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
