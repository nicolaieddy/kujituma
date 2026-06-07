export type CalEvent = {
  date: string;
  type: "birthday" | "follow_up" | "custom_event";
  contactId: string;
  contactName: string;
  whatsappNumber: string | null;
  detail?: string;
  messageSent?: boolean;
  messageSentDate?: string;
  isOverdue?: boolean;
};

export const EVENT_STYLES = {
  birthday: {
    dot: "bg-[hsl(15,85%,60%)]",
    badge: "bg-[hsl(15,80%,95%)] text-[hsl(15,70%,35%)]",
    border: "border-l-[hsl(15,85%,60%)]",
    icon: "Cake" as const,
    label: "Birthdays",
    sidebarIcon: "text-[hsl(15,85%,60%)]",
  },
  follow_up: {
    dot: "bg-[hsl(210,70%,55%)]",
    badge: "bg-[hsl(210,70%,95%)] text-[hsl(210,60%,35%)]",
    border: "border-l-[hsl(210,70%,55%)]",
    icon: "CalendarCheck" as const,
    label: "Follow-ups",
    sidebarIcon: "text-[hsl(210,70%,55%)]",
  },
  custom_event: {
    dot: "bg-[hsl(152,55%,48%)]",
    badge: "bg-[hsl(152,50%,94%)] text-[hsl(152,50%,30%)]",
    border: "border-l-[hsl(152,55%,48%)]",
    icon: "Star" as const,
    label: "Events",
    sidebarIcon: "text-[hsl(152,55%,48%)]",
  },
} as const;
