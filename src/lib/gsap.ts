import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Draggable } from 'gsap/Draggable'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useEffect, type RefObject } from 'react'
import { useLocation } from 'react-router'
import { usePreloaderStatus } from './preloader'

/**
 * Single place where GSAP plugins are registered. Import gsap/ScrollTrigger from here,
 * never directly, so registration always happens once.
 */
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, ScrambleTextPlugin, Draggable)
gsap.defaults({ ease: 'power3.out', duration: 0.9 })

export { Draggable, gsap, ScrollTrigger, SplitText, useGSAP }

/**
 * Use instead of `once: true` on a scroll-triggered tween or timeline: it plays the animation the
 * first time the trigger is reached (or skipped past) and never reverses it.
 *
 * `once: true` makes a trigger kill itself as soon as it is passed. When the page opens at a restored
 * scroll position, that happens while ScrollTrigger is still looping over its trigger list for a
 * newly created trigger, which leaves a hole in the list and crashes the render
 * ("Cannot read properties of undefined (reading 'end')", then "Maximum call stack size exceeded").
 */
export const ONCE = { toggleActions: 'play play none none' } as const

/** Animations only run when the user has not asked for reduced motion. */
const MOTION_OK = '(prefers-reduced-motion: no-preference)'

/**
 * Fade-and-rise every `[data-reveal]` element inside `scope` as it scrolls into view.
 * Elements stay fully visible when reduced motion is on or JS animation fails.
 *
 *   const ref = useRef<HTMLElement>(null)
 *   useReveal(ref)
 *   <section ref={ref}><h2 data-reveal>…</h2></section>
 */
export function useReveal(scope: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  // While the preloader covers the page, hold everything hidden and start once it is gone, so the
  // first screen animates in front of the visitor instead of behind the overlay.
  const ready = usePreloaderStatus() === 'done'
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      if (!ready) {
        mm.add(MOTION_OK, () => {
          gsap.set(gsap.utils.toArray('[data-reveal]'), { autoAlpha: 0 })
        })
        return () => mm.revert()
      }
      mm.add(MOTION_OK, () => {
        const items = gsap.utils.toArray<HTMLElement>('[data-reveal]')
        items.forEach((el) => {
          gsap.from(el, {
            autoAlpha: 0,
            y: 32,
            delay: Number(el.dataset.revealDelay ?? 0),
            scrollTrigger: { trigger: el, start: 'top 88%', ...ONCE },
          })
        })
        // Display headings open line by line behind a mask. autoSplit re-measures the lines when
        // fonts load or the viewport resizes, and replays from the right state.
        gsap.utils.toArray<HTMLElement>('[data-split]').forEach((el) => {
          SplitText.create(el, {
            type: 'lines',
            mask: 'lines',
            autoSplit: true,
            onSplit: (self) =>
              gsap.from(self.lines, {
                yPercent: 105,
                duration: 1.1,
                stagger: 0.09,
                ease: 'expo.out',
                scrollTrigger: { trigger: el, start: 'top 85%', ...ONCE },
              }),
          })
        })
      })
      return () => mm.revert()
    },
    { scope, dependencies: [...deps, ready], revertOnUpdate: true },
  )
}

/**
 * Resolves with the delay (seconds) a first-screen entrance should use once the page is on screen.
 * During a page transition the new page stays hidden (visibility) while the old one recedes, then
 * rises as a sheet; waiting for it to become visible and adding a short beat lets the stagger play
 * as the sheet lands rather than unseen.
 */
export const whenPageVisible = (ms = 4000) =>
  new Promise<number>((resolve) => {
    const until = performance.now() + ms
    let waited = false
    const tick = () => {
      const page = document.querySelector('[data-page]')
      if (!page || getComputedStyle(page).visibility !== 'hidden' || performance.now() > until) return resolve(waited ? 0.3 : 0.1)
      waited = true
      requestAnimationFrame(tick)
    }
    tick()
  })

/**
 * Split a heading into lines and slide them up — used for large display titles.
 * Waits for web fonts so line breaks are measured with the final font.
 */
export function useSplitHeading(target: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  useGSAP(
    () => {
      const el = target.current
      if (!el) return
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        let split: SplitText | undefined
        document.fonts.ready.then(() => {
          split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' })
          gsap.from(split.lines, { yPercent: 110, duration: 1.1, stagger: 0.08, ease: 'expo.out' })
        })
        return () => split?.revert()
      })
      return () => mm.revert()
    },
    { dependencies: deps, revertOnUpdate: true },
  )
}

/** SPA route changes alter page height; ScrollTrigger must re-measure after each one. */
export function useScrollTriggerRefresh() {
  const { pathname } = useLocation()
  useEffect(() => {
    const id = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => cancelAnimationFrame(id)
  }, [pathname])

  // Images and web fonts that arrive after the triggers were measured shift everything below them,
  // leaving pins and reveals at stale positions (sections "stick" or reveal at the wrong spot).
  // Re-measure, debounced, whenever one finishes loading — but not mid page-transition, which
  // refreshes on its own once it lands.
  //
  // Any refresh that happens in the meantime (the page transition's own, a route change…) already
  // measured those images, so it cancels the pending one. Otherwise a second refresh would land a few
  // frames after the transition finishes — right as the visitor starts scrolling — and make the page
  // flicker and jump.
  useEffect(() => {
    let timer = 0
    const schedule = () => {
      clearTimeout(timer)
      timer = window.setTimeout(() => {
        if (document.documentElement.style.overflow === 'hidden') return schedule()
        ScrollTrigger.refresh()
      }, 250)
    }
    const cancel = () => clearTimeout(timer)
    const onLoad = (e: Event) => {
      if (e.target instanceof HTMLImageElement) schedule()
    }
    document.addEventListener('load', onLoad, true) // `load` does not bubble; capture sees every <img>
    document.fonts?.ready.then(schedule)
    ScrollTrigger.addEventListener('refresh', cancel)
    return () => {
      cancel()
      document.removeEventListener('load', onLoad, true)
      ScrollTrigger.removeEventListener('refresh', cancel)
    }
  }, [])
}
