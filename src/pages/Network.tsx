import { Routes, Route, Navigate, NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Calendar, Plus, Wrench } from "lucide-react";
import Dashboard from "./network/Dashboard";
import Contacts from "./network/Contacts";
import ContactDetail from "./network/ContactDetail";
import CalendarPage from "./network/CalendarPage";
import QuickAdd from "./network/QuickAdd";
import Tools from "./network/Tools";

const tabs = [
  { to: "/network", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/network/contacts", label: "Contacts", icon: Users, end: false },
  { to: "/network/calendar", label: "Calendar", icon: Calendar, end: false },
  { to: "/network/quick-add", label: "Quick Add", icon: Plus, end: false },
  { to: "/network/tools", label: "Tools", icon: Wrench, end: false },
];

function NetworkSubNav() {
  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b border-border bg-background/60 backdrop-blur sticky top-0 z-10 px-2">
      {tabs.map((t) => {
        const Icon = t.icon;
        return (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {t.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

export default function Network() {
  return (
    <div className="container max-w-6xl mx-auto px-4 py-4 space-y-4">
      <NetworkSubNav />
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="contacts/:id" element={<ContactDetail />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="quick-add" element={<QuickAdd />} />
        <Route path="tools" element={<Tools />} />
        <Route path="*" element={<Navigate to="/network" replace />} />
      </Routes>
    </div>
  );
}
