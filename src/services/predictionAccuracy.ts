import type {
  PredictionAccuracyRankingItem,
  PredictionAccuracySummary,
  PredictionEvaluationResult,
  StoredPrediction,
  WaitTimePrediction,
} from '../types'
import { storageClient } from './storage/storageClient'

const RETENTION_DAYS = 14
const MAX_RECORDS = 20_000
const EVALUATION_TOLERANCE_MS = 10 * 60 * 1000

interface RealWaitTimeSnapshot {
  attractionId: string
  waitTime: number | null
  status: 'OPEN' | 'CLOSED'
}

const readPredictions = () => storageClient.get('predictions')
const writePredictions = (predictions: StoredPrediction[]) =>
  storageClient.set('predictions', predictions)

const prunePredictions = (predictions: StoredPrediction[]) => {
  const retentionLimit = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
  return predictions
    .filter((prediction) => new Date(prediction.timestamp).getTime() >= retentionLimit)
    .slice(-MAX_RECORDS)
}

const calculateResult = (
  predictedWaitTime: number,
  actualWaitTime: number,
  evaluatedAt: string,
): PredictionEvaluationResult => {
  const absoluteError = Math.abs(predictedWaitTime - actualWaitTime)
  const percentageError = (absoluteError / Math.max(actualWaitTime, 5)) * 100

  return {
    actualWaitTime,
    evaluatedAt,
    absoluteError,
    percentageError: Math.round(percentageError * 10) / 10,
    accuracy: Math.max(0, Math.round((100 - percentageError) * 10) / 10),
  }
}

export function savePrediction(
  parkId: string,
  attractionId: string,
  attractionName: string,
  prediction: WaitTimePrediction,
  timestamp = new Date().toISOString(),
): void {
  if (
    prediction.currentWait === null
    || prediction.predictedWait30Minutes === null
    || prediction.predictedWait60Minutes === null
  ) return

  const predictions = prunePredictions(readPredictions())
  const timestampMs = new Date(timestamp).getTime()
  const alreadySaved = predictions.some((stored) =>
    stored.parkId === parkId
    && stored.attractionId === attractionId
    && Math.abs(new Date(stored.timestamp).getTime() - timestampMs) < 30_000,
  )

  if (alreadySaved) return

  predictions.push({
    id: `${parkId}:${attractionId}:${timestamp}`,
    parkId,
    attractionId,
    attractionName,
    timestamp,
    currentWaitTime: prediction.currentWait,
    predicted30: prediction.predictedWait30Minutes,
    predicted60: prediction.predictedWait60Minutes,
    confidence: prediction.confidence,
  })

  writePredictions(prunePredictions(predictions))
}

export function evaluatePendingPredictions(
  parkId: string,
  snapshots: RealWaitTimeSnapshot[],
  timestamp = new Date().toISOString(),
): void {
  const predictions = readPredictions()
  const snapshotMap = new Map(snapshots.map((snapshot) => [snapshot.attractionId, snapshot]))
  const currentTimestamp = new Date(timestamp).getTime()
  let hasChanges = false

  const evaluated = predictions.map((prediction) => {
    if (prediction.parkId !== parkId) return prediction

    const snapshot = snapshotMap.get(prediction.attractionId)
    if (!snapshot || snapshot.status !== 'OPEN' || snapshot.waitTime === null) return prediction

    const predictionTimestamp = new Date(prediction.timestamp).getTime()
    const age = currentTimestamp - predictionTimestamp
    const nextPrediction = { ...prediction }

    if (
      !prediction.result30
      && age >= 30 * 60 * 1000
      && age <= 30 * 60 * 1000 + EVALUATION_TOLERANCE_MS
    ) {
      nextPrediction.result30 = calculateResult(
        prediction.predicted30,
        snapshot.waitTime,
        timestamp,
      )
      hasChanges = true
    }

    if (
      !prediction.result60
      && age >= 60 * 60 * 1000
      && age <= 60 * 60 * 1000 + EVALUATION_TOLERANCE_MS
    ) {
      nextPrediction.result60 = calculateResult(
        prediction.predicted60,
        snapshot.waitTime,
        timestamp,
      )
      hasChanges = true
    }

    return nextPrediction
  })

  if (hasChanges) writePredictions(prunePredictions(evaluated))
}

export function getStoredPredictions(): StoredPrediction[] {
  return readPredictions()
}

const toRankingItems = (predictions: StoredPrediction[]) =>
  predictions.flatMap<PredictionAccuracyRankingItem>((prediction) => {
    const results: PredictionAccuracyRankingItem[] = []

    if (prediction.result30) {
      results.push({
        predictionId: prediction.id,
        parkId: prediction.parkId,
        attractionId: prediction.attractionId,
        attractionName: prediction.attractionName,
        horizonMinutes: 30,
        predictedWaitTime: prediction.predicted30,
        actualWaitTime: prediction.result30.actualWaitTime,
        absoluteError: prediction.result30.absoluteError,
        percentageError: prediction.result30.percentageError,
        accuracy: prediction.result30.accuracy,
        timestamp: prediction.timestamp,
      })
    }

    if (prediction.result60) {
      results.push({
        predictionId: prediction.id,
        parkId: prediction.parkId,
        attractionId: prediction.attractionId,
        attractionName: prediction.attractionName,
        horizonMinutes: 60,
        predictedWaitTime: prediction.predicted60,
        actualWaitTime: prediction.result60.actualWaitTime,
        absoluteError: prediction.result60.absoluteError,
        percentageError: prediction.result60.percentageError,
        accuracy: prediction.result60.accuracy,
        timestamp: prediction.timestamp,
      })
    }

    return results
  })

export function getPredictionAccuracyRankings(parkId?: string) {
  const items = toRankingItems(readPredictions())
    .filter((item) => !parkId || item.parkId === parkId)

  return {
    mostAccurate: [...items].sort((a, b) => b.accuracy - a.accuracy).slice(0, 10),
    leastAccurate: [...items].sort((a, b) => a.accuracy - b.accuracy).slice(0, 10),
  }
}

const summarize = (items: PredictionAccuracyRankingItem[]): PredictionAccuracySummary => ({
  averageAccuracy: items.length
    ? Math.round(items.reduce((sum, item) => sum + item.accuracy, 0) / items.length * 10) / 10
    : null,
  averageAbsoluteError: items.length
    ? Math.round(items.reduce((sum, item) => sum + item.absoluteError, 0) / items.length * 10) / 10
    : null,
  evaluatedPredictions: items.length,
})

export function getAccuracyForAttraction(
  parkId: string,
  attractionId: string,
): PredictionAccuracySummary {
  return summarize(
    toRankingItems(readPredictions()).filter((item) =>
      item.parkId === parkId && item.attractionId === attractionId,
    ),
  )
}

export function getAccuracyForPark(parkId: string): PredictionAccuracySummary {
  return summarize(
    toRankingItems(readPredictions()).filter((item) => item.parkId === parkId),
  )
}

export function getOverallPredictionAccuracy(): PredictionAccuracySummary {
  return summarize(toRankingItems(readPredictions()))
}
