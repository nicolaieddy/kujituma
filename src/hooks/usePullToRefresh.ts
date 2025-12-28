import { useEffect, useRef, useState, useCallback } from 'react'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  enabled?: boolean
}

interface RefreshResult {
  isFromCache: boolean;
  timestamp: Date;
}

export const usePullToRefresh = ({ 
  onRefresh, 
  threshold = 80,
  enabled = true 
}: UsePullToRefreshOptions) => {
  const [isPulling, setIsPulling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [lastRefresh, setLastRefresh] = useState<RefreshResult | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const startY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || isRefreshing) return
    const container = containerRef.current
    if (!container || container.scrollTop > 0) return
    
    startY.current = e.touches[0].clientY
  }, [enabled, isRefreshing])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || isRefreshing || startY.current === 0) return
    const container = containerRef.current
    if (!container || container.scrollTop > 0) return

    const currentY = e.touches[0].clientY
    const distance = currentY - startY.current

    if (distance > 0) {
      setIsPulling(true)
      setPullDistance(Math.min(distance, threshold * 1.5))
    }
  }, [enabled, isRefreshing, threshold])

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || !isPulling) return

    if (pullDistance >= threshold) {
      setIsRefreshing(true)
      const startTime = Date.now()
      try {
        await onRefresh()
        const duration = Date.now() - startTime
        // If refresh was very fast (<100ms), likely from cache
        const isFromCache = duration < 100
        setLastRefresh({ isFromCache, timestamp: new Date() })
        setShowFeedback(true)
      } finally {
        setIsRefreshing(false)
      }
    }

    setIsPulling(false)
    setPullDistance(0)
    startY.current = 0
  }, [enabled, isPulling, pullDistance, threshold, onRefresh])

  const hideFeedback = useCallback(() => {
    setShowFeedback(false)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !enabled) return

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: true })
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd])

  const progress = Math.min((pullDistance / threshold) * 100, 100)

  return {
    containerRef,
    isPulling,
    isRefreshing,
    progress,
    pullDistance,
    lastRefresh,
    showFeedback,
    hideFeedback
  }
}
