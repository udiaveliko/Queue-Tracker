import type { GeoCoordinate } from '../data/attractionGeoLocations'

export interface NamedGeoCoordinate extends GeoCoordinate {
  name: string
}

export interface OSMRouteLeg {
  fromName: string
  toName: string
  coordinates: Array<[number, number]>
  distanceMeters: number
  durationSeconds: number
  source: 'osrm' | 'fallback'
  profile?: 'foot' | 'driving-compatible'
}

const OSRM_BASE_URL = 'https://router.project-osrm.org'

const toRadians = (value: number) => value * Math.PI / 180

export function calculateGeoDistance(from: GeoCoordinate, to: GeoCoordinate) {
  const earthRadius = 6_371_000
  const latitudeDistance = toRadians(to.lat - from.lat)
  const longitudeDistance = toRadians(to.lng - from.lng)
  const firstLatitude = toRadians(from.lat)
  const secondLatitude = toRadians(to.lat)
  const haversine =
    Math.sin(latitudeDistance / 2) ** 2
    + Math.cos(firstLatitude)
      * Math.cos(secondLatitude)
      * Math.sin(longitudeDistance / 2) ** 2

  return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

export function createFallbackLeg(
  from: NamedGeoCoordinate,
  to: NamedGeoCoordinate,
): OSMRouteLeg {
  const distanceMeters = Math.round(calculateGeoDistance(from, to))

  return {
    fromName: from.name,
    toName: to.name,
    coordinates: [
      [from.lat, from.lng],
      [to.lat, to.lng],
    ],
    distanceMeters,
    durationSeconds: Math.max(60, Math.round(distanceMeters / 1.25)),
    source: 'fallback',
  }
}

const fetchOSRMLeg = async (
  from: NamedGeoCoordinate,
  to: NamedGeoCoordinate,
  profile: 'foot' | 'driving',
  signal?: AbortSignal,
): Promise<OSMRouteLeg | null> => {
  const coordinates = `${from.lng},${from.lat};${to.lng},${to.lat}`
  const url = `${OSRM_BASE_URL}/route/v1/${profile}/${coordinates}?overview=full&geometries=geojson&steps=false`
  const response = await fetch(url, {
    signal,
    cache: 'no-store',
  })

  if (!response.ok) return null

  const payload = await response.json() as {
    routes?: Array<{
      distance: number
      duration: number
      geometry: { coordinates: [number, number][] }
    }>
  }
  const route = payload.routes?.[0]
  if (!route?.geometry.coordinates.length) return null

  return {
    fromName: from.name,
    toName: to.name,
    coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceMeters: Math.round(route.distance),
    durationSeconds: Math.max(1, Math.round(route.duration)),
    source: 'osrm',
    profile: profile === 'foot' ? 'foot' : 'driving-compatible',
  }
}

export async function getWalkingRouteLeg(
  from: NamedGeoCoordinate,
  to: NamedGeoCoordinate,
  signal?: AbortSignal,
): Promise<OSMRouteLeg> {
  try {
    const walkingRoute = await fetchOSRMLeg(from, to, 'foot', signal)
    if (walkingRoute) return walkingRoute

    const compatibleRoute = await fetchOSRMLeg(from, to, 'driving', signal)
    if (compatibleRoute) return compatibleRoute
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
  }

  return createFallbackLeg(from, to)
}

export async function getWalkingRouteLegs(
  points: NamedGeoCoordinate[],
  signal?: AbortSignal,
): Promise<OSMRouteLeg[]> {
  const legs: OSMRouteLeg[] = []

  for (let index = 0; index < points.length - 1; index += 1) {
    if (signal?.aborted) throw new DOMException('Operação cancelada.', 'AbortError')
    legs.push(await getWalkingRouteLeg(points[index], points[index + 1], signal))
  }

  return legs
}
