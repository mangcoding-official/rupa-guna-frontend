/**
 * Post-build SEO step (runs after `vite build`):
 *
 *   1. Writes a copy of dist/index.html for every public route (dist/about/index.html,
 *      dist/work/<slug>/index.html, …) with that page's <title>, description, canonical, Open Graph,
 *      Twitter and robots tags already in the HTML. Crawlers that do not run JavaScript (WhatsApp,
 *      LinkedIn, Facebook, X, Slack, parts of Bing) then see the right metadata for each URL instead
 *      of the home page's. The app itself is unchanged: React still renders and owns the head at runtime.
 *   2. Writes dist/sitemap.xml and dist/robots.txt.
 *
 * Content comes from Strapi at build time, so publish → rebuild (Strapi webhook → host deploy hook).
 * If Strapi cannot be reached the build still succeeds: static routes are written with fallback
 * metadata and a warning is printed.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import qs from 'qs'
import { loadEnv } from 'vite'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const env = { ...loadEnv(process.env.MODE ?? 'production', root, 'VITE_'), ...process.env }

const STRAPI_URL = (env.VITE_STRAPI_URL ?? 'http://localhost:1337').replace(/\/$/, '')
const SITE_URL = (env.VITE_SITE_URL ?? '').replace(/\/$/, '')
if (!SITE_URL || SITE_URL.includes('localhost')) {
  console.warn(`[seo] VITE_SITE_URL is "${SITE_URL || '(empty)'}" — set it to the public domain for production builds.`)
}

// ---------- Strapi ----------
const get = async (path, query) => {
  const search = query ? `?${qs.stringify(query, { encodeValuesOnly: true })}` : ''
  const res = await fetch(`${STRAPI_URL}/api${path}${search}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`${path} → ${res.status}`)
  return (await res.json()).data
}
/** A single type or list that is allowed to be missing (e.g. not published yet). */
const optional = (promise) => promise.catch((err) => (console.warn(`[seo] skipped ${err.message}`), null))
const getAll = async (path, query) => {
  const items = []
  for (let page = 1; ; page++) {
    const search = qs.stringify({ ...query, pagination: { page, pageSize: 100 } }, { encodeValuesOnly: true })
    const res = await fetch(`${STRAPI_URL}/api${path}?${search}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw new Error(`${path} → ${res.status}`)
    const body = await res.json()
    items.push(...body.data)
    if (page >= (body.meta?.pagination?.pageCount ?? 1)) return items
  }
}

const seo = { populate: { ogImage: true } }
const mediaUrl = (url) => (!url ? undefined : /^https?:\/\//.test(url) ? url : `${STRAPI_URL}${url}`)
const imageOf = (media) => mediaUrl(media?.formats?.large?.url ?? media?.url)

// ---------- HTML ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function headFor(page, site) {
  const pageTitle = page.seo?.metaTitle || page.title
  const title = pageTitle ? (pageTitle.includes(site.name) ? pageTitle : `${pageTitle} — ${site.name}`) : site.defaultTitle
  const description = page.seo?.metaDescription || page.description || site.description
  const canonical = page.seo?.canonicalUrl || `${SITE_URL}${page.path === '/' ? '' : page.path}`
  const image = mediaUrl(page.seo?.ogImage?.url) ?? page.image ?? site.image
  const noIndex = page.noIndex || page.seo?.noIndex
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta name="robots" content="${noIndex ? 'noindex, nofollow' : 'index, follow'}" />`,
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:type" content="${page.type ?? 'website'}" />`,
    `<meta property="og:site_name" content="${esc(site.name)}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    image && `<meta property="og:image" content="${esc(image)}" />`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    image && `<meta name="twitter:image" content="${esc(image)}" />`,
    page.jsonLd && `<script type="application/ld+json">${JSON.stringify(page.jsonLd).replace(/</g, '\\u003c')}</script>`,
  ]
    .filter(Boolean)
    .map((line) => `    ${line.replace(/^(<\w+)/, '$1 data-seo-static')}`)
    .join('\n')
}

const START = '<!-- seo:start -->'
const END = '<!-- seo:end -->'

// ---------- run ----------
const template = await readFile(join(dist, 'index.html'), 'utf8')
if (!template.includes(START) || !template.includes(END)) throw new Error('[seo] index.html is missing the seo:start / seo:end markers')

let data = {}
try {
  const [global, home, work, services, products, about, contact, privacy, projects, serviceList] = await Promise.all([
    get('/global', { populate: { defaultSeo: seo } }),
    optional(get('/home-page', { populate: { seo } })),
    optional(get('/work-page', { populate: { seo } })),
    optional(get('/services-page', { populate: { seo } })),
    optional(get('/products-page', { populate: { seo } })),
    optional(get('/about-page', { populate: { seo, image: true } })),
    optional(get('/contact-page', { populate: { seo } })),
    optional(get('/privacy-page', { populate: { seo } })),
    optional(getAll('/projects', { fields: ['title', 'slug', 'excerpt', 'storyLead', 'year', 'updatedAt'], populate: { seo, cover: true, heroMedia: true } })),
    optional(getAll('/services', { fields: ['title', 'slug', 'shortDescription', 'tagline', 'updatedAt'], populate: { seo, heroMedia: true } })),
  ])
  data = { global, home, work, services, products, about, contact, privacy, projects: projects ?? [], serviceList: serviceList ?? [] }
} catch (err) {
  console.warn(`[seo] Strapi unreachable at ${STRAPI_URL} (${err.message}); writing static routes with fallback metadata.`)
}

const { global, home, work, services, products, about, contact, privacy, projects = [], serviceList = [] } = data
const site = {
  name: global?.siteName ?? 'Rupa Guna',
  defaultTitle: global?.defaultSeo?.metaTitle || 'Rupa Guna — Beauty with purpose',
  description:
    global?.defaultSeo?.metaDescription ||
    global?.siteDescription ||
    'Rupa Guna is a design studio that helps founders give their company a form worth looking at and a purpose worth remembering.',
  image: mediaUrl(global?.defaultSeo?.ogImage?.url),
}
const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: site.name,
  url: SITE_URL || undefined,
  description: site.description,
  logo: SITE_URL ? `${SITE_URL}/assets/logo-stacked.svg` : undefined,
  email: global?.email ?? undefined,
  sameAs: global?.socialLinks?.map((s) => s.url).filter(Boolean),
}

/** `sitemap: false` keeps a route out of the sitemap (thin or duplicate pages). */
const pages = [
  { path: '/', seo: home?.seo, jsonLd: organization, lastmod: home?.updatedAt, priority: '1.0' },
  { path: '/work', title: 'Work', description: work?.description, seo: work?.seo, lastmod: work?.updatedAt, priority: '0.9' },
  { path: '/services', title: 'Services', description: services?.description, seo: services?.seo, lastmod: services?.updatedAt, priority: '0.9' },
  { path: '/products', title: 'Products', description: products?.description, seo: products?.seo, lastmod: products?.updatedAt, priority: '0.7' },
  { path: '/about', title: 'About', description: about?.intro, seo: about?.seo, image: imageOf(about?.image), lastmod: about?.updatedAt, priority: '0.8' },
  { path: '/contact', title: contact?.title ?? 'Contact', description: contact?.subtitle, seo: contact?.seo, sitemap: false },
  { path: '/privacy-policy', title: privacy?.title ?? 'Privacy Policy', seo: privacy?.seo, lastmod: privacy?.updatedAt, priority: '0.2' },
  // Not built yet ("Coming soon"): reachable, but kept out of the index.
  ...['/insights', '/careers'].map((path) => ({ path, title: 'Coming soon', noIndex: true, sitemap: false })),
  ...projects.map((p) => ({
    path: `/work/${p.slug}`,
    title: p.title,
    description: p.excerpt ?? p.storyLead,
    seo: p.seo,
    image: imageOf(p.heroMedia) ?? imageOf(p.cover),
    type: 'article',
    lastmod: p.updatedAt,
    priority: '0.7',
  })),
  ...serviceList.map((s) => ({
    path: `/services/${s.slug}`,
    title: s.title,
    description: s.shortDescription ?? s.tagline,
    seo: s.seo,
    image: imageOf(s.heroMedia),
    lastmod: s.updatedAt,
    priority: '0.8',
  })),
]

for (const page of pages) {
  const html = template.replace(new RegExp(`${START}[\\s\\S]*?${END}`), `${START}\n${headFor(page, site)}\n    ${END}`)
  const file = page.path === '/' ? join(dist, 'index.html') : join(dist, page.path, 'index.html')
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, html)
}

// Pages that set noindex (or a canonical pointing elsewhere) in Strapi stay out of the sitemap.
const indexable = pages.filter((p) => p.sitemap !== false && !p.noIndex && !p.seo?.noIndex && !p.seo?.canonicalUrl)
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable
  .map((p) =>
    [
      '  <url>',
      `    <loc>${esc(`${SITE_URL}${p.path === '/' ? '' : p.path}` || '/')}</loc>`,
      p.lastmod && `    <lastmod>${p.lastmod.slice(0, 10)}</lastmod>`,
      p.priority && `    <priority>${p.priority}</priority>`,
      '  </url>',
    ]
      .filter(Boolean)
      .join('\n'),
  )
  .join('\n')}
</urlset>
`
await writeFile(join(dist, 'sitemap.xml'), sitemap)
await writeFile(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`)

console.log(`[seo] wrote ${pages.length} pages, sitemap with ${indexable.length} URLs, robots.txt`)
