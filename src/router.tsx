import { createBrowserRouter } from 'react-router'
import { RootLayout } from '@/components/layout'
import AboutPage from '@/pages/AboutPage'
import HomePage from '@/pages/HomePage'
import WorkDetailPage from '@/pages/WorkDetailPage'
import WorkPage from '@/pages/WorkPage'
import PrivacyPage from '@/pages/PrivacyPage'
import ProductsPage from '@/pages/ProductsPage'
import ServiceDetailPage from '@/pages/ServiceDetailPage'
import ServicesPage from '@/pages/ServicesPage'
import { ComingSoonPage, NotFoundPage, RouteErrorPage } from '@/pages/StatusPages'

/**
 * Routes from the PRD sitemap. Pages not built yet render <ComingSoonPage />
 * so header/footer links never dead-end; swap each one for its page as it lands.
 */
export const router = createBrowserRouter([
  {
    Component: RootLayout,
    ErrorBoundary: RouteErrorPage,
    children: [
      { index: true, Component: HomePage },
      { path: 'work', Component: WorkPage },
      { path: 'work/:slug', Component: WorkDetailPage },
      { path: 'services', Component: ServicesPage },
      { path: 'services/:slug', Component: ServiceDetailPage },
      { path: 'products', Component: ProductsPage },
      { path: 'about', Component: AboutPage },
      { path: 'insights', Component: ComingSoonPage },
      { path: 'insights/:slug', Component: ComingSoonPage },
      { path: 'careers', Component: ComingSoonPage },
      { path: 'careers/:slug', Component: ComingSoonPage },
      // The Discovery Call dialog (mounted in RootLayout) opens over the home page.
      { path: 'contact', Component: HomePage },
      { path: 'privacy-policy', Component: PrivacyPage },
      { path: '*', Component: NotFoundPage },
    ],
  },
])
