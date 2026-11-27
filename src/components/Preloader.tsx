import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { gsap } from '@/lib/gsap'
import { imagesReady, pageReady } from '@/lib/pageReady'
import { finishPreloader, getPreloaderStatus } from '@/lib/preloader'
import { homePageQuery } from '@/lib/queries'
import { mediaUrl } from '@/lib/strapi'
import type { HeroSection, HomePage } from '@/lib/types'

/**
 * First-load preloader. Each first visit gets one of two intros, chosen by the URL it lands on:
 *   - the home page: the "Beauty with / Purpose" flight onto the hero (below)
 *   - any other page: the page's name fills like liquid as it loads, then shutters open (PagePreloader)
 * Both run once per visit only. Navigation inside the site is PageTransition's job and never shows
 * a preloader, so the two never overlap.
 */
export function Preloader() {
  // Decided once, from the URL the visitor landed on: later route changes must not swap the intro.
  const [isHome] = useState(() => window.location.pathname === '/')
  return isHome ? <HomePreloader /> : <PagePreloader />
}

/**
 * Intro preloader from Figma "Desktop - 1 / 2 / 3":
 *   1. "BEAUTY WITH / PURPOSE" set large in the middle of a white screen
 *   2. the lines part (still large) and the image opens between them — "Desktop - 2"
 *   3. words and image shrink together onto the real hero, then the overlay dissolves.
 *
 * Smoothness rules:
 *   - one continuous GSAP timeline (stages overlap, no awaits between them)
 *   - words only use transform / opacity; the image box is the one element that also tweens its size
 *   - every target is measured, and every image decoded, before the motion starts
 *   - the overlay cross-fades onto the identical page underneath instead of disappearing
 */
const MAX_WAIT_MS = 4000
const GAP = 8
const OPEN_EASE = 'power3.inOut'
const LAND_EASE = 'expo.inOut'

// Module-level guard: React StrictMode mounts effects twice in development; the intro must run once.
let started = false

const timeout = <T,>(promise: Promise<T>, ms: number) =>
  Promise.race([promise, new Promise<undefined>((r) => setTimeout(() => r(undefined), ms))])

const decodeImage = (src?: string) =>
  new Promise<boolean>((resolve) => {
    if (!src) return resolve(false)
    const img = new Image()
    img.src = src
    img.decode().then(
      () => resolve(true),
      () => resolve(false),
    )
  })

/** The hero element that is actually rendered (desktop and mobile each have their own "Purpose"). */
const visible = (selector: string) =>
  [...document.querySelectorAll<HTMLElement>(selector)].find((el) => el.getClientRects().length > 0 && el.offsetParent !== null)

/** Waits (frame by frame) until the home page has rendered its hero. */
const waitForHero = (ms: number) =>
  new Promise<boolean>((resolve) => {
    const until = performance.now() + ms
    const tick = () => {
      if (visible('[data-hero-media]') && visible('[data-hero-word-top]') && visible('[data-hero-word-bottom]')) return resolve(true)
      if (performance.now() > until) return resolve(false)
      requestAnimationFrame(tick)
    }
    tick()
  })

function HomePreloader() {
  const queryClient = useQueryClient()
  const [gone, setGone] = useState(() => getPreloaderStatus() === 'done')
  const root = useRef<HTMLDivElement>(null)
  const top = useRef<HTMLParagraphElement>(null)
  const bottom = useRef<HTMLParagraphElement>(null)
  const media = useRef<HTMLDivElement>(null)
  const img = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (started || gone) return
    const el = root.current
    const topEl = top.current
    const bottomEl = bottom.current
    const mediaEl = media.current
    const imgEl = img.current
    if (!el || !topEl || !bottomEl || !mediaEl || !imgEl) return
    started = true

    const vw = window.innerWidth
    const vh = window.innerHeight
    const colW = Math.min(660, vw - 40)
    const fs = Math.min(64, colW / 7.6) // "BEAUTY WITH" is ~7.2× its font size wide
    const lh = fs * 1.4

    // ---- stage 1 layout: both lines centred ----
    gsap.set([topEl, bottomEl], { fontSize: fs, lineHeight: `${lh}px`, transformOrigin: '0 0', force3D: true })
    const topW = topEl.offsetWidth
    const botW = bottomEl.offsetWidth
    const y1 = (vh - (lh * 2 + GAP)) / 2
    gsap.set(topEl, { x: (vw - topW) / 2, y: y1 })
    gsap.set(bottomEl, { x: (vw - botW) / 2, y: y1 + lh + GAP })

    const intro = gsap.timeline()
    intro.from('[data-pre-word]', { yPercent: 110, duration: 0.85, stagger: 0.1, ease: 'power4.out' }, 0.05)
    // Stages 2–3 start once the words have settled (~1.05s), or right away if loading took longer.
    // They live in their own timeline: a finished timeline is dropped by GSAP and can't be extended.
    const next = () => gsap.timeline({ delay: Math.max(0, 1.05 - intro.time()) })
    const dissolve = (tl: gsap.core.Timeline, at: gsap.Position) =>
      tl.to(el, { autoAlpha: 0, duration: 0.5, ease: 'power2.inOut', onStart: finishPreloader, onComplete: () => setGone(true) }, at)

    const prepare = async () => {
      if (window.location.pathname !== '/') return null
      // Wait for the home page data to land in the cache. prefetchQuery never throws, and polling the
      // cache survives the fetch being cancelled and restarted (React StrictMode does this in dev).
      void queryClient.prefetchQuery(homePageQuery)
      const home = await timeout(
        new Promise<HomePage>((resolve) => {
          const check = () => {
            const data = queryClient.getQueryData<HomePage>(homePageQuery.queryKey)
            if (data) resolve(data)
            else setTimeout(check, 50)
          }
          check()
        }),
        MAX_WAIT_MS,
      )
      const hero = home?.sections?.find((s): s is HeroSection => s.__component === 'sections.hero')
      const src = mediaUrl(hero?.media?.formats?.large?.url ?? hero?.media?.url)
      const [fontsOk, imageOk, heroOk] = await Promise.all([
        timeout(document.fonts.ready.then(() => true), MAX_WAIT_MS),
        timeout(decodeImage(src), MAX_WAIT_MS),
        waitForHero(MAX_WAIT_MS),
      ])
      if (!fontsOk || !imageOk || !heroOk || !src) return null
      // The page's own hero image must be ready too, or the cross-fade would reveal an empty box.
      const pageImg = visible('[data-hero-media]')?.querySelector('img')
      if (pageImg) await timeout(pageImg.decode().catch(() => undefined), 1500)
      return src
    }

    prepare().then((src) => {
      const tTop = visible('[data-hero-word-top]')?.getBoundingClientRect()
      const tBottom = visible('[data-hero-word-bottom]')?.getBoundingClientRect()
      const tMedia = visible('[data-hero-media]')?.getBoundingClientRect()
      if (!src || !tTop || !tBottom || !tMedia) {
        // Another route or no hero: hold the words briefly, then dissolve.
        dissolve(next(), 0)
        return
      }
      imgEl.src = src

      // ---- stage 2 layout ("Desktop - 2"): column of title / image / title, centred ----
      const imgH = Math.max(120, Math.min((colW * 440) / 660, vh - 80 - lh * 2 - GAP * 2))
      const colX = (vw - colW) / 2
      const y0 = (vh - (lh * 2 + imgH + GAP * 2)) / 2
      gsap.set(mediaEl, { x: colX, y: y0 + lh + GAP, width: colW, height: imgH, force3D: true })

      const tl = next()
      // Stage 2: the lines part to the column edges while the image opens from the centre between them.
      tl.addLabel('open', 0)
        .to(topEl, { x: colX, y: y0, duration: 0.8, ease: OPEN_EASE }, 'open')
        .to(bottomEl, { x: colX + colW - botW, y: y0 + lh + GAP + imgH + GAP, duration: 0.8, ease: OPEN_EASE }, 'open')
        .fromTo(
          mediaEl,
          { autoAlpha: 1, clipPath: 'inset(50% 50% 50% 50% round 16px)' },
          { clipPath: 'inset(0% 0% 0% 0% round 16px)', duration: 0.8, ease: OPEN_EASE },
          'open+=0.1',
        )
        .fromTo(imgEl, { scale: 1.35 }, { scale: 1.12, duration: 0.9, ease: 'power2.out' }, 'open+=0.1')
        // Stage 3: after a short hold everything shrinks onto the hero underneath.
        .addLabel('land', 'open+=1.05')
        .to(topEl, { x: tTop.left, y: tTop.top, scale: tTop.height / lh, duration: 1, ease: LAND_EASE }, 'land')
        .to(bottomEl, { x: tBottom.left, y: tBottom.top, scale: tBottom.height / lh, duration: 1, ease: LAND_EASE }, 'land')
        .to(mediaEl, { x: tMedia.left, y: tMedia.top, width: tMedia.width, height: tMedia.height, duration: 1, ease: LAND_EASE }, 'land')
        .to(imgEl, { scale: 1, duration: 1, ease: LAND_EASE }, 'land')
      dissolve(tl, 'land+=0.95')
    })
    // No cleanup: the overlay lives until its own timeline removes it (see `started`).
  }, [gone, queryClient])

  if (gone) return null

  return (
    <div ref={root} aria-hidden className="fixed inset-0 z-[100] overflow-hidden bg-white" data-preloader>
      <p ref={top} className="display absolute top-0 left-0 z-10 overflow-hidden whitespace-nowrap will-change-transform">
        <span data-pre-word className="block will-change-transform">
          Beauty with
        </span>
      </p>
      <div
        ref={media}
        style={{ visibility: 'hidden' }}
        className="absolute top-0 left-0 overflow-hidden rounded-2xl will-change-transform"
      >
        <img ref={img} alt="" decoding="async" className="size-full object-cover will-change-transform" />
      </div>
      <p ref={bottom} className="display absolute top-0 left-0 z-10 overflow-hidden whitespace-nowrap will-change-transform">
        <span data-pre-word className="block will-change-transform">
          Purpose
        </span>
      </p>
    </div>
  )
}

// ---------- Inner pages ----------

/** The word shown for each top-level route; anything else falls back to the studio's name. */
const PAGE_LABELS: Record<string, string> = {
  work: 'Work',
  services: 'Services',
  products: 'Products',
  about: 'About',
  insights: 'Insights',
  careers: 'Careers',
  contact: 'Let’s talk',
  'privacy-policy': 'Privacy',
}
const pageLabel = (pathname: string) => PAGE_LABELS[pathname.split('/')[1] ?? ''] ?? 'Rupa Guna'

/** Shortest time the intro stays up, so the page name always gets read. */
const PAGE_MIN_MS = 1500
const BUFFALO_MASK = {
  maskImage: 'url(/assets/buffalo.svg)',
  WebkitMaskImage: 'url(/assets/buffalo.svg)',
  maskSize: 'contain',
  WebkitMaskSize: 'contain',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
} as const

/**
 * Inner-page intro, "fill, then open":
 *   1. on navy, the page's name is set huge in outline, its letters rising in one by one
 *   2. as the page really loads (fonts, data, first-screen images) every letter fills with white
 *      from the bottom up, like liquid; along the hairline below, the buffalo walks with the progress
 *   3. once ready, the letters lift out one after another and the screen opens as a row of navy
 *      shutters rising in a wave; a second row in the brand blue follows a beat behind, so a flash
 *      of colour passes before the page, which drifts up into place beneath them.
 */
function PagePreloader() {
  const [gone, setGone] = useState(() => getPreloaderStatus() === 'done')
  const [label] = useState(() => pageLabel(window.location.pathname))
  const [cols] = useState(() => (window.innerWidth >= 768 ? 6 : 4))
  const root = useRef<HTMLDivElement>(null)
  const count = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (started || gone) return
    const el = root.current
    const countEl = count.current
    if (!el || !countEl) return
    started = true

    const q = gsap.utils.selector(el)
    const fills = q('[data-pp-fill]')
    const walker = q('[data-pp-walker]')[0]
    const track = q('[data-pp-track]')[0]
    const progress = { value: 0 }
    const render = () => {
      const v = progress.value
      countEl.textContent = String(Math.round(v * 100)).padStart(3, '0')
      // Liquid fill, bottom up; the letters fill in a gentle wave from left to right.
      fills.forEach((f, i) => {
        const local = gsap.utils.clamp(0, 1, v * 1.25 - (i / Math.max(1, fills.length)) * 0.25)
        f.style.clipPath = `inset(${((1 - local) * 100).toFixed(2)}% 0% 0% 0%)`
      })
      gsap.set(q('[data-pp-bar]'), { scaleX: v })
      if (walker && track) gsap.set(walker, { x: (track.offsetWidth - walker.offsetWidth) * v })
    }
    render()

    // 1. In: the outlined letters rise in one by one; the details follow.
    gsap
      .timeline()
      .from(q('[data-pp-letter]'), { yPercent: 110, duration: 1.1, stagger: 0.06, ease: 'power4.out' }, 0.05)
      .from(q('[data-pp-meta]'), { autoAlpha: 0, y: 10, duration: 0.7, stagger: 0.06, ease: 'power3.out' }, 0.35)

    // 2. The progress creeps towards 90% on its own and only completes once the page is really ready.
    const creep = gsap.to(progress, { value: 0.9, duration: 2.4, ease: 'power2.out', onUpdate: render })
    const page = document.querySelector<HTMLElement>('[data-page]')
    const minTime = new Promise((r) => setTimeout(r, PAGE_MIN_MS))
    const ready = Promise.all([
      timeout(document.fonts.ready, MAX_WAIT_MS),
      pageReady(MAX_WAIT_MS).then(() => (page ? imagesReady(page, 1500) : undefined)),
      minTime,
    ])

    ready.then(() => {
      creep.kill()
      const main = document.getElementById('main')
      gsap
        .timeline()
        .to(progress, { value: 1, duration: 0.6, ease: 'power2.inOut', onUpdate: render })
        // 3. Out: the letters lift out one after another, the details fade…
        .addLabel('out', '+=0.15')
        .to(q('[data-pp-letter]'), { yPercent: -110, duration: 0.75, stagger: 0.05, ease: 'power3.in' }, 'out')
        .to(q('[data-pp-meta]'), { autoAlpha: 0, y: -10, duration: 0.45, stagger: 0.04, ease: 'power2.in' }, 'out')
        // …then the navy shutters rise in a wave, the blue ones a beat behind…
        .addLabel('open', 'out+=0.55')
        .to(
          q('[data-pp-navy] > *'),
          {
            yPercent: -100,
            duration: 0.9,
            stagger: { each: 0.07, from: 'start' },
            ease: 'expo.inOut',
            // The page is still fully covered here, so its reveals can set their start states unseen.
            onStart: finishPreloader,
          },
          'open',
        )
        .to(q('[data-pp-blue] > *'), { yPercent: -100, duration: 0.9, stagger: 0.07, ease: 'expo.inOut', onComplete: () => setGone(true) }, 'open+=0.16')
        // …and the page drifts up into place beneath them.
        .fromTo(main, { y: 120 }, { y: 0, duration: 1.4, ease: 'expo.out', clearProps: 'transform' }, 'open+=0.3')
    })
    // No cleanup: the overlay lives until its own timeline removes it (see `started`).
  }, [gone])

  if (gone) return null

  const letters = [...label]
  return (
    <div ref={root} aria-hidden className="pointer-events-none fixed inset-0 z-[100]" data-preloader>
      {/* Shutters: blue behind, navy in front. */}
      <div data-pp-blue className="absolute inset-0 flex">
        {Array.from({ length: cols }, (_, i) => (
          <span key={i} className="-mx-px h-full flex-1 bg-blue" />
        ))}
      </div>
      <div data-pp-navy className="absolute inset-0 flex">
        {Array.from({ length: cols }, (_, i) => (
          <span key={i} className="-mx-px h-full flex-1 bg-navy" />
        ))}
      </div>

      <div className="absolute inset-0 flex flex-col text-white">
        <div className="flex flex-1 items-center justify-center px-5">
          <p className="display flex overflow-hidden py-[0.2em] text-[clamp(60px,17vw,200px)] leading-[1.3] whitespace-pre">
            {letters.map((ch, i) => (
              <span key={i} data-pp-letter className="relative inline-block will-change-transform">
                {/* Outline */}
                <span className="text-transparent [-webkit-text-stroke:1.5px_rgba(255,255,255,0.35)]">{ch}</span>
                {/* Fill, revealed bottom-up with the progress */}
                <span data-pp-fill className="absolute inset-0 text-white" style={{ clipPath: 'inset(100% 0% 0% 0%)' }}>
                  {ch}
                </span>
              </span>
            ))}
          </p>
        </div>
        <div className="container-site pb-6 lg:pb-10">
          {/* The buffalo walks along the hairline with the progress. */}
          <div data-pp-track data-pp-meta className="relative mb-4">
            <span
              data-pp-walker
              className="mb-2 block aspect-[620/309] w-12 bg-[#ff5a3c] lg:w-16"
              style={BUFFALO_MASK}
            />
            <div className="relative h-px bg-white/15">
              <span data-pp-bar className="absolute inset-0 origin-left scale-x-0 bg-white" />
            </div>
          </div>
          <div className="flex items-center justify-between text-sm text-white/70">
            <span data-pp-meta>Rupa Guna</span>
            <span data-pp-meta className="tabular-nums">
              <span ref={count}>000</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
