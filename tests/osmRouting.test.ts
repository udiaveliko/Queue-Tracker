import assert from 'node:assert/strict'
import test from 'node:test'
import {
  attractionGeoLocations,
  parkGeoConfigs,
  relativeLocationToGeo,
} from '../src/data/attractionGeoLocations.ts'
import {
  calculateGeoDistance,
  createDirectRoute,
} from '../src/services/osmRouting.ts'

test('todos os parques possuem centro e zoom para OpenStreetMap', () => {
  const expectedParks = [
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

  for (const parkId of expectedParks) {
    assert.ok(parkGeoConfigs[parkId])
    assert.ok(parkGeoConfigs[parkId].zoom >= 15)
  }
})

test('projeta coordenada relativa para latitude e longitude do parque', () => {
  const center = relativeLocationToGeo('magic-kingdom', { x: 50, y: 50 })

  assert.deepEqual(center, {
    lat: parkGeoConfigs['magic-kingdom'].lat,
    lng: parkGeoConfigs['magic-kingdom'].lng,
  })
  assert.ok(attractionGeoLocations.length > 50)
})

test('rota direta calcula distância e caminhada sem serviço externo', () => {
  const points = [
    { lat: 28.4177, lng: -81.5812 },
    { lat: 28.4187, lng: -81.5812 },
  ]
  const distance = calculateGeoDistance(points[0], points[1])
  const route = createDirectRoute(points)

  assert.ok(distance > 100 && distance < 120)
  assert.equal(route.source, 'direct')
  assert.equal(route.coordinates.length, 2)
  assert.ok(route.durationMinutes >= 1)
})
