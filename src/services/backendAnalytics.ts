import { getApiUrl } from './apiBaseUrl'

export interface AnalyticsRankingItem {
  id: string
  name: string
  averageWait: number
  sampleCount: number
}

export interface AnalyticsHour {
  hour: number
  averageWait: number
  sampleCount: number
}

export interface AnalyticsOverviewResponse {
  totalParks: number
  totalAttractions: number
  totalSamples: number
  validSamples: number
  suspiciousSamples: number
  invalidSamples: number
  dataQualityRate: number | null
  overallAverageWait: number | null
  highestAveragePark: AnalyticsRankingItem | null
  lowestAveragePark: AnalyticsRankingItem | null
  parkRankings: AnalyticsRankingItem[]
}

export interface AttractionMetric extends AnalyticsRankingItem {
  minimumWait: number
  maximumWait: number
  variation: number
}

export interface ParkAnalyticsResponse {
  park: {
    id: string
    name: string
    provider: string
  }
  averageWait: number | null
  highestAverageAttractions: AttractionMetric[]
  lowestAverageAttractions: AttractionMetric[]
  highestVariationAttractions: AttractionMetric[]
  bestAverageHour: AnalyticsHour | null
  worstAverageHour: AnalyticsHour | null
  hourlyHistory: AnalyticsHour[]
}

export interface AttractionAnalyticsResponse {
  attraction: {
    id: string
    name: string
    parkId: string
    parkName: string
  }
  averageWait: number | null
  minimumWait: number | null
  maximumWait: number | null
  sampleCount: number
  bestHour: AnalyticsHour | null
  worstHour: AnalyticsHour | null
  hourlyHistory: AnalyticsHour[]
  predictionAccuracy: {
    averageAccuracy: number | null
    evaluatedPredictions: number
  }
}

async function getAnalytics<T>(path: string): Promise<T> {
  const url = getApiUrl(path)
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(body?.error ?? 'Não foi possível carregar os analytics.')
  }

  const data = await response.json() as T

  console.info('[Analytics API]', {
    source: 'SQLite backend',
    endpoint: path,
    url,
    records: getAnalyticsRecordCount(path, data),
  })

  return data
}

const getAnalyticsRecordCount = (path: string, data: unknown) => {
  if (!data || typeof data !== 'object') return 0

  if (path === '/analytics/overview') {
    const overview = data as AnalyticsOverviewResponse
    return overview.totalSamples
  }

  if (path.startsWith('/analytics/park/')) {
    const park = data as ParkAnalyticsResponse
    return park.hourlyHistory.length
      + park.highestAverageAttractions.length
      + park.lowestAverageAttractions.length
      + park.highestVariationAttractions.length
  }

  const attraction = data as AttractionAnalyticsResponse
  return attraction.sampleCount
}

export const getAnalyticsOverview = () =>
  getAnalytics<AnalyticsOverviewResponse>('/analytics/overview')

export const getBackendParkAnalytics = (parkId: string) =>
  getAnalytics<ParkAnalyticsResponse>(`/analytics/park/${parkId}`)

export const getBackendAttractionAnalytics = (attractionId: string) =>
  getAnalytics<AttractionAnalyticsResponse>(`/analytics/attraction/${attractionId}`)
