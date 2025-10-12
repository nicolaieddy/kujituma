import { Mountain } from "lucide-react";

export const KilimanjaroLoader = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-6">
      {/* Mountain with climbing runner */}
      <div className="relative w-32 h-32">
        {/* Mountain silhouette */}
        <div className="absolute inset-0 flex items-end justify-center">
          <Mountain className="w-28 h-28 text-primary animate-pulse" strokeWidth={1.5} />
        </div>
        
        {/* Animated runner climbing up */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 animate-climb-mountain">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <div className="w-3 h-4 bg-primary-foreground rounded-sm" />
          </div>
        </div>
        
        {/* Trail dots */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-50 animate-pulse">
          <div className="w-1.5 h-1.5 rounded-full bg-primary mb-1" />
        </div>
      </div>
      
      {/* Loading text */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-foreground font-medium animate-pulse">Climbing...</p>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};
