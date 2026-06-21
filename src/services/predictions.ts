import type {
  WaitTimeHistoryEntry,
  WaitTimePrediction,
  WaitTimePredictionTrend,
} from '../types'
import { storageClient } from './storage/storageClient'

const MAX_RECORDS = 12
const MAX_HISTORY_AGE_MS = 3 * 60 * 60 * 1000
const MIN_RECORDS_FOR_TREND = 3
const STABLE_THRESHOLD_MINUTES = 3
const MAX_CHANGE_PER_MINUTE = 1.5

interface RegressionPoint {
  minute: number
  waitTime: number
}

const roundToFive = (value: number) => Math.max(0, Math.round(value / 5) * 5)

const getRecentOpenRecords = (history: WaitTimeHistoryEntry[]) =>
  history.length
    ? history
        .filter((entry) => (
          entry.status === 'OPEN'
          && (entry.quality ?? 'VALID') === 'VALID'
          && entry.waitTime !== null
          && new Date(history.at(-1)!.timestamp).getTime() - new Date(entry.timestamp).getTime()
            <= MAX_HISTORY_AGE_MS
        ))
        .slice(-MAX_RECORDS)
    : []

const createRegressionPoints = (
  history: WaitTimeHistoryEntry[],
): RegressionPoint[] => {
  if (!history.length) return []

  const firstTimestamp = new Date(history[0].timestamp).getTime()

  return history
    .map((entry) => ({
      minute: (new Date(entry.timestamp).getTime() - firstTimestamp) / 60_000,
      waitTime: entry.waitTime as number,
    }))
    .filter((point) => Number.isFinite(point.minute) && Number.isFinite(point.waitTime))
}

const calculateSlope = (points: RegressionPoint[]) => {
  if (points.length < 2) return 0

  const averageX = points.reduce((sum, point) => sum + point.minute, 0) / points.length
  const averageY = points.reduce((sum, point) => sum + point.waitTime, 0) / points.length
  const numerator = points.reduce(
    (sum, point) => sum + (point.minute - averageX) * (point.waitTime - averageY),
    0,
  )
  const denominator = points.reduce(
    (sum, point) => sum + (point.minute - averageX) ** 2,
    0,
  )

  if (denominator === 0) return 0
  return Math.max(-MAX_CHANGE_PER_MINUTE, Math.min(MAX_CHANGE_PER_MINUTE, numerator / denominator))
}

const getTrend = (projectedChange30Minutes: number): WaitTimePredictionTrend => {
  if (projectedChange30Minutes > STABLE_THRESHOLD_MINUTES) return 'up'
  if (projectedChange30Minutes < -STABLE_THRESHOLD_MINUTES) return 'down'
  return 'stable'
}

const getConfidence = (sampleCount: number): WaitTimePrediction['confidence'] => {
  if (sampleCount >= 8) return 'high'
  if (sampleCount >= 4) return 'medium'
  return 'low'
}

export function calculateWaitTimePrediction(
  history: WaitTimeHistoryEntry[],
): WaitTimePrediction {
  const latestRecord = history.at(-1)

  if (!latestRecord || latestRecord.status !== 'OPEN' || latestRecord.waitTime === null) {
    return {
      trend: 'stable',
      currentWait: null,
      predictedWait30Minutes: null,
      predictedWait60Minutes: null,
      confidence: 'low',
      sampleCount: 0,
    }
  }

  const recentRecords = getRecentOpenRecords(history)
  const currentWait = recentRecords.at(-1)?.waitTime ?? null

  if (currentWait === null) {
    return {
      trend: 'stable',
      currentWait: null,
      predictedWait30Minutes: null,
      predictedWait60Minutes: null,
      confidence: 'low',
      sampleCount: recentRecords.length,
    }
  }

  if (recentRecords.length < MIN_RECORDS_FOR_TREND) {
    return {
      trend: 'stable',
      currentWait,
      predictedWait30Minutes: currentWait,
      predictedWait60Minutes: currentWait,
      confidence: 'low',
      sampleCount: recentRecords.length,
    }
  }

  const slope = calculateSlope(createRegressionPoints(recentRecords))
  const projectedChange30Minutes = slope * 30

  return {
    trend: getTrend(projectedChange30Minutes),
    currentWait,
    predictedWait30Minutes: roundToFive(currentWait + projectedChange30Minutes),
    predictedWait60Minutes: roundToFive(currentWait + slope * 60),
    confidence: getConfidence(recentRecords.length),
    sampleCount: recentRecords.length,
  }
}

export function getPredictionForAttraction(
  parkId: string,
  attractionId: string,
): WaitTimePrediction {
  const history = storageClient
    .get('waitTimeHistory')
    .filter((entry) =>
      entry.parkId === parkId
      && entry.attractionId === attractionId
      && (entry.quality ?? 'VALID') === 'VALID',
    )
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  return calculateWaitTimePrediction(
    history,
  )
}
