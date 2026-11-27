import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router'
import { closeDiscoveryCall, DISCOVERY_PATH, openDiscoveryCall, useDiscoveryCallOpen } from '@/lib/discoveryCall'
import { gsap, useGSAP } from '@/lib/gsap'
import { useContactPage, useGlobal } from '@/lib/queries'
import { strapiSubmit } from '@/lib/strapi'

/**
 * Discovery Call — Figma "Discovery Call · Step 1–4" (Desktop 1440 + Mobile 390).
 * Desktop: centred dialog (white card on a grey frame, actions in the grey footer).
 * Mobile: bottom sheet with a close button. Three steps + "Brief sent".
 * Any link to /contact opens it; visiting /contact directly shows it over the page and closing goes home.
 */
const STEPS = ['About you', 'Your project', 'Details'] as const
type Fields = { name: string; email: string; company: string; website_url: string; services: string[]; budget: string; message: string }
const EMPTY: Fields = { name: '', email: '', company: '', website_url: '', services: [], budget: '', message: '' }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function DiscoveryCall() {
  const open = useDiscoveryCallOpen()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(open)
  if (open && !mounted) setMounted(true)

  // Links to /contact open the dialog wherever they are (header, footer, pages).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a')
      if (!a || a.target === '_blank') return
      const url = new URL(a.href, window.location.href)
      if (url.origin !== window.location.origin || url.pathname !== DISCOVERY_PATH) return
      e.preventDefault()
      openDiscoveryCall()
    }
    window.addEventListener('click', onClick, true)
    return () => window.removeEventListener('click', onClick, true)
  }, [])

  // Arriving on /contact (typed URL, shared link) opens it too.
  useEffect(() => {
    if (pathname === DISCOVERY_PATH) openDiscoveryCall()
  }, [pathname])

  const onClosed = () => {
    setMounted(false)
    if (window.location.pathname !== DISCOVERY_PATH) return
    // Came from inside the site → step back; opened from a shared /contact link → go home.
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/', { replace: true })
  }

  if (!mounted) return null
  return createPortal(<Dialog open={open} onClosed={onClosed} />, document.body)
}

function Dialog({ open, onClosed }: { open: boolean; onClosed: () => void }) {
  const { data: page } = useContactPage()
  const { data: global } = useGlobal()
  const root = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(0)
  const [sent, setSent] = useState(false)
  const [fields, setFields] = useState<Fields>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof Fields | 'form', string>>>({})
  const [sending, setSending] = useState(false)
  const direction = useRef<1 | -1>(1)
  const honeypot = useRef<HTMLInputElement>(null)

  const title = page?.title ?? 'Let’s build a brand that carries your purpose.'
  const subtitle = page?.subtitle ?? 'Tell us about your project. We reply within two working days to schedule a discovery call.'
  const email = global?.email ?? 'hello@rupaguna.studio'

  // ---- open / close ----
  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const d = reduced ? 0 : 1
      const desktop = window.matchMedia('(min-width: 768px)').matches
      if (open) {
        gsap
          .timeline()
          .fromTo('[data-dc-scrim]', { autoAlpha: 0 }, { autoAlpha: 0.64, duration: 0.45 * d, ease: 'power2.out' })
          .fromTo(
            '[data-dc-panel]',
            desktop ? { y: 60, autoAlpha: 0, scale: 0.97 } : { yPercent: 100 },
            desktop
              ? { y: 0, autoAlpha: 1, scale: 1, duration: 0.8 * d, ease: 'expo.out' }
              : { yPercent: 0, duration: 0.75 * d, ease: 'power4.out' },
            0.05,
          )
          .from('[data-dc-fade]', { y: 20, autoAlpha: 0, duration: 0.6 * d, stagger: 0.04 * d, ease: 'power3.out', clearProps: 'transform' }, 0.25 * d)
        gsap.delayedCall(0.3 * d, () => root.current?.querySelector<HTMLElement>('input, button[data-dc-first]')?.focus({ preventScroll: true }))
      } else {
        gsap
          .timeline({ onComplete: onClosed })
          .to('[data-dc-panel]', desktop ? { y: 40, autoAlpha: 0, duration: 0.4 * d, ease: 'power3.in' } : { yPercent: 100, duration: 0.5 * d, ease: 'power3.in' })
          .to('[data-dc-scrim]', { autoAlpha: 0, duration: 0.35 * d, ease: 'power2.in' }, 0.1 * d)
      }
    },
    { scope: root, dependencies: [open] },
  )

  // Escape closes; the page behind does not scroll.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeDiscoveryCall()
    window.addEventListener('keydown', onKey)
    const html = document.documentElement
    const previous = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      html.style.overflow = previous
    }
  }, [open])

  // Step change: the new step slides in from the side it came from.
  const firstStep = useRef(true)
  useGSAP(
    () => {
      if (firstStep.current) {
        firstStep.current = false
        return
      }
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.fromTo('[data-dc-step]', { x: 40 * direction.current, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.55, ease: 'power3.out', clearProps: 'transform' })
      gsap.fromTo('[data-dc-bar-fill]', { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'expo.out', stagger: 0 })
      root.current?.querySelector<HTMLElement>('[data-dc-step] input, [data-dc-step] textarea, [data-dc-step] button')?.focus({ preventScroll: true })
    },
    { scope: root, dependencies: [step, sent] },
  )

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    setFields((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const validate = (s: number) => {
    const next: typeof errors = {}
    if (s === 0) {
      if (!fields.name.trim()) next.name = 'Please tell us your name.'
      if (!EMAIL.test(fields.email.trim())) next.email = 'Please enter a valid email address.'
    }
    if (s === 2 && fields.message.trim().length < 10) next.message = 'A few words about the project helps us prepare.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const go = (to: number) => {
    direction.current = to > step ? 1 : -1
    // Swap the step behind a quick fade so the height change is not seen mid-content.
    const el = root.current?.querySelector('[data-dc-step]')
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setStep(to)
    gsap.to(el, { x: -24 * direction.current, autoAlpha: 0, duration: 0.2, ease: 'power2.in', onComplete: () => setStep(to) })
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (step < 2) {
      if (validate(step)) go(step + 1)
      return
    }
    if (!validate(2) || sending) return
    setSending(true)
    try {
      await strapiSubmit('/inquiries/submit', {
        ...fields,
        name: fields.name.trim(),
        email: fields.email.trim(),
        consent: true,
        source: window.location.href,
        website: honeypot.current?.value ?? '',
      })
      direction.current = 1
      setSent(true)
      setFields(EMPTY)
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      setErrors({ form: message || `Something went wrong. Please try again or email ${email}.` })
    } finally {
      setSending(false)
    }
  }

  const close = () => closeDiscoveryCall()
  const restart = () => {
    close()
    window.setTimeout(() => {
      setSent(false)
      setStep(0)
    }, 600)
  }

  return (
    <div ref={root} className="fixed inset-0 z-[90] flex items-end justify-center md:items-center md:p-6">
      <div data-dc-scrim className="absolute inset-0 bg-navy opacity-0" onClick={close} aria-hidden />
      <div
        data-dc-panel
        data-lenis-prevent
        role="dialog"
        aria-modal="true"
        aria-labelledby="dc-title"
        className="relative max-h-[calc(100svh-40px)] w-full overflow-y-auto overscroll-contain rounded-t-[20px] bg-white md:max-h-[calc(100svh-48px)] md:max-w-[720px] md:rounded-3xl md:bg-surface md:p-2"
      >
        <form onSubmit={submit} noValidate>
          <div className="px-5 pt-5 pb-8 md:rounded-2xl md:bg-white md:p-12">
            {/* Progress (desktop: on top) */}
            {!sent && <Progress step={step} className="mb-8 hidden md:flex" />}

            <div className="flex items-center justify-between gap-4 md:block">
              <p data-dc-fade className="text-sm text-label">
                {sent ? 'Brief sent' : `Step ${step + 1} of 3 · ${STEPS[step]}`}
              </p>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-navy transition-colors hover:bg-navy hover:text-white md:hidden"
              >
                <CloseIcon />
              </button>
            </div>

            <div data-dc-step>
              {sent ? (
                <div className="mt-6 md:mt-4">
                  <h2 id="dc-title" className="display text-[32px] md:text-[24px]">
                    {page?.successTitle ?? 'Thank you. We’ll be in touch.'}
                  </h2>
                  <p className="mt-6 text-sm text-label md:mt-4">
                    {page?.successMessage ?? 'Your brief is with our team. We reply within two working days to schedule your discovery call.'}
                  </p>
                  <div className="mt-6 flex justify-end">
                    <button data-dc-first type="button" onClick={restart} className={btn('navy')}>
                      Back to site
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 id="dc-title" data-dc-fade className="display mt-6 text-2xl md:mt-4 md:max-w-[485px] md:font-sans md:text-2xl md:leading-[1.25] md:font-normal">
                    {title}
                  </h2>
                  <p data-dc-fade className="mt-6 text-sm text-label md:mt-4 md:text-base md:leading-normal">
                    {subtitle}
                  </p>
                  <Progress step={step} className="mt-6 md:hidden" />

                  <div data-dc-fade className="mt-6 md:mt-8">
                    {step === 0 && (
                      <div className="flex flex-col gap-6 md:gap-8">
                        <Field label="Your name" error={errors.name}>
                          {(id, describedBy) => (
                            <input id={id} aria-describedby={describedBy} aria-invalid={!!errors.name} className={input} placeholder="Full name" autoComplete="name" value={fields.name} onChange={(e) => set('name', e.target.value)} />
                          )}
                        </Field>
                        <Field label="Email" error={errors.email}>
                          {(id, describedBy) => (
                            <input id={id} type="email" aria-describedby={describedBy} aria-invalid={!!errors.email} className={input} placeholder="name@company.com" autoComplete="email" value={fields.email} onChange={(e) => set('email', e.target.value)} />
                          )}
                        </Field>
                        <Field label="Company">
                          {(id) => <input id={id} className={input} placeholder="Company name" autoComplete="organization" value={fields.company} onChange={(e) => set('company', e.target.value)} />}
                        </Field>
                        <Field label="Website">
                          {(id) => <input id={id} type="url" className={input} placeholder="https://" autoComplete="url" value={fields.website_url} onChange={(e) => set('website_url', e.target.value)} />}
                        </Field>
                      </div>
                    )}
                    {step === 1 && (
                      <div className="flex flex-col gap-8">
                        <Chips
                          label="What can we help with?"
                          options={page?.serviceOptions?.map((o) => o.label) ?? ['Brand', 'Digital Experience', 'Complete', 'Partnership', 'Products']}
                          selected={fields.services}
                          onToggle={(v) => set('services', fields.services.includes(v) ? fields.services.filter((s) => s !== v) : [...fields.services, v])}
                          multiple
                        />
                        <Chips
                          label="Project budget"
                          options={page?.budgetOptions?.map((o) => o.label) ?? ['< EUR 10k', 'EUR 10–25k', 'EUR 25–50k', 'EUR 50k+']}
                          selected={fields.budget ? [fields.budget] : []}
                          onToggle={(v) => set('budget', fields.budget === v ? '' : v)}
                        />
                      </div>
                    )}
                    {step === 2 && (
                      <Field label="Tell us about your project" error={errors.message}>
                        {(id, describedBy) => (
                          <textarea
                            id={id}
                            aria-describedby={describedBy}
                            aria-invalid={!!errors.message}
                            rows={4}
                            className="mt-2 block w-full resize-none rounded-lg border border-[#d9d9d9] p-4 text-base text-navy transition-colors outline-none placeholder:text-gray focus:border-navy md:min-h-[100px] md:text-sm"
                            placeholder="Goals, timeline, anything we should know."
                            value={fields.message}
                            onChange={(e) => set('message', e.target.value)}
                          />
                        )}
                      </Field>
                    )}
                  </div>
                  {errors.form && (
                    <p role="alert" className="mt-6 rounded-lg bg-[#fff1ee] px-4 py-3 text-sm text-[#b42318]">
                      {errors.form}
                    </p>
                  )}
                  {step === 2 && (
                    <p className="mt-4 text-xs text-gray">
                      By sending this brief you agree to our{' '}
                      <a href="/privacy-policy" className="link-underline">
                        privacy policy
                      </a>
                      .
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Honeypot: hidden from people, filled by bots. */}
            <input ref={honeypot} name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />

            {/* Mobile actions live inside the sheet */}
            {!sent && (
              <div className="mt-6 flex items-center justify-between gap-3 md:hidden">
                {step === 0 ? (
                  <p className="text-xs text-gray">
                    or email{' '}
                    <a className="link-underline" href={`mailto:${email}`}>
                      {email}
                    </a>
                  </p>
                ) : (
                  <button type="button" onClick={() => go(step - 1)} className={btn('outline')}>
                    Back
                  </button>
                )}
                <button type="submit" disabled={sending} className={btn('navy')}>
                  {step === 2 ? (sending ? 'Sending…' : 'Send brief') : 'Next'}
                </button>
              </div>
            )}
          </div>

          {/* Desktop actions: the grey footer of the dialog */}
          {!sent && (
            <div className="hidden items-center justify-between gap-4 px-12 py-12 md:flex">
              {step === 0 ? (
                <p className="text-sm text-label">
                  or email{' '}
                  <a className="link-underline" href={`mailto:${email}`}>
                    {email}
                  </a>
                </p>
              ) : (
                <button type="button" onClick={() => go(step - 1)} className={btn('outline')}>
                  Back
                </button>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={close} className={btn('outline')}>
                  Cancel
                </button>
                <button type="submit" disabled={sending} className={btn('navy')}>
                  {step === 2 ? (sending ? 'Sending…' : 'Send brief') : 'Next'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

const input =
  'mt-2 block w-full border-b border-[#7f8199] bg-transparent pb-1 text-base text-navy transition-colors outline-none placeholder:text-gray focus:border-navy md:border-line md:focus:border-navy aria-[invalid=true]:border-[#d92d20]'

const btn = (variant: 'navy' | 'outline') =>
  `inline-flex h-[49px] items-center justify-center rounded-full px-6 text-sm font-medium transition-[background-color,color,transform] duration-300 active:scale-[0.97] disabled:opacity-60 md:h-[51px] ${
    variant === 'navy' ? 'bg-navy text-white hover:bg-blue' : 'border border-navy text-navy hover:bg-navy hover:text-white'
  }`

function Progress({ step, className = '' }: { step: number; className?: string }) {
  return (
    <div aria-hidden className={`flex gap-1.5 md:gap-2 ${className}`}>
      {STEPS.map((s, i) => (
        <span key={s} className="relative h-1 flex-1 overflow-hidden rounded-sm bg-line">
          {i <= step && <span data-dc-bar-fill={i === step ? '' : undefined} className="absolute inset-0 origin-left rounded-sm bg-blue" />}
        </span>
      ))}
    </div>
  )
}

let fieldId = 0
function Field({ label, error, children }: { label: string; error?: string; children: (id: string, describedBy?: string) => ReactNode }) {
  const [id] = useState(() => `dc-field-${++fieldId}`)
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-navy">
        {label}
      </label>
      {children(id, error ? `${id}-error` : undefined)}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-[#d92d20]">
          {error}
        </p>
      )}
    </div>
  )
}

function Chips({
  label,
  options,
  selected,
  onToggle,
  multiple,
}: {
  label: string
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
  multiple?: boolean
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-navy">{label}</legend>
      <div className="mt-3 flex flex-wrap gap-2" role={multiple ? 'group' : 'radiogroup'}>
        {options.map((o) => {
          const on = selected.includes(o)
          return (
            <button
              key={o}
              type="button"
              role={multiple ? undefined : 'radio'}
              aria-checked={multiple ? undefined : on}
              aria-pressed={multiple ? on : undefined}
              onClick={() => onToggle(o)}
              className={`rounded-full border px-4 py-[9px] text-sm leading-[17px] font-medium transition-colors duration-300 ${
                on ? 'border-navy bg-navy text-white' : 'border-[#d9d9d9] text-navy hover:border-navy'
              }`}
            >
              {o}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function CloseIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
    </svg>
  )
}
