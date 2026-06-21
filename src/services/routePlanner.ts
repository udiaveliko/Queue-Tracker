import type {
  Attraction,
  PlannedRoute,
  RoutePlannerAttraction,
  RouteRecommendation,
  WaitTimePrediction,
} from '../types'
import { getPredictionForAttraction } from './predictions'

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
  }
}

export function createStoredRoutePlannerAttraction(
  parkId: string,
  attraction: Attraction,
): RoutePlannerAttraction | null {
  return createRoutePlannerAttraction(
    attraction,
    getPredictionForAttraction(parkId, attraction.id),
  )
}

export function planAttractionRoute(
  selectedAttractions: RoutePlannerAttraction[],
): PlannedRoute {
  const sortedAttractions = [...selectedAttractions].sort((a, b) => {
    const recommendationDifference =
      recommendationPriority[a.recommendation] - recommendationPriority[b.recommendation]

    if (recommendationDifference !== 0) return recommendationDifference
    if (a.waitTime !== b.waitTime) return a.waitTime - b.waitTime
    return a.name.localeCompare(b.name, 'pt-BR')
  })

  const stops = sortedAttractions.map((attraction, index) => {
    const estimatedWait = attraction.recommendation === 'WAIT'
      ? attraction.predictedWait30Minutes ?? attraction.waitTime
      : attraction.waitTime

    return {
      ...attraction,
      order: index + 1,
      estimatedWait,
    }
  })

  return {
    stops,
    totalEstimatedWait: stops.reduce((total, stop) => total + stop.estimatedWait, 0),
  }
}
