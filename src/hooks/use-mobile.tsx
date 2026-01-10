import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

// Get initial value synchronously to avoid hydration issues and re-render loops
const getInitialMobile = () => {
  if (typeof window === 'undefined') return false
  return window.innerWidth < MOBILE_BREAKPOINT
}

const getInitialTablet = () => {
  if (typeof window === 'undefined') return false
  return window.innerWidth < TABLET_BREAKPOINT && window.innerWidth >= MOBILE_BREAKPOINT
}

export function useIsMobile() {
  // Initialize with actual value to prevent hydration mismatch and re-render loops
  const [isMobile, setIsMobile] = React.useState<boolean>(getInitialMobile)
  // Track if mounted to avoid state updates on unmounted component
  const mountedRef = React.useRef(true)

  React.useEffect(() => {
    mountedRef.current = true
    
    const handleResize = () => {
      if (!mountedRef.current) return
      const newValue = window.innerWidth < MOBILE_BREAKPOINT
      // Only update if value actually changed to prevent re-render loops
      setIsMobile(prev => prev !== newValue ? newValue : prev)
    }
    
    // Use resize event instead of matchMedia for better iOS Safari compatibility
    window.addEventListener("resize", handleResize, { passive: true })
    
    // Initial sync - only if value differs
    const currentValue = window.innerWidth < MOBILE_BREAKPOINT
    setIsMobile(prev => prev !== currentValue ? currentValue : prev)
    
    return () => {
      mountedRef.current = false
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return isMobile
}

export function useIsTablet() {
  // Initialize with actual value to prevent hydration mismatch and re-render loops
  const [isTablet, setIsTablet] = React.useState<boolean>(getInitialTablet)
  // Track if mounted to avoid state updates on unmounted component
  const mountedRef = React.useRef(true)

  React.useEffect(() => {
    mountedRef.current = true
    
    const handleResize = () => {
      if (!mountedRef.current) return
      const newValue = window.innerWidth < TABLET_BREAKPOINT && window.innerWidth >= MOBILE_BREAKPOINT
      // Only update if value actually changed to prevent re-render loops
      setIsTablet(prev => prev !== newValue ? newValue : prev)
    }
    
    // Use resize event instead of matchMedia for better iOS Safari compatibility
    window.addEventListener("resize", handleResize, { passive: true })
    
    // Initial sync - only if value differs
    const currentValue = window.innerWidth < TABLET_BREAKPOINT && window.innerWidth >= MOBILE_BREAKPOINT
    setIsTablet(prev => prev !== currentValue ? currentValue : prev)
    
    return () => {
      mountedRef.current = false
      window.removeEventListener("resize", handleResize)
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
