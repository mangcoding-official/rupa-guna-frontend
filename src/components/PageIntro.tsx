import { useRef } from 'react'
import { PillLink } from '@/components/ui'
import { gsap, SplitText, useGSAP, whenPageVisible } from '@/lib/gsap'
import { usePreloaderStatus } from '@/lib/preloader'
import { useMediaQuery } from '@/lib/useMediaQuery'
import type { LinkItem } from '@/lib/types'

/**
 * Top of the inner pages (Work, Services, Products, About…): small label in the left column,
 * display title + description (+ optional button) in the content column.
 * Mobile: the label sits at the top and the text block at the bottom of the first screen (Figma mobile frames).
 */
export function PageIntro({
  label,
  title,
  description,
  cta,
  className = 'lg:pb-[177px]',
  compact = false,
}: {
  label?: string | null
  title: string
  description?: string | null
  cta?: LinkItem | null
  /** Bottom spacing on desktop differs per frame. */
  className?: string
  /** Text pages (legal): no full-screen intro on mobile/tablet. */
  compact?: boolean
}) {
  const scope = useRef<HTMLElement>(null)
  const isDesktop = useMediaQuery('(min-width: 1200px)')
  const ready = usePreloaderStatus() === 'done'
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', (ctx) => {
        const q = gsap.utils.selector(scope)
        const parts = [q('[data-intro-label]'), q('[data-intro-desc]'), q('[data-intro-cta]')]
        // Hidden until the page is actually on screen (preloader gone).
        // Flattened: a page without a button (or description) leaves an empty list, which GSAP cannot animate.
        gsap.set(parts.flat(), { autoAlpha: 0 })
        gsap.set(q('[data-intro-title]'), { autoAlpha: 0 })
        if (!ready) return

        let split: SplitText | undefined
        let desc: SplitText | undefined
        let cancelled = false
        // Measure lines with the final font (so the stagger follows the real line breaks), and start
        // once the page is actually on screen.
        Promise.all([document.fonts.ready, whenPageVisible()]).then(([, delay]) => {
          if (cancelled || !scope.current) return
          // Created after an await, so add it to the matchMedia context to be reverted with it.
          ctx.add(() => {
            split = SplitText.create(q('[data-intro-title]'), { type: 'lines', mask: 'lines' })
            desc = q('[data-intro-desc]').length
              ? SplitText.create(q('[data-intro-desc]'), { type: 'lines', mask: 'lines' })
              : undefined
            const [label, description, cta] = parts
            const tl = gsap.timeline({ delay, defaults: { ease: 'expo.out' } })
            // The small label scrambles in first…
            if (label.length)
              tl.set(label, { autoAlpha: 1 }, 0).to(
                label,
                { duration: 1, scrambleText: { text: '{original}', chars: 'lowerCase', speed: 0.5 } },
                0,
              )
            // …the title rises line by line, each line tipping upright as it lands…
            tl.set(q('[data-intro-title]'), { autoAlpha: 1 }, 0.1).from(
              split.lines,
              { yPercent: 115, rotate: 4, transformOrigin: '0% 100%', duration: 1.4, stagger: 0.12 },
              0.1,
            )
            // …the description follows in its own lines…
            if (desc)
              tl.set(description, { autoAlpha: 1 }, 0.45).from(desc.lines, { yPercent: 105, duration: 1.1, stagger: 0.08 }, 0.45)
            // …and the button pops in last.
            if (cta.length)
              tl.fromTo(
                cta,
                { autoAlpha: 0, y: 24, scale: 0.92 },
                { autoAlpha: 1, y: 0, scale: 1, duration: 1, ease: 'back.out(1.6)' },
                0.75,
              )
          })
        })
        return () => {
          cancelled = true
          split?.revert()
          desc?.revert()
        }
      })
      return () => mm.revert()
    },
    { scope, dependencies: [isDesktop, ready], revertOnUpdate: true },
  )
  const text = (
    <div className="flex max-w-[560px] flex-col gap-4">
      <h1 data-intro-title className="display max-w-[490px] text-[32px] md:max-w-[560px] lg:max-w-[490px]">
        {title}
      </h1>
      {description && (
        <p data-intro-desc className="text-base leading-normal text-label lg:text-lg">
          {description}
        </p>
      )}
      {cta && (
        <div data-intro-cta className="lg:mt-[84px]">
          <PillLink link={cta} />
        </div>
      )}
    </div>
  )
  return (
    <section
      ref={scope}
      className={`container-site flex flex-col justify-between lg:block lg:min-h-0 lg:pt-[134px] ${compact ? 'gap-4 pt-12 pb-10' : 'min-h-[calc(100svh-64px)] gap-10 pt-6 pb-8 md:min-h-[min(calc(100svh-64px),720px)]'} ${className}`}
    >
      <div className="section-grid">
        <p data-intro-label className="text-sm text-label lg:pt-1.5 lg:text-gray">
          {label}
        </p>
        {isDesktop && text}
      </div>
      {!isDesktop && text}
    </section>
  )
}
