import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  ResolvedAttractionLocation,
  RoutePlannerAttraction,
  RouteRecommendation,
} from '../src/types/index.ts'
import {
  explainRouteDecision,
  planAttractionRoute,
} from '../src/services/routePlanner.ts'

const routeAttraction = (
  id: string,
  waitTime: number,
  recommendation: RouteRecommendation,
  x: number,
  y: number,
  land = 'Test Land',
): RoutePlannerAttraction => ({
  id,
  name: id,
  land,
  waitTime,
  trend: recommendation === 'GO_NOW'
    ? 'up'
    : recommendation === 'WAIT'
      ? 'down'
      : 'stable',
  recommendation,
  predictedWait30Minutes: waitTime,
  location: {
    parkId: 'test-park',
    attractionId: id,
    x,
    y,
    land,
    estimatedLocation: false,
  } satisfies ResolvedAttractionLocation,
})

test('primeira atração respeita recomendação GO_NOW em qualquer modo', () => {
  const attractions = [
    routeAttraction('go-now', 45, 'GO_NOW', 0, 0),
    routeAttraction('short-wait', 5, 'STABLE', 50, 50),
  ]

  assert.equal(planAttractionRoute(attractions, 'shortest-wait').stops[0].id, 'go-now')
  assert.equal(planAttractionRoute(attractions, 'shortest-walk').stops[0].id, 'go-now')
})

test('modo menor fila prefere a próxima atração com espera baixa', () => {
  const route = planAttractionRoute([
    routeAttraction('first', 30, 'GO_NOW', 0, 0),
    routeAttraction('near', 50, 'WAIT', 5, 0),
    routeAttraction('far-short', 5, 'STABLE', 90, 90),
  ], 'shortest-wait')

  assert.deepEqual(route.stops.map((stop) => stop.id), ['first', 'far-short', 'near'])
})

test('modo menor caminhada prefere a atração mais próxima e soma distâncias', () => {
  const route = planAttractionRoute([
    routeAttraction('first', 30, 'GO_NOW', 0, 0),
    routeAttraction('near', 50, 'WAIT', 5, 0),
    routeAttraction('far-short', 5, 'STABLE', 90, 90, 'Other Land'),
  ], 'shortest-walk')

  assert.deepEqual(route.stops.map((stop) => stop.id), ['first', 'near', 'far-short'])
  assert.equal(route.stops[0].distanceFromPrevious, 0)
  assert.ok(route.totalEstimatedDistance > 0)
  assert.equal(route.landsVisited, 2)
  assert.equal(
    route.longestWalkingDistance,
    Math.max(...route.stops.map((stop) => stop.distanceFromPrevious)),
  )
})

test('explica decisão com scores entre zero e cem', () => {
  const previous = routeAttraction('previous', 30, 'STABLE', 10, 10)
  const candidate = routeAttraction('candidate', 12, 'GO_NOW', 14, 10)
  const explanation = explainRouteDecision(candidate, previous, 'balanced')

  assert.equal(explanation.primaryReason, 'está na mesma área')
  assert.ok(explanation.score >= 0 && explanation.score <= 100)
  assert.ok(explanation.waitScore >= 0 && explanation.waitScore <= 100)
  assert.ok(explanation.distanceScore >= 0 && explanation.distanceScore <= 100)
  assert.equal(explanation.predictionScore, 100)
})

test('primeira parada explica recomendação de ir agora', () => {
  const explanation = explainRouteDecision(
    routeAttraction('first', 40, 'GO_NOW', 10, 10),
    undefined,
    'shortest-wait',
  )

  assert.equal(explanation.primaryReason, 'melhor ir agora')
})

test('rota vazia retorna totais zerados', () => {
  assert.deepEqual(planAttractionRoute([], 'balanced'), {
    stops: [],
    totalEstimatedWait: 0,
    totalEstimatedDistance: 0,
    landsVisited: 0,
    longestWalkingDistance: 0,
  })
})
