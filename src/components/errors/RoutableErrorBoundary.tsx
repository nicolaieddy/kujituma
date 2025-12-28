import { useLocation } from "react-router-dom";
import { AppErrorBoundary } from "@/components/errors/AppErrorBoundary";

export const RoutableErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  // Reset boundary when route changes so /debug can be visited after a crash
  return <AppErrorBoundary key={location.pathname}>{children}</AppErrorBoundary>;
};
