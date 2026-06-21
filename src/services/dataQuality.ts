import type {
  DataQualityIssue,
  DataQualityResult,
  WaitTimeHistoryEntry,
} from '../types'
import { getApiUrl } from './apiBaseUrl'

const MAX_WAIT_TIME = 300
const ABRUPT_CHANGE_MINUTES = 60
const ABRUPT_CHANGE_WINDOW_MS = 10 * 60 * 1000

const getMinuteKey = (timestamp: string) => {
  const date = new Date(timestamp)
  date.setSeconds(0, 0)
  return date.toISOString()
}

const createIssue = (
  code: DataQualityIssue['code'],
  message: string,
): DataQualityIssue => ({ code, message })

export function validateWaitTimeSample(
  sample: WaitTimeHistoryEntry,
  existingHistory: WaitTimeHistoryEntry[] = [],
): DataQualityResult {
  const invalidIssues: DataQualityIssue[] = []
  const suspiciousIssues: DataQualityIssue[] = []
  const timestamp = new Date(sample.timestamp)

  if (!sample.parkId.trim()) {
    invalidIssues.push(createIssue('EMPTY_PARK_ID', 'parkId não pode ser vazio.'))
  }
  if (!sample.attractionId.trim()) {
    invalidIssues.push(createIssue('EMPTY_ATTRACTION_ID', 'attractionId não pode ser vazio.'))
  }
  if (!Number.isFinite(timestamp.getTime())) {
    invalidIssues.push(createIssue('INVALID_TIMESTAMP', 'Timestamp inválido.'))
  }
  if (sample.status !== 'OPEN' && sample.status !== 'CLOSED') {
    invalidIssues.push(createIssue('INVALID_STATUS', 'Status deve ser OPEN ou CLOSED.'))
  }
  if (sample.waitTime !== null && sample.waitTime < 0) {
    invalidIssues.push(createIssue('NEGATIVE_WAIT', 'Fila não pode ser negativa.'))
  }
  if (sample.waitTime !== null && sample.waitTime > MAX_WAIT_TIME) {
    invalidIssues.push(createIssue('EXCESSIVE_WAIT', 'Fila acima de 300 minutos.'))
  }

  if (!invalidIssues.length) {
    const duplicate = existingHistory.some((entry) =>
      entry.parkId === sample.parkId
      && entry.attractionId === sample.attractionId
      && getMinuteKey(entry.timestamp) === getMinuteKey(sample.timestamp),
    )

    if (duplicate) {
      invalidIssues.push(createIssue(
        'DUPLICATE_MINUTE',
        'Já existe uma amostra da atração neste minuto.',
      ))
    }
  }

  if (!invalidIssues.length && sample.waitTime !== null) {
    const previous = [...existingHistory]
      .filter((entry) =>
        entry.parkId === sample.parkId
        && entry.attractionId === sample.attractionId
        && entry.waitTime !== null
        && entry.quality !== 'INVALID',
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]

    if (previous?.waitTime !== null && previous) {
      const elapsed = timestamp.getTime() - new Date(previous.timestamp).getTime()
      const change = Math.abs(sample.waitTime - previous.waitTime)

      if (
        elapsed >= 0
        && elapsed <= ABRUPT_CHANGE_WINDOW_MS
        && change >= ABRUPT_CHANGE_MINUTES
      ) {
        suspiciousIssues.push(createIssue(
          'ABRUPT_CHANGE',
          `Mudança de ${change} minutos em menos de 10 minutos.`,
        ))
      }
    }
  }

  if (invalidIssues.length) return { quality: 'INVALID', issues: invalidIssues }
  if (suspiciousIssues.length) return { quality: 'SUSPICIOUS', issues: suspiciousIssues }
  return { quality: 'VALID', issues: [] }
}

export function validateWaitTimeSamples(
  samples: WaitTimeHistoryEntry[],
  existingHistory: WaitTimeHistoryEntry[] = [],
) {
  const accepted: WaitTimeHistoryEntry[] = []
  const invalid: Array<{ sample: WaitTimeHistoryEntry; result: DataQualityResult }> = []
  const validationContext = [...existingHistory]

  samples.forEach((sample) => {
    const result = validateWaitTimeSample(sample, validationContext)
    if (result.quality === 'INVALID') {
      invalid.push({ sample, result })
      return
    }

    const validatedSample = { ...sample, quality: result.quality }
    accepted.push(validatedSample)
    validationContext.push(validatedSample)
  })

  return { accepted, invalid }
}

export function reportInvalidSamples(
  invalid: Array<{ sample: WaitTimeHistoryEntry; result: DataQualityResult }>,
): void {
  if (!invalid.length) return

  void fetch(getApiUrl('/data-quality/events'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invalid.map(({ sample, result }) => ({
      parkId: sample.parkId,
      attractionId: sample.attractionId,
      timestamp: sample.timestamp,
      quality: result.quality,
      issues: result.issues,
    }))),
  }).catch(() => undefined)
}
