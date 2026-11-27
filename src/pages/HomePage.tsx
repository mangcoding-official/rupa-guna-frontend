import { SectionRenderer } from '@/components/sections'
import { Seo } from '@/components/Seo'
import { TravelingMark } from '@/components/TravelingMark'
import { ErrorState, PageLoading } from '@/components/ui'
import { useGlobal, useHomePage } from '@/lib/queries'
import { SITE_URL, mediaUrl } from '@/lib/strapi'

export default function HomePage() {
  const { data: page, isPending, isError, refetch } = useHomePage()
  const { data: global } = useGlobal()

  if (isPending) return <PageLoading />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: global?.siteName ?? 'Rupa Guna',
    url: SITE_URL,
    logo: mediaUrl(global?.logo?.url),
    email: global?.email ?? undefined,
    telephone: global?.phone ?? undefined,
    address: global?.address ?? undefined,
    sameAs: global?.socialLinks?.map((s) => s.url),
  }

  return (
    <>
      <Seo seo={page.seo} jsonLd={organization} />
      <SectionRenderer sections={page.sections} chapters />
      <TravelingMark />
    </>
  )
}
