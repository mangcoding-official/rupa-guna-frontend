import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { gsap, useGSAP } from '@/lib/gsap'

/**
 * Full-screen bottom sheet used by the Work Detail modals (Figma: "Story modal" / "Case study modal").
 * A strip of the project image stays visible above the sheet; the sheet slides up, its content fades up.
 * Stays mounted while it animates out, then unmounts.
 */
export function Sheet({
  open,
  onClose,
  label,
  cover,
  children,
  panelRef,
}: {
  open: boolean
  onClose: () => void
  label: string
  cover?: string
  children: ReactNode
  panelRef?: React.RefObject<HTMLDivElement | null>
}) {
  const [mounted, setMounted] = useState(open)
  const root = useRef<HTMLDivElement>(null)
  const ownPanel = useRef<HTMLDivElement>(null)
  const panel = panelRef ?? ownPanel
  const closeBtn = useRef<HTMLButtonElement>(null)

  // Mount as soon as it should open; unmounting waits for the exit animation.
  if (open && !mounted) setMounted(true)

  useGSAP(
    () => {
      if (!mounted || !root.current || !panel.current) return
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const d = reduced ? 0 : 1
      if (open) {
        gsap
          .timeline()
          .fromTo('[data-sheet-backdrop]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45 * d, ease: 'power2.out' })
          .fromTo(panel.current, { yPercent: 100 }, { yPercent: 0, duration: 0.85 * d, ease: 'power4.out' }, 0)
          .from(
            '[data-sheet-fade]',
            { y: 32, autoAlpha: 0, duration: 0.8 * d, stagger: 0.06 * d, ease: 'power3.out', clearProps: 'transform' },
            0.3 * d,
          )
        gsap.delayedCall(0.1, () => closeBtn.current?.focus({ preventScroll: true }))
      } else {
        gsap
          .timeline({ onComplete: () => setMounted(false) })
          .to(panel.current, { yPercent: 100, duration: 0.55 * d, ease: 'power3.in' })
          .to('[data-sheet-backdrop]', { autoAlpha: 0, duration: 0.4 * d, ease: 'power2.in' }, 0.15 * d)
      }
    },
    { scope: root, dependencies: [open, mounted] },
  )

  // Escape closes; the page behind does not scroll while the sheet is open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const html = document.documentElement
    const previous = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      html.style.overflow = previous
    }
  }, [open, onClose])

  if (!mounted) return null

  return createPortal(
    <div ref={root} className="fixed inset-0 z-[70]">
      <div data-sheet-backdrop className="absolute inset-0 bg-navy" onClick={onClose} aria-hidden>
        {cover && <img src={cover} alt="" className="h-[200px] w-full object-cover opacity-40" />}
      </div>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        data-lenis-prevent
        className="absolute inset-x-0 top-12 bottom-0 overflow-y-auto overscroll-contain rounded-t-3xl bg-white will-change-transform lg:top-[60px]"
      >
        <div className="sticky top-0 z-10 flex justify-end px-5 pt-5 lg:px-15 lg:pt-[30px]">
          <button
            ref={closeBtn}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-10 items-center justify-center rounded-full bg-surface text-navy transition-colors duration-300 hover:bg-navy hover:text-white lg:size-14"
          >
            <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="-mt-10 lg:-mt-14">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

/** Diagonal "expand" icon used on the Figma "Read the full …" buttons. */
export function ExpandIcon({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={`size-4 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9.5 2.5h4v4M13.5 2.5 9 7M6.5 13.5h-4v-4M2.5 13.5 7 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
