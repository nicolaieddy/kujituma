import { createContext, useContext, useState, ReactNode } from "react";

interface QuarterlyReviewContextType {
  openQuarterlyReview: () => void;
  openQuarterlyHistory: () => void;
  isHistoryOpen: boolean;
  setHistoryOpen: (open: boolean) => void;
}

const QuarterlyReviewContext = createContext<QuarterlyReviewContextType | null>(null);

export const useQuarterlyReviewTrigger = () => {
  const context = useContext(QuarterlyReviewContext);
  if (!context) {
    throw new Error("useQuarterlyReviewTrigger must be used within QuarterlyReviewProvider");
  }
  return context;
};

interface QuarterlyReviewProviderProps {
  children: ReactNode;
  onOpenReview: () => void;
}

export const QuarterlyReviewProvider = ({ children, onOpenReview }: QuarterlyReviewProviderProps) => {
  const [isHistoryOpen, setHistoryOpen] = useState(false);

  const openQuarterlyReview = () => {
    onOpenReview();
  };

  const openQuarterlyHistory = () => {
    setHistoryOpen(true);
  };

  return (
    <QuarterlyReviewContext.Provider value={{ 
      openQuarterlyReview, 
      openQuarterlyHistory,
      isHistoryOpen,
      setHistoryOpen
    }}>
      {children}
    </QuarterlyReviewContext.Provider>
  );
};
