import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Move } from "lucide-react";

interface CoverPhotoPositionerProps {
  imageUrl: string;
  initialPosition: number;
  onSave: (position: number) => void;
  onCancel: () => void;
}

export const CoverPhotoPositioner = ({ 
  imageUrl, 
  initialPosition, 
  onSave, 
  onCancel 
}: CoverPhotoPositionerProps) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startPositionRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startPositionRef.current = position;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startYRef.current = e.touches[0].clientY;
    startPositionRef.current = position;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      
      const containerHeight = containerRef.current.offsetHeight;
      const deltaY = e.clientY - startYRef.current;
      const deltaPercent = (deltaY / containerHeight) * 100;
      const newPosition = Math.max(0, Math.min(100, startPositionRef.current + deltaPercent));
      setPosition(newPosition);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !containerRef.current) return;
      
      const containerHeight = containerRef.current.offsetHeight;
      const deltaY = e.touches[0].clientY - startYRef.current;
      const deltaPercent = (deltaY / containerHeight) * 100;
      const newPosition = Math.max(0, Math.min(100, startPositionRef.current + deltaPercent));
      setPosition(newPosition);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Move className="h-4 w-4" />
        <span>Drag to reposition your cover photo</span>
      </div>
      
      <div 
        ref={containerRef}
        className={`relative h-40 rounded-lg overflow-hidden cursor-grab select-none ${isDragging ? 'cursor-grabbing' : ''}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div 
          className="absolute inset-0 w-full h-[200%]"
          style={{
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: `center ${position}%`,
            transform: 'translateZ(0)'
          }}
        />
        <div className="absolute inset-0 border-2 border-dashed border-primary/50 pointer-events-none" />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => onSave(Math.round(position))}
        >
          <Check className="h-4 w-4 mr-1" />
          Apply
        </Button>
      </div>
    </div>
  );
};
