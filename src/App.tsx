
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TourProvider } from "@/components/tour/TourProvider";
import { useLastActive } from "@/hooks/useLastActive";
import Feed from "./pages/Feed";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Goals from "./pages/Goals";
import Profile from "./pages/Profile";

const AppContent = () => {
  // Track user activity for last active timestamp
  useLastActive();

  return (
    <Routes>
      <Route path="/" element={<Goals />} />
      <Route path="/community" element={<Feed />} />
      <Route path="/goals" element={<Goals />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/:userId" element={<Profile />} />
      <Route path="*" element={<Feed />} />
    </Routes>
  );
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <TourProvider>
            <AppContent />
          </TourProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
