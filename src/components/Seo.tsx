import { useLocation } from 'react-router'
import { useGlobal } from '@/lib/queries'
import { SITE_URL, mediaUrl } from '@/lib/strapi'
import type { Seo as SeoFields } from '@/lib/types'

type Props = {
  /** Page title without the site name suffix. Omit on the home page. */
  title?: string | null
  description?: string | null
  /** Strapi `shared.seo` component — overrides title/description when filled. */
  seo?: SeoFields | null
  image?: string | null
  type?: 'website' | 'article'
  noIndex?: boolean
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

/**
 * Per-page metadata. React 19 hoists <title>, <meta> and <link> into <head>,
 * so no helmet library is needed.
 */
export function Seo({ title, description, seo, image, type = 'website', noIndex, jsonLd }: Props) {
  const { data: global } = useGlobal()
  const { pathname } = useLocation()

  const siteName = global?.siteName ?? 'Rupa Guna'
  const defaults = global?.defaultSeo
  const pageTitle = seo?.metaTitle || title
  const fullTitle = pageTitle ? (pageTitle.includes(siteName) ? pageTitle : `${pageTitle} — ${siteName}`) : defaults?.metaTitle || siteName
  const desc = seo?.metaDescription || description || defaults?.metaDescription || global?.siteDescription || ''
  const ogImage = mediaUrl(seo?.ogImage?.url) ?? image ?? mediaUrl(defaults?.ogImage?.url)
  const canonical = seo?.canonicalUrl || `${SITE_URL}${pathname === '/' ? '' : pathname}`
  const robots = noIndex || seo?.noIndex ? 'noindex, nofollow' : 'index, follow'

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_US" />
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
    </>
  )
}
