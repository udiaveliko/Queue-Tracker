import type {
  Attraction,
  PlannedRoute,
  RouteDecisionExplanation,
  RoutePlannerAttraction,
  RoutePlannerMode,
  RouteRecommendation,
  RouteStartPoint,
  WaitTimePrediction,
} from '../types'
import { getPredictionForAttraction } from './predictions'
import { getAttractionGeoLocation } from '../data/attractionGeoLocations'
import { calculateGeoDistance } from './osmRouting'
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

const getCandidateScore = (
  candidate: RoutePlannerAttraction,
  origin: RouteStartPoint | RoutePlannerAttraction,
  mode: RoutePlannerMode,
) => {
  const weights = modeWeights[mode]
  const originLocation = 'location' in origin ? origin.location : origin
  const waitScore = Math.min(100, getWaitPriority(candidate))
  const candidateGeo = 'latitude' in origin
    && typeof origin.latitude === 'number'
    && typeof origin.longitude === 'number'
    ? getAttractionGeoLocation(candidate.location.parkId, {
        id: candidate.id,
        name: candidate.name,
        location: candidate.location,
      })
    : null
  const distanceScore = candidateGeo && 'latitude' in origin
    ? Math.min(
        100,
        calculateGeoDistance(
          { lat: origin.latitude!, lng: origin.longitude! },
          candidateGeo,
        ) / 20,
      )
    : Math.min(
        100,
        calculateMapDistance(originLocation, candidate.location) / Math.SQRT2,
      )
  const sameLandBonus = origin.land === candidate.land ? -8 : 0

  return waitScore * weights.wait + distanceScore * weights.distance + sameLandBonus
}

export function explainRouteDecision(
  attraction: RoutePlannerAttraction,
  previous: RoutePlannerAttraction | undefined,
  mode: RoutePlannerMode,
  startPoint?: RouteStartPoint,
): RouteDecisionExplanation {
  const weights = modeWeights[mode]
  const waitScore = clampScore(100 - Math.min(100, getWaitPriority(attraction)))
  const predictionScore = getPredictionScore(attraction)
  const origin = previous ?? startPoint
  const originLocation = origin && 'location' in origin ? origin.location : origin
  const attractionGeo = !previous
    && startPoint
    && typeof startPoint.latitude === 'number'
    && typeof startPoint.longitude === 'number'
    ? getAttractionGeoLocation(attraction.location.parkId, {
        id: attraction.id,
        name: attraction.name,
        location: attraction.location,
      })
    : null
  const distanceCost = attractionGeo && startPoint
    ? Math.min(
        100,
        calculateGeoDistance(
          { lat: startPoint.latitude!, lng: startPoint.longitude! },
          attractionGeo,
        ) / 20,
      )
    : origin
    ? Math.min(
        100,
        calculateMapDistance(originLocation!, attraction.location) / Math.SQRT2,
      )
    : 0
  const distanceScore = clampScore(100 - distanceCost)
  const sameLandBonus = origin?.land === attraction.land ? 8 : 0
  const score = clampScore(
    waitScore * weights.wait
      + distanceScore * weights.distance
      + predictionScore * 0.12
      + sameLandBonus,
  )

  let primaryReason: RouteDecisionExplanation['primaryReason']

  if (!previous && startPoint && distanceScore >= 82 && mode !== 'shortest-wait') {
    primaryReason = 'evita deslocamento longo'
  } else if (!previous && attraction.recommendation === 'GO_NOW') {
    primaryReason = 'melhor ir agora'
  } else if (origin?.land === attraction.land) {
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
  startPoint?: RouteStartPoint,
): PlannedRoute {
  if (!selectedAttractions.length) {
    return {
      stops: [],
      totalEstimatedWait: 0,
      totalEstimatedDistance: 0,
      landsVisited: 0,
      longestWalkingDistance: 0,
      distanceFromStart: 0,
    }
  }

  const remaining = [...selectedAttractions].sort((a, b) => {
    if (!startPoint) return compareInitialPriority(a, b)
    const scoreDifference =
      getCandidateScore(a, startPoint, mode) - getCandidateScore(b, startPoint, mode)
    return scoreDifference || compareInitialPriority(a, b)
  })
  const orderedAttractions: RoutePlannerAttraction[] = [remaining.shift()!]

  while (remaining.length) {
    const previous = orderedAttractions[orderedAttractions.length - 1]
    remaining.sort((a, b) => {
      const scoreDifference =
        getCandidateScore(a, previous, mode) - getCandidateScore(b, previous, mode)
      return scoreDifference || compareInitialPriority(a, b)
    })
    orderedAttractions.push(remaining.shift()!)
  }

  const stops = orderedAttractions.map((attraction, index) => {
    const estimatedWait = attraction.recommendation === 'WAIT'
      ? attraction.predictedWait30Minutes ?? attraction.waitTime
      : attraction.waitTime
    const previous = orderedAttractions[index - 1]
    const originLocation = previous?.location ?? startPoint
    const attractionGeo = !previous
      && startPoint
      && typeof startPoint.latitude === 'number'
      && typeof startPoint.longitude === 'number'
      ? getAttractionGeoLocation(attraction.location.parkId, {
          id: attraction.id,
          name: attraction.name,
          location: attraction.location,
        })
      : null

    return {
      ...attraction,
      order: index + 1,
      estimatedWait,
      distanceFromPrevious: attractionGeo && startPoint
        ? Math.round(calculateGeoDistance(
            { lat: startPoint.latitude!, lng: startPoint.longitude! },
            attractionGeo,
          ))
        : originLocation
        ? estimateWalkingDistance(originLocation, attraction.location)
        : 0,
      explanation: explainRouteDecision(attraction, previous, mode, startPoint),
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
    distanceFromStart: stops[0]?.distanceFromPrevious ?? 0,
  }
}
