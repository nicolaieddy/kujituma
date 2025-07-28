import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, SkipForward, ArrowLeft } from 'lucide-react';
import { TourStep } from '@/types/tour';

interface TourPopoverProps {
  step: TourStep;
  currentStepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onClose: () => void;
  targetElement: Element | null;
}

export const TourPopover = ({ 
  step, 
  currentStepIndex, 
  totalSteps, 
  onNext, 
  onPrevious,
  onSkip, 
  onClose,
  targetElement 
}: TourPopoverProps) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [arrowPosition, setArrowPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!targetElement) return;

    const updatePosition = () => {
      const rect = targetElement.getBoundingClientRect();
      const popoverWidth = 320;
      const popoverHeight = 200;
      const arrowSize = 8;
      const offset = 16;
      const padding = 20; // Extra padding from viewport edges

      let top = 0;
      let left = 0;
      let arrowTop = 0;
      let arrowLeft = 0;

      switch (step.placement) {
        case 'bottom':
          top = rect.bottom + arrowSize + offset;
          left = rect.left + (rect.width / 2) - (popoverWidth / 2);
          arrowTop = -arrowSize;
          arrowLeft = popoverWidth / 2 - arrowSize;
          break;
        case 'top':
          top = rect.top - popoverHeight - arrowSize - offset;
          left = rect.left + (rect.width / 2) - (popoverWidth / 2);
          arrowTop = popoverHeight;
          arrowLeft = popoverWidth / 2 - arrowSize;
          break;
        case 'right':
          top = rect.top + (rect.height / 2) - (popoverHeight / 2);
          left = rect.right + arrowSize + offset;
          arrowTop = popoverHeight / 2 - arrowSize;
          arrowLeft = -arrowSize;
          break;
        case 'left':
          top = rect.top + (rect.height / 2) - (popoverHeight / 2);
          left = rect.left - popoverWidth - arrowSize - offset;
          arrowTop = popoverHeight / 2 - arrowSize;
          arrowLeft = popoverWidth;
          break;
      }

      // Enhanced viewport bounds checking with extra padding for buttons
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Ensure popover doesn't go off-screen horizontally
      if (left < padding) {
        left = padding;
        // Adjust arrow position when popover is repositioned
        if (step.placement === 'bottom' || step.placement === 'top') {
          arrowLeft = Math.max(arrowSize, Math.min(
            popoverWidth - arrowSize * 2, 
            rect.left + (rect.width / 2) - left - arrowSize
          ));
        }
      }
      if (left + popoverWidth > viewportWidth - padding) {
        left = viewportWidth - popoverWidth - padding;
        // Adjust arrow position when popover is repositioned
        if (step.placement === 'bottom' || step.placement === 'top') {
          arrowLeft = Math.max(arrowSize, Math.min(
            popoverWidth - arrowSize * 2, 
            rect.left + (rect.width / 2) - left - arrowSize
          ));
        }
      }
      
      // Ensure popover doesn't go off-screen vertically
      if (top < padding) {
        top = padding;
        // If repositioned from top, adjust arrow
        if (step.placement === 'left' || step.placement === 'right') {
          arrowTop = Math.max(arrowSize, Math.min(
            popoverHeight - arrowSize * 2,
            rect.top + (rect.height / 2) - top - arrowSize
          ));
        }
      }
      if (top + popoverHeight > viewportHeight - padding) {
        top = viewportHeight - popoverHeight - padding;
        // If repositioned from bottom, adjust arrow
        if (step.placement === 'left' || step.placement === 'right') {
          arrowTop = Math.max(arrowSize, Math.min(
            popoverHeight - arrowSize * 2,
            rect.top + (rect.height / 2) - top - arrowSize
          ));
        }
      }

      setPosition({ top, left });
      setArrowPosition({ top: arrowTop, left: arrowLeft });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [targetElement, step.placement]);

  const isLastStep = currentStepIndex === totalSteps - 1;
  const isFirstStep = currentStepIndex === 0;

  return (
    <div 
      className="fixed z-50 w-80"
      style={{ 
        top: position.top, 
        left: position.left,
        pointerEvents: 'auto'
      }}
    >
      <Card className="bg-white/95 backdrop-blur-lg border-white/20 shadow-xl">
        {/* Arrow */}
        <div 
          className={`absolute w-0 h-0 border-8 ${
            step.placement === 'bottom' 
              ? 'border-b-white/95 border-l-transparent border-r-transparent border-t-transparent'
              : step.placement === 'top'
              ? 'border-t-white/95 border-l-transparent border-r-transparent border-b-transparent'
              : step.placement === 'right'
              ? 'border-r-white/95 border-t-transparent border-b-transparent border-l-transparent'
              : 'border-l-white/95 border-t-transparent border-b-transparent border-r-transparent'
          }`}
          style={{ 
            top: arrowPosition.top, 
            left: arrowPosition.left 
          }}
        />
        
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {step.title}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-gray-500">
            Step {currentStepIndex + 1} of {totalSteps}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <p className="text-gray-700 mb-4 leading-relaxed">
            {step.content}
          </p>
          
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex gap-2 flex-1 min-w-0">
              {!isFirstStep && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onPrevious}
                  className="text-gray-500 hover:text-gray-700 px-2 text-xs"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Previous
                </Button>
              )}
              {step.showSkip && !isLastStep && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onSkip}
                  className="text-gray-500 hover:text-gray-700 px-2 text-xs"
                >
                  <SkipForward className="h-3 w-3 mr-1" />
                  Skip
                </Button>
              )}
            </div>
            
            <Button 
              onClick={onNext}
              size="sm"
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-3 text-xs min-w-0"
            >
              {step.actionText || (isLastStep ? 'Finish' : 'Next')}
              {!isLastStep && <ArrowRight className="h-3 w-3 ml-1" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
