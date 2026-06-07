import { Link } from "react-router-dom";
import { CalEvent, EVENT_STYLES } from "./types";
import { Cake, CalendarCheck, Star, MessageCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO, isToday as isDateToday } from "date-fns";

const ICON_MAP = { Cake, CalendarCheck, Star } as const;

interface AgendaViewProps {
  groupedEvents: [string, CalEvent[]][];
  onSendMessage: (event: CalEvent) => void;
}

const AgendaView = ({ groupedEvents, onSendMessage }: AgendaViewProps) => {
  if (groupedEvents.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground italic">No events this month</p>;
  }

  return (
    <div className="space-y-6">
      {groupedEvents.map(([dateStr, evts]) => (
        <div key={dateStr}>
          <div className="mb-2.5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <span className="text-sm font-bold text-primary">{format(parseISO(dateStr), "d")}</span>
            </div>
            <div>
              <span className="text-sm font-semibold">{format(parseISO(dateStr), "EEEE")}</span>
              <span className="ml-2 text-xs text-muted-foreground">{format(parseISO(dateStr), "MMMM d, yyyy")}</span>
            </div>
            {isDateToday(parseISO(dateStr)) && (
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground shadow-sm">Today</span>
            )}
          </div>
          <div className="space-y-2 pl-[52px]">
            {evts.map((e, i) => {
              const style = EVENT_STYLES[e.type];
              const Icon = ICON_MAP[style.icon];
              return (
                <div
                  key={i}
                  className={`flex items-center gap-4 rounded-2xl border border-border p-4 transition-all hover:shadow-md border-l-[3px] ${e.messageSent ? "border-l-[hsl(var(--success))] bg-[hsl(var(--success))]/5" : `${style.border} bg-card`} ${e.isOverdue ? "ring-1 ring-destructive/30" : ""}`}
                >
                  <Link to={`/network/contacts/${e.contactId}`} className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${e.messageSent ? "bg-[hsl(var(--success))]/15" : style.badge}`}>
                      {e.messageSent ? <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{e.contactName}</p>
                        {e.messageSent && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--success))]/15 px-2.5 py-0.5 text-[11px] font-bold text-[hsl(var(--success))]">
                            <CheckCircle2 className="h-3 w-3" /> Done
                          </span>
                        )}
                        {e.isOverdue && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                            Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {e.type === "birthday" ? "Birthday 🎂" : e.type === "custom_event" ? e.detail : `Follow-up${e.detail ? `: ${e.detail.slice(0, 60)}` : ""}`}
                      </p>
                    </div>
                  </Link>
                  {!e.messageSent && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 flex-shrink-0"
                      onClick={() => onSendMessage(e)}
                      title="Send message"
                    >
                      <MessageCircle className="h-4 w-4 text-primary" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AgendaView;
