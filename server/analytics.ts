import { database } from './database.js'

interface CountRow {
  count: number
}

interface AverageRow {
  average: number | null
}

interface ParkAverageRow {
  id: string
  name: string
  averageWait: number
  sampleCount: number
}

interface AttractionMetricRow {
  id: string
  name: string
  averageWait: number
  minimumWait: number
  maximumWait: number
  variation: number
  sampleCount: number
}

interface HourMetricRow {
  hour: number
  averageWait: number
  sampleCount: number
}

interface AttractionIdentityRow {
  id: string
  name: string
  parkId: string
  parkName: string
}

interface PredictionAccuracyRow {
  averageAccuracy: number | null
  evaluatedPredictions: number
}

const round = (value: number | null, precision = 1) => {
  if (value === null) return null
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

const getParkAverages = (): ParkAverageRow[] =>
  database.prepare(`
    SELECT
      parks.id AS id,
      parks.name AS name,
      ROUND(AVG(samples.wait_time), 1) AS averageWait,
      COUNT(samples.id) AS sampleCount
    FROM parks
    JOIN wait_time_samples AS samples ON samples.park_id = parks.id
    WHERE samples.status = 'OPEN'
      AND samples.wait_time IS NOT NULL
      AND samples.quality != 'INVALID'
    GROUP BY parks.id, parks.name
    ORDER BY averageWait DESC
  `).all() as unknown as ParkAverageRow[]

const getAttractionMetrics = (parkId: string): AttractionMetricRow[] =>
  database.prepare(`
    SELECT
      attractions.id AS id,
      attractions.name AS name,
      ROUND(AVG(samples.wait_time), 1) AS averageWait,
      MIN(samples.wait_time) AS minimumWait,
      MAX(samples.wait_time) AS maximumWait,
      MAX(samples.wait_time) - MIN(samples.wait_time) AS variation,
      COUNT(samples.id) AS sampleCount
    FROM attractions
    JOIN wait_time_samples AS samples
      ON samples.attraction_id = attractions.id
    WHERE attractions.park_id = ?
      AND samples.status = 'OPEN'
      AND samples.wait_time IS NOT NULL
      AND samples.quality != 'INVALID'
    GROUP BY attractions.id, attractions.name
  `).all(parkId) as unknown as AttractionMetricRow[]

const getHourlyMetrics = (
  whereClause: string,
  parameter: string,
): HourMetricRow[] =>
  database.prepare(`
    SELECT
      CAST(strftime('%H', samples.timestamp) AS INTEGER) AS hour,
      ROUND(AVG(samples.wait_time), 1) AS averageWait,
      COUNT(samples.id) AS sampleCount
    FROM wait_time_samples AS samples
    WHERE ${whereClause}
      AND samples.status = 'OPEN'
      AND samples.wait_time IS NOT NULL
      AND samples.quality != 'INVALID'
    GROUP BY hour
    ORDER BY hour ASC
  `).all(parameter) as unknown as HourMetricRow[]

export function getAnalyticsOverview() {
  const totalParks = (database.prepare('SELECT COUNT(*) AS count FROM parks').get() as unknown as CountRow).count
  const totalAttractions = (database.prepare('SELECT COUNT(*) AS count FROM attractions').get() as unknown as CountRow).count
  const validSamples = (database.prepare(`
    SELECT COUNT(*) AS count FROM wait_time_samples WHERE quality = 'VALID'
  `).get() as unknown as CountRow).count
  const suspiciousSamples = (database.prepare(`
    SELECT COUNT(*) AS count FROM wait_time_samples WHERE quality = 'SUSPICIOUS'
  `).get() as unknown as CountRow).count
  const invalidSamples = (database.prepare(`
    SELECT COUNT(*) AS count FROM data_quality_events WHERE quality = 'INVALID'
  `).get() as unknown as CountRow).count
  const totalSamples = validSamples + suspiciousSamples
  const totalEvaluatedSamples = totalSamples + invalidSamples
  const average = database.prepare(`
    SELECT AVG(wait_time) AS average
    FROM wait_time_samples
    WHERE status = 'OPEN'
      AND wait_time IS NOT NULL
      AND quality != 'INVALID'
  `).get() as unknown as AverageRow
  const parkRankings = getParkAverages()

  return {
    totalParks,
    totalAttractions,
    totalSamples,
    validSamples,
    suspiciousSamples,
    invalidSamples,
    dataQualityRate: totalEvaluatedSamples
      ? round(validSamples / totalEvaluatedSamples * 100)
      : null,
    overallAverageWait: round(average.average),
    highestAveragePark: parkRankings[0] ?? null,
    lowestAveragePark: parkRankings.at(-1) ?? null,
    parkRankings,
  }
}

export function getParkAnalytics(parkId: string) {
  const park = database.prepare(`
    SELECT id, name, provider FROM parks WHERE id = ?
  `).get(parkId) as { id: string; name: string; provider: string } | undefined

  if (!park) return null

  const attractions = getAttractionMetrics(parkId)
  const hourlyHistory = getHourlyMetrics('samples.park_id = ?', parkId)
  const sortedByAverage = [...attractions].sort((a, b) => b.averageWait - a.averageWait)
  const sortedByVariation = [...attractions].sort((a, b) => b.variation - a.variation)
  const sortedHours = [...hourlyHistory].sort((a, b) => a.averageWait - b.averageWait)
  const parkAverage = database.prepare(`
    SELECT AVG(wait_time) AS average
    FROM wait_time_samples
    WHERE park_id = ?
      AND status = 'OPEN'
      AND wait_time IS NOT NULL
      AND quality != 'INVALID'
  `).get(parkId) as unknown as AverageRow

  return {
    park,
    averageWait: round(parkAverage.average),
    highestAverageAttractions: sortedByAverage.slice(0, 10),
    lowestAverageAttractions: [...sortedByAverage].reverse().slice(0, 10),
    highestVariationAttractions: sortedByVariation.slice(0, 10),
    bestAverageHour: sortedHours[0] ?? null,
    worstAverageHour: sortedHours.at(-1) ?? null,
    hourlyHistory,
  }
}

export function getAttractionAnalytics(attractionId: string) {
  const attraction = database.prepare(`
    SELECT
      attractions.id AS id,
      attractions.name AS name,
      parks.id AS parkId,
      parks.name AS parkName
    FROM attractions
    JOIN parks ON parks.id = attractions.park_id
    WHERE attractions.id = ?
  `).get(attractionId) as AttractionIdentityRow | undefined

  if (!attraction) return null

  const metrics = database.prepare(`
    SELECT
      AVG(wait_time) AS averageWait,
      MIN(wait_time) AS minimumWait,
      MAX(wait_time) AS maximumWait,
      COUNT(id) AS sampleCount
    FROM wait_time_samples
    WHERE attraction_id = ?
      AND status = 'OPEN'
      AND wait_time IS NOT NULL
      AND quality != 'INVALID'
  `).get(attractionId) as {
    averageWait: number | null
    minimumWait: number | null
    maximumWait: number | null
    sampleCount: number
  }
  const hourlyHistory = getHourlyMetrics('samples.attraction_id = ?', attractionId)
  const sortedHours = [...hourlyHistory].sort((a, b) => a.averageWait - b.averageWait)
  const accuracy = database.prepare(`
    WITH evaluated AS (
      SELECT
        predictions.attraction_id AS attraction_id,
        predictions.predicted_30 AS predicted,
        results.actual_30 AS actual
      FROM predictions
      JOIN prediction_results AS results ON results.prediction_id = predictions.id
      WHERE results.actual_30 IS NOT NULL
      UNION ALL
      SELECT
        predictions.attraction_id AS attraction_id,
        predictions.predicted_60 AS predicted,
        results.actual_60 AS actual
      FROM predictions
      JOIN prediction_results AS results ON results.prediction_id = predictions.id
      WHERE results.actual_60 IS NOT NULL
    )
    SELECT
      AVG(MAX(0, 100 - (ABS(predicted - actual) * 100.0 / MAX(actual, 5)))) AS averageAccuracy,
      COUNT(*) AS evaluatedPredictions
    FROM evaluated
    WHERE attraction_id = ?
  `).get(attractionId) as unknown as PredictionAccuracyRow

  return {
    attraction,
    averageWait: round(metrics.averageWait),
    minimumWait: metrics.minimumWait,
    maximumWait: metrics.maximumWait,
    sampleCount: metrics.sampleCount,
    bestHour: sortedHours[0] ?? null,
    worstHour: sortedHours.at(-1) ?? null,
    hourlyHistory,
    predictionAccuracy: {
      averageAccuracy: round(accuracy.averageAccuracy),
      evaluatedPredictions: accuracy.evaluatedPredictions,
    },
  }
}
