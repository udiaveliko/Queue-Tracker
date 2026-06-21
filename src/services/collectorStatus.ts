import { getApiUrl } from './apiBaseUrl'

export interface CollectorRunSummary {
  parksProcessed: number
  attractionsReceived: number
  samplesSaved: number
  valid: number
  suspicious: number
  invalid: number
  duplicatesSkipped: number
  errors: number
}

export interface CollectorStatusResponse {
  enabled: boolean
  isRunning: boolean
  intervalMs: number
  lastRunAt: string | null
  nextRunAt: string | null
  lastRunDurationMs: number | null
  lastRunSummary: CollectorRunSummary | null
}

async function requestCollector<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(getApiUrl(path), {
    ...init,
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(body?.error ?? 'Não foi possível consultar o coletor.')
  }

  return await response.json() as T
}

export const getCollectorStatus = () =>
  requestCollector<CollectorStatusResponse>('/collector/status')

export const runCollectorNow = () =>
  requestCollector('/collector/run-once', { method: 'POST' })
