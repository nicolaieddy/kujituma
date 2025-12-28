import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { MainNavigation } from "@/components/layout/MainNavigation";
import { OfflineFallback } from "@/components/pwa/OfflineFallback";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DailyCheckInsTab } from "@/components/rituals/DailyCheckInsTab";
import { WeeklyPlanningTab } from "@/components/rituals/WeeklyPlanningTab";
import { QuarterlyReviewsTab } from "@/components/rituals/QuarterlyReviewsTab";
import { Sun, CalendarDays, ClipboardList } from "lucide-react";

const Rituals = () => {
  const { user, loading } = useAuth();
  const { isOffline } = useOfflineStatus();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isOffline) {
    return (
      <div className="min-h-screen bg-background">
        <MainNavigation />
        <OfflineFallback 
          title="Rituals unavailable offline"
          description="Your rituals data requires an internet connection to load. Please reconnect to track your check-ins and reviews."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Rituals Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Track your daily check-ins, weekly planning, and quarterly reviews
          </p>
        </div>

        <Tabs defaultValue="daily" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="daily" className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
              <span className="hidden sm:inline">Daily</span>
            </TabsTrigger>
            <TabsTrigger value="weekly" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Weekly</span>
            </TabsTrigger>
            <TabsTrigger value="quarterly" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Quarterly</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            <DailyCheckInsTab />
          </TabsContent>

          <TabsContent value="weekly">
            <WeeklyPlanningTab />
          </TabsContent>

          <TabsContent value="quarterly">
            <QuarterlyReviewsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Rituals;
