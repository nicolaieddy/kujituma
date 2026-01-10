import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const isIOS = () => {
  if (typeof navigator === "undefined") return false
  // iPadOS 13+ reports as MacIntel but supports touch
  const ua = navigator.userAgent || ""
  const platform = (navigator as any).platform || ""
  const maxTouchPoints = (navigator as any).maxTouchPoints || 0
  return /iPad|iPhone|iPod/.test(ua) || (platform === "MacIntel" && maxTouchPoints > 1)
}

const IOS = isIOS()

const TooltipProvider = IOS
  ? (({ children }: { children: React.ReactNode }) => <>{children}</>)
  : TooltipPrimitive.Provider

const Tooltip = IOS
  ? (({ children }: { children: React.ReactNode }) => <>{children}</>)
  : TooltipPrimitive.Root

const TooltipTrigger = IOS
  ? (({ children }: { children: React.ReactNode }) => <>{children}</>)
  : TooltipPrimitive.Trigger

const TooltipContent = IOS
  ? (React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(() => null) as any)
  : React.forwardRef<
      React.ElementRef<typeof TooltipPrimitive.Content>,
      React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
    >(({ className, sideOffset = 4, ...props }, ref) => (
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      />
    ))

TooltipContent.displayName = IOS
  ? "TooltipContent"
  : TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
