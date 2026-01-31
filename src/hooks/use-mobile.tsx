import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

// Get initial values synchronously to avoid flash
const getIsMobile = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.innerWidth < MOBILE_BREAKPOINT
}

const getIsTablet = (): boolean => {
  if (typeof window === 'undefined') return false
  const width = window.innerWidth
  return width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT
}

export function useIsMobile(): boolean {
  // Initialize with actual value to prevent hydration mismatch
  const [isMobile, setIsMobile] = React.useState<boolean>(getIsMobile)
  
  React.useEffect(() => {
    // Create a stable handler that's debounced
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    
    const handleResize = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(() => {
        const newValue = window.innerWidth < MOBILE_BREAKPOINT
        setIsMobile(prev => prev === newValue ? prev : newValue)
      }, 150)
    }
    
    window.addEventListener('resize', handleResize, { passive: true })
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [])
  
  return isMobile
}

export function useIsTablet(): boolean {
  const [isTablet, setIsTablet] = React.useState<boolean>(getIsTablet)
  
  React.useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    
    const handleResize = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(() => {
        const width = window.innerWidth
        const newValue = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT
        setIsTablet(prev => prev === newValue ? prev : newValue)
      }, 150)
    }
    
    window.addEventListener('resize', handleResize, { passive: true })
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [])
  
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
