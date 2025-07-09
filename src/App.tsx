
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TourProvider } from "@/components/tour/TourProvider";
import { lazy, Suspense } from "react";
import { useOptimizedAuth } from "@/hooks/useOptimizedAuth";

// Lazy load pages for better performance
const Feed = lazy(() => import("./pages/Feed"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const Goals = lazy(() => import("./pages/Goals"));
const Profile = lazy(() => import("./pages/Profile"));

const LoadingSpinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
    <div className="text-white">Loading...</div>
  </div>
);

const AppContent = () => {
  // Optimized auth tracking
  useOptimizedAuth();

  return (
    <Suspense fallback={<LoadingSpinner />}>
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
    </Suspense>
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
