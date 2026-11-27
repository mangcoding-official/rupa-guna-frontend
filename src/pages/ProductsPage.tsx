import { useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { FilterChips, FilterList, type FilterOption } from '@/components/Filters'
import { PageIntro } from '@/components/PageIntro'
import { SectionRenderer } from '@/components/sections'
import { Seo } from '@/components/Seo'
import { ProjectCover } from '@/components/StrapiImage'
import { ErrorState, PageLoading } from '@/components/ui'
import { gsap, ScrollTrigger, useGSAP, useReveal } from '@/lib/gsap'
import { useProducts, useProductsPage } from '@/lib/queries'
import { SITE_URL } from '@/lib/strapi'
import type { Product, ProductsPage as ProductsPageData } from '@/lib/types'
import { useMediaQuery } from '@/lib/useMediaQuery'

/**
 * Products — Figma "Products · Desktop 1440" (183:4983) and "Products · Mobile 390" (206:1587).
 * Intro, filterable product grid (?category=), then the page sections ("Why our products").
 */
export default function ProductsPage() {
  const { data: page, isPending, isError, refetch } = useProductsPage()
  const { data: products, isPending: productsPending } = useProducts()

  if (isPending || productsPending) return <PageLoading />
  if (isError || !page) return <ErrorState onRetry={() => refetch()} />

  const list = products ?? []
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: page.title,
    url: `${SITE_URL}/products`,
    itemListElement: list.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: { '@type': 'Product', name: p.title, category: p.category ?? undefined, description: p.description ?? undefined },
    })),
  }

  return (
    <>
      <Seo title="Products" description={page.description} seo={page.seo} jsonLd={jsonLd} />
      <PageIntro label={page.label ?? 'Products'} title={page.title} description={page.description} className="lg:pb-[100px]" />
      <ProductGrid page={page} products={list} />
      <SectionRenderer sections={page.sections} />
    </>
  )
}

function ProductGrid({ page, products }: { page: ProductsPageData; products: Product[] }) {
  const scope = useRef<HTMLElement>(null)
  const isDesktop = useMediaQuery('(min-width: 1200px)')
  const [params, setParams] = useSearchParams()
  const filters = page.filters ?? []
  const requested = params.get('category')
  const active = filters.some((f) => f.value === requested) ? requested : null
  const shown = active ? products.filter((p) => p.group === active) : products
  const label = page.filterLabel ?? 'Product'

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
      if (firstRun.current) {
        firstRun.current = false
        return
      }
      const target = scope.current?.querySelector('[data-filter-results]')
      if (target) gsap.fromTo(target, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', clearProps: 'transform' })
      requestAnimationFrame(() => ScrollTrigger.refresh())
    },
    { scope, dependencies: [active] },
  )

  const options: FilterOption[] = [
    { label: isDesktop ? `All (${products.length} Products)` : 'All', value: null, count: isDesktop ? undefined : products.length },
    ...filters.map((f) => ({ label: f.label, value: f.value })),
  ]

  return (
    <section ref={scope} aria-label={label} className="container-site pb-12 lg:pt-[60px] lg:pb-[60px]">
      {!isDesktop && <FilterChips options={options} active={active} onSelect={select} />}
      <div className="section-grid gap-y-7 pt-12 lg:pt-0">
        <div>
          <p className="text-sm text-label lg:text-gray">{label}</p>
          {isDesktop && <FilterList options={options} active={active} onSelect={select} />}
        </div>
        <div data-filter-results>
          {shown.length ? (
            <ProductCards key={active ?? 'all'} products={shown} />
          ) : (
            <p className="rounded-2xl bg-surface p-10 text-center text-sm text-label">No products in this category yet.</p>
          )}
        </div>
      </div>
    </section>
  )
}

function ProductCards({ products }: { products: Product[] }) {
  const scope = useRef<HTMLUListElement>(null)
  useReveal(scope)
  return (
    <ul ref={scope} className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-3 lg:gap-x-5 lg:gap-y-[50px]">
      {products.map((p, i) => (
        <li key={p.documentId} data-reveal data-reveal-delay={String((i % 3) * 0.08)}>
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  )
}

function ProductCard({ product }: { product: Product }) {
  const inner = (
    <>
      <div className="aspect-167/165 overflow-hidden rounded-2xl md:aspect-square">
        <ProjectCover
          project={{ title: product.category ?? product.title, cover: product.cover, accentColor: product.accentColor }}
          sizes="(min-width: 1200px) 317px, (min-width: 768px) 33vw, 50vw"
          className="size-full transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] pointer-fine:group-hover/prod:scale-[1.04]"
        />
      </div>
      <div className="mt-2 lg:mt-[11px]">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-navy">{product.title}</p>
          <p className="hidden shrink-0 text-sm font-medium text-navy md:block">{product.price || '$ —'}</p>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 md:mt-0.5">
          {product.category && <p className="text-xs text-gray lg:text-sm">{product.category}</p>}
          <p className="shrink-0 text-sm font-medium text-navy md:hidden">{product.price || '$ —'}</p>
        </div>
      </div>
    </>
  )
  return product.url ? (
    <a href={product.url} target="_blank" rel="noreferrer" className="group/prod block">
      {inner}
    </a>
  ) : (
    <div className="group/prod">{inner}</div>
  )
}
