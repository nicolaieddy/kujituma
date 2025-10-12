import { useRef, useCallback, useState } from 'react'

interface UseSwipeGestureOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  threshold?: number
}

export const useSwipeGesture = ({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50
}: UseSwipeGestureOptions) => {
  const [isSwiping, setIsSwiping] = useState(false)
  const [swipeDistance, setSwipeDistance] = useState(0)
  const startX = useRef(0)
  const startY = useRef(0)
  const currentX = useRef(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    currentX.current = startX.current
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startX.current) return

    currentX.current = e.touches[0].clientX
    const deltaX = currentX.current - startX.current
    const deltaY = Math.abs(e.touches[0].clientY - startY.current)

    // Only track horizontal swipes
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setIsSwiping(true)
      setSwipeDistance(deltaX)
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping) return

    if (Math.abs(swipeDistance) >= threshold) {
      if (swipeDistance > 0 && onSwipeRight) {
        onSwipeRight()
      } else if (swipeDistance < 0 && onSwipeLeft) {
        onSwipeLeft()
      }
    }

    setIsSwiping(false)
    setSwipeDistance(0)
    startX.current = 0
    startY.current = 0
    currentX.current = 0
  }, [isSwiping, swipeDistance, threshold, onSwipeLeft, onSwipeRight])

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    isSwiping,
    swipeDistance,
  }
}
