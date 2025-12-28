
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { UnsavedChangesProvider } from "@/contexts/UnsavedChangesContext";
import { HabitsProvider } from "@/components/habits/HabitsProvider";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { AppErrorBoundary } from "@/components/errors/AppErrorBoundary";

import { useUserActivity } from "@/hooks/useUserActivity";
import { useAuth } from "@/contexts/AuthContext";
import { lazy, Suspense, useEffect } from "react";
import { GoalsService } from "@/services/goalsService";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load pages for better performance
const Feed = lazy(() => import("./pages/Feed"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const Goals = lazy(() => import("./pages/Goals"));
const Profile = lazy(() => import("./pages/Profile"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Friends = lazy(() => import("./pages/Friends"));
import LandingPage from "./pages/LandingPage";
const Install = lazy(() => import("./pages/Install"));
const Rituals = lazy(() => import("./pages/Rituals"));

const LoadingSpinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <Skeleton className="h-4 w-32" />
    </div>
  </div>
);

// Prefetch goals data when user is authenticated
const usePrefetchGoals = (queryClient: QueryClient) => {
  const { user } = useAuth();
  
  useEffect(() => {
    if (user?.id) {
      // Prefetch goals data in background
      queryClient.prefetchQuery({
        queryKey: ['goals', user.id],
        queryFn: GoalsService.getGoals,
        staleTime: 1000 * 60 * 5,
      });
    }
  }, [user?.id, queryClient]);
};

// Component to conditionally render landing page or dashboard based on auth
const HomePage = () => {
  const { user, loading } = useAuth();
  
  console.log('[HomePage] Rendering - loading:', loading, 'user:', user?.email);
  
  if (loading) {
    console.log('[HomePage] Still loading auth...');
    return <LoadingSpinner />;
  }
  
  console.log('[HomePage] Auth loaded, rendering:', user ? 'Goals' : 'LandingPage');
  return user ? <Goals /> : <LandingPage />;
};

const AppContent = ({ queryClient }: { queryClient: QueryClient }) => {
  // Track user activity to update last_active_at timestamp
  useUserActivity();
  // Prefetch goals data when user is authenticated
  usePrefetchGoals(queryClient);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/community" element={<Feed />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:userId" element={<Profile />} />
        <Route path="/rituals" element={<Rituals />} />
        <Route path="/install" element={<Install />} />
        <Route path="*" element={<Feed />} />
      </Routes>
    </Suspense>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <OfflineIndicator />
        <BrowserRouter>
          <AuthProvider>
            <UnsavedChangesProvider>
              <HabitsProvider>
                <AppErrorBoundary>
                  <AppContent queryClient={queryClient} />
                </AppErrorBoundary>
                <InstallPrompt />
              </HabitsProvider>
            </UnsavedChangesProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
