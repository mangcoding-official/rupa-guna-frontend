import { Fragment, useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { FeatureCard, Team, Values } from '@/components/aboutSections'
import { ProjectCover, StrapiImage } from '@/components/StrapiImage'
import { ArrowIcon, ChapterNumber, SectionIntro, Skeleton, SmartLink } from '@/components/ui'
import { Draggable, gsap, ScrollTrigger, useGSAP, useReveal, ONCE } from '@/lib/gsap'
import { ChapterContext } from '@/lib/chapter'
import { getPreloaderStatus, usePreloaderStatus } from '@/lib/preloader'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { useProjects, useServices } from '@/lib/queries'
import { mediaUrl } from '@/lib/strapi'
import type {
  FaqSection,
  FeaturedProjectsSection,
  HeroSection,
  Media,
  PageSection,
  ProcessSection,
  ProjectSummary,
  ServicesOverviewSection,
  Testimonial,
} from '@/lib/types'

const MOTION = '(prefers-reduced-motion: no-preference)'

/** Sections whose label carries a chapter number when the page is numbered. */
const CHAPTERED = new Set<PageSection['__component']>([
  'sections.featured-projects',
  'sections.services-overview',
  'sections.process',
  'sections.faq',
  'sections.values',
  'sections.team',
])

/**
 * Maps each Strapi dynamic-zone entry to its component. Types without a design yet are skipped.
 * `chapters` numbers the labelled sections in order (the hero's statement, if any, is chapter 01).
 */
export function SectionRenderer({ sections, chapters = false }: { sections?: PageSection[] | null; chapters?: boolean }) {
  if (!sections?.length) return null
  const counts = sections.map((section) =>
    chapters && (section.__component === 'sections.hero' ? !!section.statement : CHAPTERED.has(section.__component)),
  )
  const numbers = counts.map((c, i) => (c ? counts.slice(0, i + 1).filter(Boolean).length : null))
  return (
    <>
      {sections.map((section, i) => (
        <ChapterContext.Provider key={`${section.__component}-${section.id}`} value={numbers[i]}>
          {renderSection(section)}
        </ChapterContext.Provider>
      ))}
    </>
  )
}

function renderSection(section: PageSection) {
        const key = `${section.__component}-${section.id}`
        switch (section.__component) {
          case 'sections.hero':
            return <Hero key={key} section={section} />
          case 'sections.services-overview':
            return <ServicesOverview key={key} section={section} />
          case 'sections.featured-projects':
            return <FeaturedWork key={key} section={section} />
          case 'sections.testimonials':
            return <Testimonials key={key} testimonials={section.testimonials} background={section.background?.url} />
          case 'sections.faq':
            return <Faq key={key} section={section} />
          case 'sections.process':
            return <Process key={key} section={section} />
          case 'sections.feature-card':
            return <FeatureCard key={key} section={section} />
          case 'sections.values':
            return <Values key={key} section={section} />
          case 'sections.team':
            return <Team key={key} section={section} />
          default:
            return null
        }
}

// ---------- Hero (Figma: Hero — "BEAUTY WITH" / image / "PURPOSE") ----------
export function Hero({ section }: { section: HeroSection }) {
  const scope = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      // On first load the preloader flies onto this hero and hands off; only run our own intro otherwise
      // (e.g. navigating back to the home page later).
      const handedOff = getPreloaderStatus() === 'running'
      const mm = gsap.matchMedia()
      mm.add(MOTION, () => {
        if (!handedOff) {
          gsap
            .timeline({ defaults: { ease: 'expo.out' } })
            .from('[data-hero-word]', { yPercent: 110, duration: 1.1, stagger: 0.12 })
            .fromTo(
              '[data-hero-media]',
              { clipPath: 'inset(12% 12% 12% 12% round 16px)', scale: 1.08 },
              { clipPath: 'inset(0% 0% 0% 0% round 16px)', scale: 1, duration: 1.4 },
              0.1,
            )
            .from('[data-hero-fade]', { autoAlpha: 0, y: 16, duration: 0.8 }, 0.6)
        }

        const scrub = { trigger: scope.current, start: 'top top', end: 'bottom top', scrub: 0.6 }
        gsap.to('[data-hero-img]', { yPercent: 8, scale: 1.06, ease: 'none', scrollTrigger: scrub })
        // Leaving, the whole hero steps back and dims a little, so the next section reads as arriving
        // in front of it.
        // Explicit start values: arriving here from a page-transition, the hero mounts while the old
        // page's scroll position (and the hidden incoming page) are still in place, so values read
        // from the DOM at that moment could be wrong and would stick.
        gsap.fromTo(
          '[data-hero-inner]',
          { scale: 1, opacity: 1 },
          {
            scale: 0.92,
            opacity: 0.25,
            transformOrigin: '50% 30%',
            ease: 'power1.in',
            immediateRender: false,
            scrollTrigger: { trigger: scope.current, start: 'top top', end: 'bottom top', scrub: 0.6 },
          },
        )

        // Pointer play (mouse only): the image tilts gently in 3D towards the cursor and the two
        // title words slide the opposite way, as if they sat on a nearer plane.
        const section = scope.current
        if (!section || !window.matchMedia('(pointer: fine)').matches) return
        gsap.set('[data-hero-media]', { transformPerspective: 1400 })
        const ease = { duration: 1.1, ease: 'power3.out' }
        const rx = gsap.quickTo('[data-hero-media]', 'rotationX', ease)
        const ry = gsap.quickTo('[data-hero-media]', 'rotationY', ease)
        // The whole line moves (not the word inside its mask), so nothing is clipped.
        const wordsX = gsap.quickTo('[data-hero-line]', 'x', ease)
        const imgX = gsap.quickTo('[data-hero-slides]', 'x', ease)
        const imgY = gsap.quickTo('[data-hero-slides]', 'y', ease)
        // Zoomed in slightly while the pointer plays, so the shifted image never shows its edges (and
        // at rest it matches the preloader's hand-off exactly).
        const imgS = gsap.quickTo('[data-hero-slides]', 'scale', ease)
        const move = (e: PointerEvent) => {
          if (e.pointerType !== 'mouse') return
          const nx = e.clientX / window.innerWidth - 0.5
          const ny = e.clientY / window.innerHeight - 0.5
          rx(ny * -6)
          ry(nx * 8)
          wordsX(nx * -28)
          imgX(nx * -14)
          imgY(ny * -10)
          imgS(1.06)
        }
        const reset = () => {
          rx(0)
          ry(0)
          wordsX(0)
          imgX(0)
          imgY(0)
          imgS(1)
        }
        section.addEventListener('pointermove', move)
        section.addEventListener('pointerleave', reset)
        return () => {
          section.removeEventListener('pointermove', move)
          section.removeEventListener('pointerleave', reset)
        }
      })
      return () => mm.revert()
    },
    { scope },
  )

  const media = section.media
  const isVideo = media?.mime?.startsWith('video/')
  // The hero image comes first (the preloader lands on it); featured project covers follow.
  const { data: projects } = useProjects({ featured: true, limit: 6 })
  const linked = projects?.find((p) => section.mediaLink === `/work/${p.slug}`)
  const slides: HeroSlide[] = [
    { key: 'hero', media, href: section.mediaLink ?? undefined, label: linked?.title ?? media?.alternativeText ?? undefined },
    ...(isVideo ? [] : (projects ?? []))
      .filter((p) => p.cover?.url && p.cover.url !== media?.url)
      .map((p) => ({ key: p.documentId, media: p.cover, href: `/work/${p.slug}`, label: p.title })),
  ].slice(0, 5)
  const fullTitle = [section.titleTop, section.titleBottom].filter(Boolean).join(' ')

  return (
    <>
    <section
      ref={scope}
      className="relative container-site flex min-h-[780px] flex-col justify-center py-12 lg:min-h-0 lg:pt-[110px] lg:pb-[330px]"
    >
      {/* First resting place of the travelling buffalo (home, desktop): the empty left column. */}
      <span data-mark-anchor aria-hidden className="absolute bottom-[360px] left-15 hidden aspect-[620/309] w-[96px] text-blue lg:block" />
      <div data-hero-inner className="mx-auto w-full max-w-[660px]">
        {/* Screen readers get the whole title once; the split visual title below is decorative. */}
        <h1 className="sr-only">{fullTitle}</h1>
        <p data-hero-line aria-hidden className="display overflow-hidden text-2xl">
          <span data-hero-top className="block">
            <span data-hero-word data-hero-word-top className="inline-block align-top">
              {section.titleTop}
            </span>
          </span>
        </p>
        {/* The image sits between the two halves of the title, as in the design. */}
        <div data-hero-media className="relative mt-4 aspect-660/440 overflow-hidden rounded-2xl">
          {isVideo ? (
            <span data-hero-img className="block size-full">
              <video className="size-full object-cover" src={mediaUrl(media!.url)} autoPlay muted loop playsInline aria-hidden />
            </span>
          ) : (
            <HeroSlides slides={slides} />
          )}
        </div>
        {section.titleBottom && (
          <p data-hero-line aria-hidden className="display mt-4 overflow-hidden text-right text-2xl lg:hidden">
            <span data-hero-bottom className="block">
              <span data-hero-word data-hero-word-bottom className="inline-block align-top">
                {section.titleBottom}
              </span>
            </span>
          </p>
        )}
        <div className="mt-4 flex flex-col gap-4 lg:mt-5 lg:flex-row lg:items-start lg:justify-between">
          {section.description && (
            <p data-hero-fade data-intro className="text-sm leading-[1.25] lg:max-w-[320px]">
              {section.description}
            </p>
          )}
          {section.titleBottom && (
            <p data-hero-line aria-hidden className="display hidden overflow-hidden text-2xl lg:block">
              <span data-hero-bottom className="block">
                <span data-hero-word data-hero-word-bottom className="inline-block align-top">
                  {section.titleBottom}
                </span>
              </span>
            </p>
          )}
        </div>
      </div>
    </section>
    {section.statement && (
      <Statement
        label={section.statementLabel}
        text={section.statement}
        images={section.statementImages ?? []}
        definitions={section.statementDefinitions ?? []}
      />
    )}
    </>
  )
}

// ---------- Statement (manifesto under the hero) ----------
type Definition = { term: string; phonetic?: string; meaning: string }
const STAR = /^\*([^*]+)\*(.*)$/
const ACCENT = /^_([^_]+)_(.*)$/

/**
 * The brand's name, explained in one large sentence, read with the scroll (pinned on desktop): the
 * words rise into full colour one after another, the two key words (`_form_`, `_purpose_`) are set
 * in blue, and after each `*starred*` word a capsule window opens in the line, pushing the words
 * aside, with a picture from the work settling inside it. `[mark]` is the buffalo logo inline, where the hero's travelling buffalo
 * lands. When the sentence is complete, two dictionary notes (rupa, guna) draw in underneath.
 */
function Statement({
  label,
  text,
  images,
  definitions,
}: {
  label?: string | null
  text: string
  images: Media[]
  definitions: Definition[]
}) {
  const scope = useRef<HTMLElement>(null)
  useReveal(scope)
  useGSAP(
    () => {
      const el = scope.current
      if (!el) return
      const mm = gsap.matchMedia()
      mm.add({ motion: MOTION, desktop: '(min-width: 1200px)' }, (ctx) => {
        if (!ctx.conditions?.motion) return
        const words = gsap.utils.toArray<HTMLElement>('[data-st-word]')
        // Read with the scroll: pinned in place on desktop, scrubbed through on smaller screens.
        const tl = gsap.timeline({
          defaults: { ease: 'power2.out' },
          scrollTrigger: ctx.conditions.desktop
            ? {
                trigger: el,
                start: () => {
                  const header = document.querySelector('header')?.offsetHeight ?? 0
                  return `center ${header + (window.innerHeight - header) / 2}px`
                },
                end: '+=220%',
                pin: true,
                scrub: 1.2,
                invalidateOnRefresh: true,
              }
            : // Mobile: finishes (navy turn included) as the section's end reaches the bottom of the
              // screen, before the Work chapter comes into view.
              { trigger: el, start: 'top 80%', end: 'bottom 98%', scrub: 1.2 },
        })
        const STEP = 0.3
        words.forEach((w, i) => {
          const at = i * STEP
          // Each word rises into place out of a pale state.
          // Long, overlapping fades: the light moves through the sentence like a soft wave.
          tl.fromTo(w, { opacity: 0.2, yPercent: 22 }, { opacity: 1, yPercent: 0, duration: 1.8, ease: 'sine.out' }, at)
          // After its word, a capsule opens and pushes the text aside. The picture inside keeps its
          // final size (never squeezed or re-cropped) and blooms open from its centre.
          const pill = w.nextElementSibling?.matches('[data-st-pill]') ? (w.nextElementSibling as HTMLElement) : null
          if (pill) {
            const beforePunct = !!pill.nextElementSibling?.matches('[data-st-punct]')
            const pic = pill.querySelector('[data-st-pic]')
            tl.fromTo(
              pill,
              { width: 0, marginLeft: 0, marginRight: 0 },
              { width: '2em', marginLeft: '0.22em', marginRight: beforePunct ? '0.04em' : '0.22em', duration: 2.4, ease: 'power2.inOut' },
              at + 0.4,
            )
              // The picture opens from a point in the middle into the full capsule, so the narrow
              // window never shows a thin sliver of image.
              .fromTo(
                pic,
                { clipPath: 'inset(50% 50% 50% 50% round 999px)', scale: 1.35 },
                { clipPath: 'inset(0% 0% 0% 0% round 999px)', scale: 1, duration: 2.4, ease: 'power2.inOut' },
                at + 0.6,
              )
          }
        })
        // Background turn: the whole screen dissolves from white to navy (the Work chapter's stage)
        // and the text turns light with it; the buffalo and the pictures keep their colour.
        const turnAt = words.length * STEP + 4.4
        const end = words.length * STEP + 1.4
        tl.fromTo('[data-st-def-line]', { scaleX: 0 }, { scaleX: 1, duration: 2.2, stagger: 0.4, ease: 'power2.inOut' }, end)
          .fromTo('[data-st-def-text]', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1.6, stagger: 0.15, ease: 'sine.out' }, end + 0.6)
          .fromTo('[data-st-bg]', { opacity: 0 }, { opacity: 1, duration: 2.6, ease: 'sine.inOut' }, turnAt)
          // The colour tokens of this section are tweened with the same scrub, so text and lines
          // change colour exactly in step with the background (and reverse just as exactly).
          .fromTo(
            el,
            { '--color-navy': '#000436', '--color-label': '#4d5378', '--color-gray': '#707070', '--color-line': '#e6e6e6' },
            { '--color-navy': '#ffffff', '--color-label': '#9a9cb8', '--color-gray': '#b9bbd0', '--color-line': '#2a2e5c', duration: 2.2, ease: 'sine.inOut' },
            turnAt + 0.2,
          )
          // Rest: hold the finished page a moment before the pin lets go.
          .to({}, { duration: 1.6 })

        // Leaving: as the Work sheet rises over it, the whole statement steps back and dims.
        gsap.fromTo(
          '[data-st-inner]',
          { scale: 1, opacity: 1, y: 0 },
          {
            scale: 0.94,
            opacity: 0.3,
            y: -60,
            transformOrigin: '50% 0%',
            ease: 'power1.in',
            immediateRender: false,
            // On desktop it starts only once the pin has let go (the sentence is complete by then);
            // measured from the pin's own end, since a pinned element's position doesn't move.
            scrollTrigger: ctx.conditions.desktop
              ? {
                  start: () => tl.scrollTrigger?.end ?? 0,
                  end: () => (tl.scrollTrigger?.end ?? 0) + window.innerHeight * 0.75,
                  scrub: 0.8,
                  invalidateOnRefresh: true,
                }
              : { trigger: el, start: 'bottom 85%', end: 'bottom 15%', scrub: 0.8 },
          },
        )
      })
      return () => mm.revert()
    },
    { scope, dependencies: [text, images.length, definitions.length], revertOnUpdate: true },
  )

  // The n-th starred word takes the n-th image.
  const tokens = text.split(/\s+/).filter(Boolean)
  const starIndex = tokens.map((t, i) => (STAR.test(t) ? tokens.slice(0, i).filter((u) => STAR.test(u)).length : -1))
  return (
    <section ref={scope} aria-label={label ?? undefined} className="tone relative isolate container-site pt-6 pb-16 lg:-mt-[150px] lg:pt-0 lg:pb-[140px]">
      {/* The navy the screen turns to at the end of the read; it reaches past the section (and past
          the pinned frame) so the whole viewport changes colour, and runs on into the Work chapter. */}
      <div
        data-st-bg
        aria-hidden
        className="pointer-events-none absolute inset-x-[calc(50%-50vw)] -top-[50vh] -bottom-[50vh] -z-10 bg-[#000436] opacity-0 motion-reduce:hidden"
      />
      <div data-st-inner className="section-grid gap-y-4">
        {label ? (
          <p data-reveal className="label lg:pt-3">
            <ChapterNumber />
            {label}
          </p>
        ) : (
          <span className="hidden lg:block" />
        )}
        <div className="max-w-[920px]">
          <p className="text-[28px] leading-[1.25] font-medium tracking-[-0.015em] text-navy lg:text-[52px] lg:leading-[1.18]">
            {tokens.map((token, i) => {
              // "[mark]": the buffalo logo inline (where the travelling mark from the hero lands).
              if (token === '[mark]')
                return (
                  <Fragment key={i}>
                    <span
                      data-mark-anchor
                      aria-hidden
                      className="mr-[0.25em] inline-block aspect-[620/309] w-[1.55em] bg-blue text-blue align-[-0.02em] [.has-travel-mark_&]:invisible"
                      style={BUFFALO_MASK}
                    />
                  </Fragment>
                )
              const star = STAR.exec(token)
              const accent = !star ? ACCENT.exec(token) : null
              // Punctuation after a starred word goes after its image: "years [img]."
              const word = star ? star[1] : accent ? accent[1] : token
              const punct = star ? star[2] : accent ? accent[2] : ''
              const image = star ? images[starIndex[i]] : undefined
              return (
                <Fragment key={i}>
                  <span data-st-word className={`inline-block ${accent ? 'text-blue' : ''}`}>
                    {word}
                    {!image && punct}
                  </span>
                  {image && (
                    <span
                      data-st-pill
                      data-cover={image.url}
                      aria-hidden
                      className={`relative ml-[0.22em] inline-block h-[0.9em] w-[2em] overflow-hidden rounded-full align-[-0.1em] ${punct ? 'mr-[0.04em]' : 'mr-[0.22em]'}`}
                    >
                      {/* Fixed at the capsule's full size and centred, so it never squeezes as the window opens. */}
                      <span data-st-pic className="absolute top-0 left-1/2 block h-full w-[2em] -translate-x-1/2">
                        <StrapiImage media={image} alt="" sizes="120px" className="size-full" />
                      </span>
                    </span>
                  )}
                  {image && punct && (
                    <span data-st-word data-st-punct className="inline-block">
                      {punct}
                    </span>
                  )}{' '}
                </Fragment>
              )
            })}
          </p>

          {definitions.length > 0 && (
            <dl className="mt-12 grid gap-8 md:grid-cols-2 md:gap-10 lg:mt-16">
              {definitions.map((d) => (
                <div key={d.term} className="relative pt-5">
                  <span data-st-def-line aria-hidden className="absolute inset-x-0 top-0 h-px origin-left bg-line" />
                  <dt data-st-def-text className="flex items-baseline gap-3">
                    <span className="display text-lg lg:text-xl">{d.term}</span>
                    {d.phonetic && <span className="text-sm text-gray">{d.phonetic}</span>}
                  </dt>
                  <dd data-st-def-text className="mt-2 max-w-[340px] text-sm leading-normal text-label lg:text-base">
                    {d.meaning}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  )
}

const BUFFALO_MASK = {
  maskImage: 'url(/assets/buffalo.svg)',
  WebkitMaskImage: 'url(/assets/buffalo.svg)',
  maskSize: 'contain',
  WebkitMaskSize: 'contain',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
} as const

// ---------- Hero slideshow ----------
type HeroSlide = { key: string; media?: HeroSection['media']; href?: string; label?: string }
const SLIDE_INTERVAL = 4.5

/**
 * The hero image cycles through the featured work. Each new image rises in as a curtain from the
 * bottom edge, settling from a slight zoom, while the one before is pushed up and away beneath it.
 * No pagination: the images simply follow one another. It pauses on hover/focus, off-screen and in a
 * background tab; reduced motion shows the first image only.
 */
function HeroSlides({ slides }: { slides: HeroSlide[] }) {
  const scope = useRef<HTMLSpanElement>(null)
  const [active, setActive] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [inView, setInView] = useState(true)
  const [tabVisible, setTabVisible] = useState(true)
  const preloaderDone = usePreloaderStatus() === 'done'
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const n = slides.length
  const previous = useRef(0)
  const clock = useRef<gsap.core.Tween | null>(null)
  const playing = n > 1 && preloaderDone && inView && tabVisible && !hovered && !reduced

  useEffect(() => {
    const onVis = () => setTabVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  useGSAP(
    () => {
      const st = ScrollTrigger.create({ trigger: scope.current, start: 'top bottom', end: 'bottom top', onToggle: (self) => setInView(self.isActive) })
      return () => st.kill()
    },
    { scope },
  )

  // The transition between two slides.
  useGSAP(
    () => {
      const els = gsap.utils.toArray<HTMLElement>('[data-hero-slide]')
      const from = previous.current
      previous.current = active
      if (from === active || !els[active]) return
      const next = els[active]
      const prev = els[from]
      const img = (el?: HTMLElement) => el?.querySelector('[data-hero-slide-img]')
      gsap.killTweensOf([...els, ...els.map(img)])
      els.forEach((el, i) => i !== active && i !== from && gsap.set(el, { autoAlpha: 0, zIndex: 0 }))
      if (reduced) {
        gsap.set(prev, { autoAlpha: 0, zIndex: 0 })
        gsap.set(next, { autoAlpha: 1, zIndex: 1, clipPath: 'none' })
        return
      }
      gsap.set(prev, { zIndex: 1 })
      // Decode the incoming image first, so the curtain never opens onto a half-drawn picture.
      const pic = next.querySelector('img')
      const tl = gsap
        .timeline({
          paused: true,
          onComplete: () => {
            gsap.set(prev, { autoAlpha: 0, zIndex: 0 })
            gsap.set(img(prev) ?? [], { clearProps: 'transform' })
            gsap.set(next, { zIndex: 1, clearProps: 'clipPath' })
          },
        })
        .fromTo(next, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.inOut' }, 0)
        .fromTo(img(next) ?? [], { scale: 1.3, yPercent: 12 }, { scale: 1, yPercent: 0, duration: 1.8, ease: 'expo.inOut' }, 0)
        .to(img(prev) ?? [], { yPercent: -14, scale: 1.08, duration: 1.3, ease: 'expo.inOut' }, 0)
      let live = true
      const start = () => {
        if (!live) return
        gsap.set(next, { zIndex: 2, autoAlpha: 1 })
        tl.play()
      }
      if (pic && !pic.complete) pic.decode().then(start, start)
      else start()
      return () => {
        live = false
      }
    },
    { scope, dependencies: [active] },
  )

  // The clock: after the interval, the next slide comes in.
  useGSAP(
    () => {
      if (n < 2) return
      clock.current = gsap.to({}, {
        duration: SLIDE_INTERVAL,
        ease: 'none',
        paused: true,
        onComplete: () => setActive((i) => (i + 1) % n),
      })
      return () => {
        clock.current?.kill()
        clock.current = null
      }
    },
    { scope, dependencies: [active, n] },
  )
  useEffect(() => {
    if (playing) clock.current?.resume()
    else clock.current?.pause()
  }, [playing, active])

  const current = slides[active]
  return (
    <span
      ref={scope}
      className="absolute inset-0 block"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      {/* Parallax target (see Hero); slides are stacked inside it. */}
      <span data-hero-img className="absolute inset-0 block">
        <span data-hero-slides className="absolute inset-0 block">
        {slides.map((slide, i) => (
          <span
            key={slide.key}
            data-hero-slide
            className="absolute inset-0 block overflow-hidden"
            style={{ zIndex: i === 0 ? 1 : 0, visibility: i === 0 ? 'visible' : 'hidden', opacity: i === 0 ? 1 : 0 }}
          >
            <span data-hero-slide-img className="block size-full will-change-transform">
              <StrapiImage media={slide.media} priority={i === 0} sizes="(min-width: 1200px) 660px, 100vw" className="size-full" />
            </span>
          </span>
        ))}
        </span>
      </span>

      {current?.href && (
        <SmartLink href={current.href} aria-label={current.label ? `View ${current.label}` : 'View project'} className="absolute inset-0 z-10">
          {null}
        </SmartLink>
      )}

    </span>
  )
}

// ---------- Services (Figma: "FOUR WAYS WE GIVE BRANDS FORM AND PURPOSE.") ----------
function ServicesOverview({ section }: { section: ServicesOverviewSection }) {
  const scope = useRef<HTMLElement>(null)
  const highlight = useRef<HTMLDivElement>(null)
  const rows = useRef<(HTMLAnchorElement | null)[]>([])
  const { data: collection, isPending: loadingCollection } = useServices()
  // Editorial rows from the section win; otherwise list the Service collection.
  const hasItems = !!section.items?.length
  const services = hasItems
    ? section.items!.map((r) => ({ documentId: String(r.id), title: r.title, category: r.category, shortDescription: r.description, href: r.url, image: r.image }))
    : collection?.map((c) => ({ documentId: c.documentId, title: c.title, category: c.category, shortDescription: c.shortDescription, href: `/services/${c.slug}`, image: null }))
  const isPending = !hasItems && loadingCollection
  // Preview media per row (desktop hover card): the row's own picture (set per row in the CMS), else
  // the linked service's image, else a cover from the featured work.
  const { data: work } = useProjects({ featured: true, limit: 6 })
  const covers = (work ?? []).filter((p) => p.cover?.url)
  const previews = services?.map((row, i) => {
    const svc = collection?.find((c) => row.href === `/services/${c.slug}`)
    const fallback = covers.length ? covers[i % covers.length] : undefined
    return {
      title: row.title,
      cover: row.image?.url ? row.image : svc?.heroMedia?.url ? svc.heroMedia : (fallback?.cover ?? null),
      accentColor: svc?.accentColor ?? '#4671ff',
    }
  })
  // The design shows the second row highlighted; the highlight then follows hover/focus.
  const [active, setActive] = useState(1)
  useReveal(scope, [services?.length])

  // Desktop: one blue pill glides between rows instead of each row toggling its own background.
  const moveHighlight = useCallback((index: number, immediate = false) => {
    // Measure the <li>: the scroll reveal transforms each <li>, which makes it the offsetParent of
    // the link inside, so the link's own offsetTop would always read 0.
    const item = rows.current[index]?.parentElement
    const pill = highlight.current
    if (!item || !pill) return
    gsap.to(pill, {
      y: item.offsetTop,
      height: item.offsetHeight,
      autoAlpha: 1,
      duration: immediate ? 0 : 0.55,
      ease: 'expo.out',
    })
  }, [])

  useGSAP(() => moveHighlight(active, true), { dependencies: [services?.length], scope })

  // Scroll-in: the list's rules draw across, the rows rise one after another (each row's columns
  // trailing slightly behind its title), and finally the blue highlight wipes in on its row.
  useGSAP(
    () => {
      if (!services?.length) return
      const mm = gsap.matchMedia()
      mm.add({ motion: MOTION, desktop: '(min-width: 1200px)' }, (ctx) => {
        if (!ctx.conditions?.motion) return
        const list = scope.current?.querySelector('[data-svc-list]')
        const tl = gsap.timeline({ scrollTrigger: { trigger: list, start: 'top 85%', ...ONCE } })
        tl.from('[data-svc-line]', { scaleX: 0, duration: 1.4, stagger: 0.15, ease: 'expo.inOut' })
          .from('[data-svc-row]', { y: 70, autoAlpha: 0, duration: 1.1, stagger: 0.12, ease: 'expo.out' }, 0.2)
          .from('[data-svc-cell]', { y: 18, autoAlpha: 0, duration: 0.9, stagger: 0.05, ease: 'power3.out' }, 0.35)
        if (ctx.conditions.desktop && highlight.current) {
          tl.fromTo(
            highlight.current,
            { clipPath: 'inset(0% 100% 0% 0% round 16px)' },
            { clipPath: 'inset(0% 0% 0% 0% round 16px)', duration: 1, ease: 'expo.inOut', clearProps: 'clipPath' },
            0.55,
          )
        }
      })
      return () => mm.revert()
    },
    { scope, dependencies: [services?.length], revertOnUpdate: true },
  )

  const select = (i: number) => {
    setActive(i)
    moveHighlight(i)
  }

  // Desktop: a small card follows the cursor over the list, showing the hovered service. It leans
  // with the cursor's speed, and the cards inside slide vertically so moving between rows rolls
  // from one to the next.
  const preview = useRef<HTMLDivElement>(null)
  const previewApi = useRef<{ move: (e: React.PointerEvent) => void; show: (on: boolean) => void } | null>(null)
  useGSAP(
    () => {
      const el = preview.current
      if (!el || !window.matchMedia('(pointer: fine) and (min-width: 1200px)').matches) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' })
      const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' })
      const r = gsap.quickTo(el, 'rotate', { duration: 0.8, ease: 'power3.out' })
      let lastX = 0
      previewApi.current = {
        move: (e) => {
          const box = el.parentElement!.getBoundingClientRect()
          const px = e.clientX - box.left
          x(px)
          y(e.clientY - box.top)
          r(gsap.utils.clamp(-8, 8, (px - lastX) * 0.4))
          lastX = px
        },
        show: (on) =>
          gsap.to(el, { scale: on ? 1 : 0, autoAlpha: on ? 1 : 0, duration: on ? 0.5 : 0.35, ease: on ? 'back.out(1.6)' : 'power3.in', overwrite: 'auto' }),
      }
      return () => {
        previewApi.current = null
      }
    },
    { scope, dependencies: [services?.length] },
  )
  useGSAP(
    () => {
      gsap.to('[data-svc-preview-track]', { yPercent: -100 * active, duration: 0.7, ease: 'expo.out' })
    },
    { scope, dependencies: [active] },
  )

  return (
    <>
    <section ref={scope} className="container-site pt-16 pb-12 lg:pt-[160px] lg:pb-[120px]">
      <SectionIntro label={section.label} title={section.title} cta={section.cta} />

      {isPending ? (
        <Skeleton className="mt-6 h-80 lg:mt-[100px]" />
      ) : (
        <div
          data-svc-list
          className="relative mt-6 lg:mt-[100px]"
          onPointerMove={(e) => e.pointerType === 'mouse' && previewApi.current?.move(e)}
          onPointerEnter={(e) => e.pointerType === 'mouse' && previewApi.current?.show(true)}
          onPointerLeave={() => previewApi.current?.show(false)}
        >
          {/* Hover card (desktop, mouse): one slide per service, rolled to the active one. */}
          <div
            ref={preview}
            aria-hidden
            style={{ transform: 'scale(0)', visibility: 'hidden' }}
            className="pointer-events-none absolute top-0 left-0 z-20 -mt-[230px] ml-8 hidden aspect-[4/3] w-[260px] overflow-hidden rounded-2xl shadow-[0_20px_50px_-20px_rgba(0,4,54,0.45)] lg:block"
          >
            {/* The track is one card tall; its slides overflow below, so yPercent -100 = one slide. */}
            <div data-svc-preview-track className="flex size-full flex-col">
              {previews?.map((p, i) => (
                <ProjectCover key={i} project={p} sizes="260px" className="size-full shrink-0" />
              ))}
            </div>
          </div>
          {/* Top and bottom rules are elements of their own so they can draw in. */}
          <span data-svc-line aria-hidden className="absolute inset-x-0 top-0 hidden h-px origin-left bg-line lg:block" />
          <span data-svc-line aria-hidden className="absolute inset-x-0 bottom-0 hidden h-px origin-left bg-line lg:block" />
          <div
            ref={highlight}
            aria-hidden
            className="pointer-events-none invisible absolute inset-x-0 top-0 hidden rounded-2xl bg-blue lg:block"
          />
          <ul className="relative flex flex-col gap-2 lg:gap-0">
            {services?.map((service, i) => {
              const isActive = i === active
              return (
                <li key={service.documentId}>
                  <Link
                    ref={(el) => {
                      rows.current[i] = el
                    }}
                    data-svc-row
                    to={service.href}
                    onMouseEnter={() => select(i)}
                    onFocus={() => select(i)}
                    className={`group grid rounded-2xl p-5 transition-colors duration-300 lg:h-[88px] lg:grid-cols-[400px_320px_minmax(0,1fr)_32px] lg:items-center lg:bg-transparent lg:px-8 lg:py-0 ${
                      isActive ? 'bg-blue text-white' : 'bg-surface lg:text-navy'
                    }`}
                  >
                    <span className="display text-base transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] lg:group-hover:translate-x-2">
                      {service.title}
                    </span>
                    <span
                      data-svc-cell
                      className={`mt-1.5 text-xs lg:mt-0 lg:text-sm lg:font-semibold ${
                        isActive ? 'text-white' : 'text-gray lg:text-muted'
                      }`}
                    >
                      {service.category}
                    </span>
                    <span data-svc-cell className={`mt-2 text-sm lg:mt-0 lg:font-medium ${isActive ? 'text-white' : 'text-label lg:text-muted'}`}>
                      {service.shortDescription}
                    </span>
                    <ArrowIcon
                      direction="up-right"
                      className={`hidden justify-self-end transition-[opacity,transform] duration-500 lg:block lg:group-hover:translate-x-0.5 lg:group-hover:-translate-y-0.5 ${isActive ? 'opacity-100' : 'opacity-0'}`}
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
    </>
  )
}

// ---------- Work (Figma: Card / Work stack + Control / Slider) ----------
/**
 * Background turn: as the section scrolls in, a navy field opens from a rounded inset to full bleed
 * and the section's colour tokens flip to dark (see `.tone` in index.css), so the work is shown on a
 * dark stage. Leaving, it folds back into a card that steps away while the testimonial card opens.
 */
function FeaturedWork({ section }: { section: FeaturedProjectsSection }) {
  const scope = useRef<HTMLElement>(null)
  const { data: projects, isPending } = useProjects({ featured: true, limit: section.limit ?? 6 })
  useReveal(scope, [projects?.length])

  useGSAP(
    () => {
      const el = scope.current
      if (!el) return
      const mm = gsap.matchMedia()
      mm.add({ motion: MOTION, desktop: '(min-width: 1200px)' }, (ctx) => {
        if (!ctx.conditions?.motion) return
        const desktop = ctx.conditions.desktop
        const cardOut = desktop ? 'inset(0% 4% 12% 4% round 40px)' : 'inset(0% 3% 8% 3% round 24px)'
        const full = 'inset(0% 0% 0% 0% round 0px)'

        // No entrance of its own: the screen has already turned navy at the end of the statement
        // (see Statement), so this section simply continues it.
        // Leaving, the field folds back into a rounded card and steps away, just as the testimonial
        // card below starts to open: one card closes, the next one opens.
        gsap.fromTo(
          '[data-work-bg]',
          { clipPath: full, scale: 1 },
          {
            clipPath: cardOut,
            scale: 0.96,
            transformOrigin: '50% 100%',
            ease: 'power2.inOut',
            immediateRender: false,
            scrollTrigger: { trigger: el, start: 'bottom 85%', end: 'bottom 25%', scrub: 0.8 },
          },
        )
        // Text and controls turn light while the field covers them.
        ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom 30%', toggleClass: { targets: el, className: 'tone-dark' } })

        // The stack itself assembles from the manifesto's capsules (WorkStack `intro`).
      })
      return () => mm.revert()
    },
    { scope, dependencies: [projects?.length], revertOnUpdate: true },
  )

  return (
    // Starts dark (reduced motion / before JS); the scroll trigger takes the class over.
    <section ref={scope} className="tone tone-dark relative pt-16 pb-20 lg:pt-[120px] lg:pb-[140px]">
      {/* Literal navy: the token itself flips inside the dark tone. */}
      <div data-work-bg aria-hidden className="absolute inset-0 bg-[#000436]" />
      <div className="relative container-site">
        <SectionIntro label={section.label} title={section.title} cta={section.cta} />
        {/* Desktop: title, stack and arrows fit one screen; the stack scales down on shorter screens
            (its height is what's left of the viewport after the title, caption and arrows). */}
        <div
          data-work-stage
          className="mt-10 lg:mx-auto lg:mt-28 lg:max-w-[min(660px,calc((100svh-var(--header-h)-400px)*1.535))]"
        >
          {isPending ? (
            <Skeleton className="mx-auto aspect-660/430 max-w-[660px]" />
          ) : projects?.length ? (
            <WorkStack projects={projects} intro />
          ) : null}
        </div>
      </div>
    </section>
  )
}

/**
 * Stacked cards: the front card is the current project, the two behind it are shown as grey plates
 * (as in the design). Arrows (or ←/→ keys) cycle through the stack.
 */
export function WorkStack({
  projects,
  layout = 'center',
  label = 'Selected work',
  intro = false,
}: {
  projects: ProjectSummary[]
  /** 'center' = home page (controls centred below); 'side' = Work Detail "Next project" (controls top-right). */
  layout?: 'center' | 'side'
  label?: string
  /** Home: the stack assembles itself from the manifesto's three capsules as it scrolls in. */
  intro?: boolean
}) {
  const side = layout === 'side'
  const scope = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [captionIndex, setCaptionIndex] = useState(0)
  const previous = useRef(index)
  const n = projects.length
  const current = projects[captionIndex] ?? projects[index]
  const isDesktop = useMediaQuery('(min-width: 1200px)')

  // Slot 0 = front, 1-2 = plates behind (desktop only, as in the design), 3+ = hidden at the back.
  const slotStyle = (slot: number) => {
    // x: 0 also brings back a card that was dragged (see the Draggable below).
    if (slot === 0) return { x: 0, y: 0, scale: 1, autoAlpha: 1, zIndex: 30, plate: 0 }
    if (!isDesktop) return { x: 0, y: 0, scale: 1, autoAlpha: 0, zIndex: 0, plate: 0 }
    if (slot === 1) return { x: 0, y: -30, scale: 580 / 660, autoAlpha: 1, zIndex: 20, plate: 1 }
    if (slot === 2) return { x: 0, y: -50, scale: 500 / 660, autoAlpha: 1, zIndex: 10, plate: 1 }
    return { x: 0, y: -50, scale: 500 / 660, autoAlpha: 0, zIndex: 0, plate: 1 }
  }

  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>('[data-stack-card]')
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      // Rapid clicks: stop every card motion still running (a card mid-throw, a delayed slot move)
      // before starting the new one, so a stale tween can never land a card in a wrong or hidden
      // state afterwards. Each card then goes to its new place from wherever it is right now.
      gsap.killTweensOf(cards)
      gsap.killTweensOf(cards.map((c) => c.querySelector('[data-plate]')))
      // Only a real navigation (not the first render) sends the old front card away.
      const navigated = previous.current !== index
      previous.current = index
      cards.forEach((card, i) => {
        const slot = (i - index + n) % n
        const { plate, zIndex, ...pos } = slotStyle(slot)
        // Next: the old front card is thrown off to the right. Previous: the card that comes back
        // to the front slides in from the left, over the stack.
        const leaving = navigated && direction === 1 && slot === n - 1 && n > 1
        const entering = navigated && direction === -1 && slot === 0 && n > 1
        const overlay = card.querySelector('[data-plate]')
        gsap.set(card, { zIndex: leaving || entering ? 40 : zIndex })
        if (reduced) {
          gsap.set(card, { ...pos, xPercent: 0, rotate: 0 })
          gsap.set(overlay, { autoAlpha: plate })
          return
        }
        if (leaving) {
          // Off to the right, then quietly back to the rear of the stack.
          gsap
            .timeline()
            .to(card, { xPercent: 115, rotate: 6, autoAlpha: 0, duration: 0.6, ease: 'power3.in', overwrite: true })
            .set(card, { ...pos, xPercent: 0, rotate: 0, zIndex })
            .set(overlay, { autoAlpha: plate })
        } else if (entering) {
          // In from the left, landing on top of the stack.
          gsap.set(overlay, { autoAlpha: 0 })
          gsap.fromTo(
            card,
            { xPercent: -115, y: 0, scale: 1, rotate: -6, autoAlpha: 0 },
            {
              ...pos,
              xPercent: 0,
              rotate: 0,
              duration: 0.9,
              ease: 'expo.out',
              overwrite: true,
              onComplete: () => void gsap.set(card, { zIndex }),
            },
          )
        } else {
          gsap.to(card, { ...pos, xPercent: 0, rotate: 0, duration: 0.9, ease: 'expo.out', delay: direction === 1 ? 0.15 : 0 })
          gsap.to(overlay, { autoAlpha: plate, duration: 0.6, delay: direction === 1 ? 0.15 : 0 })
        }
      })
    },
    { scope, dependencies: [index, n, isDesktop] },
  )

  // ---- Intro (home): "from the sentence to the work" ----
  // The three capsules from the manifesto (look · reason · years = the three projects of the stack)
  // appear in a row in the middle of the stage, then, with the scroll, grow and settle into the stack:
  // the middle one becomes the front card, the other two step back into the plates behind it and
  // take their grey. The real stack then takes over seamlessly.
  /** Ends the intro for good: capsules gone, the real stack shown (also on the first interaction). */
  const finishIntro = useRef<() => void>(() => {})
  const indexRef = useRef(index)
  useEffect(() => {
    indexRef.current = index
  }, [index])
  const introCaps = intro ? [1, 0, 2].map((slot) => ({ slot, project: projects[slot % n] })).filter((c, i, all) => n > 2 || all.findIndex((d) => d.project === c.project) === i) : []
  useGSAP(
    () => {
      if (!intro || !introCaps.length) return
      const box = scope.current?.querySelector<HTMLElement>('[data-stack-box]')
      if (!box) return
      const mm = gsap.matchMedia()
      mm.add({ motion: MOTION, desktop: '(min-width: 1200px)' }, (ctx) => {
        if (!ctx.conditions?.motion) return
        const W = ctx.conditions.desktop ? 132 : 92
        const H = Math.round(W * 0.46)
        const GAP = ctx.conditions.desktop ? 18 : 10
        const cards = gsap.utils.toArray<HTMLElement>('[data-stack-card]')
        const caps = gsap.utils.toArray<HTMLElement>('[data-cap]')
        // Where a card of a given slot sits now (its own slot transform included), in box coordinates.
        const target = (slot: number) => {
          const card = cards[(indexRef.current + slot) % cards.length]
          const r = card.getBoundingClientRect()
          const b = box.getBoundingClientRect()
          const shown = Number(getComputedStyle(card).opacity) > 0.01
          return { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height, shown }
        }
        let done = false
        const tl = gsap.timeline({
          defaults: { ease: 'power3.inOut' },
          scrollTrigger: { trigger: box, start: 'top 88%', end: 'center 52%', scrub: 0.8, invalidateOnRefresh: true },
          // One way only: once it has played through, it never runs (or rewinds) again.
          onUpdate: () => {
            if (tl.progress() >= 0.999) finishIntro.current()
          },
        })
        finishIntro.current = () => {
          if (done) return
          done = true
          tl.scrollTrigger?.kill()
          tl.kill()
          gsap.set(caps, { visibility: 'hidden' })
          gsap.set(box.querySelector('[data-stack-cards]'), { opacity: 1 })
        }
        caps.forEach((cap) => {
          const row = Number(cap.dataset.row)
          const slot = Number(cap.dataset.slot)
          const plate = cap.querySelector('[data-cap-plate]')
          // 1. Pops into the row, one after another (left to right, like reading the sentence).
          tl.fromTo(
            cap,
            {
              x: () => box.offsetWidth / 2 + (row - 1) * (W + GAP) - W / 2,
              y: () => box.offsetHeight / 2 - H / 2,
              width: W,
              height: H,
              borderRadius: H / 2,
              scale: 0.5,
              opacity: 0,
            },
            { scale: 1, opacity: 1, duration: 0.16, ease: 'back.out(1.7)' },
            row * 0.05,
          )
          // 2. Grows into its place in the stack, all three together, the front card leading a touch.
          tl.to(
            cap,
            {
              x: () => target(slot).x,
              y: () => target(slot).y,
              width: () => target(slot).w,
              height: () => target(slot).h,
              borderRadius: 18,
              opacity: () => (target(slot).shown ? 1 : 0),
              duration: 0.55,
            },
            0.28 + slot * 0.03,
          )
          // 3. The plates take their grey as they settle behind the front card.
          if (slot > 0 && plate) tl.fromTo(plate, { opacity: 0 }, { opacity: 1, duration: 0.18, ease: 'none' }, 0.72)
        })
        // 4. Hand-over to the real, interactive stack: an instant swap, invisible since the
        //    capsules now sit exactly where (and as) the cards are. A short rest follows.
        tl.fromTo('[data-stack-cards]', { opacity: 0 }, { opacity: 1, duration: 0.001, ease: 'none' }, 0.95)
          .fromTo(caps, { visibility: 'inherit' }, { visibility: 'hidden', duration: 0.001, ease: 'none' }, 0.95)
          .to({}, { duration: 0.08 }, 0.95)
      })
      return () => mm.revert()
    },
    { scope, dependencies: [intro, n], revertOnUpdate: true },
  )

  // The front card can be dragged sideways and thrown: past a third of a card it flies off (right =
  // next, left = previous); short of that it springs back. A drag never counts as a click.
  const dragged = useRef(false)
  const goRef = useRef<(step: 1 | -1) => void>(() => {})
  useGSAP(
    () => {
      if (n < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const card = gsap.utils.toArray<HTMLElement>('[data-stack-card]')[index]
      if (!card) return
      const [drag] = Draggable.create(card, {
        type: 'x',
        dragClickables: true,
        minimumMovement: 6,
        zIndexBoost: false,
        onDragStart() {
          finishIntro.current()
          dragged.current = true
          // PageTransition ignores links marked like this, so releasing never navigates.
          card.setAttribute('data-no-transition', '')
          gsap.to(cursor.current, { scale: 0.8, duration: 0.3, overwrite: 'auto' })
        },
        onDrag() {
          gsap.set(card, { rotate: this.x / 30 })
        },
        onRelease() {
          const x = this.x as number
          const release = () =>
            setTimeout(() => {
              card.removeAttribute('data-no-transition')
              dragged.current = false
            }, 60)
          if (!dragged.current) return
          if (Math.abs(x) > card.offsetWidth / 3) goRef.current(x > 0 ? 1 : -1)
          else gsap.to(card, { x: 0, rotate: 0, duration: 0.9, ease: 'elastic.out(1, 0.55)' })
          gsap.to(cursor.current, { scale: 1, duration: 0.3, overwrite: 'auto' })
          release()
        },
      })
      return () => drag?.kill()
    },
    { scope, dependencies: [index, n] },
  )

  // Custom "View" cursor over the cards (fine pointers only; touch keeps the normal tap).
  const cursor = useRef<HTMLSpanElement>(null)
  const moveCursor = (e: React.PointerEvent<HTMLDivElement>, enter = false) => {
    if (e.pointerType !== 'mouse' || !cursor.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (enter) gsap.set(cursor.current, { x, y })
    gsap.to(cursor.current, { x, y, scale: 1, duration: enter ? 0.4 : 0.35, ease: 'power3.out', overwrite: 'auto' })
  }
  const hideCursor = () => cursor.current && gsap.to(cursor.current, { scale: 0, duration: 0.3, ease: 'power3.in', overwrite: 'auto' })

  const go = (step: 1 | -1) => {
    finishIntro.current()
    const nextIndex = (index + step + n) % n
    setDirection(step)
    setIndex(nextIndex)
    // The cards move at once; the captions roll up and out, swap their text, then roll in from below.
    const captions = scope.current?.querySelectorAll('[data-stack-caption]')
    if (!captions?.length) return setCaptionIndex(nextIndex)
    gsap.to(captions, {
      autoAlpha: 0,
      y: -10,
      duration: 0.25,
      ease: 'power2.in',
      overwrite: true,
      onComplete: () => {
        setCaptionIndex(nextIndex)
        gsap.fromTo(captions, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' })
      },
    })
  }
  useEffect(() => {
    goRef.current = go
  })


  return (
    <div
      ref={scope}
      className={side ? 'flex items-start justify-between gap-8' : 'mx-auto max-w-[660px]'}
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(1)
        if (e.key === 'ArrowLeft') go(-1)
      }}
    >
      <div className={side ? 'w-full max-w-[660px]' : ''}>
      <div
        data-stack-box
        className={`relative aspect-660/430 pointer-fine:cursor-none ${side ? 'lg:mt-10' : 'lg:mt-[50px]'}`}
        onPointerEnter={(e) => moveCursor(e, true)}
        onPointerMove={(e) => moveCursor(e)}
        onPointerLeave={() => hideCursor()}
      >
        <span
          ref={cursor}
          aria-hidden
          style={{ transform: 'scale(0)' }}
          className="pointer-events-none absolute top-0 left-0 z-50 -mt-10 -ml-10 hidden size-20 items-center justify-center rounded-full bg-blue text-sm font-medium text-[#fff] pointer-fine:flex"
        >
          View
        </span>
        <div data-stack-cards className="absolute inset-0">
        {projects.map((project, i) => (
          <Link
            key={project.documentId}
            data-stack-card
            data-cover={project.cover?.url ?? undefined}
            to={`/work/${project.slug}`}
            onClick={(e) => dragged.current && e.preventDefault()}
            draggable={false}
            tabIndex={i === index ? 0 : -1}
            aria-hidden={i !== index}
            className="group/card absolute inset-0 origin-top overflow-hidden rounded-[18px] bg-surface will-change-transform pointer-fine:cursor-none"
          >
            <ProjectCover
              project={project}
              sizes="(min-width: 1200px) 660px, 100vw"
              className="size-full transition-transform duration-[1200ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover/card:scale-[1.04]"
            />
            {/* Grey plate shown while the card waits behind the front one */}
            <span data-plate aria-hidden className={`absolute inset-0 ${(i - index + n) % n === 1 ? 'bg-stack-2' : 'bg-stack-1'}`} />
          </Link>
        ))}
        </div>
        {/* Intro capsules (home): drawn above the stack, gone once it takes over. */}
        {introCaps.map(({ slot, project }, row) => (
          <div
            key={`cap-${slot}`}
            data-cap
            data-row={row}
            data-slot={slot}
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 overflow-hidden opacity-0 motion-reduce:hidden"
            style={{ zIndex: 45 - slot }}
          >
            <ProjectCover project={project} sizes="(min-width: 1200px) 660px, 100vw" className="size-full" />
            <span data-cap-plate aria-hidden className={`absolute inset-0 opacity-0 ${slot === 1 ? 'bg-stack-2' : 'bg-stack-1'}`} />
          </div>
        ))}
      </div>

      <div data-stack-caption aria-live="polite" className="mt-2 flex items-start justify-between text-sm lg:mt-2">
        <div>
          <p className="font-medium text-navy lg:font-normal lg:text-ink-soft">{current.title}</p>
          {current.category && <p className="text-xs text-label lg:text-sm lg:text-muted-2">{current.category}</p>}
        </div>
        {current.year && <p className="pt-2 text-xs text-label lg:pt-0 lg:text-sm lg:text-muted-2">{current.year}</p>}
      </div>

      </div>

      {n > 1 && (
        <div className={side ? 'hidden shrink-0 lg:mt-10 lg:block' : 'mt-6 flex lg:mt-8 lg:justify-center'}>
          <div className="inline-flex gap-1 rounded-full bg-surface p-1">
            <StackButton label="Previous project" onClick={() => go(-1)} direction="left" />
            <StackButton label="Next project" onClick={() => go(1)} direction="right" />
          </div>
        </div>
      )}
    </div>
  )
}

function StackButton({ label, onClick, direction }: { label: string; onClick: () => void; direction: 'left' | 'right' }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex size-10 items-center justify-center rounded-full bg-white text-gray shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-colors hover:bg-navy hover:text-white"
    >
      <ArrowIcon direction={direction} />
    </button>
  )
}

// ---------- Testimonials (Figma: Testimonial / Row 2) ----------
const SLIDE_SECONDS = 6

export function Testimonials({ testimonials, background }: { testimonials: Testimonial[]; background?: string | null }) {
  const scope = useRef<HTMLElement>(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const n = testimonials.length
  const t = testimonials[index]
  const bg = mediaUrl(background) ?? '/assets/testimonial-bg.jpg'

  // Fade the current quote out, then switch; the effect below fades the new one in.
  const show = (i: number) => {
    if (i === index) return
    const quote = scope.current?.querySelector('[data-testi-quote]')
    if (!quote) return setIndex(i)
    gsap.to(quote, { autoAlpha: 0, y: -10, duration: 0.3, ease: 'power2.in', overwrite: true, onComplete: () => setIndex(i) })
  }

  // Scroll story: the section pins with only the painted background showing; scrolling on settles
  // the background and lifts the testimonial card into place. Autoplay starts once it has landed.
  const [revealed, setRevealed] = useState(false)
  const revealedRef = useRef(false)
  useGSAP(
    () => {
      const box = scope.current?.querySelector<HTMLElement>('[data-testi-box]')
      if (!box) return
      const mark = (value: boolean) => {
        if (revealedRef.current === value) return
        revealedRef.current = value
        setRevealed(value)
      }
      const mm = gsap.matchMedia()
      mm.add(MOTION, () => {
        gsap
          .timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: box,
              // Centre the box in the area below the sticky header, so the header never overlaps it.
              start: () => {
                const header = document.querySelector('header')?.offsetHeight ?? 0
                return `center ${header + (window.innerHeight - header) / 2}px`
              },
              end: '+=160%',
              pin: scope.current,
              scrub: 0.8,
              invalidateOnRefresh: true,
              // Hysteresis: lingering around the threshold must not toggle autoplay on and off.
              onUpdate: (self) => {
                if (self.progress > 0.72) mark(true)
                else if (self.progress < 0.5) mark(false)
              },
            },
          })
          // "Dawn": the scene opens from a slightly inset card to full size while the painting comes
          // out of the navy it inherits from the card above, like light rising…
          .fromTo(
            box,
            { clipPath: () => (window.innerWidth >= 1200 ? 'inset(14% 9% 14% 9% round 40px)' : 'inset(10% 6% 10% 6% round 28px)') },
            { clipPath: 'inset(0% 0% 0% 0% round 24px)', duration: 0.6, ease: 'power2.inOut' },
            0,
          )
          .fromTo('[data-testi-veil]', { opacity: 1 }, { opacity: 0, duration: 0.55, ease: 'sine.inOut' }, 0.1)
          // Shifted up towards the painting's saturated lower part, so the small card already shows
          // colour. (yPercent stays below the zoom's overflow at every point: no edge ever shows.)
          .fromTo('[data-testi-bg]', { scale: 1.5, yPercent: -24 }, { scale: 1, yPercent: 0, duration: 0.75, ease: 'power1.out' }, 0)
          // …then the white card is unveiled from the bottom up as it settles, and its words follow.
          .fromTo(
            '[data-testi-card]',
            { y: 60, autoAlpha: 1, clipPath: 'inset(100% 0% 0% 0% round 16px)' },
            { y: 0, autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0% round 16px)', duration: 0.38, ease: 'power3.inOut' },
            0.48,
          )
          .fromTo('[data-testi-quote] > *', { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.08, ease: 'power3.out' }, 0.62)
          .fromTo('[data-testi-bars]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 }, 0.9)
          // Rest: hold the finished scene for the last stretch of the pin, so the scrub has caught up
          // and everything is still before the section is released and scrolls on.
          .to({}, { duration: 0.35 })
      })
      mm.add('(prefers-reduced-motion: reduce)', () => mark(true))
      return () => mm.revert()
    },
    { scope },
  )

  // A new quote fades in only when the slide actually changes (never on hover, pause or reveal).
  const shownIndex = useRef(index)
  useEffect(() => {
    if (shownIndex.current === index) return
    shownIndex.current = index
    const quote = scope.current?.querySelector('[data-testi-quote]')
    if (!quote) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(quote, { autoAlpha: 1, y: 0 })
      return
    }
    gsap.fromTo(quote, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'expo.out', overwrite: true })
  }, [index])

  // Progress bar fills over SLIDE_SECONDS, then advances. One tween per slide: pausing (hover/focus)
  // freezes it where it is instead of rebuilding it, so nothing jumps or restarts.
  const barTween = useRef<gsap.core.Tween | null>(null)
  const showRef = useRef(show)
  useEffect(() => {
    showRef.current = show
  })
  useEffect(() => {
    if (n < 2 || !revealed || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const bar = scope.current?.querySelector(`[data-testi-bar="${index}"]`)
    if (!bar) return
    const tween = gsap.fromTo(
      bar,
      { scaleX: 0 },
      { scaleX: 1, duration: SLIDE_SECONDS, ease: 'none', onComplete: () => showRef.current((index + 1) % n) },
    )
    barTween.current = tween
    return () => {
      tween.kill()
      barTween.current = null
    }
  }, [index, revealed, n])
  useEffect(() => {
    if (paused) barTween.current?.pause()
    else barTween.current?.resume()
  }, [paused, index, revealed])

  if (!t) return null

  return (
    <section
      ref={scope}
      aria-roledescription="carousel"
      aria-label="Client testimonials"
      className="px-5"
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        data-testi-box
        className="relative mx-auto flex h-[calc(100svh-var(--header-h)-24px)] max-w-[1400px] items-end overflow-hidden rounded-3xl p-4 lg:h-[min(983px,calc(100svh-var(--header-h)-40px))] lg:items-center lg:justify-center lg:p-0"
      >
        <img
          data-testi-bg
          src={bg}
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 size-full object-cover will-change-transform"
        />
        {/* Navy veil the painting emerges from as the scene opens (motion only). */}
        <div data-testi-veil aria-hidden className="pointer-events-none absolute inset-0 bg-[#000436] opacity-0" />
        <div
          data-testi-card
          className="relative w-full will-change-transform lg:w-[640px]"
          onPointerEnter={(e) => e.pointerType === 'mouse' && setPaused(true)}
          onPointerLeave={() => setPaused(false)}
        >
        <figure
          data-testi-quote
          className="flex w-full flex-col rounded-2xl bg-white p-6 lg:min-h-[min(719px,calc(100svh-var(--header-h)-180px))] lg:justify-between lg:p-[60px]"
        >
          <blockquote className="text-2xl leading-[1.25] lg:text-5xl lg:leading-[1.2]">“{t.quote}”</blockquote>
          <figcaption className="mt-8 flex items-center gap-3.5">
            {t.avatar && <StrapiImage media={t.avatar} fallbackAlt={t.authorName} className="size-10 rounded-full lg:size-11" sizes="44px" />}
            <div>
              <p className="text-sm font-medium lg:font-semibold lg:text-black">{t.authorName}</p>
              <p className="text-xs text-gray-2 uppercase lg:text-[10px]">{[t.authorRole, t.client?.name].filter(Boolean).join(' · ')}</p>
            </div>
          </figcaption>
        </figure>
        </div>

        {n > 1 && (
          <div data-testi-bars className="absolute inset-x-0 bottom-7 hidden justify-center gap-3 lg:flex">
            {testimonials.map((item, i) => (
              // The visible bar is 3px; the button around it gives a 27px-tall touch target.
              <button
                key={item.documentId}
                type="button"
                aria-label={`Show testimonial ${i + 1}`}
                aria-current={i === index}
                onClick={() => show(i)}
                className="py-3"
              >
                <span className="relative block h-[3px] w-[52px] overflow-hidden rounded-full bg-white/40">
                  <span
                    data-testi-bar={i}
                    className="absolute inset-0 origin-left rounded-full bg-white"
                    style={{ transform: `scaleX(${i < index ? 1 : 0})` }}
                  />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// ---------- FAQ (Figma: FAQs accordion) ----------
export function Faq({ section }: { section: FaqSection }) {
  const scope = useRef<HTMLElement>(null)
  useReveal(scope)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION, () => {
        // Rows that enter the viewport together are batched: each draws its top rule from the left,
        // then its question rises — one row after another, in reading order.
        const rows = gsap.utils.toArray<HTMLElement>('[data-faq-row]')
        if (!rows.length) return
        gsap.set(rows.map((r) => r.querySelector('[data-faq-line]')), { scaleX: 0 })
        gsap.set(rows.map((r) => r.querySelector('[data-faq-question]')), { autoAlpha: 0, y: 24 })
        // No `once: true` (see ONCE in lib/gsap): the triggers stay alive and each row plays only the
        // first time it is reached.
        const shown = new Set<Element>()
        const play = (entered: Element[]) => {
          const batch = entered.filter((r) => !shown.has(r))
          if (!batch.length) return
          batch.forEach((r) => shown.add(r))
          const lines = batch.map((r) => r.querySelector('[data-faq-line]'))
          const questions = batch.map((r) => r.querySelector('[data-faq-question]'))
          gsap
            .timeline()
            .to(lines, { scaleX: 1, duration: 1.1, stagger: 0.09, ease: 'expo.out' })
            .to(
              questions,
              { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.09, ease: 'power3.out', clearProps: 'transform' },
              0.12,
            )
        }
        // onLeave covers rows that were jumped past (anchor link, restored scroll position).
        ScrollTrigger.batch(rows, { start: 'top 90%', onEnter: play, onLeave: play })
      })
      return () => mm.revert()
    },
    { scope, dependencies: [section.items.length], revertOnUpdate: true },
  )
  return (
    <section ref={scope} className="container-site py-12 lg:pt-[120px] lg:pb-[100px]">
      <SectionIntro label={section.label} title={section.title} />
      <div className="section-grid mt-6 lg:mt-12">
        <span className="hidden lg:block" />
        <ul className="border-b border-line">
          {section.items.map((item) => (
            <FaqRow key={item.id} question={item.question} answer={item.answer} />
          ))}
        </ul>
      </div>
    </section>
  )
}

function FaqRow({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    const el = panel.current
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    gsap.to(el, { height: open ? 'auto' : 0, duration: reduced ? 0 : 0.5, ease: 'expo.out', overwrite: 'auto' })
    // Opening also lets the answer's paragraphs rise one after another.
    if (open && !reduced) {
      gsap.fromTo(
        el.querySelectorAll('p'),
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.07, delay: 0.08, ease: 'power3.out', overwrite: true, clearProps: 'transform' },
      )
    }
  }, [open])

  return (
    <li data-faq-row className="relative">
      {/* The row's top rule is its own element so it can draw in from the left. */}
      <span data-faq-line aria-hidden className="absolute inset-x-0 top-0 h-px origin-left bg-line" />
      <h3 data-faq-question>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="group flex w-full items-center justify-between gap-6 py-4 text-left text-sm leading-[18px] transition-colors duration-300 hover:text-blue"
        >
          <span className="transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:translate-x-2">{question}</span>
          <span
            aria-hidden
            className={`text-sm font-medium text-gray transition-transform duration-300 ${open ? 'rotate-45' : ''}`}
          >
            +
          </span>
        </button>
      </h3>
      <div id={id} ref={panel} role="region" className="h-0 overflow-hidden" aria-hidden={!open}>
        {/* Answers come from a Strapi text field: a blank line starts a new paragraph. */}
        <div className="flex max-w-[640px] flex-col gap-3 pb-5 text-sm leading-relaxed text-label">
          {answer
            .split(/\n\s*\n/)
            .map((para) => para.trim())
            .filter(Boolean)
            .map((para, i) => (
              <p key={i} className="whitespace-pre-line">
                {para}
              </p>
            ))}
        </div>
      </div>
    </li>
  )
}

// ---------- Process (Figma Services: "How we work" navy card) ----------
export function Process({ section }: { section: ProcessSection }) {
  const scope = useRef<HTMLElement>(null)
  // dark = navy card (Services "How we work"); light = grey card (Products "Why our products").
  const light = section.variant === 'light'
  const numbered = section.numbered !== false
  useReveal(scope)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION, () => {
        const card = scope.current?.querySelector<HTMLElement>('[data-process-card]')
        if (light || !card) {
          // Light card: opens out from slightly inset as it scrolls in.
          gsap.fromTo(
            '[data-process-card]',
            { clipPath: 'inset(6% 4% 6% 4% round 24px)' },
            {
              clipPath: 'inset(0% 0% 0% 0% round 24px)',
              // Eased, so the reveal settles (zero velocity) instead of stopping dead mid-scroll.
              ease: 'power1.inOut',
              scrollTrigger: { trigger: scope.current, start: 'top 90%', end: 'top 30%', scrub: 0.6 },
            },
          )
        } else {
          // Dark card: it arrives as a small capsule in the brand blue (an echo of the highlighted
          // service row just above), widens into the full card and deepens to navy as it opens; the
          // content comes in once there is room for it.
          const open = gsap.timeline({
            defaults: { ease: 'power2.inOut' },
            scrollTrigger: { trigger: scope.current, start: 'top 95%', end: 'top 25%', scrub: 0.8 },
          })
          open
            .fromTo(
              card,
              { clipPath: 'inset(38% 34% 38% 34% round 999px)', backgroundColor: '#4671ff' },
              { clipPath: 'inset(0% 0% 0% 0% round 24px)', duration: 1 },
              0,
            )
            .fromTo(card, { backgroundColor: '#4671ff' }, { backgroundColor: '#000436', duration: 0.7, ease: 'sine.inOut' }, 0.3)
            .fromTo(card.children, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0.6)
        }
        // …then the steps follow the scroll one after another: each rule draws across and its text
        // rises out of a dim state, so the process reads as a sequence while the card passes by.
        const steps = gsap.utils.toArray<HTMLElement>('[data-process-step]')
        const tl = gsap.timeline({
          defaults: { ease: 'power2.out' },
          // Dark (stepper): on desktop the card is held in the middle of the screen while the route
          // is walked, so each step gets a calm stretch of scroll; elsewhere a long scrubbed range.
          scrollTrigger: light
            ? { trigger: '[data-process-steps]', start: 'top 90%', end: 'bottom 60%', scrub: 0.8 }
            : window.matchMedia('(min-width: 1200px)').matches
              ? {
                  trigger: scope.current,
                  start: () => {
                    const header = document.querySelector('header')?.offsetHeight ?? 0
                    return `center ${header + (window.innerHeight - header) / 2}px`
                  },
                  end: '+=180%',
                  pin: true,
                  scrub: 1.2,
                  invalidateOnRefresh: true,
                }
              : { trigger: '[data-process-steps]', start: 'top 85%', end: 'bottom 15%', scrub: 1.2 },
        })
        if (light) {
          steps.forEach((step, i) => {
            tl.fromTo(step.querySelector('[data-step-line]'), { scaleX: 0 }, { scaleX: 1, duration: 1 }, i * 0.6).fromTo(
              step.querySelectorAll('[data-step-text]'),
              { autoAlpha: 0.12, y: 28 },
              { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08 },
              i * 0.6 + 0.2,
            )
          })
        } else {
          // Stepper: one step is "current" at a time. Its marker pops in and swells with a halo, the
          // progress line runs on from it towards the next stop, and its text rises into full light;
          // when the next step takes over, the previous one settles as done (marker back to size,
          // text half lit). At the end of the route every step comes back to full light.
          steps.forEach((step, i) => {
            const at = i
            const dot = step.querySelector('[data-step-dot]')
            const halo = step.querySelector('[data-step-halo]')
            const texts = step.querySelectorAll('[data-step-text]')
            if (dot) tl.fromTo(dot, { scale: 0 }, { scale: 1.5, duration: 0.3, ease: 'back.out(3)' }, at)
            if (halo) tl.fromTo(halo, { scale: 0.4, opacity: 0.9 }, { scale: 2.6, opacity: 0, duration: 0.7, ease: 'power2.out' }, at + 0.05)
            tl.fromTo(step.querySelector('[data-step-line]'), { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'power1.inOut' }, at + 0.1)
              .fromTo(texts, { autoAlpha: 0.12, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.06 }, at + 0.15)
            if (i < steps.length - 1) {
              if (dot) tl.to(dot, { scale: 1, duration: 0.3, ease: 'power2.out' }, at + 1)
              tl.to(texts, { autoAlpha: 0.5, duration: 0.3, ease: 'power1.out' }, at + 1)
            }
          })
          const end = steps.length
          tl.to(gsap.utils.toArray('[data-step-dot]'), { scale: 1, duration: 0.3 }, end).to(
            steps.flatMap((st) => gsap.utils.toArray<HTMLElement>(st.querySelectorAll('[data-step-text]'))),
            { autoAlpha: 1, duration: 0.4, ease: 'power1.out' },
            end,
          )
        }
        // Rest at the end so the last step settles before the scrub runs out.
        tl.to({}, { duration: 0.3 })
      })
      return () => mm.revert()
    },
    { scope },
  )

  return (
    <section ref={scope} className="container-site py-6 lg:py-5">
      <div
        data-process-card
        className={`rounded-2xl p-6 md:p-10 lg:grid ${light ? 'bg-surface text-navy' : 'bg-navy text-white'}  lg:min-h-[560px] lg:grid-cols-[290px_minmax(0,1fr)] lg:rounded-3xl lg:px-10 ${light ? 'lg:min-h-[440px] lg:pt-[72px] lg:pb-20' : 'lg:pt-[72px] lg:pb-[128px]'}`}
      >
        {section.label && (
          <p data-reveal className={`text-sm lg:pt-2 ${light ? 'text-gray' : 'text-[#a9beff]'}`}>
            <ChapterNumber className={light ? 'text-blue' : 'text-white'} />
            {section.label}
          </p>
        )}
        <div>
          <h2 data-split className="display mt-6 text-2xl lg:mt-0 lg:text-[32px]">
            {section.title}
          </h2>
          <ol
            data-process-steps
            className={`mt-6 grid gap-6 md:mt-10 md:gap-x-5 md:gap-y-10 lg:gap-5 ${light ? 'md:grid-cols-3 lg:mt-[110px]' : 'md:grid-cols-2 lg:mt-[123px] lg:grid-cols-4'}`}
          >
            {section.steps.map((step, i) => (
              <li key={step.id} data-process-step className="relative pt-4 lg:pt-5">
                {/* Dark: a dim track the progress line fills along (stepper). */}
                {!light && <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-white/15" />}
                <span data-step-line aria-hidden className={`absolute inset-x-0 top-0 h-px origin-left ${light ? 'bg-muted' : 'bg-[#a9beff]'}`} />
                {!light && (
                  <span aria-hidden className="absolute top-0 left-0 size-2.5 -translate-y-1/2">
                    <span data-step-halo className="absolute inset-0 rounded-full bg-blue opacity-0" />
                    <span data-step-dot className="absolute inset-0 rounded-full bg-blue shadow-[0_0_0_4px_rgba(70,113,255,0.25)]" />
                  </span>
                )}
                {numbered && (
                  <p data-step-text className={`text-xs lg:text-sm lg:font-medium ${light ? 'text-blue' : 'text-[#a9beff]'}`}>
                    {String(i + 1).padStart(2, '0')}
                  </p>
                )}
                <h3 data-step-text className={`display text-base ${numbered ? 'mt-1.5 lg:mt-[13px]' : ''}`}>
                  {step.title}
                </h3>
                {step.description && (
                  <p data-step-text className={`mt-1.5 text-sm lg:mt-[18px] ${light ? 'text-label' : 'text-[#d6d8f0]'} lg:pr-2.5 lg:text-base lg:leading-normal`}>
                    {step.description}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
