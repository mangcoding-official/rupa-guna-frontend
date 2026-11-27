import { useCallback, useMemo, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { BlocksRenderer } from '@/components/BlocksRenderer'
import { Testimonials, WorkStack } from '@/components/sections'
import { Seo } from '@/components/Seo'
import { ExpandIcon, Sheet } from '@/components/Sheet'
import { ProjectCover, StrapiImage } from '@/components/StrapiImage'
import { ArrowIcon, ErrorState, PageLoading, PillButton, RollText } from '@/components/ui'
import { gsap, useGSAP, useReveal, ONCE } from '@/lib/gsap'
import { useProject, useProjects } from '@/lib/queries'
import { SITE_URL, mediaUrl } from '@/lib/strapi'
import type { Blocks, Media, Project, ProjectSummary } from '@/lib/types'
import { NotFoundPage } from './StatusPages'

/**
 * Work Detail — Figma "Work Detail · Terratani · Desktop 1440" (183:5119) and "· FitDaily · Mobile 390" (206:1057),
 * with the "Story modal" (183:4885 / 206:1142) and "Case study modal" (183:4909 / 206:1160).
 * Modals are driven by ?view=story | ?view=gallery so they are linkable and the back button closes them.
 */
const MOTION = '(prefers-reduced-motion: no-preference)'

/** Plain text of Strapi Blocks (walks nested lists/links), used for the faded story continuation. */
type AnyNode = { text?: string; children?: AnyNode[] }
const nodeText = (n: AnyNode): string => n.text ?? (n.children ?? []).map(nodeText).join('')
const blocksToText = (blocks?: Blocks | null) =>
  ((blocks ?? []) as AnyNode[])
    .map(nodeText)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

/** All images in the gallery, in order (used for the teaser row). */
const galleryImages = (project: Project): Media[] =>
  (project.gallery ?? []).flatMap((b) =>
    b.__component === 'blocks.image-full' ? (b.image ? [b.image] : []) : b.__component === 'blocks.image-grid' ? (b.images ?? []) : [],
  )

export default function WorkDetailPage() {
  const { slug = '' } = useParams()
  const { data: project, isPending, isError, refetch } = useProject(slug)
  const { data: all } = useProjects()
  const [params, setParams] = useSearchParams()
  const view = params.get('view')

  const openView = useCallback((v: 'story' | 'gallery') => setParams({ view: v }), [setParams])
  const closeView = useCallback(() => {
    // Opened in-app → go back (so the back button stays in sync); opened from a shared link → drop the param.
    if (window.history.state?.idx > 0) window.history.back()
    else setParams({}, { replace: true })
  }, [setParams])

  // Next project = the one after this in the portfolio order; the stack holds every other project.
  const others = useMemo(() => {
    if (!all || !project) return []
    const i = all.findIndex((p) => p.slug === project.slug)
    const rotated = i < 0 ? all : [...all.slice(i + 1), ...all.slice(0, i)]
    return rotated.filter((p) => p.slug !== project.slug)
  }, [all, project])
  const next = others[0]

  if (isPending) return <PageLoading />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!project) return <NotFoundPage />

  const cover = mediaUrl(project.heroMedia?.formats?.large?.url ?? project.heroMedia?.url ?? project.cover?.url)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: project.title,
    description: project.excerpt ?? project.storyLead ?? undefined,
    image: cover,
    dateCreated: project.year ? String(project.year) : undefined,
    url: `${SITE_URL}/work/${project.slug}`,
    creator: { '@type': 'Organization', name: 'Rupa Guna' },
  }

  return (
    <>
      <Seo title={project.title} description={project.excerpt ?? project.storyLead} seo={project.seo} image={cover} type="article" jsonLd={jsonLd} />
      <DetailHero project={project} />
      <StoryTeaser project={project} onOpen={() => openView('story')} />
      <GalleryTeaser project={project} onOpen={() => openView('gallery')} />
      {!!project.results?.length && <Results project={project} />}
      {project.testimonial && <Testimonials testimonials={[project.testimonial]} />}
      {others.length > 0 && <NextProject projects={others} />}

      <Sheet open={view === 'story'} onClose={closeView} label={`${project.title} — the full story`} cover={cover}>
        <StoryContent project={project} next={next} />
      </Sheet>
      <CaseStudySheet open={view === 'gallery'} onClose={closeView} project={project} next={next} cover={cover} />
    </>
  )
}

// ---------- Hero: back link, "Case study" label, title, media ----------
function DetailHero({ project }: { project: Project }) {
  const scope = useRef<HTMLElement>(null)
  useReveal(scope, [project.slug])
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION, () => {
        gsap.fromTo(
          '[data-detail-media]',
          { clipPath: 'inset(8% 8% 8% 8% round 16px)' },
          { clipPath: 'inset(0% 0% 0% 0% round 16px)', duration: 1.3, ease: 'expo.out', delay: 0.15 },
        )
        gsap.fromTo('[data-detail-img]', { scale: 1.15 }, { scale: 1, duration: 1.6, ease: 'expo.out', delay: 0.15 })
        // Gentle parallax as the page scrolls away.
        gsap.to('[data-detail-img]', {
          yPercent: 8,
          ease: 'none',
          scrollTrigger: { trigger: '[data-detail-media]', start: 'top top', end: 'bottom top', scrub: true },
        })
      })
      return () => mm.revert()
    },
    { scope, dependencies: [project.slug], revertOnUpdate: true },
  )

  const media = project.heroMedia ?? project.cover
  const isVideo = media?.mime?.startsWith('video/')

  return (
    <section ref={scope} className="container-site pt-6 lg:pt-10">
      <Link data-reveal to="/work" className="group -my-2 inline-flex items-center gap-1.5 py-2 text-sm font-medium">
        <ArrowIcon direction="left" className="size-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
        All work
      </Link>
      <div className="section-grid mt-5 lg:mt-20">
        <p data-reveal className="text-sm text-gray lg:pt-2.5">
          Case study
        </p>
        <h1 data-split className="display text-[36px] lg:text-[44px]">
          {project.title}
        </h1>
      </div>
      <div className="section-grid mt-3 lg:mt-10">
        <span className="hidden lg:block" />
        <div data-detail-media className="aspect-[1000/630] overflow-hidden rounded-2xl bg-surface lg:w-[1000px] lg:max-w-[calc(100vw-440px)]">
          <div data-detail-img className="size-full will-change-transform">
            {isVideo ? (
              <video className="size-full object-cover" src={mediaUrl(media!.url)} autoPlay muted loop playsInline aria-hidden />
            ) : (
              <ProjectCover project={project} media={media} priority sizes="(min-width: 1200px) 1000px, 100vw" className="size-full" />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------- The story (teaser) ----------
function StoryTeaser({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const scope = useRef<HTMLElement>(null)
  useReveal(scope, [project.slug])
  const firstText = (project.story ?? []).find((b) => b.__component === 'blocks.rich-text')
  const continuation = firstText && firstText.__component === 'blocks.rich-text' ? blocksToText(firstText.body) : ''
  const meta = [
    { label: 'Services', value: project.disciplines?.map((d) => d.text).join(', ') },
    { label: 'Industry', value: project.industry?.name },
    { label: 'Year', value: project.year ? String(project.year) : undefined },
  ].filter((m) => m.value)

  if (!project.storyLead && !meta.length) return null

  return (
    <section ref={scope} className="container-site pt-[100px] lg:pt-20 lg:pb-20">
      <div className="section-grid">
        <p data-reveal className="text-sm text-gray">
          The story
        </p>
        <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,650px)] lg:gap-5">
          <dl data-reveal className="flex flex-col gap-3 text-sm lg:gap-[19px]">
            {meta.map((m) => (
              <div key={m.label}>
                <dt>{m.label}</dt>
                <dd className="mt-0.5 text-xs text-gray lg:mt-1 lg:text-sm">{m.value}</dd>
              </div>
            ))}
          </dl>
          <div>
            {project.storyLead && (
              <p data-split className="text-lg leading-[1.33] lg:text-4xl lg:leading-[1.2]">
                {project.storyLead}
              </p>
            )}
            {continuation && (
              <p data-reveal aria-hidden className="mt-4 line-clamp-3 text-lg leading-[1.33] text-[#b9bccb] lg:mt-2.5 lg:text-4xl lg:leading-[1.2]">
                {continuation}
              </p>
            )}
            {(project.story?.length ?? 0) > 0 && (
              <div data-reveal className="mt-6 lg:mt-[120px]">
                <PillButton variant="outline" onClick={onOpen} aria-haspopup="dialog" className="gap-4">
                  <RollText>Read the full story</RollText>
                  <ExpandIcon className="hidden lg:block" />
                </PillButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------- Gallery (teaser row + CTA card) ----------
function GalleryTeaser({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const scope = useRef<HTMLElement>(null)
  useReveal(scope, [project.slug])
  const images = galleryImages(project).slice(0, 2)
  if (!images.length) return null

  return (
    <section ref={scope} className="container-site pt-[100px] lg:pt-[60px] lg:pb-[60px]">
      <div className="section-grid">
        <p data-reveal className="text-sm text-gray">
          Gallery
        </p>
        {/* The row bleeds past the right edge of the page, as in the design. */}
        <div data-reveal className="-mr-5 lg:-mr-15">
          <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto pr-5 [scrollbar-width:none] lg:gap-5 lg:pr-15 [&::-webkit-scrollbar]:hidden">
            {images.map((img, i) => (
              <li
                key={img.id}
                className={`group/g h-[236px] shrink-0 snap-start overflow-hidden rounded-2xl bg-surface md:h-[340px] lg:h-[380px] ${i === 0 ? 'w-[260px] md:w-[480px] lg:w-[560px]' : 'w-[260px] md:w-[320px] lg:w-[360px]'}`}
              >
                <button type="button" onClick={onOpen} aria-label="Open the full gallery" className="block size-full">
                  <StrapiImage
                    media={img}
                    fallbackAlt={`${project.title} gallery image ${i + 1}`}
                    sizes="(min-width: 1200px) 560px, (min-width: 768px) 480px, 260px"
                    className="size-full transition-transform duration-[1200ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover/g:scale-[1.04]"
                  />
                </button>
              </li>
            ))}
            <li className="hidden h-[380px] w-[360px] shrink-0 snap-start items-center justify-center rounded-2xl bg-surface lg:flex">
              <PillButton variant="outline" onClick={onOpen} aria-haspopup="dialog" className="gap-4">
                <RollText>Read the full Gallery</RollText>
                <ExpandIcon />
              </PillButton>
            </li>
          </ul>
        </div>
        <span className="hidden lg:block" />
        <button
          data-reveal
          type="button"
          onClick={onOpen}
          aria-haspopup="dialog"
          className="mt-6 flex h-[58px] items-center justify-between rounded-2xl bg-surface px-5 text-sm font-medium transition-colors hover:bg-navy hover:text-white lg:hidden"
        >
          Read the full Gallery
          <ExpandIcon />
        </button>
      </div>
    </section>
  )
}

// ---------- Results ----------
function Results({ project }: { project: Project }) {
  const scope = useRef<HTMLElement>(null)
  useReveal(scope, [project.slug])
  // Numbers count up from zero when the cards come into view (prefix/suffix such as "×" or "%" kept).
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION, () => {
        gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
          const final = el.textContent ?? ''
          const match = final.match(/^(\D*)(\d+(?:[.,]\d+)?)(.*)$/)
          if (!match) return
          const [, prefix, num, suffix] = match
          const target = Number(num.replace(',', '.'))
          const decimals = num.includes('.') || num.includes(',') ? 1 : 0
          const state = { v: 0 }
          gsap.to(state, {
            v: target,
            duration: 1.6,
            ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 90%', ...ONCE },
            onUpdate: () => void (el.textContent = `${prefix}${state.v.toFixed(decimals)}${suffix}`),
            onComplete: () => void (el.textContent = final),
          })
        })
      })
      return () => mm.revert()
    },
    { scope, dependencies: [project.slug], revertOnUpdate: true },
  )

  return (
    <section ref={scope} className="container-site pt-[100px] pb-12 lg:pt-10 lg:pb-[60px]">
      <div className="section-grid">
        <p data-reveal className="text-sm text-gray">
          Results
        </p>
        <ul className="grid gap-3.5 lg:grid-cols-3 lg:gap-5">
          {project.results!.map((r, i) => (
            <li
              key={r.id}
              data-reveal
              data-reveal-delay={String(i * 0.08)}
              className="flex flex-col rounded-2xl bg-surface p-6 transition-colors duration-500 hover:bg-[#eef1ff] lg:h-[300px] lg:p-7"
            >
              <span className="text-sm text-gray">{String(i + 1).padStart(2, '0')}</span>
              <span data-count aria-label={r.value} className="mt-2 text-[56px] leading-[1.32] font-semibold text-blue lg:mt-auto lg:text-navy">
                {r.value}
              </span>
              <span className="mt-3 text-sm text-label lg:mt-auto lg:text-base lg:leading-normal">{r.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// ---------- Next project ----------
function NextProject({ projects }: { projects: ProjectSummary[] }) {
  const scope = useRef<HTMLElement>(null)
  useReveal(scope, [projects.length])
  return (
    <section ref={scope} className="container-site pt-[100px] lg:pt-[104px] lg:pb-[100px]">
      <div className="section-grid">
        <p data-reveal className="text-sm text-gray lg:pt-10">
          Next project
        </p>
        <div data-reveal>
          <WorkStack projects={projects} layout="side" label="Next project" />
        </div>
      </div>
    </section>
  )
}

// ---------- Story modal content ----------
function StoryContent({ project, next }: { project: Project; next?: ProjectSummary }) {
  return (
    <article className="container-site pb-16 lg:pb-[120px]">
      <div className="section-grid pt-5 lg:pt-[110px]">
        <p data-sheet-fade className="text-sm text-gray">
          The full story
        </p>
        <div className="max-w-[652px]">
          {project.storyLead && (
            <p data-sheet-fade className="mt-6 text-2xl leading-[1.25] lg:mt-0 lg:text-5xl lg:leading-[1.2]">
              {project.storyLead}
            </p>
          )}
          <div className="mt-8 flex flex-col gap-8 lg:mt-[50px] lg:gap-[50px]">
            {project.story?.map((block) => {
              const key = `${block.__component}-${block.id}`
              if (block.__component === 'blocks.rich-text')
                return (
                  <div data-sheet-fade key={key}>
                    <BlocksRenderer content={block.body} className="prose-rg text-base leading-[1.5] lg:text-lg [&>*+*]:mt-[30px]" />
                  </div>
                )
              if (block.__component === 'blocks.image-full')
                return (
                  <figure data-sheet-fade key={key}>
                    <div className="aspect-[652/400] overflow-hidden rounded-2xl bg-surface">
                      <StrapiImage media={block.image} fallbackAlt={block.caption ?? project.title} sizes="(min-width: 1200px) 652px, 100vw" className="size-full" />
                    </div>
                    {block.caption && <figcaption className="mt-3 text-sm text-gray">{block.caption}</figcaption>}
                  </figure>
                )
              return (
                <figure data-sheet-fade key={key}>
                  <blockquote className="text-xl leading-[1.25] text-blue lg:text-4xl lg:leading-[1.2]">“{block.quote}”</blockquote>
                  {(block.author || block.role) && (
                    <figcaption className="mt-5 text-sm text-gray">{[block.author, block.role].filter(Boolean).join(', ')}</figcaption>
                  )}
                </figure>
              )
            })}
          </div>
          {next && (
            <div data-sheet-fade className="mt-12 border-t border-muted pt-6 lg:mt-[110px] lg:max-w-[620px]">
              <Link to={`/work/${next.slug}`} className="group inline-flex items-center gap-1.5 text-sm font-medium">
                Next · {next.title}
                <ArrowIcon className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

// ---------- Case study modal ----------
function CaseStudySheet({
  open,
  onClose,
  project,
  next,
  cover,
}: {
  open: boolean
  onClose: () => void
  project: Project
  next?: ProjectSummary
  cover?: string
}) {
  const panel = useRef<HTMLDivElement>(null)
  const blocks = project.gallery ?? []
  const [first, ...rest] = blocks
  const lead = first?.__component === 'blocks.image-full' ? first : undefined
  const body = lead ? rest : blocks
  const meta = [
    { label: 'Client', value: project.client?.name },
    { label: 'Services', value: project.disciplines?.map((d) => d.text).join(', ') },
    { label: 'Year', value: project.year ? String(project.year) : undefined },
    { label: 'Team', value: project.team?.map((t) => t.text).join(', ') },
  ].filter((m) => m.value)
  const subtitle = [project.subtitle, project.year].filter(Boolean).join(' · ')

  return (
    <Sheet open={open} onClose={onClose} label={`${project.title} — case study`} cover={cover} panelRef={panel}>
      <article className="mx-auto w-full max-w-[915px] px-5 pb-12 lg:pb-[60px]">
        <header className="flex flex-col gap-4 pt-5 lg:flex-row lg:items-center lg:gap-10 lg:px-[112px] lg:pt-[69px]">
          <p data-sheet-fade className="text-sm text-gray lg:hidden">
            Case study
          </p>
          <div data-sheet-fade>
            <h2 className="display text-2xl lg:font-sans lg:text-base lg:font-medium lg:tracking-[-0.04em] lg:normal-case">{project.title}</h2>
            {subtitle && <p className="text-xs text-gray lg:mt-1 lg:text-sm">{subtitle}</p>}
          </div>
          {!!project.tags?.length && (
            <ul data-sheet-fade className="hidden flex-wrap gap-2 lg:flex">
              {project.tags.map((t) => (
                <li key={t.id} className="rounded-full border border-muted px-4 py-[9px] text-sm font-medium">
                  {t.text}
                </li>
              ))}
            </ul>
          )}
        </header>

        {lead?.image && (
          <div data-sheet-fade className="mt-5 aspect-[875/556] overflow-hidden rounded-2xl bg-surface lg:mt-8 lg:rounded-3xl">
            <StrapiImage media={lead.image} priority fallbackAlt={project.title} sizes="(min-width: 1200px) 875px, 100vw" className="size-full" />
          </div>
        )}

        {/* Desktop: meta row + tools right under the lead image */}
        <div data-sheet-fade className="hidden lg:block lg:px-[113px] lg:pt-[72px]">
          <dl className="grid grid-cols-4 gap-6">
            {meta.map((m) => (
              <div key={m.label} className="text-sm">
                <dt className="text-gray">{m.label}</dt>
                <dd className="mt-1 font-medium">{m.value}</dd>
              </div>
            ))}
          </dl>
          {!!project.tools?.length && (
            <div className="mt-[66px]">
              <p className="text-sm text-gray">Tools</p>
              <ul className="mt-3 flex flex-wrap gap-1">
                {project.tools.map((t) => (
                  <li key={t.id} className="rounded-full border border-navy px-4 py-[9px] text-sm font-medium">
                    {t.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-6 lg:mt-[72px] lg:gap-[30px]">
          {body.map((block) => {
            const key = `${block.__component}-${block.id}`
            if (block.__component === 'blocks.rich-text')
              return (
                <div data-sheet-fade key={key} className="lg:px-[113px] lg:py-[40px]">
                  <BlocksRenderer
                    content={block.body}
                    className="text-xl leading-[1.25] text-navy lg:max-w-[620px] lg:text-base lg:leading-[1.5] lg:text-label [&>*+*]:mt-4"
                  />
                </div>
              )
            if (block.__component === 'blocks.image-full')
              return (
                <figure data-sheet-fade key={key}>
                  <div className="overflow-hidden rounded-2xl bg-surface lg:rounded-3xl">
                    <StrapiImage media={block.image} fallbackAlt={block.caption ?? project.title} sizes="(min-width: 1200px) 875px, 100vw" className="w-full" />
                  </div>
                  {block.caption && <figcaption className="mt-3 text-sm text-gray lg:px-[113px]">{block.caption}</figcaption>}
                </figure>
              )
            if (block.__component === 'blocks.image-grid')
              return (
                <div data-sheet-fade key={key} className={`grid gap-2 ${block.columns === 'three' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {block.images?.map((img) => (
                    <div key={img.id} className="aspect-square overflow-hidden rounded-2xl bg-surface">
                      <StrapiImage media={img} fallbackAlt={project.title} sizes="(min-width: 1200px) 440px, 50vw" className="size-full" />
                    </div>
                  ))}
                </div>
              )
            return (
              <div data-sheet-fade key={key} className="overflow-hidden rounded-2xl bg-navy lg:rounded-3xl">
                {block.embedUrl ? (
                  <iframe src={block.embedUrl} title={block.caption ?? project.title} className="aspect-video w-full" allow="autoplay; fullscreen" />
                ) : (
                  <video src={mediaUrl(block.file?.url)} poster={mediaUrl(block.poster?.url)} controls playsInline className="w-full" />
                )}
              </div>
            )
          })}
        </div>

        {/* Mobile: meta collected in a card at the end */}
        {meta.length > 0 && (
          <dl data-sheet-fade className="mt-6 flex flex-col gap-5 rounded-2xl bg-surface p-5 lg:hidden">
            {meta.map((m) => (
              <div key={m.label}>
                <dt className="text-sm text-gray">{m.label}</dt>
                <dd className="mt-1 text-base">{m.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <footer data-sheet-fade className="mt-6 flex items-center justify-between lg:mt-[110px]">
          {next ? (
            <Link
              to={`/work/${next.slug}`}
              className="group/pill inline-flex items-center gap-2.5 text-sm font-medium lg:h-[51px] lg:rounded-full lg:border lg:border-navy lg:px-6 lg:transition-colors lg:hover:bg-navy lg:hover:text-white"
            >
              <span>Next</span>
              <span aria-hidden className="size-1 rounded-full bg-current lg:hidden" />
              <span aria-hidden className="hidden lg:inline">•</span>
              <RollText>{next.title}</RollText>
            </Link>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => panel.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="group/pill inline-flex items-center gap-1.5 text-sm text-gray lg:h-[51px] lg:rounded-full lg:border lg:border-navy lg:px-6 lg:text-navy lg:transition-colors lg:hover:bg-navy lg:hover:text-white"
          >
            <RollText>Back to top</RollText>
            <ArrowIcon direction="right" className="-rotate-90 lg:hidden" />
          </button>
        </footer>
      </article>
    </Sheet>
  )
}
