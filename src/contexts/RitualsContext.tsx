import { createContext, useContext, useState, ReactNode } from "react";

interface RitualsContextType {
  // Weekly Planning
  openWeeklyPlanning: () => void;
  openWeeklyPlanningHistory: () => void;
  isWeeklyHistoryOpen: boolean;
  setWeeklyHistoryOpen: (open: boolean) => void;
  
  // Daily Check-in
  openDailyCheckIn: () => void;
  openDailyCheckInHistory: () => void;
  isDailyHistoryOpen: boolean;
  setDailyHistoryOpen: (open: boolean) => void;
}

const RitualsContext = createContext<RitualsContextType | null>(null);

export const useRitualsTrigger = () => {
  const context = useContext(RitualsContext);
  // Return no-op functions if used outside provider (safe fallback)
  if (!context) {
    return {
      openWeeklyPlanning: () => {},
      openWeeklyPlanningHistory: () => {},
      isWeeklyHistoryOpen: false,
      setWeeklyHistoryOpen: () => {},
      openDailyCheckIn: () => {},
      openDailyCheckInHistory: () => {},
      isDailyHistoryOpen: false,
      setDailyHistoryOpen: () => {},
    };
  }
  return context;
};

interface RitualsProviderProps {
  children: ReactNode;
  onOpenWeeklyPlanning: () => void;
  onOpenDailyCheckIn: () => void;
}

export const RitualsProvider = ({ 
  children, 
  onOpenWeeklyPlanning,
  onOpenDailyCheckIn 
}: RitualsProviderProps) => {
  const [isWeeklyHistoryOpen, setWeeklyHistoryOpen] = useState(false);
  const [isDailyHistoryOpen, setDailyHistoryOpen] = useState(false);

  const openWeeklyPlanning = () => {
    onOpenWeeklyPlanning();
  };

  const openWeeklyPlanningHistory = () => {
    setWeeklyHistoryOpen(true);
  };

  const openDailyCheckIn = () => {
    onOpenDailyCheckIn();
  };

  const openDailyCheckInHistory = () => {
    setDailyHistoryOpen(true);
  };

  return (
    <RitualsContext.Provider value={{ 
      openWeeklyPlanning, 
      openWeeklyPlanningHistory,
      isWeeklyHistoryOpen,
      setWeeklyHistoryOpen,
      openDailyCheckIn,
      openDailyCheckInHistory,
      isDailyHistoryOpen,
      setDailyHistoryOpen,
    }}>
      {children}
    </RitualsContext.Provider>
  );
};
