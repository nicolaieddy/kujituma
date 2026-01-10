import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

// Singleton state to prevent multiple instances from causing loops
let cachedIsMobile: boolean | null = null
let cachedIsTablet: boolean | null = null

// Get value once synchronously and cache it
const getIsMobile = (): boolean => {
  if (typeof window === 'undefined') return false
  if (cachedIsMobile === null) {
    cachedIsMobile = window.innerWidth < MOBILE_BREAKPOINT
  }
  return cachedIsMobile
}

const getIsTablet = (): boolean => {
  if (typeof window === 'undefined') return false
  if (cachedIsTablet === null) {
    const width = window.innerWidth
    cachedIsTablet = width < TABLET_BREAKPOINT && width >= MOBILE_BREAKPOINT
  }
  return cachedIsTablet
}

// Update cache - called from effect
const updateCache = () => {
  if (typeof window === 'undefined') return
  const width = window.innerWidth
  cachedIsMobile = width < MOBILE_BREAKPOINT
  cachedIsTablet = width < TABLET_BREAKPOINT && width >= MOBILE_BREAKPOINT
}

// Single resize listener setup - shared across all hook instances
let resizeListenerAttached = false
const subscribers = new Set<() => void>()

const setupResizeListener = () => {
  if (resizeListenerAttached || typeof window === 'undefined') return
  resizeListenerAttached = true
  
  // Debounced handler to prevent rapid firing
  let timeoutId: number | null = null
  const handleResize = () => {
    if (timeoutId) {
      window.clearTimeout(timeoutId)
    }
    timeoutId = window.setTimeout(() => {
      updateCache()
      subscribers.forEach(callback => callback())
    }, 150) // Debounce 150ms
  }
  
  window.addEventListener('resize', handleResize, { passive: true })
}

export function useIsMobile(): boolean {
  // Initialize with cached/computed value - never undefined
  const [isMobile, setIsMobile] = React.useState<boolean>(getIsMobile)
  
  React.useEffect(() => {
    setupResizeListener()
    
    const callback = () => {
      const newValue = getIsMobile()
      setIsMobile(prev => prev !== newValue ? newValue : prev)
    }
    
    subscribers.add(callback)
    
    // Sync initial value (in case cache was updated)
    const currentValue = getIsMobile()
    if (currentValue !== isMobile) {
      setIsMobile(currentValue)
    }
    
    return () => {
      subscribers.delete(callback)
    }
  }, []) // Empty deps - only run once
  
  return isMobile
}

export function useIsTablet(): boolean {
  // Initialize with cached/computed value - never undefined
  const [isTablet, setIsTablet] = React.useState<boolean>(getIsTablet)
  
  React.useEffect(() => {
    setupResizeListener()
    
    const callback = () => {
      const newValue = getIsTablet()
      setIsTablet(prev => prev !== newValue ? newValue : prev)
    }
    
    subscribers.add(callback)
    
    // Sync initial value (in case cache was updated)
    const currentValue = getIsTablet()
    if (currentValue !== isTablet) {
      setIsTablet(currentValue)
    }
    
    return () => {
      subscribers.delete(callback)
    }
  }, []) // Empty deps - only run once
  
  return isTablet
}

export function useDeviceType() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  
  return React.useMemo(() => ({
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet
  }), [isMobile, isTablet])
}
