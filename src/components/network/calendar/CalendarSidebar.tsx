import { Link } from "react-router-dom";
import { CalEvent, EVENT_STYLES } from "./types";
import { Cake, CalendarCheck, Star, MessageCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO, differenceInDays, isToday as isDateToday } from "date-fns";

const ICON_MAP = { Cake, CalendarCheck, Star } as const;

interface CalendarSidebarProps {
  selectedDay: Date | null;
  selectedDayEvents: CalEvent[];
  periodEvents: CalEvent[];
  periodLabel: string;
  onSendMessage: (event: CalEvent) => void;
}

const CalendarSidebar = ({ selectedDay, selectedDayEvents, periodEvents, periodLabel, onSendMessage }: CalendarSidebarProps) => {
  const today = new Date();

  const grouped = periodEvents.reduce<Record<string, CalEvent[]>>((acc, e) => {
    if (!acc[e.date]) acc[e.date] = [];
    acc[e.date].push(e);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="hidden w-80 flex-shrink-0 lg:block">
      <div className="sticky top-6 space-y-4">
        {/* Selected day card */}
        {selectedDay && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-xl bg-primary px-3.5 py-1.5 text-center shadow-sm">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
                  {format(selectedDay, "MMM")}
                </span>
                <span className="block text-2xl font-bold leading-none text-primary-foreground">
                  {format(selectedDay, "d")}
                </span>
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-semibold">{format(selectedDay, "EEEE")}</p>
                <p className="text-xs text-muted-foreground">{format(selectedDay, "MMMM d, yyyy")}</p>
              </div>
            </div>
            {selectedDayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No events on this day</p>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map((e, i) => {
                  const style = EVENT_STYLES[e.type];
                  const Icon = ICON_MAP[style.icon];
                  return (
                    <div key={i} className={`flex items-start gap-3 rounded-xl border-l-[3px] p-3 transition-all hover:bg-accent/40 ${e.messageSent ? "border-l-[hsl(var(--success))] bg-[hsl(var(--success))]/8" : `${style.border} bg-muted/30`} ${e.isOverdue ? "ring-1 ring-destructive/30" : ""}`}>
                      <Link to={`/network/contacts/${e.contactId}`} className="flex items-start gap-2.5 flex-1 min-w-0">
                        <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${e.messageSent ? "text-[hsl(var(--success))]" : style.sidebarIcon}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold truncate">{e.contactName}</p>
                            {e.messageSent && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-[hsl(var(--success))]/15 px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--success))]">
                                <CheckCircle2 className="h-3 w-3" /> Done
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {e.type === "birthday" ? "Birthday 🎂" : e.type === "custom_event" ? e.detail : `Follow-up${e.detail ? `: ${e.detail.slice(0, 40)}` : ""}`}
                          </p>
                          {e.isOverdue && <p className="text-[10px] text-destructive font-medium mt-0.5">Overdue</p>}
                        </div>
                      </Link>
                      {!e.messageSent && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0"
                          onClick={() => onSendMessage(e)}
                          title="Send message"
                        >
                          <MessageCircle className="h-3.5 w-3.5 text-primary" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* All events for period */}
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="px-5 pt-4 pb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{periodLabel}</h3>
          </div>
          <ScrollArea className="max-h-[420px] px-5 pb-4">
            {sortedDates.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground italic">No events this period</p>
            ) : (
              <div className="space-y-4">
                {sortedDates.map((dateStr) => {
                  const dateObj = parseISO(dateStr);
                  const daysUntil = differenceInDays(dateObj, today);
                  const isTodayDate = isDateToday(dateObj);
                  return (
                    <div key={dateStr}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-bold text-foreground">{format(dateObj, "MMM d")}</span>
                        <span className="text-[10px] text-muted-foreground">{format(dateObj, "EEE")}</span>
                        {isTodayDate && (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground">Today</span>
                        )}
                        {daysUntil > 0 && daysUntil <= 14 && (
                          <span className="text-[10px] font-medium text-muted-foreground">in {daysUntil}d</span>
                        )}
                      </div>
                      <div className="space-y-1 pl-2 border-l-2 border-border/60">
                        {grouped[dateStr].map((e, j) => {
                          const style = EVENT_STYLES[e.type];
                          const Icon = ICON_MAP[style.icon];
                          return (
                            <div key={j} className={`flex items-center gap-2 rounded-lg p-2 text-xs transition-colors hover:bg-accent/40 ${e.messageSent ? "bg-[hsl(var(--success))]/8" : ""} ${e.isOverdue ? "text-destructive" : ""}`}>
                              <Link to={`/network/contacts/${e.contactId}`} className="flex items-center gap-2 flex-1 min-w-0">
                                {e.messageSent ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-[hsl(var(--success))]" />
                                ) : (
                                  <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${style.sidebarIcon}`} />
                                )}
                                <span className="truncate flex-1 font-medium">{e.contactName}</span>
                                {e.messageSent && <span className="flex-shrink-0 text-[10px] font-bold text-[hsl(var(--success))]">Done</span>}
                              </Link>
                              {!e.messageSent && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 flex-shrink-0"
                                  onClick={(ev) => { ev.stopPropagation(); onSendMessage(e); }}
                                  title="Send message"
                                >
                                  <MessageCircle className="h-3 w-3 text-primary" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Legend */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-4 text-xs">
            {Object.entries(EVENT_STYLES).map(([key, style]) => {
              const Icon = ICON_MAP[style.icon];
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-md ${style.badge}`}>
                    <Icon className="h-3 w-3" />
                  </span>
                  <span className="font-medium text-muted-foreground">{style.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarSidebar;
