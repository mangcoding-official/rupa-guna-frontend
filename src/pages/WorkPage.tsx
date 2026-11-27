import { useCallback, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { WorkStack } from '@/components/sections'
import { PageIntro } from '@/components/PageIntro'
import { Seo } from '@/components/Seo'
import { FilterChips, FilterList, type FilterOption } from '@/components/Filters'
import { ProjectCover } from '@/components/StrapiImage'
import { ArrowIcon, ErrorState, PageLoading } from '@/components/ui'
import { gsap, ScrollTrigger, useGSAP, useReveal, ONCE } from '@/lib/gsap'
import { useProjects, useWorkPage } from '@/lib/queries'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { SITE_URL } from '@/lib/strapi'
import type { Option, ProjectSummary, WorkPage as WorkPageData } from '@/lib/types'

/**
 * Work — Figma "Work · Desktop 1440" (183:4772) and "Work · Mobile 390" (206:870).
 * Intro, "Selected work" (desktop: card stack + vertical filter list; mobile: filter chips + card list)
 * and the "All projects" index. The active filter lives in ?category= so it can be shared.
 */
const MOTION = '(prefers-reduced-motion: no-preference)'
const pad = (n: number) => String(n).padStart(2, '0')

export default function WorkPage() {
  const { data: page, isPending, isError, refetch } = useWorkPage()
  const { data: projects, isPending: projectsPending } = useProjects()

  if (isPending || projectsPending) return <PageLoading />
  if (isError || !page) return <ErrorState onRetry={() => refetch()} />

  const list = projects ?? []
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: page.title,
    description: page.description ?? undefined,
    url: `${SITE_URL}/work`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: list.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}/work/${p.slug}`,
        name: p.title,
      })),
    },
  }

  return (
    <>
      <Seo title="Work" description={page.description} seo={page.seo} jsonLd={jsonLd} />
      <PageIntro label={page.label ?? 'Work'} title={page.title} description={page.description} />
      <SelectedWork page={page} projects={list} />
      <ProjectIndex label={page.indexLabel ?? 'All projects'} projects={list} />
    </>
  )
}

// ---------- Selected work: filters + stack (desktop) / card list (mobile) ----------
function SelectedWork({ page, projects }: { page: WorkPageData; projects: ProjectSummary[] }) {
  const scope = useRef<HTMLElement>(null)
  const isDesktop = useMediaQuery('(min-width: 1200px)')
  const [params, setParams] = useSearchParams()
  const filters = page.filters ?? []
  const requested = params.get('category')
  const active = filters.some((f) => f.value === requested) ? requested : null
  const shown = active ? projects.filter((p) => p.category === active) : projects

  // Fade the current results out, then switch the filter; the effect below brings the new ones in.
  const select = useCallback(
    (value: string | null) => {
      if (value === active) return
      const apply = () =>
        setParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            if (value) next.set('category', value)
            else next.delete('category')
            return next
          },
          { replace: true, preventScrollReset: true },
        )
      const target = scope.current?.querySelector('[data-filter-results]')
      if (!target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return apply()
      gsap.to(target, { autoAlpha: 0, y: 16, duration: 0.25, ease: 'power2.in', overwrite: true, onComplete: apply })
    },
    [active, setParams],
  )

  const firstRun = useRef(true)
  useGSAP(
    () => {
      const target = scope.current?.querySelector('[data-filter-results]')
      if (firstRun.current) {
        firstRun.current = false
        return
      }
      if (target)
        gsap.fromTo(
          target,
          { autoAlpha: 0, y: 16 },
          { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', clearProps: 'transform' },
        )
      // The mobile list changes the page height: re-measure every trigger below it (index, footer).
      requestAnimationFrame(() => ScrollTrigger.refresh())
    },
    { scope, dependencies: [active] },
  )

  const label = page.selectedLabel ?? 'Selected work'
  const options: FilterOption[] = [
    { label: 'All', value: null, count: projects.length },
    ...filters.map((f: Option) => ({ label: f.label, value: f.value })),
  ]

  return (
    <section ref={scope} aria-label={label} className="container-site lg:py-[37px]">
      {isDesktop ? (
        <div className="section-grid">
          <div className="pt-10">
            <p className="text-sm text-gray">{label}</p>
            <FilterList options={options} active={active} onSelect={select} />
          </div>
          <div data-filter-results>
            {shown.length ? <WorkStack key={active ?? 'all'} projects={shown} layout="side" label={label} /> : <EmptyState />}
          </div>
        </div>
      ) : (
        <>
          <FilterChips options={options} active={active} onSelect={select} />
          <div className="py-12">
            <p className="text-sm text-label">{label}</p>
            <div data-filter-results className="mt-8">
              {shown.length ? <CardList key={active ?? 'all'} projects={shown} /> : <EmptyState />}
            </div>
          </div>
        </>
      )}
    </section>
  )
}

/** Mobile "Selected work": one card per project, each rising in as it scrolls into view. */
function CardList({ projects }: { projects: ProjectSummary[] }) {
  const scope = useRef<HTMLUListElement>(null)
  useReveal(scope)
  return (
    <ul ref={scope} className="flex flex-col gap-8 md:grid md:grid-cols-2 md:gap-x-5 md:gap-y-10">
      {projects.map((p) => (
        <li key={p.documentId} data-reveal>
          <Link to={`/work/${p.slug}`} className="group block">
            <div className="aspect-350/228 overflow-hidden rounded-2xl">
              <ProjectCover
                project={p}
                sizes="100vw"
                className="size-full transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-active:scale-[0.98] pointer-fine:group-hover:scale-[1.04]"
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-navy">{p.title}</p>
                {p.category && <p className="mt-0.5 text-xs text-gray">{p.category}</p>}
              </div>
              {p.year && <p className="text-xs text-gray">{p.year}</p>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function EmptyState() {
  return (
    <p className="flex aspect-660/430 max-w-[660px] items-center justify-center rounded-2xl bg-surface p-6 text-center text-sm text-label lg:mt-10">
      No projects in this category yet.
    </p>
  )
}

// ---------- All projects: index table ----------
function ProjectIndex({ label, projects }: { label: string; projects: ProjectSummary[] }) {
  const scope = useRef<HTMLElement>(null)
  const pill = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<number | null>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION, () => {
        const trigger = { trigger: '[data-index]', start: 'top 85%', ...ONCE }
        // Quick, capped staggers: the whole list is in within about a second however long it is.
        gsap
          .timeline({ scrollTrigger: trigger })
          .from('[data-index-head]', { autoAlpha: 0, y: 16, duration: 0.6, stagger: 0.04, ease: 'power3.out' })
          .from('[data-index-line]', { scaleX: 0, duration: 0.9, stagger: { amount: 0.35 }, ease: 'expo.out' }, 0.05)
          .from('[data-index-row]', { autoAlpha: 0, y: 24, duration: 0.7, stagger: { amount: 0.35 }, ease: 'power3.out' }, 0.1)
      })
      return () => mm.revert()
    },
    { scope, dependencies: [projects.length], revertOnUpdate: true },
  )

  // Desktop hover, as on the home page's services list: one blue block glides between rows and the
  // hovered row's text turns white. It fades away when the pointer leaves the list.
  const hover = useCallback((index: number | null, el?: HTMLElement | null) => {
    setHovered(index)
    const block = pill.current
    if (!block) return
    if (index === null || !el) {
      gsap.to(block, { autoAlpha: 0, duration: 0.3, ease: 'power2.out', overwrite: true })
      return
    }
    const target = { y: el.offsetTop, height: el.offsetHeight }
    // Appearing: start on the row and fade in. Already visible: glide over to the new row.
    const visible = gsap.getProperty(block, 'autoAlpha') === 1
    if (!visible) gsap.set(block, target)
    gsap.to(block, { ...target, autoAlpha: 1, duration: visible ? 0.5 : 0.3, ease: 'expo.out', overwrite: true })
  }, [])

  if (!projects.length) return null

  return (
    <section ref={scope} aria-label={label} className="container-site pt-12 lg:pt-15">
      <div className="section-grid">
        <span className="hidden lg:block" />
        <div data-index>
          {/* Header row (desktop) / section label (mobile) */}
          <div className="relative pb-6 leading-[17px] lg:grid lg:grid-cols-[14fr_24fr_24fr_24fr_12fr_18px] lg:px-5 lg:py-5">
            <p data-index-head className="text-sm text-label lg:text-gray">
              {label}
            </p>
            {['Project', 'Service', 'Sector', 'Year'].map((h) => (
              <p key={h} data-index-head aria-hidden className="hidden text-sm text-gray lg:block">
                {h}
              </p>
            ))}
            <span data-index-line aria-hidden className="absolute inset-x-0 bottom-0 hidden h-px origin-left bg-line lg:block" />
          </div>
          <ol className="relative" onMouseLeave={() => hover(null)}>
            <div
              ref={pill}
              aria-hidden
              className="pointer-events-none invisible absolute inset-x-0 top-0 hidden rounded-2xl bg-blue lg:block"
            />
            {projects.map((p, i) => {
              const on = hovered === i
              return (
                <li key={p.documentId} data-index-row className="group/row relative">
                  <Link
                    to={`/work/${p.slug}`}
                    onPointerEnter={(e) => e.pointerType === 'mouse' && hover(i, e.currentTarget.parentElement)}
                    onFocus={(e) => hover(i, e.currentTarget.parentElement)}
                    onBlur={() => hover(null)}
                    className="relative flex items-center gap-3 py-3.5 leading-[17px] lg:grid lg:grid-cols-[14fr_24fr_24fr_24fr_12fr_18px] lg:gap-0 lg:px-5 lg:py-5"
                  >
                    <span
                      className={`w-6 shrink-0 text-xs transition-colors duration-300 lg:w-auto lg:text-sm ${on ? 'lg:text-white/70' : 'text-gray'}`}
                    >
                      {pad(i + 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-sm font-medium transition-[color,translate] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] ${on ? 'text-navy lg:translate-x-2 lg:text-white' : 'text-navy'}`}
                      >
                        {p.title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-[15px] text-gray lg:hidden">
                        {[p.category, p.industry?.name].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span
                      className={`hidden text-sm transition-colors duration-300 lg:block ${on ? 'text-white' : 'text-label'}`}
                    >
                      {p.category}
                    </span>
                    <span
                      className={`hidden text-sm transition-colors duration-300 lg:block ${on ? 'text-white' : 'text-label'}`}
                    >
                      {p.industry?.name}
                    </span>
                    <span
                      className={`text-xs transition-colors duration-300 lg:text-sm ${on ? 'text-gray lg:text-white/70' : 'text-gray'}`}
                    >
                      {p.year}
                    </span>
                    <span
                      aria-hidden
                      className={`relative hidden size-[18px] overflow-hidden transition-colors duration-300 lg:block ${on ? 'text-white' : 'text-navy'}`}
                    >
                      <ArrowIcon
                        direction="up-right"
                        className={`absolute inset-0 m-auto transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] ${on ? 'translate-x-full -translate-y-full' : ''}`}
                      />
                      <ArrowIcon
                        direction="up-right"
                        className={`absolute inset-0 m-auto transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] ${on ? 'translate-0' : '-translate-x-full translate-y-full'}`}
                      />
                    </span>
                  </Link>
                  {/* The hairline hides under the blue block (and next to it) so the block reads clean. */}
                  <span
                    data-index-line
                    aria-hidden
                    className={`pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left bg-line transition-opacity duration-300 ${hovered !== null && (on || hovered === i + 1) ? 'lg:opacity-0' : ''}`}
                  />
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}
