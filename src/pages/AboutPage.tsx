import { useRef } from 'react'
import { PageIntro } from '@/components/PageIntro'
import { SectionRenderer } from '@/components/sections'
import { Seo } from '@/components/Seo'
import { ProjectCover, StrapiImage } from '@/components/StrapiImage'
import { ErrorState, PageLoading } from '@/components/ui'
import { gsap, ScrollTrigger, SplitText, useGSAP } from '@/lib/gsap'
import { useAboutPage, useProjects } from '@/lib/queries'
import { SITE_URL } from '@/lib/strapi'
import type { AboutPage as AboutPageData } from '@/lib/types'

/**
 * About — intro, a full-width studio image, the studio story, then the page's sections from Strapi
 * (feature card, values, team, FAQ…). Every piece is editable in Strapi → About page.
 */
export default function AboutPage() {
  const { data: page, isPending, isError, refetch } = useAboutPage()

  if (isPending) return <PageLoading />
  if (isError || !page) return <ErrorState onRetry={() => refetch()} />

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: page.title,
    description: page.intro ?? undefined,
    url: `${SITE_URL}/about`,
  }

  return (
    <>
      <Seo title="About" description={page.intro} seo={page.seo} jsonLd={jsonLd} />
      <PageIntro label={page.label ?? 'About'} title={page.title} description={page.intro} className="lg:pb-16" />
      <StudioImage page={page} />
      <SectionRenderer sections={page.sections} />
    </>
  )
}

const MOTION = '(prefers-reduced-motion: no-preference)'
const STORY_HEADLINE = 'Every identity we make starts in the field, long before it reaches a screen.'
const BUFFALO_MASK = {
  maskImage: 'url(/assets/buffalo-mask.svg)',
  WebkitMaskImage: 'url(/assets/buffalo-mask.svg)',
  maskSize: 'contain',
  WebkitMaskSize: 'contain',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
  maskPosition: 'center',
  WebkitMaskPosition: 'center',
} as const

/**
 * Project covers scattered around the headline like a collage (positions in % of the screen, clear of
 * the centred headline). `depth` sets how far each drifts while held and how fast it leaves.
 */
const COLLAGE = [
  // Above the headline
  { className: 'left-[6%] top-[6%] w-[26vw] max-w-[200px] aspect-[4/3]', depth: 0.6, tilt: -6 },
  { className: 'right-[8%] top-[4%] w-[22vw] max-w-[150px] aspect-[4/5]', depth: 1, tilt: 5 },
  // Beside it (wide screens only, where the margins are free)
  { className: 'left-[2%] top-[42%] hidden lg:block w-[150px] aspect-square', depth: 1.3, tilt: 4 },
  { className: 'right-[2%] top-[46%] hidden lg:block w-[160px] aspect-[4/3]', depth: 0.8, tilt: -4 },
  // Below it
  { className: 'left-[20%] bottom-[3%] w-[24vw] max-w-[170px] aspect-[4/3]', depth: 1.15, tilt: 3 },
  { className: 'right-[18%] bottom-[3%] w-[24vw] max-w-[170px] aspect-[4/3]', depth: 0.7, tilt: -5 },
] as const

/**
 * The studio image as one pinned scene:
 *   1. the rounded card of the design grows to fill the screen, the photo settling from a zoom;
 *   2. the studio's buffalo walks in as a faint white silhouette behind a bridging headline
 *      ("Our story" + Strapi `storyHeadline`);
 *   3. project covers rise into a collage around the headline and drift by depth;
 *   4. on the way out the covers fly up, the headline and buffalo fade and the photo washes to white;
 *   5. a small blue buffalo walks into the middle and the view dives into its body until the screen is
 *      blue, handing over to the blue section that follows (it starts on that same blue).
 */
function StudioImage({ page }: { page: AboutPageData }) {
  const scope = useRef<HTMLElement>(null)
  const { data: projects } = useProjects()
  // One cover per slot, repeating the projects when there are fewer of them than slots.
  const covers = (projects ?? []).filter((p) => p.cover)
  const collage = covers.length ? COLLAGE.map((_, i) => covers[i % covers.length]) : []
  const label = page.storyLabel ?? 'Our story'
  useGSAP(
    () => {
      if (!page.image) return
      const stage = scope.current?.querySelector<HTMLElement>('[data-about-stage]')
      if (!stage) return
      const q = gsap.utils.selector(stage)

      // The card's rect inside the full-screen stage, as clip-path insets (re-measured on refresh).
      const card = () => {
        const w = stage.clientWidth
        const h = stage.clientHeight
        const gutter = w >= 1200 ? 60 : w >= 768 ? 40 : 20
        const cardW = Math.min(1320, w - gutter * 2)
        const ratio = w >= 1200 ? 640 / 1320 : w >= 768 ? 9 / 16 : 5 / 4
        const header = document.querySelector('header')?.offsetHeight ?? 0
        const top = header + 8
        const cardH = Math.min(cardW * ratio, h - top - 24)
        const side = (w - cardW) / 2
        return `inset(${top}px ${side}px ${Math.max(0, h - top - cardH)}px ${side}px round 24px)`
      }
      const mm = gsap.matchMedia()
      mm.add(MOTION, () => {
        // Words (not lines) so the split survives the font swap and any re-wrap. No mask: the display
        // face's glyphs reach past their line box, and a clipping mask would crop them.
        const headline = SplitText.create(q('[data-bridge-headline]'), { type: 'words' })
        const h = stage.clientHeight
        // Scroll distance per unit of timeline.
        const UNIT = h * 0.55
        const tiles = q('[data-collage]')
        const mark = q('[data-scene-mark]')[0] as HTMLElement | undefined

        // Scale at which the solid middle of the buffalo's body (about a fifth of its width) covers the screen.
        const cover = () => (Math.max(stage.clientWidth, stage.clientHeight) * 1.5) / ((mark?.offsetWidth || 400) * 0.2)

        // Phases follow one another with a short rest between them, on soft eases, so the scene reads as
        // a calm sequence rather than several things moving at once.
        const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' }, paused: true })
        tl
          // 1. The card grows to fill the screen; the photo settles from a zoom.
          .fromTo(q('[data-about-frame]'), { clipPath: card }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 1.2 }, 0)
          .fromTo(q('[data-about-img]'), { scale: 1.3 }, { scale: 1, duration: 1.2 }, 0)
          // 2. A soft shade comes up and the buffalo walks in behind, a faint white silhouette…
          .fromTo(q('[data-bridge-shade]'), { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'sine.inOut' }, 1.0)
          .fromTo(
            q('[data-scene-buffalo]'),
            { xPercent: 20, autoAlpha: 0 },
            { xPercent: 0, autoAlpha: 1, duration: 1.2, ease: 'power2.out' },
            1.0,
          )
          // …then the eyebrow and the headline rise, word by word (the layer stays hidden until here).
          .fromTo(q('[data-bridge]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, 1.3)
          .fromTo(
            q('[data-bridge-label]'),
            { autoAlpha: 0, y: 16 },
            { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' },
            1.3,
          )
          .fromTo(
            headline.words,
            { yPercent: 40, autoAlpha: 0 },
            { yPercent: 0, autoAlpha: 1, duration: 0.7, stagger: 0.05, ease: 'power2.out' },
            1.45,
          )

        // Held for a read.
        let t = 2.9
        if (tiles.length) {
          // 3. The covers rise into place around the headline, one after another, then drift by depth…
          tl.fromTo(
            tiles,
            { y: 70, scale: 0.94, rotate: 0, autoAlpha: 0 },
            {
              y: 0,
              scale: 1,
              rotate: (i: number) => COLLAGE[i].tilt,
              autoAlpha: 1,
              duration: 0.9,
              stagger: 0.12,
              ease: 'power2.out',
            },
            t,
          )
          tiles.forEach((el, i) => tl.to(el, { y: -36 * COLLAGE[i].depth, duration: 1.2, ease: 'none' }, t + 1.5))
          t += 2.9
          // 4. …and drift up and away together, at their own depths.
          tiles.forEach((el, i) =>
            tl.to(el, { y: -h * (0.35 + 0.25 * COLLAGE[i].depth), autoAlpha: 0, duration: 0.9, ease: 'power2.in' }, t),
          )
          t += 0.5
        }
        tl
          // The headline and eyebrow fade up, the buffalo fades, the photo washes to a clean white.
          .to(
            [q('[data-bridge-label]'), headline.words],
            { y: -20, autoAlpha: 0, duration: 0.7, stagger: 0.01, ease: 'power2.in' },
            t,
          )
          .to(q('[data-scene-buffalo]'), { autoAlpha: 0, duration: 0.7, ease: 'sine.inOut' }, t)
          .fromTo(q('[data-about-white]'), { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'sine.inOut' }, t + 0.3)
          .to(q('[data-bridge-shade]'), { opacity: 0, duration: 0.7, ease: 'sine.inOut' }, t + 0.3)
        t += 1.5
        if (mark) {
          tl
            // 5. A small blue buffalo walks into the middle of the white screen and holds…
            .fromTo(mark, { x: -70, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.8, ease: 'power2.out' }, t)
            // …then the view dives into its body until the whole screen is its blue.
            .to(mark, { scale: cover, duration: 1.2, ease: 'power2.in' }, t + 1.3)
        }
        // Rest on blue so the scrub catches up before the blue section takes over.
        tl.to({}, { duration: 0.3 })

        // Attached after it is built, so the pin lasts exactly as long as the timeline needs.
        ScrollTrigger.create({
          animation: tl,
          trigger: stage,
          start: 'top top',
          end: () => `+=${tl.duration() * UNIT}`,
          pin: true,
          // A longer catch-up smooths out uneven wheel and trackpad input.
          scrub: 1.2,
          invalidateOnRefresh: true,
          // This pin adds several screens of scroll above everything after it. It can be created after
          // the sections below (it is rebuilt once the project covers load), so it must be measured
          // first, and the triggers below re-measured now that it exists, or they would pin on top of it.
          refreshPriority: 1,
        })
        ScrollTrigger.sort()
        const refresh = requestAnimationFrame(() => ScrollTrigger.refresh())

        return () => {
          cancelAnimationFrame(refresh)
          headline.revert()
        }
      })
      // Reduced motion: just the card, no pin.
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(q('[data-about-frame]'), { clipPath: card() })
      })
      return () => mm.revert()
    },
    { scope, dependencies: [page.image?.url, collage.length], revertOnUpdate: true },
  )

  if (!page.image) return null
  return (
    <section ref={scope} aria-label="The studio">
      <div data-about-stage className="relative h-svh overflow-hidden">
        <div data-about-frame className="absolute inset-0 overflow-hidden will-change-[clip-path]">
          <div data-about-img className="absolute inset-0 will-change-transform">
            <StrapiImage media={page.image} fallbackAlt="Rupa Guna studio" priority sizes="100vw" className="size-full" />
          </div>
        </div>
        <div
          data-bridge-shade
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,4,54,0.45),rgba(0,4,54,0.15))] opacity-0"
        />
        <div data-about-white aria-hidden className="pointer-events-none absolute inset-0 bg-white opacity-0" />

        {/* Motion only from here: without the scene, the image is just the card. */}
        {/* The studio's buffalo, behind the text (a mask, so its colour can be animated). */}
        <div
          data-scene-buffalo
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 aspect-[620/309] w-[min(115vw,1100px)] -translate-x-1/2 -translate-y-[42%] bg-white/20 opacity-0 motion-reduce:hidden"
          style={BUFFALO_MASK}
        />
        {collage.length ? (
          <div aria-hidden className="pointer-events-none absolute inset-0 motion-reduce:hidden">
            {collage.map((project, i) => (
              <div
                key={i}
                data-collage
                className={`absolute overflow-hidden rounded-xl opacity-0 shadow-[0_24px_60px_-24px_rgba(0,4,54,0.45)] lg:rounded-2xl ${COLLAGE[i].className}`}
              >
                <ProjectCover project={project} sizes="240px" className="size-full" />
              </div>
            ))}
          </div>
        ) : null}
        <div
          data-bridge
          className="container-site pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center text-white opacity-0 motion-reduce:hidden"
        >
          <p data-bridge-label className="text-lg font-medium lg:text-2xl">
            {label}
          </p>
          <p data-bridge-headline className="display mt-4 max-w-[900px] text-[28px] md:text-[44px] lg:mt-6 lg:text-[64px]">
            {page.storyHeadline ?? STORY_HEADLINE}
          </p>
        </div>
        {/* A blue buffalo that walks in, then fills the screen as the view dives into its body. */}
        <div
          data-scene-mark
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 aspect-[620/309] w-[min(56vw,440px)] origin-[53%_42%] -translate-x-1/2 -translate-y-1/2 bg-blue opacity-0 motion-reduce:hidden"
          style={BUFFALO_MASK}
        />
      </div>
    </section>
  )
}
