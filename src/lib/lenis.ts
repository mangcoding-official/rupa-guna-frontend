import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { gsap, ScrollTrigger } from './gsap'

/**
 * Lenis smooth scroll, driven by GSAP's ticker so ScrollTrigger animations stay in lockstep with it.
 *
 * Scroll locks keep working untouched: whenever <html> is locked (inline `overflow: hidden` from the
 * menu, dialogs, sheets and the page transition, or the `is-preloading` class) Lenis stops, so the
 * page cannot drift underneath and scrollable panels get native scrolling. Touch devices keep native
 * scrolling (Lenis only smooths wheel/trackpad), and reduced motion turns it off entirely.
 */
let instance: Lenis | null = null

/** The live Lenis instance (null when smooth scroll is off). */
export const getLenis = () => instance

const isLocked = (html: HTMLElement) => html.style.overflow === 'hidden' || html.classList.contains('is-preloading')

export function useLenis() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({
      lerp: 0.1,
      wheelMultiplier: 1,
      // Nested scroll areas (dialogs, horizontal lists) scroll natively.
      allowNestedScroll: true,
      // In-page anchors glide to their target and stop below the sticky header.
      anchors: { offset: -(document.querySelector('header')?.offsetHeight ?? 0) },
    })
    instance = lenis

    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    // Follow the scroll locks used across the site. (Lenis toggles its own classes on <html> too;
    // start/stop are no-ops when nothing changes, so this settles immediately.)
    const html = document.documentElement
    const sync = () => {
      if (isLocked(html)) {
        if (!lenis.isStopped) lenis.stop()
      } else if (lenis.isStopped) {
        lenis.start()
      }
    }
    const observer = new MutationObserver(sync)
    observer.observe(html, { attributes: true, attributeFilter: ['style', 'class'] })
    sync()

    return () => {
      observer.disconnect()
      gsap.ticker.remove(tick)
      lenis.destroy()
      instance = null
    }
  }, [])

  // Route changes jump the window (to the top, or a restored position on back/forward). Snap Lenis to
  // it instead of letting it glide there from the old page's position, and re-measure the new page.
  const { pathname } = useLocation()
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      instance?.resize()
      instance?.scrollTo(window.scrollY, { immediate: true, force: true })
    })
    return () => cancelAnimationFrame(id)
  }, [pathname])
}
