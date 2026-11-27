import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { getLenis } from '@/lib/lenis'
import { imagesReady, pageReady } from '@/lib/pageReady'

/**
 * Page transition — "card lift", built from the site's own motifs (rounded 24px cards, inset reveals,
 * the bottom sheet that rises in Work Detail):
 *
 *   1. Click: the current page is frozen where the visitor was looking and recedes into a rounded card
 *      floating on navy — the same inset-and-round move the hero, footer and testimonials make.
 *   2. Behind it the route changes and the next page loads (images in the first screen included).
 *   3. The new page rises from below as a white sheet with rounded top corners; the corners flatten as
 *      it lands and its content trails a beat behind, so it settles in layers. The old card drifts up
 *      and dims underneath. The header never moves.
 *
 * Back/forward (no click to intercept) gets a short rise-in. Links can opt out with `data-no-transition`;
 * links to /contact open the Discovery Call dialog instead.
 */

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const RADIUS = 24
/** Shortest time the old page spends receding, so the motion always reads as two beats. */
const MIN_OUT = 0.55

const wait = (s: number) => new Promise((r) => setTimeout(r, s * 1000))

/** Locking <html> also pauses Lenis (see lib/lenis.ts). */
const lockScroll = (lock: boolean) => {
  document.documentElement.style.overflow = lock ? 'hidden' : ''
}

type Stage = { overlay: HTMLDivElement; card: HTMLDivElement; shade: HTMLDivElement; out: gsap.core.Timeline; started: number }

/**
 * Freezes the visible part of `page` (below the header) into a fixed, non-interactive stage:
 * a navy backdrop holding a white card with a copy of the page, offset to the current scroll position.
 */
function buildStage(page: HTMLElement) {
  const header = document.querySelector('header')
  const top = Math.max(0, header?.getBoundingClientRect().bottom ?? 0)
  const pageRect = page.getBoundingClientRect()

  const overlay = document.createElement('div')
  overlay.setAttribute('aria-hidden', 'true')
  overlay.inert = true
  overlay.className = 'pointer-events-none fixed inset-x-0 bottom-0 z-30 overflow-hidden bg-navy'
  overlay.style.top = `${top}px`

  const card = document.createElement('div')
  card.className = 'absolute inset-0 overflow-hidden bg-white will-change-transform'
  card.style.transformOrigin = '50% 0%'

  const clone = page.cloneNode(true) as HTMLElement
  clone.removeAttribute('data-page')
  clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'))
  Object.assign(clone.style, {
    position: 'absolute',
    left: `${pageRect.left}px`,
    width: `${pageRect.width}px`,
    top: `${pageRect.top - top}px`,
    transform: 'none',
  } satisfies Partial<CSSStyleDeclaration>)

  const shade = document.createElement('div')
  shade.className = 'absolute inset-0 bg-navy opacity-0'
  card.append(clone, shade)
  overlay.append(card)
  document.body.appendChild(overlay)
  return { overlay, card, shade, top }
}

export function PageTransition() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const busy = useRef(false)
  /** The frozen old page, set while waiting for the new route. */
  const pending = useRef<Stage | null>(null)
  const lastPath = useRef(pathname)

  // ---- out: freeze the current page, let it recede, change the route underneath ----
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a')
      if (!a || a.target === '_blank' || a.hasAttribute('download') || a.dataset.noTransition !== undefined) return
      const url = new URL(a.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname) return // same page (query/hash changes, modals)
      if (url.pathname === '/contact') return // opens the Discovery Call dialog instead (DiscoveryCall.tsx)
      const page = document.querySelector<HTMLElement>('[data-page]')
      if (reducedMotion() || busy.current || !page) return

      e.preventDefault()
      busy.current = true
      lockScroll(true)
      const { overlay, card, shade } = buildStage(page)

      // The page steps back into a rounded card on navy.
      const out = gsap
        .timeline({ defaults: { duration: 0.75, ease: 'power3.inOut' } })
        .fromTo(
          card,
          { clipPath: 'inset(0% 0% 0% 0% round 0px)' },
          { clipPath: `inset(0% 0% 0% 0% round ${RADIUS}px)`, scale: 0.94, y: 24 },
          0,
        )
        .to(shade, { opacity: 0.12 }, 0)

      pending.current = { overlay, card, shade, out, started: performance.now() }
      // Keep the live page out of sight until it is ready to rise.
      gsap.set(page, { autoAlpha: 0 })
      navigate(url.pathname + url.search + url.hash)
    }
    window.addEventListener('click', onClick, true)
    return () => window.removeEventListener('click', onClick, true)
  }, [navigate])

  // ---- in: the route has changed ----
  useEffect(() => {
    if (pathname === lastPath.current) return
    lastPath.current = pathname
    const page = document.querySelector<HTMLElement>('[data-page]')
    const main = document.getElementById('main')
    const stage = pending.current
    pending.current = null

    if (!stage || !page) {
      // Back/forward: no snapshot to keep, just let the new page rise in.
      if (reducedMotion() || !page) return
      gsap.fromTo(page, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', clearProps: 'all' })
      return
    }

    let cancelled = false
    let done = false
    /** The content's trailing settle, which keeps running after the sheet has landed. */
    let trail: gsap.core.Tween | undefined
    const finish = () => {
      if (done) return
      done = true
      stage.out.kill()
      stage.overlay.remove()
      gsap.set(page, { clearProps: 'all' })
      // The trail finishes on its own; only cut it short when leaving mid-landing.
      if (main && (cancelled || !trail)) {
        trail?.kill()
        gsap.set(main, { clearProps: 'transform' })
      }
      lockScroll(false)
      getLenis()?.scrollTo(0, { immediate: true, force: true })
      busy.current = false
      ScrollTrigger.refresh()
    }

    window.scrollTo(0, 0)
    const elapsed = (performance.now() - stage.started) / 1000
    Promise.all([pageReady().then(() => imagesReady(page)), wait(Math.max(0, MIN_OUT - elapsed))]).then(() => {
      if (cancelled) return
      // Measure scroll triggers for the page's resting place, so reveals in the first screen play
      // while it rises rather than after.
      gsap.set(page, { clearProps: 'transform' })
      ScrollTrigger.refresh()

      const rise = window.innerHeight
      // Scroll is released the moment the sheet lands (onComplete), not after the content's trailing
      // settle: holding the lock while the page already looks still swallowed the visitor's first
      // scroll and then let the page lurch into motion.
      trail = main
        ? gsap.fromTo(main, { y: 140 }, { y: 0, duration: 1.4, ease: 'expo.out', delay: 0.35, clearProps: 'transform' })
        : undefined
      gsap
        .timeline({ defaults: { duration: 1.1, ease: 'expo.inOut' }, onComplete: finish })
        // The new page arrives as a sheet with rounded top corners, flattening as it lands (its content
        // trailing a beat behind, above)…
        .fromTo(
          page,
          { autoAlpha: 1, position: 'relative', zIndex: 35, y: rise, clipPath: `inset(0% 0% 0% 0% round ${RADIUS * 1.5}px ${RADIUS * 1.5}px 0px 0px)` },
          { y: 0, clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)' },
          0,
        )
        // …while the old card drifts up and dims beneath it.
        .to(stage.card, { y: -rise * 0.18, scale: 0.9, duration: 1.1 }, 0)
        .to(stage.shade, { opacity: 0.45, duration: 0.9, ease: 'power2.in' }, 0)
    })

    return () => {
      cancelled = true
      // Navigated again before landing: drop the old snapshot and show the page as it is.
      if (stage.overlay.isConnected) finish()
    }
  }, [pathname])

  return null
}
