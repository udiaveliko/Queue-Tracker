import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getDistanceMeters,
  getParkLocationStatus,
  parkBoundaries,
} from '../src/data/parkBoundaries.ts'

const expectedParkIds = [
  'magic-kingdom',
  'epcot',
  'hollywood-studios',
  'animal-kingdom',
  'universal-studios-florida',
  'islands-of-adventure',
  'epic-universe',
  'seaworld-orlando',
  'busch-gardens-tampa',
]

test('todos os parques possuem geofence completa', () => {
  for (const parkId of expectedParkIds) {
    const boundary = parkBoundaries[parkId]

    assert.ok(boundary)
    assert.ok(boundary.boundingBox.north > boundary.boundingBox.south)
    assert.ok(boundary.boundingBox.east > boundary.boundingBox.west)
    assert.ok(boundary.radiusMeters > 0)
    assert.ok(boundary.nearbyRadiusMeters > boundary.radiusMeters)
  }
})

test('o centro de cada parque é classificado como dentro', () => {
  for (const parkId of expectedParkIds) {
    const boundary = parkBoundaries[parkId]
    assert.equal(getParkLocationStatus(parkId, boundary.center), 'inside')
  }
})

test('posição além da área interna, mas próxima, é classificada como próximo', () => {
  const boundary = parkBoundaries['magic-kingdom']
  const distance = (boundary.radiusMeters + boundary.nearbyRadiusMeters) / 2
  const point = {
    latitude: boundary.center.latitude + distance / 111_320,
    longitude: boundary.center.longitude,
  }

  assert.equal(getParkLocationStatus('magic-kingdom', point), 'near')
})

test('posição distante é classificada como fora', () => {
  const boundary = parkBoundaries.epcot
  const point = {
    latitude: boundary.center.latitude + (boundary.nearbyRadiusMeters * 1.5) / 111_320,
    longitude: boundary.center.longitude,
  }

  assert.equal(getParkLocationStatus('epcot', point), 'outside')
})

test('distância geográfica retorna metros de forma consistente', () => {
  const distance = getDistanceMeters(
    { latitude: 28.4177, longitude: -81.5812 },
    { latitude: 28.4187, longitude: -81.5812 },
  )

  assert.ok(distance > 100 && distance < 120)
})
