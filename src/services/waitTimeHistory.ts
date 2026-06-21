import type {
  WaitTimeHistoryEntry,
  WaitTimeHistoryStats,
} from '../types'
import { storageClient } from './storage/storageClient'
import {
  reportInvalidSamples,
  validateWaitTimeSamples,
} from './dataQuality'

const RETENTION_DAYS = 7
const MAX_STORED_ENTRIES = 20_000
const PARK_TIMEZONE = 'America/New_York'

const readHistory = () => storageClient.get('waitTimeHistory')
const writeHistory = (history: WaitTimeHistoryEntry[]) =>
  storageClient.set('waitTimeHistory', history)

const pruneExpiredEntries = (history: WaitTimeHistoryEntry[]) => {
  const retentionLimit = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000

  return history.filter((entry) => {
    const timestamp = new Date(entry.timestamp).getTime()
    return Number.isFinite(timestamp) && timestamp >= retentionLimit
  })
}

const getParkDateKey = (timestamp: string | Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: PARK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(typeof timestamp === 'string' ? new Date(timestamp) : timestamp)

export function saveWaitTimeSnapshots(entries: WaitTimeHistoryEntry[]): WaitTimeHistoryEntry[] {
  if (!entries.length) return []

  const history = pruneExpiredEntries(readHistory())
  const { accepted, invalid } = validateWaitTimeSamples(entries, history)

  reportInvalidSamples(invalid)
  writeHistory([...history, ...accepted].slice(-MAX_STORED_ENTRIES))
  return accepted
}

export function getHistoryForAttraction(
  parkId: string,
  attractionId: string,
): WaitTimeHistoryEntry[] {
  return readHistory()
    .filter((entry) =>
      entry.parkId === parkId
      && entry.attractionId === attractionId
      && entry.quality !== 'INVALID',
    )
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

export function calculateDailyWaitTimeStats(
  history: WaitTimeHistoryEntry[],
  referenceDate = new Date(),
): WaitTimeHistoryStats {
  const targetDate = getParkDateKey(referenceDate)
  const todayEntries = history.filter((entry) => getParkDateKey(entry.timestamp) === targetDate)
  const values = todayEntries
    .filter((entry) =>
      entry.status === 'OPEN'
      && entry.waitTime !== null
      && entry.quality !== 'INVALID',
    )
    .map((entry) => entry.waitTime as number)
  const lastEntry = todayEntries.at(-1)

  return {
    averageWait: values.length
      ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
      : null,
    minimumWait: values.length ? Math.min(...values) : null,
    maximumWait: values.length ? Math.max(...values) : null,
    lastWait: lastEntry?.waitTime ?? null,
    sampleCount: todayEntries.length,
  }
}

export function getDailyStatsForAttraction(
  parkId: string,
  attractionId: string,
  referenceDate = new Date(),
): WaitTimeHistoryStats {
  return calculateDailyWaitTimeStats(
    getHistoryForAttraction(parkId, attractionId),
    referenceDate,
  )
}
