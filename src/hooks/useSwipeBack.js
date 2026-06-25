import { useEffect, useRef } from 'react'

/**
 * Detects a horizontal swipe-right gesture on the given ref (or document)
 * and calls `window.history.back()`.
 *
 * Conditions:
 *  - Only fires on touch-capable devices (coarse pointer or touchstart support).
 *  - Swipe must travel ≥ 80 px horizontally, start within 40 px of the left
 *    edge (classic iOS/Android back-gesture zone), and the horizontal travel
 *    must be ≥ 1.5× the vertical travel (rejects vertical scrolls).
 *  - A lightweight visual indicator slides the content panel to give feedback.
 *  - Ignores swipes that start inside interactive elements (inputs, selects,
 *    buttons, links, textareas) so form interaction isn't hijacked.
 */
export function useSwipeBack(containerRef) {
  const startX = useRef(0)
  const startY = useRef(0)
  const tracking = useRef(false)
  const transitionTimer = useRef(null)

  useEffect(() => {
    // Bail on non-touch devices
    if (typeof window === 'undefined') return
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (!isTouch) return

    const EDGE_ZONE = 40   // px from left edge
    const MIN_DISTANCE = 80 // px horizontal travel needed
    const MIN_RATIO = 1.5   // horizontal / vertical ratio

    // Tags whose interaction should NOT trigger a swipe
    const INTERACTIVE = 'INPUT,SELECT,TEXTAREA,BUTTON,A,[role="button"],[contenteditable="true"]'

    const el = () => containerRef?.current || document

    function onTouchStart(e) {
      const touch = e.touches[0]
      // Don't hijack interactive elements
      if (e.target.closest?.(INTERACTIVE)) return
      // Only accept swipes starting near the left edge
      if (touch.clientX > EDGE_ZONE) return
      startX.current = touch.clientX
      startY.current = touch.clientY
      tracking.current = true
    }

    function onTouchMove(e) {
      if (!tracking.current) return
      const touch = e.touches[0]
      const dx = touch.clientX - startX.current
      const dy = Math.abs(touch.clientY - startY.current)

      // If vertical movement dominates, cancel tracking (user is scrolling)
      if (dy > 20 && Math.abs(dx) < dy * 0.5) {
        tracking.current = false
        resetVisual()
        return
      }

      // Provide visual feedback — slide the content right (max 120 px)
      if (dx > 0) {
        const offset = Math.min(dx, 120)
        const progress = offset / 120
        const content = document.querySelector('.content')
        if (content) {
          content.style.transform = `translateX(${offset}px)`
          content.style.transition = 'none'
          content.style.opacity = 1 - progress * 0.15
        }
      }
    }

    function onTouchEnd(e) {
      if (!tracking.current) return
      tracking.current = false

      const touch = e.changedTouches[0]
      const dx = touch.clientX - startX.current
      const dy = Math.abs(touch.clientY - startY.current)

      resetVisual()

      if (dx >= MIN_DISTANCE && dx >= dy * MIN_RATIO) {
        window.history.back()
      }
    }

    function resetVisual() {
      const content = document.querySelector('.content')
      if (content) {
        clearTimeout(transitionTimer.current)
        content.style.transition = 'transform 0.25s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease'
        content.style.transform = ''
        content.style.opacity = ''
        // Clean up inline styles after transition
        transitionTimer.current = setTimeout(() => {
          if (content.style.transition) {
            content.style.transition = ''
            content.style.transform = ''
            content.style.opacity = ''
          }
        }, 260)
      }
    }

    const root = el()
    root.addEventListener('touchstart', onTouchStart, { passive: true })
    root.addEventListener('touchmove', onTouchMove, { passive: true })
    root.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      clearTimeout(transitionTimer.current)
      root.removeEventListener('touchstart', onTouchStart)
      root.removeEventListener('touchmove', onTouchMove)
      root.removeEventListener('touchend', onTouchEnd)
    }
  }, [containerRef])
}
