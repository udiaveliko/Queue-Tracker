import assert from 'node:assert/strict'
import test from 'node:test'
import {
  attractionGeoLocations,
  geoLocationToRelative,
  getAttractionGeoLocation,
  normalizeAttractionName,
  parkGeoConfigs,
  relativeLocationToGeo,
} from '../src/data/attractionGeoLocations.ts'
import {
  calculateGeoDistance,
  createFallbackLeg,
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

test('converte GPS real de volta para coordenada relativa do Planner', () => {
  const relative = geoLocationToRelative('epcot', {
    lat: parkGeoConfigs.epcot.lat,
    lng: parkGeoConfigs.epcot.lng,
  })

  assert.deepEqual(relative, { x: 50, y: 50 })
})

test('normaliza acentos, hífens, símbolos e variações de caixa', () => {
  assert.equal(
    normalizeAttractionName('Remy’s Ratatouille-Adventure!'),
    normalizeAttractionName("remy's ratatouille adventure"),
  )
})

test('distingue coordenadas verificadas e estimadas', () => {
  const verified = getAttractionGeoLocation('magic-kingdom', {
    id: 'api-space-mountain',
    name: 'Space Mountain',
  })
  const estimated = getAttractionGeoLocation('magic-kingdom', {
    id: 'magic-kingdom-17',
    name: 'Walt Disney World Railroad',
  })

  assert.equal(verified?.source, 'verified')
  assert.equal(verified?.lat, 28.4191503)
  assert.equal(estimated?.source, 'estimated')
})

test('rota direta calcula distância e caminhada sem serviço externo', () => {
  const from = { name: 'Entrada', lat: 28.4177, lng: -81.5812 }
  const to = { name: 'Atração', lat: 28.4187, lng: -81.5812 }
  const distance = calculateGeoDistance(from, to)
  const route = createFallbackLeg(from, to)

  assert.ok(distance > 100 && distance < 120)
  assert.equal(route.source, 'fallback')
  assert.equal(route.coordinates.length, 2)
  assert.equal(route.fromName, 'Entrada')
  assert.equal(route.toName, 'Atração')
  assert.ok(route.durationSeconds >= 60)
})
