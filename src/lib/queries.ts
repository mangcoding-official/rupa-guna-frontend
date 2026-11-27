import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { strapiGet } from './strapi'
import type {
  AboutPage,
  Article,
  ArticleSummary,
  Category,
  Client,
  ContactPage,
  Global,
  HomePage,
  Industry,
  Job,
  JobSummary,
  PrivacyPage,
  Project,
  ProjectSummary,
  Service,
  StrapiList,
  StrapiSingle,
  TeamMember,
  Product,
  ProductsPage,
  ServicesPage,
  WorkPage,
} from './types'

// ---------- shared populate fragments ----------
const seo = { populate: { ogImage: true } }
const media = true

const projectCard = {
  fields: ['title', 'slug', 'category', 'year', 'excerpt', 'accentColor'],
  populate: { cover: media, industry: { fields: ['name', 'slug'] } },
}

const articleCard = {
  fields: ['title', 'slug', 'excerpt', 'readingTime', 'publishedAt'],
  populate: { cover: media, category: { fields: ['name', 'slug'] }, author: { fields: ['name', 'role'] } },
}

const sections = {
  on: {
    'sections.hero': { populate: { media, statementImages: media } },
    'sections.featured-projects': { populate: { cta: true } },
    'sections.services-overview': { populate: { cta: true, items: { populate: { image: media } } } },
    'sections.client-logos': true,
    'sections.testimonials': {
      populate: { background: media, testimonials: { populate: { avatar: media, client: { fields: ['name'] } } } },
    },
    'sections.faq': { populate: { items: true } },
    'sections.text-media': { populate: { media } },
    'sections.values': { populate: { items: true } },
    'sections.team': true,
    'sections.latest-articles': true,
    'blocks.stats': { populate: { items: true } },
    'blocks.cta': { populate: { button: true } },
  },
}

/** The Services page zone only allows these components (Strapi rejects populating others). */
const servicesPageSections = {
  on: {
    'sections.process': { populate: { steps: true } },
    'sections.faq': sections.on['sections.faq'],
    'sections.testimonials': sections.on['sections.testimonials'],
    'blocks.cta': sections.on['blocks.cta'],
  },
}

/** Each dynamic zone may only populate its own components. */
const pick = (...keys: (keyof typeof sections.on)[]) => ({ on: Object.fromEntries(keys.map((k) => [k, sections.on[k]])) })
/** About zone: the shared sections it allows, plus the feature card (populated only here). */
const aboutSections = {
  on: {
    'sections.feature-card': { populate: { image: media } },
    ...pick(
      'sections.hero',
      'sections.featured-projects',
      'sections.services-overview',
      'sections.client-logos',
      'sections.testimonials',
      'sections.text-media',
      'sections.values',
      'sections.team',
      'sections.latest-articles',
      'blocks.stats',
      'blocks.cta',
      'sections.faq',
    ).on,
  },
}
const productsPageSections = {
  on: { 'sections.process': { populate: { steps: true } }, ...pick('sections.faq', 'blocks.cta').on },
}

const storyBlocks = {
  on: {
    'blocks.rich-text': true,
    'blocks.image-full': { populate: { image: media } },
    'blocks.quote': true,
  },
}

const galleryBlocks = {
  on: {
    'blocks.image-full': { populate: { image: media } },
    'blocks.image-grid': { populate: { images: media } },
    'blocks.video': { populate: { file: media, poster: media } },
    'blocks.rich-text': true,
  },
}

const first = <T,>(res: StrapiList<T>) => res.data[0] ?? null

// ---------- single types ----------
export const useGlobal = () =>
  useQuery({
    queryKey: ['global'],
    queryFn: ({ signal }) =>
      strapiGet<StrapiSingle<Global>>(
        '/global',
        {
          populate: {
            logo: media,
            navigation: true,
            headerCta: true,
            footerCta: true,
            footerLinks: true,
            socialLinks: true,
            defaultSeo: seo,
          },
        },
        signal,
      ).then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  })

/** Shared so the preloader can prefetch the home page (and its hero image) before the page renders. */
/** Home zone: the shared sections plus the process ("How we work"). */
const homeSections = { on: { ...sections.on, 'sections.process': { populate: { steps: true } } } }

export const homePageQuery = {
  queryKey: ['home-page'],
  queryFn: ({ signal }: { signal?: AbortSignal }) =>
    strapiGet<StrapiSingle<HomePage>>('/home-page', { populate: { sections: homeSections, seo } }, signal).then((r) => r.data),
}

export const useHomePage = () => useQuery(homePageQuery)

export const useWorkPage = () =>
  useQuery({
    queryKey: ['work-page'],
    queryFn: ({ signal }) =>
      strapiGet<StrapiSingle<WorkPage>>('/work-page', { populate: { filters: true, seo } }, signal).then((r) => r.data),
  })

export const useServicesPage = () =>
  useQuery({
    queryKey: ['services-page'],
    queryFn: ({ signal }) =>
      strapiGet<StrapiSingle<ServicesPage>>(
        '/services-page',
        { populate: { cta: true, sections: servicesPageSections, seo } },
        signal,
      ).then((r) => r.data),
  })

export const useProductsPage = () =>
  useQuery({
    queryKey: ['products-page'],
    queryFn: ({ signal }) =>
      strapiGet<StrapiSingle<ProductsPage>>(
        '/products-page',
        { populate: { filters: true, sections: productsPageSections, seo } },
        signal,
      ).then((r) => r.data),
  })

export const useProducts = () =>
  useQuery({
    queryKey: ['products'],
    queryFn: ({ signal }) =>
      strapiGet<StrapiList<Product>>('/products', { populate: { cover: media }, sort: ['order:asc'], pagination: { pageSize: 100 } }, signal).then(
        (r) => r.data,
      ),
  })

export const useAboutPage = () =>
  useQuery({
    queryKey: ['about-page'],
    queryFn: ({ signal }) =>
      strapiGet<StrapiSingle<AboutPage>>('/about-page', { populate: { image: media, sections: aboutSections, seo } }, signal).then((r) => r.data),
  })

export const useContactPage = () =>
  useQuery({
    queryKey: ['contact-page'],
    queryFn: ({ signal }) =>
      strapiGet<StrapiSingle<ContactPage>>(
        '/contact-page',
        { populate: { serviceOptions: true, budgetOptions: true, timelineOptions: true, seo } },
        signal,
      ).then((r) => r.data),
  })

export const usePrivacyPage = () =>
  useQuery({
    queryKey: ['privacy-page'],
    queryFn: ({ signal }) =>
      strapiGet<StrapiSingle<PrivacyPage>>('/privacy-page', { populate: { seo } }, signal).then((r) => r.data),
  })

// ---------- projects ----------
type ProjectFilters = { service?: string; industry?: string; featured?: boolean; limit?: number; excludeSlug?: string }

export const useProjects = (filters: ProjectFilters = {}) =>
  useQuery<ProjectSummary[]>({
    queryKey: ['projects', filters],
    queryFn: ({ signal }) =>
      strapiGet<StrapiList<ProjectSummary>>(
        '/projects',
        {
          ...projectCard,
          sort: ['order:asc', 'year:desc'],
          filters: {
            ...(filters.service ? { services: { slug: { $eq: filters.service } } } : {}),
            ...(filters.industry ? { industry: { slug: { $eq: filters.industry } } } : {}),
            ...(filters.featured ? { featured: { $eq: true } } : {}),
            ...(filters.excludeSlug ? { slug: { $ne: filters.excludeSlug } } : {}),
          },
          pagination: { pageSize: filters.limit ?? 100 },
        },
        signal,
      ).then((r) => r.data),
    placeholderData: keepPreviousData,
  })

export const useProject = (slug: string) =>
  useQuery({
    queryKey: ['project', slug],
    queryFn: ({ signal }) =>
      strapiGet<StrapiList<Project>>(
        '/projects',
        {
          filters: { slug: { $eq: slug } },
          populate: {
            cover: media,
            heroMedia: media,
            client: { fields: ['name'] },
            industry: { fields: ['name', 'slug'] },
            services: { fields: ['title', 'slug'] },
            disciplines: true,
            tags: true,
            team: true,
            tools: true,
            story: storyBlocks,
            gallery: galleryBlocks,
            results: true,
            testimonial: { populate: { avatar: media, client: { fields: ['name'] } } },
            seo,
          },
        },
        signal,
      ).then(first),
  })

// ---------- services ----------
export const useServices = () =>
  useQuery({
    queryKey: ['services'],
    queryFn: ({ signal }) =>
      strapiGet<StrapiList<Service>>(
        '/services',
        {
          fields: ['title', 'slug', 'tagline', 'category', 'shortDescription', 'startingPrice', 'order'],
          populate: { icon: media, deliverables: true },
          sort: ['order:asc'],
        },
        signal,
      ).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

export const useService = (slug: string) =>
  useQuery({
    queryKey: ['service', slug],
    queryFn: ({ signal }) =>
      strapiGet<StrapiList<Service>>(
        '/services',
        {
          filters: { slug: { $eq: slug } },
          populate: { icon: media, heroMedia: media, bestFor: true, programs: true, seo },
        },
        signal,
      ).then(first),
  })

export const useIndustries = () =>
  useQuery({
    queryKey: ['industries'],
    queryFn: ({ signal }) =>
      strapiGet<StrapiList<Industry>>('/industries', { fields: ['name', 'slug'], sort: ['name:asc'] }, signal).then(
        (r) => r.data,
      ),
    staleTime: 5 * 60 * 1000,
  })

// ---------- people & clients ----------
export const useClients = () =>
  useQuery({
    queryKey: ['clients'],
    queryFn: ({ signal }) =>
      strapiGet<StrapiList<Client>>(
        '/clients',
        { filters: { showInLogoWall: { $eq: true } }, populate: { logo: media }, sort: ['order:asc'] },
        signal,
      ).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

export const useTeam = () =>
  useQuery({
    queryKey: ['team'],
    queryFn: ({ signal }) =>
      strapiGet<StrapiList<TeamMember>>(
        '/team-members',
        { populate: { photo: media, socialLinks: true }, sort: ['order:asc'] },
        signal,
      ).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

// ---------- insights ----------
export const useArticles = (opts: { category?: string; page?: number; pageSize?: number; excludeSlug?: string } = {}) =>
  useQuery<StrapiList<ArticleSummary>>({
    queryKey: ['articles', opts],
    queryFn: ({ signal }) =>
      strapiGet<StrapiList<ArticleSummary>>(
        '/articles',
        {
          ...articleCard,
          sort: ['publishedAt:desc'],
          filters: {
            ...(opts.category ? { category: { slug: { $eq: opts.category } } } : {}),
            ...(opts.excludeSlug ? { slug: { $ne: opts.excludeSlug } } : {}),
          },
          pagination: { page: opts.page ?? 1, pageSize: opts.pageSize ?? 9 },
        },
        signal,
      ),
    placeholderData: keepPreviousData,
  })

export const useArticle = (slug: string) =>
  useQuery({
    queryKey: ['article', slug],
    queryFn: ({ signal }) =>
      strapiGet<StrapiList<Article>>(
        '/articles',
        {
          filters: { slug: { $eq: slug } },
          populate: { cover: media, category: { fields: ['name', 'slug'] }, author: { fields: ['name', 'role'] }, seo },
        },
        signal,
      ).then(first),
  })

export const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) =>
      strapiGet<StrapiList<Category>>('/categories', { fields: ['name', 'slug'], sort: ['name:asc'] }, signal).then(
        (r) => r.data,
      ),
    staleTime: 5 * 60 * 1000,
  })

// ---------- careers ----------
export const useJobs = () =>
  useQuery({
    queryKey: ['jobs'],
    queryFn: ({ signal }) =>
      strapiGet<StrapiList<JobSummary>>(
        '/jobs',
        {
          fields: ['title', 'slug', 'department', 'location', 'employmentType', 'workMode', 'summary', 'isOpen'],
          filters: { isOpen: { $eq: true } },
          sort: ['title:asc'],
        },
        signal,
      ).then((r) => r.data),
  })

export const useJob = (slug: string) =>
  useQuery({
    queryKey: ['job', slug],
    queryFn: ({ signal }) =>
      strapiGet<StrapiList<Job>>('/jobs', { filters: { slug: { $eq: slug } }, populate: { seo } }, signal).then(first),
  })
