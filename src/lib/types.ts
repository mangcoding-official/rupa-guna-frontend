/**
 * Types for the Strapi v5 REST responses used by the site.
 * Mirrors apps/cms/src/api/** and apps/cms/src/components/** — keep both in sync.
 */

// ---------- Strapi primitives ----------
export type MediaFormat = { url: string; width: number; height: number }

export type Media = {
  id: number
  documentId: string
  url: string
  alternativeText: string | null
  caption: string | null
  width: number | null
  height: number | null
  mime: string
  formats: Partial<Record<'thumbnail' | 'small' | 'medium' | 'large', MediaFormat>> | null
}

export type Pagination = { page: number; pageSize: number; pageCount: number; total: number }
export type StrapiList<T> = { data: T[]; meta: { pagination: Pagination } }
export type StrapiSingle<T> = { data: T; meta: Record<string, never> }

type Doc = { id: number; documentId: string; createdAt: string; updatedAt: string; publishedAt: string }

// ---------- Strapi Blocks (rich text) ----------
export type TextNode = {
  type: 'text'
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  code?: boolean
}
export type LinkNode = { type: 'link'; url: string; children: TextNode[] }
export type InlineNode = TextNode | LinkNode
export type ListItemNode = { type: 'list-item'; children: InlineNode[] }
export type ListNode = { type: 'list'; format: 'ordered' | 'unordered'; children: (ListItemNode | ListNode)[] }
export type BlockNode =
  | { type: 'paragraph'; children: InlineNode[] }
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; children: InlineNode[] }
  | { type: 'quote'; children: InlineNode[] }
  | { type: 'code'; children: TextNode[] }
  | { type: 'image'; image: Pick<Media, 'url' | 'alternativeText' | 'width' | 'height'>; children: TextNode[] }
  | ListNode
export type Blocks = BlockNode[]

// ---------- shared components ----------
export type Seo = {
  metaTitle?: string | null
  metaDescription?: string | null
  ogImage?: Media | null
  canonicalUrl?: string | null
  noIndex?: boolean | null
}
export type LinkItem = { id: number; label: string; url: string; isExternal?: boolean | null }
export type Stat = { id: number; value: string; label: string }
export type Step = { id: number; title: string; description?: string | null }
export type Option = { id: number; label: string; value: string }
export type SocialPlatform =
  | 'instagram'
  | 'linkedin'
  | 'behance'
  | 'dribbble'
  | 'contra'
  | 'threads'
  | 'youtube'
  | 'tiktok'
  | 'x'
export type SocialLink = { id: number; platform: SocialPlatform; url: string }

// ---------- content blocks (case study dynamic zone) ----------
export type RichTextBlock = { __component: 'blocks.rich-text'; id: number; body: Blocks }
export type ImageFullBlock = { __component: 'blocks.image-full'; id: number; image: Media | null; caption?: string | null }
export type ImageGridBlock = {
  __component: 'blocks.image-grid'
  id: number
  images: Media[] | null
  columns: 'two' | 'three'
  caption?: string | null
}
export type VideoBlock = {
  __component: 'blocks.video'
  id: number
  embedUrl?: string | null
  file?: Media | null
  poster?: Media | null
  caption?: string | null
}
export type QuoteBlock = { __component: 'blocks.quote'; id: number; quote: string; author?: string | null; role?: string | null }
export type StatsBlock = { __component: 'blocks.stats'; id: number; title?: string | null; items: Stat[] }
export type CtaBlock = {
  __component: 'blocks.cta'
  id: number
  title: string
  description?: string | null
  button?: LinkItem | null
}
export type ContentBlock = RichTextBlock | ImageFullBlock | ImageGridBlock | VideoBlock | QuoteBlock | StatsBlock | CtaBlock

// ---------- page sections (home/about dynamic zones) ----------
export type HeroSection = {
  __component: 'sections.hero'
  id: number
  titleTop: string
  titleBottom?: string | null
  description?: string | null
  media?: Media | null
  mediaLink?: string | null
  /** Manifesto under the hero; *starred* words get the next of `statementImages` inline after them. */
  statementLabel?: string | null
  statement?: string | null
  statementImages?: Media[] | null
  /** Dictionary-style notes shown under the statement. */
  statementDefinitions?: { term: string; phonetic?: string; meaning: string }[] | null
}
export type FeaturedProjectsSection = {
  __component: 'sections.featured-projects'
  id: number
  label?: string | null
  title: string
  cta?: LinkItem | null
  limit?: number | null
}
/** One row of the home page services list (editorial copy; links to a service or any page). */
export type ServiceRow = {
  id: number
  title: string
  category?: string | null
  description?: string | null
  url: string
  /** Picture for the row's hover preview on the home page. */
  image?: Media | null
}
export type ServicesOverviewSection = {
  __component: 'sections.services-overview'
  id: number
  label?: string | null
  title: string
  cta?: LinkItem | null
  /** When empty, the list falls back to the Service collection. */
  items?: ServiceRow[]
}
export type ProcessSection = {
  __component: 'sections.process'
  id: number
  label?: string | null
  title: string
  steps: { id: number; title: string; description?: string | null }[]
  /** dark = navy card (Services), light = grey card (Products). */
  variant?: 'dark' | 'light' | null
  numbered?: boolean | null
}
export type ClientLogosSection = { __component: 'sections.client-logos'; id: number; title?: string | null }
export type TestimonialsSection = {
  __component: 'sections.testimonials'
  id: number
  title?: string | null
  background?: Media | null
  testimonials: Testimonial[]
}
export type FaqItem = { id: number; question: string; answer: string }
export type FaqSection = { __component: 'sections.faq'; id: number; label?: string | null; title: string; items: FaqItem[] }
export type TextMediaSection = {
  __component: 'sections.text-media'
  id: number
  eyebrow?: string | null
  title: string
  body?: Blocks | null
  media?: Media | null
  mediaPosition: 'left' | 'right'
}
export type ValuesSection = {
  __component: 'sections.values'
  id: number
  label?: string | null
  title: string
  subtitle?: string | null
  items: Step[]
}
export type TeamSection = { __component: 'sections.team'; id: number; label?: string | null; title: string; subtitle?: string | null }
export type FeatureCardSection = {
  __component: 'sections.feature-card'
  id: number
  label?: string | null
  title: string
  text?: string | null
  image?: Media | null
}
export type LatestArticlesSection = { __component: 'sections.latest-articles'; id: number; title: string; limit?: number | null }
export type PageSection =
  | HeroSection
  | FeaturedProjectsSection
  | ServicesOverviewSection
  | ProcessSection
  | ClientLogosSection
  | TestimonialsSection
  | TextMediaSection
  | ValuesSection
  | TeamSection
  | FeatureCardSection
  | LatestArticlesSection
  | FaqSection
  | StatsBlock
  | CtaBlock

// ---------- collection types ----------
export type Industry = Doc & { name: string; slug: string }
export type Client = Doc & { name: string; logo: Media | null; website?: string | null; showInLogoWall: boolean; order: number }
export type Testimonial = Doc & {
  quote: string
  authorName: string
  authorRole?: string | null
  avatar?: Media | null
  client?: Pick<Client, 'name'> | null
}
export type Service = Doc & {
  title: string
  slug: string
  tagline?: string | null
  category?: string | null
  shortDescription?: string | null
  heroMedia?: Media | null
  accentColor?: string | null
  bestFor?: { id: number; text: string }[]
  programs?: Step[]
  description?: Blocks | null
  icon?: Media | null
  deliverables?: { id: number; text: string }[]
  process?: Step[]
  startingPrice?: string | null
  projects?: ProjectSummary[]
  order: number
  seo?: Seo | null
}
/** Mirrors the "Work Detail" frames in Figma. */
export type ProjectSummary = Doc & {
  title: string
  slug: string
  category?: string | null
  year?: number | null
  cover?: Media | null
  /** Colour block shown while a project has no cover yet (Figma placeholders). */
  accentColor?: string | null
  excerpt?: string | null
  industry?: { name: string; slug?: string } | null
}
type ListText = { id: number; text: string }
export type Project = ProjectSummary & {
  subtitle?: string | null
  client?: Pick<Client, 'name'> | null
  industry?: Pick<Industry, 'name' | 'slug'> | null
  services?: Pick<Service, 'title' | 'slug'>[]
  disciplines?: ListText[]
  tags?: ListText[]
  team?: ListText[]
  tools?: ListText[]
  heroMedia?: Media | null
  storyLead?: string | null
  story?: (RichTextBlock | ImageFullBlock | QuoteBlock)[]
  gallery?: (ImageFullBlock | ImageGridBlock | VideoBlock | RichTextBlock)[]
  results?: Stat[]
  testimonial?: Testimonial | null
  seo?: Seo | null
}
export type TeamMember = Doc & {
  name: string
  role: string
  photo?: Media | null
  bio?: string | null
  socialLinks?: SocialLink[]
}
export type Category = Doc & { name: string; slug: string }
export type ArticleSummary = Doc & {
  title: string
  slug: string
  excerpt?: string | null
  cover?: Media | null
  readingTime?: number | null
  category?: Pick<Category, 'name' | 'slug'> | null
  author?: Pick<TeamMember, 'name' | 'role'> | null
}
export type Article = ArticleSummary & { content: Blocks; seo?: Seo | null }
export type JobSummary = Doc & {
  title: string
  slug: string
  department?: string | null
  location?: string | null
  employmentType: 'full-time' | 'part-time' | 'contract' | 'internship'
  workMode: 'onsite' | 'hybrid' | 'remote'
  summary?: string | null
  isOpen: boolean
}
export type Job = JobSummary & { description?: Blocks | null; seo?: Seo | null }

// ---------- single types ----------
export type Global = Doc & {
  siteName: string
  siteDescription?: string | null
  logo?: Media | null
  navigation: LinkItem[]
  headerCta?: LinkItem | null
  footerTagline?: string | null
  footerTitle?: string | null
  footerCta?: LinkItem | null
  coordinates?: string | null
  copyrightName?: string | null
  footerLinks: LinkItem[]
  email?: string | null
  phone?: string | null
  whatsappNumber?: string | null
  whatsappMessage?: string | null
  address?: string | null
  socialLinks: SocialLink[]
  defaultSeo?: Seo | null
}
export type HomePage = Doc & { sections: PageSection[]; seo?: Seo | null }
/** Figma "Work · Desktop 1440" / "Work · Mobile 390". Filter `value` matches Project.category. */
export type WorkPage = Doc & {
  label?: string | null
  title: string
  description?: string | null
  selectedLabel?: string | null
  indexLabel?: string | null
  filters?: Option[]
  seo?: Seo | null
}
/** Figma "Services · Desktop 1440" / "Services · Mobile 390". */
export type ServicesPage = Doc & {
  label?: string | null
  title: string
  description?: string | null
  cta?: LinkItem | null
  servicesLabel?: string | null
  sections: PageSection[]
  seo?: Seo | null
}
export type AboutPage = Doc & {
  label?: string | null
  title: string
  intro?: string | null
  image?: Media | null
  /** Bridging text over the full-screen studio image, leading into the story. */
  storyLabel?: string | null
  storyHeadline?: string | null
  body?: Blocks | null
  sections: PageSection[]
  seo?: Seo | null
}
/** Figma "Products · Desktop 1440" / "Products · Mobile 390". `group` matches a page filter value. */
export type Product = Doc & {
  title: string
  slug: string
  category?: string | null
  group?: string | null
  price?: string | null
  description?: string | null
  cover?: Media | null
  accentColor?: string | null
  url?: string | null
  order: number
}
export type ProductsPage = Doc & {
  label?: string | null
  title: string
  description?: string | null
  filterLabel?: string | null
  filters?: Option[]
  sections: PageSection[]
  seo?: Seo | null
}
export type ContactPage = Doc & {
  title: string
  subtitle?: string | null
  serviceOptions: Option[]
  budgetOptions: Option[]
  timelineOptions: Option[]
  successTitle?: string | null
  successMessage?: string | null
  seo?: Seo | null
}
export type PrivacyPage = Doc & { title: string; content: Blocks; seo?: Seo | null }
