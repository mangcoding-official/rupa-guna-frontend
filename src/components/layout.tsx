import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { DiscoveryCall } from '@/components/DiscoveryCall'
import { PageTransition } from '@/components/PageTransition'
import { Preloader } from '@/components/Preloader'
import { Seo } from '@/components/Seo'
import { PillLink, SmartLink } from '@/components/ui'
import { gsap, ScrollTrigger, SplitText, useGSAP, useScrollTriggerRefresh, ONCE } from '@/lib/gsap'
import { useLenis } from '@/lib/lenis'
import { usePreloaderStatus } from '@/lib/preloader'
import { useGlobal } from '@/lib/queries'
import type { Global, LinkItem, SocialPlatform } from '@/lib/types'

const FALLBACK_NAV: LinkItem[] = [
  { id: 1, label: 'Home', url: '/' },
  { id: 2, label: 'Work', url: '/work' },
  { id: 3, label: 'Services', url: '/services' },
  { id: 4, label: 'Products', url: '/products' },
  { id: 5, label: 'About', url: '/about' },
]
const FALLBACK_CTA = { label: 'Book a discovery call', url: '/contact' }

const SOCIAL_LABEL: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  behance: 'Behance',
  dribbble: 'Dribbble',
  contra: 'Contra',
  threads: 'Threads',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  x: 'X',
}

const YEAR = new Date().getFullYear()

export function RootLayout() {
  const { data: global } = useGlobal()
  useScrollTriggerRefresh()
  useLenis()
  const preloader = usePreloaderStatus()
  const wasPreloading = useRef(preloader === 'running')

  // After the preloader lands on the hero, bring in the header and the rest of the intro.
  useEffect(() => {
    if (preloader !== 'done' || !wasPreloading.current) return
    wasPreloading.current = false
    gsap
      .timeline()
      // The header drops in from above the viewport…
      .fromTo(
        'header [data-intro]',
        { yPercent: -110, autoAlpha: 0 },
        {
          yPercent: 0,
          autoAlpha: 1,
          duration: 1.1,
          ease: 'expo.out',
          clearProps: 'transform',
        },
      )
      // …with the logo and the menu button trailing just behind it.
      .fromTo(
        'header [data-intro] > *',
        { y: -28 },
        {
          y: 0,
          duration: 1.2,
          stagger: 0.1,
          ease: 'expo.out',
          clearProps: 'transform',
        },
        0.05,
      )
      // Then the rest of the intro content (hero description) settles in.
      .fromTo(
        'main [data-intro]',
        { autoAlpha: 0, y: 14 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.08,
          ease: 'expo.out',
          clearProps: 'transform',
        },
        0.3,
      )
    ScrollTrigger.refresh()
  }, [preloader])

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <Preloader />
      <PageTransition />
      <DiscoveryCall />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-navy focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Seo />
      <Header global={global} />
      {/* Everything below the header: what the page transition freezes and slides. */}
      <div data-page className="flex flex-1 flex-col bg-white">
        <main id="main" className="flex-1">
          <Outlet />
        </main>
        <Footer global={global} />
      </div>
      <ScrollRestoration />
    </div>
  )
}

// ---------- Header + menu (Figma: Nav, "Landing page-navigation", "Menu · Mobile 390") ----------
function Header({ global }: { global?: Global }) {
  const { pathname } = useLocation()
  // The menu belongs to the page it was opened on, so navigating closes it without an effect.
  const [menuPath, setMenuPath] = useState<string | null>(null)
  const open = menuPath === pathname
  const setOpen = (next: boolean) => setMenuPath(next ? pathname : null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  // Escape closes the menu and focus returns to the toggle.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuPath(null)
        toggleRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Sticky header: slides away while scrolling down, comes back as soon as the visitor scrolls up.
  // Only the inner bar moves — the <header> itself is never transformed, so the fixed menu panel
  // inside it stays anchored to the viewport.
  const [hidden, setHidden] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    let last = window.scrollY
    let frame = 0
    const update = () => {
      frame = 0
      const y = window.scrollY
      setScrolled(y > 8)
      // A section can pin the bar in view (set data-header-pinned on <html>) while it plays an
      // animation tied to the header logo.
      if (document.documentElement.hasAttribute('data-header-pinned')) {
        setHidden(false)
        last = y
        return
      }
      if (y < 120) setHidden(false)
      else if (Math.abs(y - last) > 6) setHidden(y > last)
      if (Math.abs(y - last) > 6 || y < 120) last = y
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])
  const barHidden = hidden && !open

  return (
    <header className={`sticky top-0 z-40 ${barHidden ? 'pointer-events-none' : ''}`}>
      <div
        data-header-bar
        className={`transition-[translate,background-color,backdrop-filter] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] ${
          barHidden ? '-translate-y-full' : 'translate-y-0'
        } ${scrolled ? 'bg-white/85 backdrop-blur-md' : 'bg-transparent'}`}
      >
        <div data-intro className="container-site flex h-16 items-center justify-between lg:h-24">
          <Link to="/" aria-label={`${global?.siteName ?? 'Rupa Guna'} — home`} className="-my-3 inline-flex py-3">
            <img data-header-logo src="/assets/logo-horizontal.svg" alt="" width={114} height={18} className="h-[18px] w-auto" />
          </Link>
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="site-menu"
            className="group inline-flex items-center gap-4 text-sm"
          >
            {pathname !== '/' && <span className="hidden sm:inline">Menu</span>}
            <span className="sr-only">Open menu</span>
            <MenuIcon />
          </button>
        </div>
      </div>
      <MenuPanel global={global} open={open} onClose={() => setOpen(false)} />
    </header>
  )
}

function MenuIcon() {
  return (
    <span aria-hidden className="flex size-8 flex-col items-center justify-center gap-[5px]">
      <span className="h-[2px] w-[14px] bg-navy transition-transform duration-300 group-hover:translate-x-0.5" />
      <span className="h-[2px] w-[14px] bg-navy transition-transform duration-300 group-hover:-translate-x-0.5" />
    </span>
  )
}

function MenuPanel({ global, open, onClose }: { global?: Global; open: boolean; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  const nav = global?.navigation?.length ? global.navigation : FALLBACK_NAV
  const cta = global?.headerCta ?? FALLBACK_CTA
  const socials = global?.socialLinks ?? []

  const backdrop = useRef<HTMLDivElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)
  const closing = useRef<gsap.core.Timeline | null>(null)

  // One timeline, built once: play() opens, reverse() closes. Symmetric, interruptible, and only
  // transform/opacity are animated so the GPU does the work.
  useGSAP(
    () => {
      const el = panel.current
      if (!el) return
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      gsap.set(el, { yPercent: -102 })
      tl.current = gsap
        .timeline({ paused: true, defaults: { ease: 'power4.out' } })
        .set([el, backdrop.current], { visibility: 'visible' })
        .to(backdrop.current, { autoAlpha: 1, duration: 0.7, ease: 'power2.out' }, 0)
        .to(el, { yPercent: 0, duration: 0.95 }, 0)
        // Content travels a little less than the panel: a soft parallax as it unrolls.
        .from('[data-menu-inner]', { yPercent: -18, duration: 0.95 }, 0)
        .from('[data-menu-link]', { yPercent: 115, duration: 0.9, stagger: 0.06 }, 0.18)
        .from(
          '[data-menu-fade]',
          {
            autoAlpha: 0,
            y: 16,
            duration: 0.7,
            stagger: 0.06,
            ease: 'power3.out',
          },
          0.4,
        )
      if (reduced) tl.current.timeScale(100)
    },
    // Rebuild from a clean slate when the CMS navigation arrives, so old .from() states never leak.
    {
      scope: panel,
      dependencies: [nav.length, socials.length],
      revertOnUpdate: true,
    },
  )

  useEffect(() => {
    const t = tl.current
    const el = panel.current
    if (!t || !el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (open) {
      if (closing.current?.isActive()) {
        // Re-opened mid-close: run the close back the way it came, no jump.
        closing.current.reverse()
      } else {
        t.play(0)
      }
      // Focus moves into the dialog once it is visible (the timeline reveals it on its first tick).
      gsap.delayedCall(0.05, () => el.querySelector<HTMLElement>('[data-menu-close]')?.focus({ preventScroll: true }))
    } else if (t.progress() > 0) {
      // Closing gets its own short tween so it reacts instantly, instead of first rewinding the
      // staggered links. Afterwards the open timeline is parked at its start for next time.
      t.pause()
      closing.current = gsap
        .timeline({
          onComplete: () => {
            t.pause(0)
            // Park both layers fully hidden so the invisible backdrop can never swallow clicks.
            gsap.set([el, backdrop.current], { visibility: 'hidden' })
          },
        })
        .to(el, {
          yPercent: -102,
          duration: reduced ? 0 : 0.65,
          ease: 'power3.inOut',
        })
        .to(backdrop.current, { autoAlpha: 0, duration: reduced ? 0 : 0.5, ease: 'power2.inOut' }, 0)
    }
    // Lock page scroll while the menu is open.
    document.documentElement.style.overflow = open ? 'hidden' : ''
  }, [open])

  return (
    <>
      {/* Dimmed page behind the panel (desktop); clicking it closes the menu. */}
      <div
        ref={backdrop}
        aria-hidden
        onClick={onClose}
        style={{ visibility: 'hidden', opacity: 0 }}
        className="fixed inset-0 z-40 hidden cursor-pointer bg-navy/25 lg:block"
      />
      <div
        ref={panel}
        id="site-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
        inert={!open}
        style={{ visibility: 'hidden' }}
        className="fixed inset-0 z-50 flex flex-col overflow-hidden rounded-b-2xl bg-blue text-white will-change-transform lg:inset-auto lg:top-0 lg:right-10 lg:h-[844px] lg:max-h-dvh lg:w-[390px]"
      >
        <div data-menu-inner className="flex h-full flex-col overflow-y-auto px-5 pt-6 pb-5 will-change-transform">
          <div className="flex justify-end">
            <button data-menu-close type="button" onClick={onClose} className="inline-flex items-center gap-4 text-sm">
              Close <span aria-hidden className="h-[2px] w-[14px] bg-white" />
            </button>
          </div>
          <nav aria-label="Main" className="mt-6">
            <ul>
              {nav.map((item) => {
                const active = item.url === '/' ? pathname === '/' : pathname.startsWith(item.url)
                return (
                  <li key={item.id} className="flex items-start justify-between overflow-hidden">
                    <NavLink
                      data-menu-link
                      to={item.url}
                      onClick={onClose}
                      className="display block text-5xl leading-[1.4] transition-opacity hover:opacity-70"
                    >
                      {item.label}
                    </NavLink>
                    {active && <span aria-hidden className="mt-5 size-3.5 bg-white" />}
                  </li>
                )
              })}
            </ul>
          </nav>
          <div className="mt-auto pt-10">
            {global?.email && (
              <a data-menu-fade href={`mailto:${global.email}`} className="block text-base font-medium">
                {global.email}
              </a>
            )}
            {socials.length > 0 && (
              <p data-menu-fade className="mt-2 text-sm text-white/60">
                {socials.map((s, i) => (
                  <span key={s.id}>
                    {i > 0 && ' · '}
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                      {SOCIAL_LABEL[s.platform]}
                    </a>
                  </span>
                ))}
              </p>
            )}
            <div data-menu-fade className="mt-5">
              <PillLink link={cta} variant="white" className="w-full" onClick={onClose} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ---------- Footer (Figma: Footer instance, 1440×1031 / 390×983) ----------
function Footer({ global }: { global?: Global }) {
  const nav = global?.navigation?.length ? global.navigation : FALLBACK_NAV
  const cta = global?.footerCta ?? global?.headerCta ?? FALLBACK_CTA
  const scope = useRef<HTMLElement>(null)
  const { pathname } = useLocation()

  // The footer outlives page changes, and page content (CMS data, images) arrives after it mounts.
  // While the page is still empty the footer sits inside the viewport, so any `once` trigger built
  // then fires immediately — unseen, behind the preloader. Only arm the reveals once the footer has
  // been pushed below the fold (or after a timeout for genuinely short pages), and re-arm per route.
  const [armedFor, setArmedFor] = useState<string | null>(null)
  const armed = armedFor === pathname ? armedFor : null
  useEffect(() => {
    const footer = scope.current
    const main = document.getElementById('main')
    if (!footer || !main) return
    let done = false
    const arm = () => {
      if (done) return
      done = true
      setArmedFor(pathname)
    }
    const check = () => {
      if (footer.getBoundingClientRect().top + window.scrollY > window.innerHeight) arm()
    }
    const ro = new ResizeObserver(check)
    ro.observe(main)
    const raf = requestAnimationFrame(check)
    const fallback = window.setTimeout(arm, 2000)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
      clearTimeout(fallback)
    }
  }, [pathname])

  useGSAP(
    () => {
      const footer = scope.current
      if (!footer || !armed) return
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // 1. The page above peels off the footer: its white edge bulges down into the blue as a deep
        //    curve and flattens as you scroll, while the footer content rises out from under the curve
        //    (never overlapping it), so it reads as lying underneath the page.
        const scrub = { trigger: footer, start: 'top bottom', end: 'top 30%', scrub: 0.6 }
        gsap.fromTo('[data-footer-lip]', { scaleY: 1 }, { scaleY: 0, ease: 'power1.inOut', scrollTrigger: scrub })
        gsap.fromTo('[data-footer-inner]', { y: 120 }, { y: 0, ease: 'power1.out', scrollTrigger: scrub })

        // 2. The buffalo silhouette eases in from the right along the bottom edge and arrives as the
        //    page ends; on pointer devices it then leans gently towards the cursor.
        const mark = footer.querySelector<HTMLElement>('[data-footer-mark]')
        if (mark) {
          gsap.fromTo(
            mark,
            { xPercent: 45 },
            { xPercent: 0, ease: 'power2.out', scrollTrigger: { trigger: footer, start: 'top 85%', end: 'bottom bottom', scrub: 1 } },
          )
        }
        let unbind: (() => void) | undefined
        const float = footer.querySelector<HTMLElement>('[data-footer-float]')
        const panel = footer.querySelector<HTMLElement>('[data-footer-panel]')
        if (float && panel && window.matchMedia('(pointer: fine)').matches) {
          const toX = gsap.quickTo(float, 'x', { duration: 1.4, ease: 'power3.out' })
          const toY = gsap.quickTo(float, 'y', { duration: 1.4, ease: 'power3.out' })
          const toR = gsap.quickTo(float, 'rotate', { duration: 1.4, ease: 'power3.out' })
          const move = (e: PointerEvent) => {
            const r = panel.getBoundingClientRect()
            const nx = (e.clientX - r.left) / r.width - 0.5
            const ny = (e.clientY - r.top) / r.height - 0.5
            toX(nx * 40)
            toY(ny * 16)
            toR(nx * 2)
          }
          const leave = () => {
            toX(0)
            toY(0)
            toR(0)
          }
          panel.addEventListener('pointermove', move)
          panel.addEventListener('pointerleave', leave)
          unbind = () => {
            panel.removeEventListener('pointermove', move)
            panel.removeEventListener('pointerleave', leave)
          }
        }

        // 3. The logo is wiped in from the bottom and the CTA pops in.
        gsap.fromTo(
          '[data-footer-logo]',
          { clipPath: 'inset(100% 0% 0% 0%)', y: 24 },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            y: 0,
            duration: 1.1,
            ease: 'expo.out',
            clearProps: 'clipPath,transform',
            scrollTrigger: { trigger: '[data-footer-logo]', start: 'top 92%', ...ONCE },
          },
        )
        gsap.from('[data-footer-cta]', {
          autoAlpha: 0,
          scale: 0.6,
          duration: 0.9,
          delay: 0.25,
          ease: 'back.out(2.2)',
          clearProps: 'transform',
          scrollTrigger: { trigger: '[data-footer-cta]', start: 'top 92%', ...ONCE },
        })

        // 4. The big menu links rise letter by letter from behind a mask, one link after another.
        const navEl = footer.querySelector<HTMLElement>('[data-footer-nav]')
        const labels = gsap.utils.toArray<HTMLElement>('[data-footer-link-text]')
        if (navEl && labels.length) {
          const splits = labels.map((el) => SplitText.create(el, { type: 'words,chars', mask: 'words' }))
          const reveal = gsap.timeline({ scrollTrigger: { trigger: navEl, start: 'top 88%', ...ONCE } })
          splits.forEach((split, i) => {
            reveal.from(
              split.chars,
              { yPercent: 110, rotate: 8, duration: 0.9, stagger: 0.025, ease: 'expo.out' },
              i * 0.1,
            )
          })
        }

        // 5. The remaining small elements fade up as they enter; elements that enter together are
        //    batched and staggered in reading order.
        const groups: [selector: string, y: number, stagger: number][] = [
          ['[data-footer-social]', 20, 0.06],
          ['[data-footer-coords]', 16, 0],
          ['[data-footer-copy]', 16, 0],
        ]
        groups.forEach(([selector, y, stagger]) => {
          const items = gsap.utils.toArray<HTMLElement>(selector)
          if (!items.length) return
          gsap.set(items, { autoAlpha: 0, y })
          // No `once: true` (see ONCE in lib/gsap): replaying the tween on an item that is already
          // visible changes nothing, so the triggers can simply stay alive.
          const show = (batch: Element[]) =>
            gsap.to(batch, {
              autoAlpha: 1,
              y: 0,
              duration: 1,
              ease: 'power3.out',
              stagger,
              overwrite: true,
              clearProps: 'transform',
            })
          ScrollTrigger.batch(items, { start: 'top 92%', onEnter: show, onLeave: show })
        })

        // The title rises line by line from behind a mask.
        const title = footer.querySelector<HTMLElement>('[data-footer-split]')
        if (title) {
          SplitText.create(title, {
            type: 'lines',
            mask: 'lines',
            autoSplit: true,
            onSplit: (self) =>
              gsap.from(self.lines, {
                yPercent: 105,
                duration: 1.1,
                ease: 'expo.out',
                stagger: 0.1,
                scrollTrigger: { trigger: title, start: 'top 92%', ...ONCE },
              }),
          })
        }

        // The coordinates scramble into place as they fade up.
        const coords = footer.querySelector<HTMLElement>('[data-footer-coords]')
        if (coords) {
          gsap.to(coords, {
            duration: 1.4,
            delay: 0.1,
            scrambleText: {
              text: coords.textContent ?? '',
              chars: '0123456789°\'".',
              speed: 0.6,
            },
            ease: 'none',
            scrollTrigger: { trigger: coords, start: 'top 92%', ...ONCE },
          })
        }
        return () => unbind?.()
      })
      ScrollTrigger.refresh()
      return () => mm.revert()
    },
    // Rebuild from a clean slate per route and when CMS content arrives, so old states never leak into new tweens.
    {
      scope,
      dependencies: [armed, nav.length, global?.socialLinks?.length, global?.coordinates],
      revertOnUpdate: true,
    },
  )

  return (
    <footer ref={scope} className="mt-12 lg:mt-20">
      <div data-footer-panel className="relative overflow-hidden bg-blue text-white">
        {/* The page's white edge, bulging into the panel as a curve until scroll flattens it. */}
        <div
          data-footer-lip
          aria-hidden
          className="pointer-events-none absolute inset-x-[-10%] top-0 z-10 h-[clamp(64px,10vw,160px)] origin-top rounded-b-[50%] bg-white motion-reduce:hidden"
        />
        {/* Faint buffalo silhouette along the bottom edge. The outer element follows the scroll, the
            middle one leans towards the cursor, the inner one carries the mirror (so GSAP's transforms
            are not flipped). */}
        <div
          data-footer-mark
          aria-hidden
          className="pointer-events-none absolute right-[-4%] bottom-[-2%] w-[72vw] max-w-[860px] lg:right-[3%] lg:w-[46vw]"
        >
          <div data-footer-float className="origin-bottom will-change-transform">
            <div
              className="aspect-[620/309] w-full -scale-x-100 bg-white/[0.06]"
              style={{
                maskImage: 'url(/assets/buffalo.svg)',
                WebkitMaskImage: 'url(/assets/buffalo.svg)',
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
              }}
            />
          </div>
        </div>
        <div data-footer-inner className="relative container-site py-14 will-change-transform lg:pt-[100px] lg:pb-[88px]">
          <div className="section-grid gap-y-10">
            <img
              data-footer-logo
              src="/assets/logo-stacked.svg"
              alt={global?.siteName ?? 'Rupa Guna'}
              width={68}
              height={90}
              className="h-[71px] w-auto lg:h-[89px]"
            />
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <p data-footer-split className="display max-w-[470px] text-2xl lg:text-[32px]">
                {global?.footerTitle ?? 'Let’s build a brand that carries your purpose'}
              </p>
              <div data-footer-cta className="self-start">
                <PillLink link={cta} variant="white" />
              </div>
            </div>
          </div>

          <div className="section-grid mt-12 lg:mt-[110px]">
            <div className="hidden lg:block" />
            <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
              <nav data-footer-nav aria-label="Footer">
                <ul>
                  {nav.map((item) => (
                    <li key={item.id}>
                      {/* The link (hover target) stays still; the text inside slides and a white copy
                          wipes across it from the left, so the colour fills the word like ink. */}
                      <SmartLink
                        data-footer-link
                        href={item.url}
                        className="group/fl display block text-[44px] leading-[1.5] text-white/20 lg:text-[64px] lg:leading-[1.8]"
                      >
                        <span className="relative inline-block transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover/fl:translate-x-4 group-focus-visible/fl:translate-x-4">
                          <span data-footer-link-text className="inline-block">
                            {item.label}
                          </span>
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 text-white transition-[clip-path] duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] [clip-path:inset(-10%_100%_-10%_0)] group-hover/fl:[clip-path:inset(-10%_0%_-10%_0)] group-focus-visible/fl:[clip-path:inset(-10%_0%_-10%_0)]"
                          >
                            {item.label}
                          </span>
                        </span>
                      </SmartLink>
                    </li>
                  ))}
                </ul>
              </nav>
              <ul className="text-xl leading-[1.2] font-medium lg:w-[310px] lg:pt-4">
                {global?.socialLinks?.map((s) => (
                  <li key={s.id}>
                    <a
                      data-footer-social
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/so inline-block pr-2 text-white/20 transition-colors duration-500 hover:text-white"
                    >
                      <span className="inline-block transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover/so:translate-x-2">
                        {SOCIAL_LABEL[s.platform]}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="section-grid mt-12 lg:mt-24">
            <div className="hidden lg:block" />
            <div className="flex flex-col gap-1 font-medium text-white/20 lg:flex-row lg:items-end lg:justify-between">
              {global?.coordinates && (
                <p data-footer-coords aria-label={global.coordinates} className="text-sm tabular-nums lg:text-xl">
                  {global.coordinates}
                </p>
              )}
              <p data-footer-copy className="text-sm">
                © {YEAR} {global?.copyrightName ?? global?.siteName ?? 'Rupa Guna Design'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
