import type { CSSProperties } from 'react'
import { mediaSrcSet, mediaUrl } from '@/lib/strapi'
import type { Media } from '@/lib/types'

type Props = {
  media?: Media | null
  /** Used for alt text when the editor left `alternativeText` empty. */
  fallbackAlt?: string
  sizes?: string
  className?: string
  /** Eager-load images above the fold (hero, cover). */
  priority?: boolean
  /** Shown when there is no media: a calm colour block keeps layouts intact. */
  placeholderColor?: string | null
  placeholderLabel?: string
  style?: CSSProperties
  /** Overrides the CMS alt text, e.g. "" for decorative images. */
  alt?: string
}

export function StrapiImage({
  media,
  fallbackAlt = '',
  sizes = '100vw',
  className = '',
  priority = false,
  placeholderColor,
  placeholderLabel,
  style,
  alt,
}: Props) {
  if (!media) {
    return (
      <div
        role={placeholderLabel ? 'img' : undefined}
        aria-label={placeholderLabel}
        className={`relative flex items-end overflow-hidden ${className}`}
        style={{ backgroundColor: placeholderColor ?? 'var(--color-surface)', ...style }}
      >
        {placeholderLabel && (
          <span
            aria-hidden
            className="display p-6 text-4xl sm:text-5xl"
            style={{ color: placeholderColor ? 'rgba(255,255,255,0.92)' : 'var(--color-label)' }}
          >
            {placeholderLabel}
          </span>
        )}
      </div>
    )
  }

  return (
    <img
      src={mediaUrl(media.formats?.large?.url ?? media.url)}
      srcSet={mediaSrcSet(media)}
      sizes={sizes}
      width={media.width ?? undefined}
      height={media.height ?? undefined}
      alt={alt ?? media.alternativeText ?? fallbackAlt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      className={`object-cover ${className}`}
      style={style}
    />
  )
}

/** Relative luminance of a #rrggbb colour (WCAG). */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * A project's cover, or — while the project has no imagery yet — the Figma placeholder:
 * a block in the project's accent colour with an image icon and the project name.
 */
export function ProjectCover({
  project,
  media = project.cover,
  sizes,
  className = '',
  priority,
}: {
  project: { title: string; cover?: Media | null; accentColor?: string | null }
  media?: Media | null
  sizes?: string
  className?: string
  priority?: boolean
}) {
  if (media) return <StrapiImage media={media} fallbackAlt={project.title} sizes={sizes} priority={priority} className={className} />
  const bg = project.accentColor && /^#[0-9a-f]{6}$/i.test(project.accentColor) ? project.accentColor : '#f6f6f6'
  const dark = luminance(bg) < 0.25
  return (
    <div
      role="img"
      aria-label={project.title}
      className={`flex flex-col items-center justify-center gap-1.5 ${className}`}
      style={{ backgroundColor: bg, color: dark ? '#fff' : 'var(--color-navy)' }}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
      </svg>
      <span aria-hidden className="text-xs">
        {project.title}
      </span>
    </div>
  )
}
