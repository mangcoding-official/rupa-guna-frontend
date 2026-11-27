import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import './index.css'
import { startPreloader } from './lib/preloader'
import { router } from './router'

startPreloader()

// The head tags baked into the HTML (index.html fallback, or per route by scripts/prerender-seo.mjs)
// are for crawlers that do not run JavaScript. Drop them before React renders so <Seo> is the only
// source of title/meta at runtime — otherwise every page would carry two sets of tags.
document.querySelectorAll('[data-seo-static]').forEach((el) => el.remove())

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
