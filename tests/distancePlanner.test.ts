import assert from 'node:assert/strict'
import test from 'node:test'
import {
  estimateWalkingDistance,
  resolveAttractionLocation,
} from '../src/services/distancePlanner.ts'

test('encontra atração conhecida pelo nome mesmo com id da API diferente', () => {
  const location = resolveAttractionLocation('magic-kingdom', {
    id: 'api-space-mountain',
    name: 'Space Mountain',
    land: 'Tomorrowland',
  })

  assert.equal(location.x, 82)
  assert.equal(location.y, 18)
  assert.equal(location.estimatedLocation, false)
})

test('usa centro da área para atração desconhecida', () => {
  const location = resolveAttractionLocation('magic-kingdom', {
    id: 'new-ride',
    name: 'Nova atração',
    land: 'Tomorrowland',
  })

  assert.deepEqual(
    { x: location.x, y: location.y, estimated: location.estimatedLocation },
    { x: 80, y: 42, estimated: true },
  )
})

test('usa centro do parque quando área também é desconhecida', () => {
  const location = resolveAttractionLocation('magic-kingdom', {
    id: 'mystery-ride',
    name: 'Mystery Ride',
    land: 'Área não informada',
  })

  assert.equal(location.x, 50)
  assert.equal(location.y, 50)
  assert.equal(location.estimatedLocation, true)
})

test('calcula caminhada em metros e favorece atrações da mesma área', () => {
  const base = {
    parkId: 'park',
    attractionId: 'a',
    x: 10,
    y: 10,
    land: 'Land A',
    estimatedLocation: false,
  }
  const sameLand = { ...base, attractionId: 'b', x: 20 }
  const otherLand = { ...sameLand, attractionId: 'c', land: 'Land B' }

  assert.ok(estimateWalkingDistance(base, sameLand) > 0)
  assert.ok(
    estimateWalkingDistance(base, sameLand)
      < estimateWalkingDistance(base, otherLand),
  )
})
