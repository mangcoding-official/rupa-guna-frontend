import { useRef } from 'react'
import { BlocksRenderer } from '@/components/BlocksRenderer'
import { PageIntro } from '@/components/PageIntro'
import { Seo } from '@/components/Seo'
import { ErrorState, PageLoading } from '@/components/ui'
import { useReveal } from '@/lib/gsap'
import { usePrivacyPage } from '@/lib/queries'

/** Privacy Policy — no Figma frame; set in the same grid and type scale as the other inner pages. */
export default function PrivacyPage() {
  const { data: page, isPending, isError, refetch } = usePrivacyPage()
  const scope = useRef<HTMLElement>(null)
  useReveal(scope, [page?.documentId])

  if (isPending) return <PageLoading />
  if (isError || !page) return <ErrorState onRetry={() => refetch()} />

  const updated = page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null

  return (
    <>
      <Seo title={page.title} seo={page.seo} />
      <PageIntro label="Legal" title={page.title} description={updated ? `Last updated ${updated}` : null} className="lg:pb-20" compact />
      <section ref={scope} className="container-site pb-12 lg:pb-[120px]">
        <div className="section-grid">
          <span className="hidden lg:block" />
          <div data-reveal className="max-w-[680px]">
            <BlocksRenderer content={page.content} />
          </div>
        </div>
      </section>
    </>
  )
}
