import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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
  buildOSRMWalkingUrl,
  calculateGeoDistance,
  createDirectFallbackLeg,
  createInternalPathLeg,
  getWalkingRouteLeg,
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
  const route = createDirectFallbackLeg(from, to)

  assert.ok(distance > 100 && distance < 120)
  assert.equal(route.source, 'direct-fallback')
  assert.equal(route.coordinates.length, 2)
  assert.equal(route.fromName, 'Entrada')
  assert.equal(route.toName, 'Atração')
  assert.ok(route.durationSeconds >= 60)
})

test('URL do OSRM usa exclusivamente o perfil foot', () => {
  const url = buildOSRMWalkingUrl(
    { lat: 28.4177, lng: -81.5812 },
    { lat: 28.4191, lng: -81.5772 },
  )
  const source = readFileSync(
    new URL('../src/services/osmRouting.ts', import.meta.url),
    'utf8',
  )

  assert.match(url, /\/route\/v1\/foot\//)
  assert.doesNotMatch(source, /driving|driving-compatible|\/car\//i)
})

test('fallback interno nunca usa rota de carro', () => {
  const from = { name: 'Entrada', lat: 28.4177, lng: -81.5812 }
  const to = { name: 'Atração', lat: 28.4191, lng: -81.5772 }
  const route = createInternalPathLeg(from, to, [
    { lat: 28.4181, lng: -81.5800 },
    { lat: 28.4187, lng: -81.5785 },
  ])

  assert.equal(route.source, 'internal-path')
  assert.equal(route.coordinates.length, 4)
})

test('OSRM falhando gera somente linha direta ou caminho interno', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(null, { status: 404 })

  try {
    const from = { name: 'GPS', lat: 28.4177, lng: -81.5812 }
    const to = { name: 'Space Mountain', lat: 28.4191503, lng: -81.5772484 }
    const direct = await getWalkingRouteLeg(from, to)
    const internal = await getWalkingRouteLeg(from, to, {
      internalCoordinates: [{ lat: 28.4184, lng: -81.5794 }],
    })

    assert.equal(direct.source, 'direct-fallback')
    assert.equal(direct.coordinates.length, 2)
    assert.equal(internal.source, 'internal-path')
  } finally {
    globalThis.fetch = originalFetch
  }
})
