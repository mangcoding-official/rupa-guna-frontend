import { useRef } from 'react'
import { gsap, useGSAP } from '@/lib/gsap'

/** Category filters shared by Work and Products (Figma: vertical list on desktop, pill row on mobile). */
export type FilterOption = { label: string; value: string | null; count?: number }
type FilterProps = {
  options: FilterOption[]
  active: string | null
  onSelect: (value: string | null) => void
}
const optionText = (o: FilterOption) => (o.count === undefined ? o.label : `${o.label} (${o.count})`)

/** Desktop: vertical list on a hairline; a navy bar slides to the active filter. */
export function FilterList({ options, active, onSelect }: FilterProps) {
  const list = useRef<HTMLUListElement>(null)
  const bar = useRef<HTMLSpanElement>(null)
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === active))
  const placed = useRef(false)

  useGSAP(
    () => {
      const item = list.current?.children[activeIndex] as HTMLElement | undefined
      if (!item || !bar.current) return
      const to = { y: item.offsetTop + (item.offsetHeight - 16) / 2 }
      if (!placed.current) {
        placed.current = true
        gsap.set(bar.current, to)
      } else gsap.to(bar.current, { ...to, duration: 0.55, ease: 'expo.out' })
    },
    { dependencies: [activeIndex] },
  )

  return (
    <div className="relative mt-[22px] pl-3">
      <span aria-hidden className="absolute top-0 bottom-0 left-0 w-px bg-line" />
      <span ref={bar} aria-hidden className="absolute top-0 -left-px h-4 w-[3px] rounded-full bg-navy" />
      <ul ref={list}>
        {options.map((o) => {
          const isActive = o.value === active
          return (
            <li key={o.label}>
              <button
                type="button"
                aria-pressed={isActive}
                onClick={() => onSelect(o.value)}
                className={`block py-1 text-left text-sm transition-[color,translate] duration-300 ${
                  isActive ? 'font-medium text-navy' : 'text-[#dbdbdb] hover:translate-x-1 hover:text-label'
                }`}
              >
                {optionText(o)}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Mobile: a row of pills that scrolls sideways past the page gutter. */
export function FilterChips({ options, active, onSelect }: FilterProps) {
  return (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 py-px" role="group" aria-label="Filter projects">
      {options.map((o) => {
        const isActive = o.value === active
        return (
          <button
            key={o.label}
            type="button"
            aria-pressed={isActive}
            onClick={(e) => {
              e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
              onSelect(o.value)
            }}
            className={`shrink-0 rounded-full border px-4 py-[9px] text-sm leading-[17px] font-medium whitespace-nowrap transition-colors duration-300 ${
              isActive ? 'border-navy bg-navy text-white' : 'border-[#d9d9d9] bg-white text-navy'
            }`}
          >
            {optionText(o)}
          </button>
        )
      })}
    </div>
  )
}

