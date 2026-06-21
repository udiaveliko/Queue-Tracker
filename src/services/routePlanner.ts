import type {
  Attraction,
  PlannedRoute,
  RouteDecisionExplanation,
  RoutePlannerAttraction,
  RoutePlannerMode,
  RouteRecommendation,
  WaitTimePrediction,
} from '../types'
import { getPredictionForAttraction } from './predictions'
import {
  calculateMapDistance,
  estimateWalkingDistance,
  resolveAttractionLocation,
} from './distancePlanner'

const recommendationPriority: Record<RouteRecommendation, number> = {
  GO_NOW: 0,
  STABLE: 1,
  WAIT: 2,
}

export function getRouteRecommendation(
  prediction: WaitTimePrediction,
): RouteRecommendation {
  if (prediction.trend === 'up') return 'GO_NOW'
  if (prediction.trend === 'down') return 'WAIT'
  return 'STABLE'
}

export function createRoutePlannerAttraction(
  parkId: string,
  attraction: Attraction,
  prediction: WaitTimePrediction,
): RoutePlannerAttraction | null {
  if (attraction.status !== 'open' || attraction.waitTime === null) return null

  return {
    id: attraction.id,
    name: attraction.name,
    land: attraction.land,
    waitTime: attraction.waitTime,
    trend: prediction.trend,
    recommendation: getRouteRecommendation(prediction),
    predictedWait30Minutes: prediction.predictedWait30Minutes,
    location: resolveAttractionLocation(parkId, attraction),
  }
}

export function createStoredRoutePlannerAttraction(
  parkId: string,
  attraction: Attraction,
): RoutePlannerAttraction | null {
  return createRoutePlannerAttraction(
    parkId,
    attraction,
    getPredictionForAttraction(parkId, attraction.id),
  )
}

const recommendationAdjustment: Record<RouteRecommendation, number> = {
  GO_NOW: -24,
  STABLE: 0,
  WAIT: 22,
}

const modeWeights: Record<RoutePlannerMode, { wait: number; distance: number }> = {
  'shortest-wait': { wait: 0.85, distance: 0.15 },
  'shortest-walk': { wait: 0.2, distance: 0.8 },
  balanced: { wait: 0.55, distance: 0.45 },
}

const clampScore = (value: number) => Math.round(Math.max(0, Math.min(100, value)))

const getWaitPriority = (attraction: RoutePlannerAttraction) => {
  const projectedWait = attraction.predictedWait30Minutes ?? attraction.waitTime
  const predictionAdjustment = attraction.trend === 'up'
    ? -8
    : attraction.trend === 'down'
      ? 8
      : 0

  return Math.max(
    0,
    attraction.waitTime * 0.7
      + projectedWait * 0.3
      + recommendationAdjustment[attraction.recommendation]
      + predictionAdjustment,
  )
}

const getPredictionScore = (attraction: RoutePlannerAttraction) => {
  if (attraction.recommendation === 'GO_NOW') return 100
  if (attraction.recommendation === 'WAIT') return 25
  return attraction.trend === 'stable' ? 65 : 50
}

const compareInitialPriority = (
  a: RoutePlannerAttraction,
  b: RoutePlannerAttraction,
) => {
  const recommendationDifference =
    recommendationPriority[a.recommendation] - recommendationPriority[b.recommendation]

  if (recommendationDifference !== 0) return recommendationDifference
  const scoreDifference = getWaitPriority(a) - getWaitPriority(b)
  if (scoreDifference !== 0) return scoreDifference
  return a.name.localeCompare(b.name, 'pt-BR')
}

const getNextStopScore = (
  candidate: RoutePlannerAttraction,
  previous: RoutePlannerAttraction,
  mode: RoutePlannerMode,
) => {
  const weights = modeWeights[mode]
  const waitScore = Math.min(100, getWaitPriority(candidate))
  const distanceScore = Math.min(
    100,
    calculateMapDistance(previous.location, candidate.location) / Math.SQRT2,
  )
  const sameLandBonus = previous.land === candidate.land ? -8 : 0

  return waitScore * weights.wait + distanceScore * weights.distance + sameLandBonus
}

export function explainRouteDecision(
  attraction: RoutePlannerAttraction,
  previous: RoutePlannerAttraction | undefined,
  mode: RoutePlannerMode,
): RouteDecisionExplanation {
  const weights = modeWeights[mode]
  const waitScore = clampScore(100 - Math.min(100, getWaitPriority(attraction)))
  const predictionScore = getPredictionScore(attraction)
  const distanceCost = previous
    ? Math.min(
        100,
        calculateMapDistance(previous.location, attraction.location) / Math.SQRT2,
      )
    : 0
  const distanceScore = clampScore(100 - distanceCost)
  const sameLandBonus = previous?.land === attraction.land ? 8 : 0
  const score = clampScore(
    waitScore * weights.wait
      + distanceScore * weights.distance
      + predictionScore * 0.12
      + sameLandBonus,
  )

  let primaryReason: RouteDecisionExplanation['primaryReason']

  if (!previous && attraction.recommendation === 'GO_NOW') {
    primaryReason = 'melhor ir agora'
  } else if (previous?.land === attraction.land) {
    primaryReason = 'está na mesma área'
  } else if (previous && distanceScore >= 82) {
    primaryReason = mode === 'shortest-walk'
      ? 'evita deslocamento longo'
      : 'perto da atração anterior'
  } else if (attraction.trend === 'up') {
    primaryReason = 'tendência subindo'
  } else if (attraction.recommendation === 'GO_NOW') {
    primaryReason = 'melhor ir agora'
  } else if (attraction.waitTime <= 20 || waitScore >= 75) {
    primaryReason = 'fila baixa'
  } else if (mode === 'shortest-walk' || mode === 'balanced') {
    primaryReason = 'evita deslocamento longo'
  } else {
    primaryReason = 'fila baixa'
  }

  return {
    primaryReason,
    score,
    waitScore,
    distanceScore,
    predictionScore,
  }
}

export function planAttractionRoute(
  selectedAttractions: RoutePlannerAttraction[],
  mode: RoutePlannerMode = 'balanced',
): PlannedRoute {
  if (!selectedAttractions.length) {
    return {
      stops: [],
      totalEstimatedWait: 0,
      totalEstimatedDistance: 0,
      landsVisited: 0,
      longestWalkingDistance: 0,
    }
  }

  const remaining = [...selectedAttractions].sort(compareInitialPriority)
  const orderedAttractions: RoutePlannerAttraction[] = [remaining.shift()!]

  while (remaining.length) {
    const previous = orderedAttractions[orderedAttractions.length - 1]
    remaining.sort((a, b) => {
      const scoreDifference =
        getNextStopScore(a, previous, mode) - getNextStopScore(b, previous, mode)
      return scoreDifference || compareInitialPriority(a, b)
    })
    orderedAttractions.push(remaining.shift()!)
  }

  const stops = orderedAttractions.map((attraction, index) => {
    const estimatedWait = attraction.recommendation === 'WAIT'
      ? attraction.predictedWait30Minutes ?? attraction.waitTime
      : attraction.waitTime
    const previous = orderedAttractions[index - 1]

    return {
      ...attraction,
      order: index + 1,
      estimatedWait,
      distanceFromPrevious: previous
        ? estimateWalkingDistance(previous.location, attraction.location)
        : 0,
      explanation: explainRouteDecision(attraction, previous, mode),
    }
  })

  return {
    stops,
    totalEstimatedWait: stops.reduce((total, stop) => total + stop.estimatedWait, 0),
    totalEstimatedDistance: stops.reduce(
      (total, stop) => total + stop.distanceFromPrevious,
      0,
    ),
    landsVisited: new Set(stops.map((stop) => stop.land)).size,
    longestWalkingDistance: Math.max(
      0,
      ...stops.map((stop) => stop.distanceFromPrevious),
    ),
  }
}
