import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./network/Dashboard";
import Contacts from "./network/Contacts";
import ContactDetail from "./network/ContactDetail";
import CalendarPage from "./network/CalendarPage";
import QuickAdd from "./network/QuickAdd";
import Tools from "./network/Tools";

export default function Network() {
  return (
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path="contacts" element={<Contacts />} />
      <Route path="contacts/:id" element={<ContactDetail />} />
      <Route path="calendar" element={<CalendarPage />} />
      <Route path="quick-add" element={<QuickAdd />} />
      <Route path="tools" element={<Tools />} />
      <Route path="*" element={<Navigate to="/network" replace />} />
    </Routes>
  );
}
