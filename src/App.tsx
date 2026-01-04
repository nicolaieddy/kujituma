
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { HabitsProvider } from "@/components/habits/HabitsProvider";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { RoutableErrorBoundary } from "@/components/errors/RoutableErrorBoundary";
import { TosGate } from "@/components/auth/TosGate";

import { useUserActivity } from "@/hooks/useUserActivity";
import { useSessionTracking } from "@/hooks/useSessionTracking";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { useAuth } from "@/contexts/AuthContext";
import { lazy, Suspense, useEffect } from "react";
import { GoalsService } from "@/services/goalsService";
import { Skeleton } from "@/components/ui/skeleton";

// Wrapper to redirect new users to onboarding wizard
const RequireProfileComplete = ({ children }: { children: React.ReactNode }) => {
  const { user, isNewUser, loading } = useAuth();
  const location = useLocation();
  
  // Don't redirect while loading or if not authenticated
  if (loading || !user) return <>{children}</>;
  
  // Redirect new users to onboarding (except if already on onboarding, profile, or auth pages)
  if (isNewUser && 
      !location.pathname.startsWith('/onboarding') && 
      !location.pathname.startsWith('/profile') && 
      location.pathname !== '/auth') {
    return <Navigate to="/onboarding" replace />;
  }
  
  return <>{children}</>;
};

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
const Debug = lazy(() => import("./pages/Debug"));
const PartnerDashboard = lazy(() => import("./pages/PartnerDashboard"));
const CheckInHistory = lazy(() => import("./pages/CheckInHistory"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Onboarding = lazy(() => import("./pages/Onboarding"));

const LoadingSpinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-6">
      {/* Kilimanjaro Mountain Silhouette */}
      <div className="relative w-32 h-20">
        <svg
          viewBox="0 0 120 60"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Mountain shadow that moves */}
          <ellipse
            cx="60"
            cy="58"
            rx="50"
            ry="4"
            className="fill-muted animate-pulse"
          />
          
          {/* Main mountain peak (Kibo) */}
          <path
            d="M60 8 L95 52 L25 52 Z"
            className="fill-primary/20"
          />
          
          {/* Second peak (Mawenzi) */}
          <path
            d="M85 18 L110 52 L70 52 Z"
            className="fill-primary/15"
          />
          
          {/* Snow cap on Kibo */}
          <path
            d="M60 8 L70 22 L50 22 Z"
            className="fill-primary/40 animate-pulse"
            style={{ animationDelay: '0.5s' }}
          />
          
          {/* Climbing path - animated dots going up */}
          <circle
            cx="55"
            cy="45"
            r="1.5"
            className="fill-primary animate-bounce"
            style={{ animationDelay: '0s', animationDuration: '1.5s' }}
          />
          <circle
            cx="58"
            cy="38"
            r="1.5"
            className="fill-primary animate-bounce"
            style={{ animationDelay: '0.2s', animationDuration: '1.5s' }}
          />
          <circle
            cx="60"
            cy="30"
            r="1.5"
            className="fill-primary animate-bounce"
            style={{ animationDelay: '0.4s', animationDuration: '1.5s' }}
          />
          <circle
            cx="60"
            cy="22"
            r="1.5"
            className="fill-primary animate-bounce"
            style={{ animationDelay: '0.6s', animationDuration: '1.5s' }}
          />
        </svg>
      </div>
      <div className="text-sm text-muted-foreground animate-pulse">
        Climbing to the summit...
      </div>
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
  // Track session time and engagement for analytics
  useSessionTracking();
  // Track online presence for real-time status
  useOnlinePresence();
  // Prefetch goals data when user is authenticated
  usePrefetchGoals(queryClient);

  return (
    <RequireProfileComplete>
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
          <Route path="/debug" element={<Debug />} />
          <Route path="/partner/:partnerId" element={<PartnerDashboard />} />
          <Route path="/partner/:partnerId/check-ins" element={<CheckInHistory />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="*" element={<Feed />} />
        </Routes>
      </Suspense>
    </RequireProfileComplete>
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
            <TosGate>
              <HabitsProvider>
                <RoutableErrorBoundary>
                  <AppContent queryClient={queryClient} />
                </RoutableErrorBoundary>
                <InstallPrompt />
              </HabitsProvider>
            </TosGate>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
