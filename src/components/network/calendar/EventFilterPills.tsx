import { Cake, CalendarCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EventFilterPillsProps {
  activeFilters: Set<string>;
  onToggle: (type: string) => void;
}

const filters = [
  { type: "birthday", label: "Birthdays", icon: Cake, color: "hsl(15,85%,60%)" },
  { type: "follow_up", label: "Follow-ups", icon: CalendarCheck, color: "hsl(210,70%,55%)" },
  { type: "custom_event", label: "Events", icon: Star, color: "hsl(152,55%,48%)" },
];

const EventFilterPills = ({ activeFilters, onToggle }: EventFilterPillsProps) => {
  return (
    <div className="flex items-center gap-1.5">
      {filters.map((f) => {
        const active = activeFilters.has(f.type);
        return (
          <Button
            key={f.type}
            variant={active ? "default" : "outline"}
            size="sm"
            className="h-7 rounded-full text-xs gap-1.5 transition-all"
            style={active ? { backgroundColor: f.color, borderColor: f.color } : {}}
            onClick={() => onToggle(f.type)}
          >
            <f.icon className="h-3 w-3" />
            {f.label}
          </Button>
        );
      })}
    </div>
  );
};

export default EventFilterPills;
