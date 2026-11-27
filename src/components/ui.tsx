import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router'
import { useChapter } from '@/lib/chapter'

const isExternal = (href: string) => /^(https?:)?\/\//.test(href) || href.startsWith('mailto:') || href.startsWith('tel:')

/** Internal paths use client-side routing; external URLs open in a new tab. */
export function SmartLink({
  href,
  children,
  external,
  ...rest
}: { href: string; children: ReactNode; external?: boolean | null } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  if (external || isExternal(href)) {
    const newTab = !href.startsWith('mailto:') && !href.startsWith('tel:')
    return (
      <a href={href} {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...rest}>
        {children}
      </a>
    )
  }
  return (
    <Link to={href} {...rest}>
      {children}
    </Link>
  )
}

type PillVariant = 'navy' | 'white' | 'outline'
const pillClass: Record<PillVariant, string> = {
  navy: 'bg-navy text-white hover:bg-blue',
  white: 'bg-white text-navy hover:bg-navy hover:text-white',
  outline: 'border border-navy text-navy hover:bg-navy hover:text-white',
}
/** Figma "Button" instance: 48px tall pill, 24px side padding, Inter Display Medium 14. */
export const pillBase =
  'group/pill inline-flex h-12 shrink-0 items-center justify-center gap-3 rounded-full px-6 text-sm font-medium whitespace-nowrap transition-[background-color,color,transform] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] active:scale-[0.97]'

/** Hover: the label rolls up and an identical copy rolls in from below. */
export function RollText({ children, group = 'pill' }: { children: string; group?: 'pill' | 'link' }) {
  const out = group === 'pill' ? 'group-hover/pill:-translate-y-full group-focus-visible/pill:-translate-y-full' : 'group-hover/link:-translate-y-full group-focus-visible/link:-translate-y-full'
  const into = group === 'pill' ? 'group-hover/pill:translate-y-0 group-focus-visible/pill:translate-y-0' : 'group-hover/link:translate-y-0 group-focus-visible/link:translate-y-0'
  const ease = 'transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)]'
  return (
    <span className="relative inline-block overflow-hidden align-top">
      <span className={`block ${ease} ${out}`}>{children}</span>
      <span aria-hidden className={`absolute inset-0 block translate-y-full ${ease} ${into}`}>
        {children}
      </span>
    </span>
  )
}

export function PillLink({
  link,
  variant = 'navy',
  className = '',
  icon,
  onClick,
}: {
  link: { label: string; url: string; isExternal?: boolean | null }
  variant?: PillVariant
  className?: string
  icon?: ReactNode
  onClick?: () => void
}) {
  return (
    <SmartLink href={link.url} external={link.isExternal} onClick={onClick} className={`${pillBase} ${pillClass[variant]} ${className}`}>
      <RollText>{link.label}</RollText>
      {icon}
    </SmartLink>
  )
}

export function PillButton({
  children,
  variant = 'navy',
  className = '',
  ...rest
}: { children: ReactNode; variant?: PillVariant } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${pillBase} ${pillClass[variant]} disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...rest}>
      {children}
    </button>
  )
}

/** "02" before a section label, when the section is a numbered chapter (home page). */
export function ChapterNumber({ className = 'text-blue' }: { className?: string }) {
  const n = useChapter()
  if (n == null) return null
  return <span className={`mr-3 font-medium tabular-nums ${className}`}>{String(n).padStart(2, '0')}</span>
}

/**
 * Section intro used across the design: small label in the left column, Boldonse heading in the
 * content column and an optional pill button on the far right (stacked on mobile).
 */
export function SectionIntro({
  label,
  title,
  cta,
  as: Heading = 'h2',
}: {
  label?: string | null
  title: string
  cta?: { label: string; url: string } | null
  as?: 'h1' | 'h2'
}) {
  return (
    <div className="section-grid">
      {label ? (
        <p data-reveal className="label lg:pt-1">
          <ChapterNumber />
          {label}
        </p>
      ) : (
        <span className="hidden lg:block" />
      )}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <Heading data-split className="display max-w-[470px] text-2xl lg:text-[32px]">
          {title}
        </Heading>
        {cta && (
          <div data-reveal data-reveal-delay="0.15" className="self-start lg:mt-4">
            <PillLink link={cta} />
          </div>
        )}
      </div>
    </div>
  )
}

export function ArrowIcon({ direction = 'right', className = '' }: { direction?: 'left' | 'right' | 'up-right'; className?: string }) {
  const d =
    direction === 'up-right' ? 'M5 11 11 5M6 5h5v5' : direction === 'left' ? 'M13 8H3m4-4L3 8l4 4' : 'M3 8h10M9 4l4 4-4 4'
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={`size-4 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-2xl bg-surface ${className}`} />
}

export function PageLoading() {
  return (
    <div className="container-site pt-16 pb-24" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="mx-auto max-w-[660px]">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 aspect-3/2 w-full" />
      </div>
    </div>
  )
}

export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  return (
    <div className="container-site py-24" role="alert">
      <div className="section-grid">
        <p className="label">Error</p>
        <div>
          <h1 className="display text-2xl lg:text-[32px]">Content could not be loaded.</h1>
          <p className="mt-4 max-w-xl text-label">{message ?? 'Check your connection and try again.'}</p>
          {onRetry && (
            <PillButton className="mt-8" onClick={onRetry}>
              Try again
            </PillButton>
          )}
        </div>
      </div>
    </div>
  )
}
