import type { GeoCoordinate } from '../data/attractionGeoLocations'

export interface OSMRouteResult {
  coordinates: GeoCoordinate[]
  distanceMeters: number
  durationMinutes: number
  source: 'osrm' | 'direct'
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

export function createDirectRoute(points: GeoCoordinate[]): OSMRouteResult {
  const distanceMeters = points.slice(1).reduce(
    (total, point, index) => total + calculateGeoDistance(points[index], point),
    0,
  )

  return {
    coordinates: points,
    distanceMeters: Math.round(distanceMeters),
    durationMinutes: Math.max(0, Math.round(distanceMeters / 75)),
    source: 'direct',
  }
}

export async function getWalkingRoute(
  points: GeoCoordinate[],
  signal?: AbortSignal,
): Promise<OSMRouteResult> {
  if (points.length < 2) return createDirectRoute(points)

  const coordinates = points.map((point) => `${point.lng},${point.lat}`).join(';')
  const url = `${OSRM_BASE_URL}/route/v1/foot/${coordinates}?overview=full&geometries=geojson&steps=false`

  try {
    const response = await fetch(url, { signal })
    if (!response.ok) throw new Error('OSRM indisponível.')

    const payload = await response.json() as {
      routes?: Array<{
        distance: number
        duration: number
        geometry: { coordinates: [number, number][] }
      }>
    }
    const route = payload.routes?.[0]
    if (!route?.geometry.coordinates.length) throw new Error('Rota OSRM vazia.')

    return {
      coordinates: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
      distanceMeters: Math.round(route.distance),
      durationMinutes: Math.max(1, Math.round(route.duration / 60)),
      source: 'osrm',
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    return createDirectRoute(points)
  }
}
