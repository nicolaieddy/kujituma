import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { OfflineFallback } from "@/components/pwa/OfflineFallback";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DailyCheckInsTab } from "@/components/rituals/DailyCheckInsTab";
import { WeeklyPlanningTab } from "@/components/rituals/WeeklyPlanningTab";
import { QuarterlyReviewsTab } from "@/components/rituals/QuarterlyReviewsTab";
import { StreakHistoryChart } from "@/components/rituals/StreakHistoryChart";
import { CheckInHeatmap } from "@/components/rituals/CheckInHeatmap";
import { Sun, CalendarDays, ClipboardList } from "lucide-react";

const Analytics = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isOffline } = useOfflineStatus();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'daily');

  useEffect(() => {
    if (tabParam && ['daily', 'weekly', 'quarterly'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (isOffline) {
    return (
      <OfflineFallback 
        title="Analytics unavailable offline"
        description="Analytics data requires an internet connection to load. Please reconnect to view your stats."
      />
    );
  }

  return (
    <div className={`container mx-auto ${isMobile ? 'px-4 py-4' : 'px-4 py-6'}`}>
        <div className="mb-6">
          <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-foreground font-heading`}>
            Analytics
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track your progress and streaks
          </p>
        </div>

        <div className="max-w-5xl space-y-8">
          <AnalyticsDashboard />
          
          {/* Rituals Section */}
          <div className="pt-6 border-t border-border">
            <div className="mb-6">
              <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-foreground font-heading`}>
                Rituals Dashboard
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Track your daily check-ins, weekly planning, and quarterly reviews
              </p>
            </div>

            {/* Streak History Chart */}
            <StreakHistoryChart />

            {/* Check-in Heatmap */}
            <div className="mt-6">
              <CheckInHeatmap />
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-6 space-y-6">
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
        </div>
      </div>
    </div>
  );
};

export default Analytics;