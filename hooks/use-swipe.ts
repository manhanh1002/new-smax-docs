"use client"

import { useRef, useEffect, useCallback } from "react"

interface SwipeOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
}

export function useSwipe<T extends HTMLElement>(options: SwipeOptions) {
  const { onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold = 50 } = options

  const ref = useRef<T>(null)
  const startX = useRef(0)
  const startY = useRef(0)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX
      const endY = e.changedTouches[0].clientY
      const diffX = endX - startX.current
      const diffY = endY - startY.current

      // Determine if horizontal or vertical swipe
      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal swipe
        if (diffX > threshold && onSwipeRight) {
          onSwipeRight()
        } else if (diffX < -threshold && onSwipeLeft) {
          onSwipeLeft()
        }
      } else {
        // Vertical swipe
        if (diffY > threshold && onSwipeDown) {
          onSwipeDown()
        } else if (diffY < -threshold && onSwipeUp) {
          onSwipeUp()
        }
      }
    },
    [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold],
  )

  useEffect(() => {
    const element = ref.current
    if (!element) return

    element.addEventListener("touchstart", handleTouchStart, { passive: true })
    element.addEventListener("touchend", handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener("touchstart", handleTouchStart)
      element.removeEventListener("touchend", handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchEnd])

  return ref
}
