import { useRef } from 'react'
import { Link } from 'react-router'
import { PageIntro } from '@/components/PageIntro'
import { SectionRenderer } from '@/components/sections'
import { Seo } from '@/components/Seo'
import { ArrowIcon, ErrorState, PageLoading, Skeleton } from '@/components/ui'
import { gsap, useGSAP, useReveal, whenPageVisible, ONCE } from '@/lib/gsap'
import { usePreloaderStatus } from '@/lib/preloader'
import { useServices, useServicesPage } from '@/lib/queries'
import { SITE_URL } from '@/lib/strapi'
import type { Service } from '@/lib/types'

/**
 * Services — Figma "Services · Desktop 1440" (183:5193) and "Services · Mobile 390" (206:1195).
 * Intro + discovery-call button, the three service cards, then the page's sections ("How we work", FAQs).
 */
export default function ServicesPage() {
  const { data: page, isPending, isError, refetch } = useServicesPage()
  const { data: services, isPending: servicesPending } = useServices()

  if (isPending) return <PageLoading />
  if (isError || !page) return <ErrorState onRetry={() => refetch()} />

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: page.title,
    itemListElement: (services ?? []).map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Service',
        name: s.title,
        description: s.shortDescription ?? undefined,
        url: `${SITE_URL}/services/${s.slug}`,
      },
    })),
  }

  return (
    <>
      <Seo title="Services" description={page.description} seo={page.seo} jsonLd={jsonLd} />
      <PageIntro
        label={page.label ?? 'Services'}
        title={page.title}
        description={page.description}
        cta={page.cta}
        className="lg:pb-[173px]"
      />
      <ServiceCards label={page.servicesLabel ?? 'Our services'} services={services} loading={servicesPending} />
      <SectionRenderer sections={page.sections} />
    </>
  )
}

function ServiceCards({ label, services, loading }: { label: string; services?: Service[]; loading: boolean }) {
  const scope = useRef<HTMLElement>(null)
  const ready = usePreloaderStatus() === 'done'
  useReveal(scope, [services?.length])
  useGSAP(
    () => {
      if (!services?.length) return
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', (ctx) => {
        const cards = gsap.utils.toArray<HTMLElement>('[data-svc-card]')
        // Each card opens upward like a curtain while it rises and settles from slightly small, then
        // its content follows line by line and the number scrambles in.
        gsap.set(cards, { clipPath: 'inset(100% 0% 0% 0% round 16px)', y: 120, scale: 0.94, transformOrigin: '50% 100%' })
        gsap.set('[data-svc-part]', { autoAlpha: 0, y: 28 })
        if (!ready) return
        let cancelled = false
        whenPageVisible().then((delay) => {
          if (cancelled) return
          ctx.add(() => {
            // Cards already in the first screen wait for the hero intro to get going first.
            const inFirstScreen =
              (scope.current?.querySelector('[data-svc-list]')?.getBoundingClientRect().top ?? Infinity) < innerHeight
            const tl = gsap.timeline({
              delay: inFirstScreen ? delay + 0.55 : 0,
              scrollTrigger: { trigger: '[data-svc-list]', start: 'top 85%', ...ONCE },
            })
            cards.forEach((card, i) => {
              const at = i * 0.18
              tl.to(
                card,
                {
                  clipPath: 'inset(0% 0% 0% 0% round 16px)',
                  y: 0,
                  scale: 1,
                  duration: 1.4,
                  ease: 'expo.out',
                  clearProps: 'clipPath,transform',
                },
                at,
              ).to(
                card.querySelectorAll('[data-svc-part]'),
                { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out', clearProps: 'all' },
                at + 0.35,
              )
              const num = card.querySelector('[data-svc-num]')
              if (num)
                tl.to(
                  num,
                  { duration: 0.9, scrambleText: { text: num.textContent ?? '', chars: '0123456789', speed: 0.6 } },
                  at + 0.35,
                )
            })
          })
        })
        return () => {
          cancelled = true
        }
      })
      // Desktop: the three cards drift into line at different speeds as the row scrolls up, settling
      // (eased to a stop) once the row is well inside the screen.
      mm.add('(prefers-reduced-motion: no-preference) and (min-width: 1200px)', () => {
        gsap.utils.toArray<HTMLElement>('[data-svc-item]').forEach((item, i) => {
          gsap.fromTo(
            item,
            { y: (i % 3) * 70 },
            {
              y: 0,
              ease: 'power2.out',
              scrollTrigger: { trigger: '[data-svc-list]', start: 'top bottom', end: 'top 30%', scrub: 0.8 },
            },
          )
        })
      })
      return () => mm.revert()
    },
    { scope, dependencies: [services?.length, ready], revertOnUpdate: true },
  )

  return (
    <section ref={scope} aria-label={label} className="container-site py-12 lg:pt-0 lg:pb-[57px]">
      <div className="section-grid gap-y-3">
        <p data-reveal className="text-sm text-label lg:text-gray">
          {label}
        </p>
        {loading ? (
          <Skeleton className="h-[353px]" />
        ) : (
          <ul data-svc-list className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {services?.map((service, i) => (
              <li
                key={service.documentId}
                data-svc-item
                className="md:[&:last-child:nth-child(odd)]:col-span-2 lg:[&:last-child:nth-child(odd)]:col-span-1"
              >
                <ServiceCard service={service} index={i} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

/** Grey card; on hover a navy panel rises from the bottom and the text turns white. */
function ServiceCard({ service, index }: { service: Service; index: number }) {
  const ease = 'duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)]'
  return (
    <Link
      data-svc-card
      to={`/services/${service.slug}`}
      className="group/svc @container relative isolate flex h-full flex-col overflow-hidden rounded-2xl bg-surface p-6 text-navy lg:min-h-[353px] lg:p-8"
    >
      <span
        aria-hidden
        className={`absolute inset-0 -z-10 translate-y-full bg-navy transition-transform ${ease} pointer-fine:group-hover/svc:translate-y-0`}
      />
      <span
        data-svc-part
        data-svc-num
        className={`text-xs text-gray transition-colors ${ease} lg:text-sm lg:text-navy pointer-fine:group-hover/svc:text-[#a9beff]`}
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      <h2
        data-svc-part
        className={`display mt-3 text-2xl transition-colors ${ease} lg:mt-[21px] lg:text-[clamp(22px,calc((100cqw-64px)/7),32px)] pointer-fine:group-hover/svc:text-white`}
      >
        {service.title}
      </h2>
      {service.shortDescription && (
        <p
          data-svc-part
          className={`mt-3 text-sm text-label transition-colors ${ease} lg:mt-1.5 lg:text-navy pointer-fine:group-hover/svc:text-[#d6d8f0]`}
        >
          {service.shortDescription}
        </p>
      )}
      <span
        data-svc-part
        className={`mt-auto flex items-center justify-between pt-6 text-sm font-medium transition-colors ${ease} lg:pt-10 pointer-fine:group-hover/svc:text-white`}
      >
        Explore service
        <span aria-hidden className="relative size-5 overflow-hidden">
          <ArrowIcon
            direction="up-right"
            className={`absolute inset-0 m-auto size-[18px] transition-transform ${ease} group-hover/svc:translate-x-full group-hover/svc:-translate-y-full`}
          />
          <ArrowIcon
            direction="up-right"
            className={`absolute inset-0 m-auto size-[18px] -translate-x-full translate-y-full transition-transform ${ease} group-hover/svc:translate-0`}
          />
        </span>
      </span>
    </Link>
  )
}
