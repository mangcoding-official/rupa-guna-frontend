import qs from 'qs'
import type { Media } from './types'

export const STRAPI_URL = (import.meta.env.VITE_STRAPI_URL ?? 'http://localhost:1337').replace(/\/$/, '')
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? window.location.origin).replace(/\/$/, '')

export class StrapiError extends Error {
  status: number
  details: Record<string, string>
  constructor(status: number, message: string, details: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.details = details
  }
}

type ErrorBody = { error?: { status?: number; message?: string; details?: Record<string, unknown> } }

const toError = async (res: Response) => {
  let body: ErrorBody = {}
  try {
    body = (await res.json()) as ErrorBody
  } catch {
    // non-JSON error body
  }
  const raw = body.error?.details ?? {}
  const details: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) if (typeof v === 'string') details[k] = v
  return new StrapiError(res.status, body.error?.message ?? `Permintaan gagal (${res.status})`, details)
}

/** GET a Strapi REST endpoint. `query` is serialised with qs (Strapi's bracket syntax). */
export async function strapiGet<T>(path: string, query?: object, signal?: AbortSignal): Promise<T> {
  const search = query ? `?${qs.stringify(query, { encodeValuesOnly: true })}` : ''
  const res = await fetch(`${STRAPI_URL}/api${path}${search}`, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw await toError(res)
  return (await res.json()) as T
}

/** POST a public form. Files are sent as multipart with the JSON payload in a `data` field. */
export async function strapiSubmit(path: string, data: Record<string, unknown>, files: Record<string, File | undefined> = {}) {
  const hasFiles = Object.values(files).some(Boolean)
  let init: RequestInit
  if (hasFiles) {
    const form = new FormData()
    form.append('data', JSON.stringify(data))
    for (const [field, file] of Object.entries(files)) if (file) form.append(field, file, file.name)
    init = { method: 'POST', body: form }
  } else {
    init = { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }
  }
  const res = await fetch(`${STRAPI_URL}/api${path}`, init)
  if (!res.ok) throw await toError(res)
  return res.json()
}

/** Absolute URL for a Strapi media path (local uploads are relative, cloud uploads absolute). */
export const mediaUrl = (url?: string | null) => {
  if (!url) return undefined
  return /^https?:\/\//.test(url) ? url : `${STRAPI_URL}${url}`
}

/** `srcset` built from the responsive formats Strapi generates on upload. */
export const mediaSrcSet = (media: Media) => {
  const entries = Object.values(media.formats ?? {})
    .filter((f): f is NonNullable<typeof f> => Boolean(f))
    .map((f) => `${mediaUrl(f.url)} ${f.width}w`)
  if (media.width) entries.push(`${mediaUrl(media.url)} ${media.width}w`)
  return entries.length > 1 ? entries.join(', ') : undefined
}
