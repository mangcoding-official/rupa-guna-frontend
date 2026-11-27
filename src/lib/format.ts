import type { JobSummary } from './types'

const dateFormatter = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

export const formatDate = (iso?: string | null) => (iso ? dateFormatter.format(new Date(iso)) : '')

const EMPLOYMENT: Record<JobSummary['employmentType'], string> = {
  'full-time': 'Penuh waktu',
  'part-time': 'Paruh waktu',
  contract: 'Kontrak',
  internship: 'Magang',
}
const WORK_MODE: Record<JobSummary['workMode'], string> = { onsite: 'Di kantor', hybrid: 'Hybrid', remote: 'Remote' }

export const jobMeta = (job: JobSummary) =>
  [job.department, job.location, EMPLOYMENT[job.employmentType], WORK_MODE[job.workMode]].filter(Boolean).join(' · ')
