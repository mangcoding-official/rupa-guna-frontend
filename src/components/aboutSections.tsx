import { useRef } from 'react'
import { StrapiImage } from '@/components/StrapiImage'
import { SectionIntro, Skeleton } from '@/components/ui'
import { gsap, SplitText, useGSAP, useReveal, ONCE } from '@/lib/gsap'
import { useTeam } from '@/lib/queries'
import type { FeatureCardSection, TeamSection, ValuesSection } from '@/lib/types'

const MOTION = '(prefers-reduced-motion: no-preference)'
const EASE = 'duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)]'

// ---------- Feature card (About: "The water buffalo") ----------
/**
 * Figma "Buffalo" (183:5060 desktop, 206:1724 mobile): a brand-blue card with the label in the left
 * column, a display title and paragraph in the content column, and the orange buffalo standing on the
 * card's bottom edge at the right. On scroll the card opens gently from a slight inset and the buffalo
 * eases a short way forward (it faces right) into its place.
 */
export function FeatureCard({ section }: { section: FeatureCardSection }) {
  const scope = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      const root = scope.current
      if (!root) return
      const q = gsap.utils.selector(root)
      const mm = gsap.matchMedia()
      mm.add(MOTION, () => {
        // On About this section scrolls up out of the scene's blue, so a reveal on entry would play while
        // its content is still near the bottom of the screen. Wait until the section has come up past the
        // middle, then bring the copy in: eyebrow, the title word by word, then the paragraph.
        const title = q('[data-feature-title]')[0] as HTMLElement | undefined
        // Words, not masked lines: the display face reaches past its line box and a mask would crop it.
        const words = title ? SplitText.create(title, { type: 'words' }) : undefined
        gsap
          .timeline({
            defaults: { ease: 'power3.out' },
            scrollTrigger: { trigger: root, start: 'top 45%', once: true },
          })
          .from(q('[data-feature-label]'), { autoAlpha: 0, y: 16, duration: 0.7 })
          .from(words?.words ?? [], { autoAlpha: 0, yPercent: 45, duration: 0.9, stagger: 0.06 }, 0.1)
          .from(q('[data-feature-text], [data-feature-image]'), { autoAlpha: 0, y: 24, duration: 0.9 }, 0.45)

        // The buffalo glides in from the left once the copy is under way, settling on the bottom edge as
        // the section finishes filling the screen (eased to rest).
        const buffalo = q('[data-feature-buffalo]')
        if (buffalo.length)
          gsap.fromTo(
            buffalo,
            { xPercent: -40, autoAlpha: 0 },
            {
              xPercent: 0,
              autoAlpha: 1,
              ease: 'power2.out',
              scrollTrigger: { trigger: root, start: 'top 35%', end: 'top -10%', scrub: 0.8 },
            },
          )
        return () => words?.revert()
      })
      return () => mm.revert()
    },
    { scope },
  )

  return (
    // Full-bleed blue section: on About it continues straight out of the scene's blue.
    <section ref={scope} className="relative overflow-hidden bg-blue text-white">
      <div
        data-feature-card
        className="container-site relative flex flex-col pt-20 md:pt-24 lg:grid lg:min-h-svh lg:grid-cols-[290px_minmax(0,560px)] lg:content-start lg:pt-[140px]"
      >
        {section.label && (
          <p data-feature-label className="text-sm lg:pt-2">
            {section.label}
          </p>
        )}
        <div data-feature-copy className={`flex flex-col gap-5 ${section.label ? 'mt-4 lg:mt-0' : 'lg:col-start-2'}`}>
          <h2 data-feature-title className="display text-[28px] md:text-[40px] lg:text-[56px]">
            {section.title}
          </h2>
          {section.text && (
            <p data-feature-text className="max-w-[500px] text-base leading-normal text-white/90 lg:text-lg">
              {section.text}
            </p>
          )}
        </div>
        {section.image ? (
          <div
            data-feature-image
            className="mt-8 mb-16 overflow-hidden rounded-2xl lg:col-span-2 lg:mt-12 lg:mb-[120px] lg:ml-[290px] lg:max-w-[560px]"
          >
            <StrapiImage media={section.image} sizes="(min-width: 1200px) 560px, 100vw" className="aspect-302/220 w-full" />
          </div>
        ) : (
          // The mark stands on the section's bottom edge: in flow below the text on small screens,
          // at the bottom right on desktop.
          <div
            data-feature-buffalo
            aria-hidden
            className="mt-12 mb-10 ml-auto w-[86%] max-w-[700px] will-change-transform md:w-[64%] lg:absolute lg:right-[var(--gutter,60px)] lg:bottom-16 lg:mt-0 lg:mb-0 lg:ml-0 lg:w-[48%]"
          >
            <img src="/assets/buffalo.svg" alt="" width={620} height={309} className="block w-full" />
          </div>
        )}
      </div>
    </section>
  )
}

// ---------- Values (About: "What we stand for") ----------
/** Numbered rows: index, display title and a short description, separated by hairlines. */
export function Values({ section }: { section: ValuesSection }) {
  const scope = useRef<HTMLElement>(null)
  useReveal(scope)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION, () => {
        // Each row draws its rule, then its text rises.
        gsap.utils.toArray<HTMLElement>('[data-value-row]').forEach((row) => {
          gsap
            .timeline({ scrollTrigger: { trigger: row, start: 'top 90%', ...ONCE } })
            .from(row.querySelector('[data-value-line]'), { scaleX: 0, duration: 1.1, ease: 'expo.out' })
            .from(row.querySelectorAll('[data-value-text]'), { autoAlpha: 0, y: 24, duration: 0.8, stagger: 0.06 }, 0.15)
        })
      })
      return () => mm.revert()
    },
    { scope, dependencies: [section.items.length], revertOnUpdate: true },
  )

  return (
    // A white sheet with rounded top corners that slides up over the bottom of the section before it
    // (on About: the blue buffalo section), instead of meeting it at a hard edge.
    <section ref={scope} className="relative z-10 -mt-10 rounded-t-[32px] bg-white lg:-mt-16 lg:rounded-t-[56px]">
      <div className="container-site py-12 lg:pt-[120px] lg:pb-[100px]">
        <SectionIntro label={section.label} title={section.title} />
        {section.subtitle && (
          <div className="section-grid mt-4">
            <span className="hidden lg:block" />
            <p data-reveal className="max-w-[560px] text-base leading-normal text-label">
              {section.subtitle}
            </p>
          </div>
        )}
        <div className="section-grid mt-8 lg:mt-16">
          <span className="hidden lg:block" />
          <ol>
            {section.items.map((item, i) => (
              <li
                key={item.id}
                data-value-row
                className="group/val relative isolate grid grid-cols-[40px_minmax(0,1fr)] gap-x-4 gap-y-1.5 py-5 md:grid-cols-[60px_minmax(0,1fr)_minmax(0,1fr)] md:items-baseline lg:px-6 lg:py-8"
              >
                <span data-value-line aria-hidden className="absolute inset-x-0 top-0 h-px origin-left bg-line" />
                {/* Hover (desktop): a navy block rises behind the row and its text turns white. */}
                <span
                  aria-hidden
                  className={`absolute inset-0 -z-10 hidden origin-bottom scale-y-0 rounded-2xl bg-navy transition-transform ${EASE} lg:block pointer-fine:group-hover/val:scale-y-100`}
                />
                <span
                  data-value-text
                  className={`text-sm text-gray transition-colors ${EASE} pointer-fine:lg:group-hover/val:text-[#a9beff]`}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 data-value-text className="display text-lg lg:text-2xl">
                  <span
                    className={`inline-block transition-[color,translate] ${EASE} pointer-fine:lg:group-hover/val:translate-x-2 pointer-fine:lg:group-hover/val:text-white`}
                  >
                    {item.title}
                  </span>
                </h3>
                {item.description && (
                  <p
                    data-value-text
                    className={`col-start-2 text-sm leading-normal text-label transition-colors ${EASE} md:col-start-3 lg:text-base pointer-fine:lg:group-hover/val:text-[#d6d8f0]`}
                  >
                    {item.description}
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

// ---------- Team (About: "A senior team, small on purpose.") ----------
/** Section intro + the Team member collection (sorted by `order` in Strapi). */
export function Team({ section }: { section: TeamSection }) {
  const scope = useRef<HTMLElement>(null)
  const { data: team, isPending } = useTeam()
  useReveal(scope, [team?.length])
  useGSAP(
    () => {
      if (!team?.length) return
      const mm = gsap.matchMedia()
      mm.add(MOTION, () => {
        // Row by row: each portrait opens upward like a curtain while the photo settles from a zoom,
        // then the name and role rise under it.
        gsap.utils.toArray<HTMLElement>('[data-team-member]').forEach((member, i) => {
          gsap
            .timeline({ delay: (i % 3) * 0.12, scrollTrigger: { trigger: member, start: 'top 88%', once: true } })
            .fromTo(
              member.querySelector('[data-team-photo]'),
              { clipPath: 'inset(100% 0% 0% 0% round 16px)' },
              { clipPath: 'inset(0% 0% 0% 0% round 16px)', duration: 1.3, ease: 'expo.inOut', clearProps: 'clipPath' },
            )
            .fromTo(member.querySelector('[data-team-zoom]'), { scale: 1.3 }, { scale: 1, duration: 1.6, ease: 'expo.out' }, 0.15)
            .fromTo(
              member.querySelectorAll('[data-team-text]'),
              { autoAlpha: 0, y: 16 },
              { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.06 },
              0.6,
            )
        })
      })
      return () => mm.revert()
    },
    { scope, dependencies: [team?.length], revertOnUpdate: true },
  )

  return (
    <section ref={scope} className="container-site py-12 lg:pt-[100px] lg:pb-[100px]">
      <SectionIntro label={section.label} title={section.title} />
      {section.subtitle && (
        <div className="section-grid mt-4">
          <span className="hidden lg:block" />
          <p data-reveal className="max-w-[560px] text-base leading-normal text-label">
            {section.subtitle}
          </p>
        </div>
      )}
      <div className="section-grid mt-8 lg:mt-16">
        <span className="hidden lg:block" />
        {isPending ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-5">
            <Skeleton className="aspect-[4/5]" />
            <Skeleton className="aspect-[4/5]" />
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-8 lg:grid-cols-3 lg:gap-x-5 lg:gap-y-12">
            {team?.map((member) => (
              <li key={member.documentId} data-team-member className="group/tm">
                <div data-team-photo className="overflow-hidden rounded-2xl bg-surface">
                  <div data-team-zoom>
                    <StrapiImage
                      media={member.photo}
                      fallbackAlt={`Portrait of ${member.name}`}
                      sizes="(min-width: 1200px) 330px, 50vw"
                      placeholderLabel={member.name.charAt(0)}
                      className="aspect-[4/5] w-full transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] pointer-fine:group-hover/tm:scale-[1.04]"
                    />
                  </div>
                </div>
                <h3 data-team-text className="mt-3 text-base font-medium lg:mt-4 lg:text-lg">
                  {member.name}
                </h3>
                <p data-team-text className="text-sm text-label">
                  {member.role}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
