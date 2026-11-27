import { isRouteErrorResponse, useLocation, useRouteError } from 'react-router'
import { Seo } from '@/components/Seo'
import { PillLink } from '@/components/ui'

function StatusLayout({ label, title, body }: { label: string; title: string; body: string }) {
  return (
    <section className="container-site py-16 lg:py-32">
      <div className="section-grid">
        <p className="label lg:pt-1">{label}</p>
        <div>
          <h1 className="display max-w-[660px] text-2xl lg:text-[32px]">{title}</h1>
          <p className="mt-4 max-w-md text-sm text-label">{body}</p>
          <PillLink link={{ label: 'Back to home', url: '/' }} className="mt-8" />
        </div>
      </div>
    </section>
  )
}

export function NotFoundPage() {
  return (
    <>
      <Seo title="Page not found" noIndex />
      <StatusLayout label="404" title="This page doesn’t exist." body="The link may have changed. Start again from the home page." />
    </>
  )
}

/** Pages from the sitemap that are not built yet — keeps the navigation from dead-ending. */
export function ComingSoonPage() {
  const { pathname } = useLocation()
  return (
    <>
      <Seo title="Coming soon" noIndex />
      <StatusLayout label={pathname} title="We’re still crafting this page." body="It is being built from the Figma design. Check back soon." />
    </>
  )
}

export function RouteErrorPage() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />
  return <StatusLayout label="Error" title="Something went wrong." body="Reload the page or head back home." />
}
