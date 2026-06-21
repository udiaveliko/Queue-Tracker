export type AttractionStatus = 'open' | 'closed' | 'unavailable'
export type WaitTrend = 'up' | 'down' | 'stable'

export interface Attraction {
  id: string
  name: string
  land: string
  waitTime: number | null
  status: AttractionStatus
  trend?: WaitTrend
  updatedAt?: string
}

export interface Park {
  id: string
  name: string
  resort: 'Walt Disney World' | 'Universal Orlando' | 'United Parks'
  location: string
  initials: string
  accent: string
  coordinates: {
    latitude: number
    longitude: number
  }
  attractions: Attraction[]
}

export interface ParkWaitTimes {
  park: Park
  lastUpdated: string
  dataSource: 'live' | 'mock'
  warning?: string
}

export interface HourlyWeather {
  time: string
  temperature: number
  precipitationProbability: number
  weatherCode: number
}

export interface ParkWeather {
  temperature: number
  apparentTemperature: number
  precipitationProbability: number
  weatherCode: number
  isDay: boolean
  hourly: HourlyWeather[]
  updatedAt: string
}

export interface WaitTimeHistoryPoint {
  time: string
  waitTime: number
}

export interface AttractionAnalytics {
  attractionId: string
  attractionName: string
  land: string
  currentWait: number | null
  averageWait: number
  bestTime: string
  worstTime: string
  history: WaitTimeHistoryPoint[]
}

export interface ParkAnalytics {
  parkId: string
  parkName: string
  parkAccent: string
  generatedAt: string
  attractions: AttractionAnalytics[]
}

export interface WaitTimeHistoryEntry {
  parkId: string
  attractionId: string
  attractionName: string
  waitTime: number | null
  status: 'OPEN' | 'CLOSED'
  timestamp: string
  quality?: DataQualityLevel
}

export type DataQualityLevel = 'VALID' | 'SUSPICIOUS' | 'INVALID'

export interface DataQualityIssue {
  code:
    | 'NEGATIVE_WAIT'
    | 'EXCESSIVE_WAIT'
    | 'INVALID_STATUS'
    | 'INVALID_TIMESTAMP'
    | 'EMPTY_ATTRACTION_ID'
    | 'EMPTY_PARK_ID'
    | 'DUPLICATE_MINUTE'
    | 'ABRUPT_CHANGE'
  message: string
}

export interface DataQualityResult {
  quality: DataQualityLevel
  issues: DataQualityIssue[]
}

export interface WaitTimeHistoryStats {
  averageWait: number | null
  minimumWait: number | null
  maximumWait: number | null
  lastWait: number | null
  sampleCount: number
}

export type WaitTimePredictionTrend = 'up' | 'down' | 'stable'

export interface WaitTimePrediction {
  trend: WaitTimePredictionTrend
  currentWait: number | null
  predictedWait30Minutes: number | null
  predictedWait60Minutes: number | null
  confidence: 'low' | 'medium' | 'high'
  sampleCount: number
}

export type RouteRecommendation = 'GO_NOW' | 'WAIT' | 'STABLE'
export type RoutePlannerMode = 'shortest-wait' | 'shortest-walk' | 'balanced'

export interface AttractionLocation {
  parkId: string
  attractionId: string
  attractionName?: string
  x: number
  y: number
  land?: string
}

export interface ResolvedAttractionLocation extends AttractionLocation {
  estimatedLocation: boolean
}

export type RouteStartMode = 'entrance' | 'center' | 'land' | 'attraction'

export interface RouteStartPoint extends ResolvedAttractionLocation {
  label: string
}

export interface RoutePlannerAttraction {
  id: string
  name: string
  land: string
  waitTime: number
  trend: WaitTimePredictionTrend
  recommendation: RouteRecommendation
  predictedWait30Minutes: number | null
  location: ResolvedAttractionLocation
}

export type RouteDecisionReason =
  | 'fila baixa'
  | 'tendência subindo'
  | 'melhor ir agora'
  | 'perto da atração anterior'
  | 'evita deslocamento longo'
  | 'está na mesma área'

export interface RouteDecisionExplanation {
  primaryReason: RouteDecisionReason
  score: number
  waitScore: number
  distanceScore: number
  predictionScore: number
}

export interface PlannedRouteStop extends RoutePlannerAttraction {
  order: number
  estimatedWait: number
  distanceFromPrevious: number
  explanation: RouteDecisionExplanation
}

export interface PlannedRoute {
  stops: PlannedRouteStop[]
  totalEstimatedWait: number
  totalEstimatedDistance: number
  landsVisited: number
  longestWalkingDistance: number
  distanceFromStart: number
}

export interface PredictionEvaluationResult {
  actualWaitTime: number
  evaluatedAt: string
  absoluteError: number
  percentageError: number
  accuracy: number
}

export interface StoredPrediction {
  id: string
  parkId: string
  attractionId: string
  attractionName: string
  timestamp: string
  currentWaitTime: number
  predicted30: number
  predicted60: number
  confidence?: 'low' | 'medium' | 'high'
  result30?: PredictionEvaluationResult
  result60?: PredictionEvaluationResult
}

export interface PredictionAccuracySummary {
  averageAccuracy: number | null
  averageAbsoluteError: number | null
  evaluatedPredictions: number
}

export interface PredictionAccuracyRankingItem {
  predictionId: string
  parkId: string
  attractionId: string
  attractionName: string
  horizonMinutes: 30 | 60
  predictedWaitTime: number
  actualWaitTime: number
  absoluteError: number
  percentageError: number
  accuracy: number
  timestamp: string
}
