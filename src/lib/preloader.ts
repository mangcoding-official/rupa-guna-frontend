import { useSyncExternalStore } from 'react'

/**
 * Tiny global store for the intro preloader (Figma: "Desktop - 1/2/3" frames left of the landing page).
 * The hero reads it to know whether the preloader is handing off to it or it should run its own intro.
 */
type Status = 'running' | 'done'

let status: Status = 'running'
const listeners = new Set<() => void>()

export const getPreloaderStatus = () => status

export function finishPreloader() {
  if (status === 'done') return
  status = 'done'
  document.documentElement.classList.remove('is-preloading')
  listeners.forEach((l) => l())
}

export function usePreloaderStatus() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => status,
  )
}

/** Hides intro-only elements and locks scroll until the preloader finishes. Call before the first render. */
export function startPreloader() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    status = 'done'
    return
  }
  document.documentElement.classList.add('is-preloading')
  window.scrollTo(0, 0)
}
