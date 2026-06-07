import { useMemo, useState, useCallback } from "react";
import { useContacts, useInteractions, useAllContactEvents } from "@/hooks/useData";
import { Button } from "@/components/ui/button";
import SendMessageDialog from "@/components/SendMessageDialog";
import AgendaView from "@/components/calendar/AgendaView";
import CalendarSidebar from "@/components/calendar/CalendarSidebar";
import EventFilterPills from "@/components/calendar/EventFilterPills";
import CalendarGrid from "@/components/calendar/CalendarGrid";
import { CalEvent, EVENT_STYLES } from "@/components/calendar/types";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  parseISO,
  isPast,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from "date-fns";

type ViewMode = "month" | "week" | "day" | "agenda";

const CalendarPage = () => {
  const { data: contacts = [] } = useContacts();
  const { data: interactions = [] } = useInteractions();
  const { data: contactEvents = [] } = useAllContactEvents();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [view, setView] = useState<ViewMode>("month");
  const [eventTypeFilter, setEventTypeFilter] = useState<Set<string>>(
    new Set(["birthday", "follow_up", "custom_event"])
  );
  const [msgDialog, setMsgDialog] = useState<{
    open: boolean;
    event: CalEvent | null;
  }>({ open: false, event: null });

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  // Build message-sent map
  const messageSentMap = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    interactions.forEach((i) => {
      if (i.type === "Message") {
        if (!map.has(i.contact_id)) map.set(i.contact_id, new Map());
        map.get(i.contact_id)!.set(i.date, i.date);
      }
    });
    return map;
  }, [interactions]);

  const isMessageSent = useCallback(
    (
      contactId: string,
      eventDate: string
    ): { sent: boolean; sentDate?: string } => {
      const contactMessages = messageSentMap.get(contactId);
      if (!contactMessages) return { sent: false };
      const d = parseISO(eventDate);
      const DAY_MS = 86400000;
      for (let offset = -7; offset <= 7; offset++) {
        const dateStr = format(
          new Date(d.getTime() + offset * DAY_MS),
          "yyyy-MM-dd"
        );
        if (contactMessages.has(dateStr))
          return { sent: true, sentDate: dateStr };
      }
      return { sent: false };
    },
    [messageSentMap]
  );

  const events = useMemo(() => {
    const evts: CalEvent[] = [];
    contacts.forEach((c) => {
      if (c.birthday) {
        const bday = parseISO(c.birthday);
        [today.getFullYear(), today.getFullYear() + 1].forEach((yr) => {
          const d = new Date(yr, bday.getMonth(), bday.getDate());
          const dateStr = format(d, "yyyy-MM-dd");
          const msg = isMessageSent(c.id, dateStr);
          evts.push({
            date: dateStr,
            type: "birthday",
            contactId: c.id,
            contactName: c.full_name,
            whatsappNumber: c.whatsapp_number,
            messageSent: msg.sent,
            messageSentDate: msg.sentDate,
          });
        });
      }
    });
    interactions.forEach((i) => {
      if (i.follow_up_date) {
        const contact = contacts.find((c) => c.id === i.contact_id);
        const msg = isMessageSent(i.contact_id, i.follow_up_date);
        const overdue =
          isPast(parseISO(i.follow_up_date)) &&
          i.follow_up_date < todayStr &&
          !msg.sent;
        evts.push({
          date: i.follow_up_date,
          type: "follow_up",
          contactId: i.contact_id,
          contactName: contact?.full_name || "Unknown",
          whatsappNumber: contact?.whatsapp_number || null,
          detail: i.summary || undefined,
          messageSent: msg.sent,
          messageSentDate: msg.sentDate,
          isOverdue: overdue,
        });
      }
    });
    contactEvents.forEach((ce) => {
      const contact = contacts.find((c) => c.id === ce.contact_id);
      const name = contact?.full_name || "Unknown";
      const wp = contact?.whatsapp_number || null;
      if (ce.is_recurring) {
        const d = parseISO(ce.event_date);
        [today.getFullYear(), today.getFullYear() + 1].forEach((yr) => {
          const projected = new Date(yr, d.getMonth(), d.getDate());
          const dateStr = format(projected, "yyyy-MM-dd");
          const msg = isMessageSent(ce.contact_id, dateStr);
          evts.push({
            date: dateStr,
            type: "custom_event",
            contactId: ce.contact_id,
            contactName: name,
            whatsappNumber: wp,
            detail: ce.title,
            messageSent: msg.sent,
            messageSentDate: msg.sentDate,
          });
        });
      } else {
        const msg = isMessageSent(ce.contact_id, ce.event_date);
        evts.push({
          date: ce.event_date,
          type: "custom_event",
          contactId: ce.contact_id,
          contactName: name,
          whatsappNumber: wp,
          detail: ce.title,
          messageSent: msg.sent,
          messageSentDate: msg.sentDate,
        });
      }
    });
    return evts;
  }, [contacts, interactions, contactEvents, isMessageSent]);

  const filteredEvents = useMemo(
    () => events.filter((e) => eventTypeFilter.has(e.type)),
    [events, eventTypeFilter]
  );

  const eventsForDay = useCallback(
    (day: Date) => {
      const ds = format(day, "yyyy-MM-dd");
      return filteredEvents.filter((e) => e.date === ds);
    },
    [filteredEvents]
  );

  // Period events for sidebar
  const periodEvents = useMemo(() => {
    let start: string, end: string;
    if (view === "week") {
      start = format(startOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
      end = format(endOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
    } else if (view === "day") {
      start = format(currentDate, "yyyy-MM-dd");
      end = start;
    } else {
      start = format(startOfMonth(currentDate), "yyyy-MM-dd");
      end = format(endOfMonth(currentDate), "yyyy-MM-dd");
    }
    return filteredEvents
      .filter((e) => e.date >= start && e.date <= end)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredEvents, view, currentDate]);

  const selectedDayEvents = selectedDay ? eventsForDay(selectedDay) : [];

  const groupedAgendaEvents = useMemo(() => {
    const groups: Record<string, CalEvent[]> = {};
    periodEvents.forEach((e) => {
      if (!groups[e.date]) groups[e.date] = [];
      groups[e.date].push(e);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [periodEvents]);

  const toggleFilter = (type: string) => {
    setEventTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const periodLabel =
    view === "week"
      ? "This Week's Events"
      : view === "day"
      ? "Today's Events"
      : "This Month's Events";

  const handleSendMessage = (event: CalEvent) =>
    setMsgDialog({ open: true, event });

  // Navigation
  const goBack = () => {
    if (view === "month") setCurrentDate((d) => subMonths(d, 1));
    else if (view === "week") setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subDays(d, 1));
  };
  const goForward = () => {
    if (view === "month") setCurrentDate((d) => addMonths(d, 1));
    else if (view === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, 1));
  };
  const goToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(new Date());
  };

  const headerLabel =
    view === "month"
      ? format(currentDate, "MMMM yyyy")
      : view === "week"
      ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d")} – ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d, yyyy")}`
      : format(currentDate, "EEEE, MMMM d, yyyy");

  return (
    <div className="animate-fade-in">
      {/* Header toolbar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: nav + title */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs font-medium"
            onClick={goToday}
          >
            Today
          </Button>
          <div className="flex items-center rounded-lg border border-border">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-r-none"
              onClick={goBack}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-l-none"
              onClick={goForward}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h1 className="text-lg font-bold tracking-tight">{headerLabel}</h1>
        </div>

        {/* Right: filters + view toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          <EventFilterPills
            activeFilters={eventTypeFilter}
            onToggle={toggleFilter}
          />
          <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
            {(["month", "week", "day", "agenda"] as ViewMode[]).map((v) => (
              <Button
                key={v}
                variant={view === v ? "default" : "ghost"}
                size="sm"
                className="h-7 rounded-md px-3 text-xs capitalize"
                onClick={() => setView(v)}
              >
                {v}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {view === "agenda" ? (
        <AgendaView
          groupedEvents={groupedAgendaEvents}
          onSendMessage={handleSendMessage}
        />
      ) : (
        <div className="flex gap-5">
          {/* Calendar grid — takes all available space */}
          <div className="flex-1 min-w-0">
            <CalendarGrid
              currentDate={currentDate}
              selectedDay={selectedDay}
              events={filteredEvents}
              view={view}
              onSelectDay={setSelectedDay}
            />
          </div>

          {/* Sidebar */}
          <CalendarSidebar
            selectedDay={selectedDay}
            selectedDayEvents={selectedDayEvents}
            periodEvents={periodEvents}
            periodLabel={periodLabel}
            onSendMessage={handleSendMessage}
          />
        </div>
      )}

      {msgDialog.event && (
        <SendMessageDialog
          open={msgDialog.open}
          onOpenChange={(o) =>
            setMsgDialog({ open: o, event: o ? msgDialog.event : null })
          }
          contactId={msgDialog.event.contactId}
          contactName={msgDialog.event.contactName}
          whatsappNumber={msgDialog.event.whatsappNumber}
          eventType={msgDialog.event.type}
        />
      )}
    </div>
  );
};

export default CalendarPage;
