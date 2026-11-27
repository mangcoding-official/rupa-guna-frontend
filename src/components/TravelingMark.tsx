import { useEffect, useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { usePreloaderStatus } from '@/lib/preloader'

/**
 * Home page accent: the Rupa Guna buffalo stands beside the hero and, as the visitor scrolls, travels
 * down into the manifesto, where it lands as the logo in front of the words "Rupa Guna".
 *
 * Anchors (`[data-mark-anchor]`, in document order) mark where it rests: an invisible box in the
 * hero's left column, then the inline logo in the statement. The mark itself is fixed to the
 * viewport and placed every frame from the anchors' live positions: it sets off when the hero anchor
 * rises past 80% of the screen and arrives as the slot reaches 35%, a long, unhurried glide.
 *
 * The slot keeps its full size at all times, so the sentence is laid out once and its lines never
 * reflow. Until the buffalo arrives, the words on the slot's line are slid left over the empty slot
 * (no gap shows); as it lands they glide right to make room for it. Only that line moves. Its vertical position follows the anchors linearly (so on screen it
 * stays put while the page moves); size and position ease, with a small lean while it moves. After
 * landing it simply sits on the inline logo (pinned statement included) and scrolls away with it.
 *
 * While it runs, the inline logo hides (`html.has-travel-mark`) so the two never double up; on
 * mobile/tablet and with reduced motion it does not run and the inline logo shows on its own.
 */
/** It sets off when the hero anchor rises past START and lands as the slot reaches LAND (× viewport). */
const START = 0.8
const LAND = 0.35
/** Easing towards the target for x, size and lean, per 60fps frame (scaled to the real frame time, so
 * it feels the same at 60 or 120Hz). y stays exact, so it never drifts off the text. */
const FOLLOW = 0.12

export function TravelingMark() {
  const mark = useRef<HTMLDivElement>(null)
  const ready = usePreloaderStatus() === 'done'

  useEffect(() => {
    const el = mark.current
    if (!el || !ready) return
    const root = document.documentElement
    const mq = window.matchMedia('(min-width: 1200px) and (prefers-reduced-motion: no-preference)')
    const ease = gsap.parseEase('power2.inOut')
    const lerp = (from: number, to: number, t: number) => from + (to - from) * t
    let lastY = window.scrollY
    let lean = 0
    const cur = { x: 0, w: 0, r: 0, init: false }

    let slot: HTMLElement | null = null
    let lineWords: HTMLElement[] = []
    const off = () => {
      root.classList.remove('has-travel-mark')
      el.style.visibility = 'hidden'
      // Words back in place (the static inline logo shows in the slot).
      lineWords.forEach((w) => (w.style.translate = ''))
      lineWords = []
    }
    const update = (_time: number, deltaMs: number) => {
      const k = 1 - Math.pow(1 - FOLLOW, Math.min(deltaMs, 50) / (1000 / 60))
      const anchors = [...document.querySelectorAll<HTMLElement>('[data-mark-anchor]')].filter((a) => a.offsetParent)
      if (!mq.matches || anchors.length < 2) return off()
      root.classList.add('has-travel-mark')
      slot = anchors[1]
      const [a, b] = anchors.slice(0, 2).map((x) => x.getBoundingClientRect())
      const full = b.width
      const ratio = 309 / 620
      const bTop = b.top
      // Progress over a long stretch: from the hero anchor at START down the screen to the slot at
      // LAND, so the journey is slow and unhurried.
      const vh = window.innerHeight
      const travel = bTop - a.top + (START - LAND) * vh
      const p = travel <= 0 ? 1 : gsap.utils.clamp(0, 1, (START * vh - a.top) / travel)
      const e = ease(p)
      lean += ((window.scrollY - lastY) * 0.08 - lean) * k
      lastY = window.scrollY
      const moving = p > 0 && p < 1 ? Math.sin(p * Math.PI) : 0
      // The words on the slot's line (by layout position: transforms don't affect offsetTop) sit slid over the
      // empty slot, and glide right to make room over the last stretch of the journey. CSS
      // `translate` composes with GSAP's own transforms on those words (their reveal), untouched.
      // The room is fully made just before it touches down: first the line adjusts, then it lands.
      const open = gsap.parseEase('power2.inOut')(gsap.utils.clamp(0, 1, (p - 0.6) / 0.32))
      const room = slot.offsetWidth + parseFloat(getComputedStyle(slot).marginRight)
      const mid = slot.offsetTop + slot.offsetHeight / 2
      const words = [...(slot.parentElement?.querySelectorAll<HTMLElement>('[data-st-word]') ?? [])]
      lineWords.forEach((w) => (w.style.translate = ''))
      lineWords = words.filter((w) => Math.abs(w.offsetTop + w.offsetHeight / 2 - mid) < w.offsetHeight / 2)
      const shift = `${(-room * (1 - open)).toFixed(2)}px 0`
      lineWords.forEach((w) => (w.style.translate = shift))
      // At rest (before setting off / after landing) it snaps exactly onto its anchor.
      const target = { x: lerp(a.left, b.left, e), w: lerp(a.width, full, e), r: gsap.utils.clamp(-6, 6, -moving * 4 + (p < 1 ? lean : 0)) }
      const atRest = p <= 0 || p >= 1
      cur.x = atRest && Math.abs(cur.x - target.x) < 0.5 ? target.x : cur.x + (target.x - cur.x) * k
      cur.w = atRest && Math.abs(cur.w - target.w) < 0.5 ? target.w : cur.w + (target.w - cur.w) * k
      cur.r += (target.r - cur.r) * k
      if (!cur.init) Object.assign(cur, { x: target.x, w: target.w, r: target.r, init: true })
      gsap.set(el, {
        x: cur.x,
        // Bottom-aligned: its feet follow from the hero anchor's base to the text's baseline.
        y: lerp(a.bottom, b.bottom, p) - cur.w * ratio,
        width: cur.w,
        rotate: cur.r,
        visibility: 'visible',
      })
    }

    gsap.ticker.add(update)
    return () => {
      gsap.ticker.remove(update)
      off()
    }
  }, [ready])

  return (
    <div
      ref={mark}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-30 aspect-[620/309] origin-bottom bg-blue will-change-transform"
      style={{
        visibility: 'hidden',
        maskImage: 'url(/assets/buffalo.svg)',
        WebkitMaskImage: 'url(/assets/buffalo.svg)',
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
      }}
    />
  )
}
