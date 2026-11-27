import { useRef } from 'react'
import { Link, useParams } from 'react-router'
import { Seo } from '@/components/Seo'
import { ProjectCover } from '@/components/StrapiImage'
import { ArrowIcon, ErrorState, PageLoading } from '@/components/ui'
import { gsap, useGSAP, useReveal, ONCE } from '@/lib/gsap'
import { useService, useServices } from '@/lib/queries'
import { SITE_URL, mediaUrl } from '@/lib/strapi'
import type { Service } from '@/lib/types'
import { NotFoundPage } from './StatusPages'

/**
 * Service Detail — Figma "Service Detail · Brand Design / UI/UX Design / Marketing Design" (Desktop 1440 + Mobile 390).
 * Hero (number, title, tagline, image) → Overview + Best for → Programs → Other services.
 */
const MOTION = '(prefers-reduced-motion: no-preference)'
const EASE = 'ease-[cubic-bezier(0.2,0.7,0.2,1)]'

export default function ServiceDetailPage() {
  const { slug = '' } = useParams()
  const { data: service, isPending, isError, refetch } = useService(slug)
  const { data: all } = useServices()

  if (isPending) return <PageLoading />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!service) return <NotFoundPage />

  const index = Math.max(0, all?.findIndex((s) => s.slug === service.slug) ?? 0)
  const others = (all ?? []).filter((s) => s.slug !== service.slug)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.title,
    description: service.shortDescription ?? undefined,
    url: `${SITE_URL}/services/${service.slug}`,
    provider: { '@type': 'Organization', name: 'Rupa Guna' },
    hasOfferCatalog: service.programs?.length
      ? {
          '@type': 'OfferCatalog',
          name: `${service.title} programs`,
          itemListElement: service.programs.map((p) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: p.title, description: p.description } })),
        }
      : undefined,
  }

  return (
    <>
      <Seo
        title={service.title}
        description={service.shortDescription ?? service.tagline}
        seo={service.seo}
        image={mediaUrl(service.heroMedia?.url)}
        jsonLd={jsonLd}
      />
      <ServiceHero service={service} number={index + 1} />
      <Overview service={service} />
      {!!service.programs?.length && <Programs service={service} />}
      {others.length > 0 && <OtherServices services={others} />}
    </>
  )
}

function ServiceHero({ service, number }: { service: Service; number: number }) {
  const scope = useRef<HTMLElement>(null)
  useReveal(scope, [service.slug])
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION, () => {
        gsap.fromTo(
          '[data-svc-media]',
          { clipPath: 'inset(10% 6% 10% 6% round 16px)' },
          { clipPath: 'inset(0% 0% 0% 0% round 16px)', duration: 1.3, ease: 'expo.out', delay: 0.2 },
        )
        gsap.fromTo('[data-svc-img]', { scale: 1.15 }, { scale: 1, duration: 1.6, ease: 'expo.out', delay: 0.2 })
        gsap.to('[data-svc-img]', {
          yPercent: 8,
          ease: 'none',
          scrollTrigger: { trigger: '[data-svc-media]', start: 'top top', end: 'bottom top', scrub: true },
        })
      })
      return () => mm.revert()
    },
    { scope, dependencies: [service.slug], revertOnUpdate: true },
  )

  return (
    <section ref={scope} className="container-site pt-12 lg:pt-10">
      <Link data-reveal to="/services" className="group -my-2 inline-flex items-center gap-1 py-2 text-sm text-label lg:text-gray">
        <ArrowIcon direction="left" className="size-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
        <span className="transition-colors duration-300 group-hover:text-navy">All services</span>
      </Link>
      <div className="section-grid mt-4 gap-y-4 lg:mt-[93px]">
        <p data-reveal className="text-sm text-label lg:pt-2.5 lg:text-gray">
          Service {String(number).padStart(2, '0')}
        </p>
        <div>
          <h1 data-split className="display text-[32px] lg:text-[64px] lg:leading-[1.6]">
            {service.title}
          </h1>
          {service.tagline && (
            <p data-reveal data-reveal-delay="0.15" className="mt-4 text-base leading-normal text-label lg:mt-0 lg:text-lg">
              {service.tagline}
            </p>
          )}
        </div>
      </div>
      <div className="section-grid mt-4 lg:mt-[88px]">
        <span className="hidden lg:block" />
        <div data-svc-media className="aspect-350/236 overflow-hidden rounded-2xl md:aspect-990/620">
          <div data-svc-img className="size-full will-change-transform">
            <ProjectCover
              project={{ title: service.title, cover: service.heroMedia, accentColor: service.accentColor }}
              priority
              sizes="(min-width: 1200px) 990px, 100vw"
              className="size-full"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function Overview({ service }: { service: Service }) {
  const scope = useRef<HTMLElement>(null)
  useReveal(scope, [service.slug])
  if (!service.shortDescription && !service.bestFor?.length) return null
  return (
    <section ref={scope} className="container-site pt-24 pb-12 lg:pt-20 lg:pb-[120px]">
      <div className="section-grid gap-y-4">
        <p data-reveal className="text-sm text-label lg:pt-2 lg:text-gray">
          Overview
        </p>
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:gap-10">
          {service.shortDescription && (
            <p data-split className="max-w-[640px] text-xl leading-[1.2] font-medium lg:text-2xl lg:leading-[1.25] lg:font-normal">
              {service.shortDescription}
            </p>
          )}
          {!!service.bestFor?.length && (
            <div data-reveal data-reveal-delay="0.15" className="pt-2 md:w-[305px] md:shrink-0 lg:pt-2">
              <p className="text-xs text-gray lg:text-sm">Best for</p>
              <ul className="mt-1.5 flex flex-col gap-1.5 text-sm lg:mt-4 lg:text-base lg:leading-normal">
                {service.bestFor.map((b) => (
                  <li key={b.id}>{b.text}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/** Rows draw their rule from the left, then the text rises (one stagger for the whole list). */
function useRowsReveal(scope: React.RefObject<HTMLElement | null>, deps: unknown[]) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION, () => {
        gsap
          .timeline({ scrollTrigger: { trigger: '[data-rows]', start: 'top 85%', ...ONCE } })
          .from('[data-row-line]', { scaleX: 0, duration: 1.1, stagger: 0.07, ease: 'expo.out' })
          .from('[data-row-text]', { autoAlpha: 0, y: 20, duration: 0.8, stagger: 0.05, ease: 'power3.out' }, 0.1)
      })
      return () => mm.revert()
    },
    { scope, dependencies: deps, revertOnUpdate: true },
  )
}

function Programs({ service }: { service: Service }) {
  const scope = useRef<HTMLElement>(null)
  useReveal(scope, [service.slug])
  useRowsReveal(scope, [service.slug])
  const programs = service.programs!
  return (
    <section ref={scope} aria-label="Programs" className="container-site py-12 lg:pt-5 lg:pb-[180px]">
      <div className="section-grid">
        <p data-reveal className="hidden text-sm text-gray lg:block">
          Programs
        </p>
        <div>
          <div data-reveal className="flex items-center justify-between lg:block">
            <p className="text-sm text-label lg:hidden">Programs</p>
            <p className="text-xs text-gray lg:text-sm">
              {programs.length} programs
            </p>
          </div>
          <ul data-rows className="relative mt-4 lg:mt-[43px]">
            <span data-row-line aria-hidden className="absolute inset-x-0 top-0 h-px origin-left bg-line lg:bg-muted" />
            {programs.map((p) => (
              <li key={p.id} className="relative flex flex-col gap-1 py-4 md:grid md:grid-cols-2 md:items-center md:gap-5 lg:py-[26px]">
                <h2 data-row-text className="text-xl leading-[1.2] font-medium">
                  {p.title}
                </h2>
                {p.description && (
                  <p data-row-text className="text-sm text-gray">
                    {p.description}
                  </p>
                )}
                <span data-row-line aria-hidden className="absolute inset-x-0 bottom-0 h-px origin-left bg-line lg:bg-muted" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function OtherServices({ services }: { services: Service[] }) {
  const scope = useRef<HTMLElement>(null)
  useReveal(scope)
  useRowsReveal(scope, [services.length])
  return (
    <section ref={scope} aria-label="Other services" className="container-site pt-12 lg:pt-5">
      <div className="section-grid gap-y-6">
        <p data-reveal className="text-sm text-label lg:text-gray">
          Other services
        </p>
        <ul data-rows className="relative">
          <span data-row-line aria-hidden className="absolute inset-x-0 top-0 h-px origin-left bg-line lg:bg-muted" />
          {services.map((s) => (
            <li key={s.documentId} className="group/os relative">
              <Link to={`/services/${s.slug}`} className="flex items-center gap-4 py-4 md:grid md:grid-cols-[1fr_1fr_18px] md:gap-5 lg:py-[26px]">
                <span data-row-text className="flex min-w-0 flex-1 flex-col gap-1 md:contents">
                  <span className={`text-xl leading-[1.2] font-medium transition-transform duration-500 ${EASE} md:group-hover/os:translate-x-2`}>
                    {s.title}
                  </span>
                  {s.tagline && <span className="text-sm text-gray">{s.tagline}</span>}
                </span>
                <span data-row-text aria-hidden className="relative size-[18px] shrink-0 overflow-hidden">
                  <ArrowIcon className={`absolute inset-0 m-auto size-[18px] transition-transform duration-500 ${EASE} group-hover/os:translate-x-full`} />
                  <ArrowIcon className={`absolute inset-0 m-auto size-[18px] -translate-x-full text-blue transition-transform duration-500 ${EASE} group-hover/os:translate-x-0`} />
                </span>
              </Link>
              <span data-row-line aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left bg-line lg:bg-muted" />
              <span
                aria-hidden
                className={`pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-navy transition-transform duration-700 ${EASE} group-hover/os:scale-x-100`}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
