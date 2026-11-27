import { useSyncExternalStore } from 'react'

/** Open/closed state of the Discovery Call dialog, shared by every "Book a discovery call" link. */
let open = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export const openDiscoveryCall = () => {
  if (open) return
  open = true
  emit()
}
export const closeDiscoveryCall = () => {
  if (!open) return
  open = false
  emit()
}
export const useDiscoveryCallOpen = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => open,
  )

/** Links to this path open the dialog instead of navigating. */
export const DISCOVERY_PATH = '/contact'
