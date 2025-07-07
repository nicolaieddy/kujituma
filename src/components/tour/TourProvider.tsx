import { createContext, useContext, useEffect, useState } from 'react';
import { TourPopover } from './TourPopover';
import { onboardingTourConfig } from './TourConfig';
import { useTour } from '@/hooks/useTour';

interface TourContextType {
  startTour: () => void;
  isActive: boolean;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const useTourContext = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTourContext must be used within TourProvider');
  }
  return context;
};

interface TourProviderProps {
  children: React.ReactNode;
}

export const TourProvider = ({ children }: TourProviderProps) => {
  const { tour, showTour, nextStep, completeTour, dismissTour } = useTour();
  const [targetElement, setTargetElement] = useState<Element | null>(null);
  const [overlay, setOverlay] = useState<Element | null>(null);

  const currentStep = showTour && tour ? onboardingTourConfig.steps[tour.current_step] : null;

  useEffect(() => {
    if (!showTour || !currentStep) {
      removeHighlight();
      return;
    }

    // Find target element
    const element = document.querySelector(currentStep.target);
    if (element) {
      setTargetElement(element);
      highlightElement(element);
    }

    return () => removeHighlight();
  }, [showTour, currentStep]);

  const highlightElement = (element: Element) => {
    const rect = element.getBoundingClientRect();
    
    // Create overlay
    const overlayDiv = document.createElement('div');
    overlayDiv.className = 'tour-overlay';
    overlayDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.4);
      z-index: 40;
      pointer-events: none;
    `;

    // Create spotlight hole
    const spotlight = document.createElement('div');
    spotlight.style.cssText = `
      position: absolute;
      top: ${rect.top - 8}px;
      left: ${rect.left - 8}px;
      width: ${rect.width + 16}px;
      height: ${rect.height + 16}px;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.4);
      border-radius: 8px;
      pointer-events: auto;
    `;

    overlayDiv.appendChild(spotlight);
    document.body.appendChild(overlayDiv);
    setOverlay(overlayDiv);

    // Bring target element to front
    element.classList.add('tour-highlighted');
    (element as HTMLElement).style.position = 'relative';
    (element as HTMLElement).style.zIndex = '45';
  };

  const removeHighlight = () => {
    // Remove overlay
    if (overlay) {
      document.body.removeChild(overlay);
      setOverlay(null);
    }

    // Reset highlighted elements
    document.querySelectorAll('.tour-highlighted').forEach(el => {
      el.classList.remove('tour-highlighted');
      (el as HTMLElement).style.position = '';
      (el as HTMLElement).style.zIndex = '';
    });

    setTargetElement(null);
  };

  const handleNext = () => {
    if (!tour || !currentStep) return;

    const isLastStep = tour.current_step === onboardingTourConfig.steps.length - 1;
    
    if (isLastStep) {
      completeTour();
    } else {
      nextStep();
    }
  };

  const handleSkip = () => {
    completeTour();
  };

  const handleClose = () => {
    dismissTour();
  };

  const startTourManually = () => {
    // This will be implemented for admin trigger functionality
  };

  return (
    <TourContext.Provider value={{ startTour: startTourManually, isActive: showTour }}>
      {children}
      
      {showTour && currentStep && targetElement && (
        <TourPopover
          step={currentStep}
          currentStepIndex={tour?.current_step || 0}
          totalSteps={onboardingTourConfig.steps.length}
          onNext={handleNext}
          onSkip={handleSkip}
          onClose={handleClose}
          targetElement={targetElement}
        />
      )}
    </TourContext.Provider>
  );
};