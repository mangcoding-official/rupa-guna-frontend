import { useSyncExternalStore } from 'react'

/** Live `matchMedia` result, e.g. useMediaQuery('(min-width: 1200px)'). */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (notify) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', notify)
      return () => mql.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,
  )
}
