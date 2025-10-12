import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    animated?: boolean
  }
>(({ className, value, animated = true, ...props }, ref) => {
  const [displayValue, setDisplayValue] = React.useState(0)

  React.useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setDisplayValue(value || 0)
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setDisplayValue(value || 0)
    }
  }, [value, animated])

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-secondary shadow-inner",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-gradient-to-r from-primary via-primary to-primary/80 transition-all duration-700 ease-out shadow-sm relative"
        style={{ transform: `translateX(-${100 - displayValue}%)` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
