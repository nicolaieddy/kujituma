import * as React from "react"
import { cn } from "@/lib/utils"

interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  size?: number
  strokeWidth?: number
  showValue?: boolean
}

export const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(
  ({ className, value, size = 120, strokeWidth = 8, showValue = true, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(0)
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const offset = circumference - (displayValue / 100) * circumference

    React.useEffect(() => {
      const timer = setTimeout(() => {
        setDisplayValue(Math.min(Math.max(value, 0), 100))
      }, 100)
      return () => clearTimeout(timer)
    }, [value])

    return (
      <div
        ref={ref}
        className={cn("relative inline-flex items-center justify-center", className)}
        style={{ width: size, height: size }}
        {...props}
      >
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          {/* Background circle */}
          <circle
            className="text-secondary"
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          {/* Progress circle with gradient */}
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--primary) / 0.6)" />
            </linearGradient>
          </defs>
          <circle
            className="transition-all duration-700 ease-out drop-shadow-lg"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="url(#progressGradient)"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
            style={{
              filter: "drop-shadow(0 0 8px hsl(var(--primary) / 0.4))"
            }}
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-foreground">
              {Math.round(displayValue)}%
            </span>
          </div>
        )}
      </div>
    )
  }
)

CircularProgress.displayName = "CircularProgress"
