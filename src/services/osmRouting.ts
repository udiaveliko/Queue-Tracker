import type { GeoCoordinate } from '../data/attractionGeoLocations'

export interface NamedGeoCoordinate extends GeoCoordinate {
  name: string
}

export type OSMRouteLegSource =
  | 'walking-osrm'
  | 'internal-path'
  | 'direct-fallback'

export interface OSMRouteLeg {
  fromName: string
  toName: string
  coordinates: Array<[number, number]>
  distanceMeters: number
  durationSeconds: number
  source: OSMRouteLegSource
}

export interface WalkingRouteLegOptions {
  internalCoordinates?: GeoCoordinate[]
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

const calculatePathDistance = (coordinates: GeoCoordinate[]) =>
  coordinates.slice(1).reduce(
    (total, coordinate, index) =>
      total + calculateGeoDistance(coordinates[index], coordinate),
    0,
  )

export function createDirectFallbackLeg(
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
    source: 'direct-fallback',
  }
}

export function createInternalPathLeg(
  from: NamedGeoCoordinate,
  to: NamedGeoCoordinate,
  internalCoordinates: GeoCoordinate[],
): OSMRouteLeg {
  const path = [
    from,
    ...internalCoordinates,
    to,
  ].filter((coordinate, index, coordinates) =>
    index === 0
    || calculateGeoDistance(coordinates[index - 1], coordinate) >= 4,
  )
  const distanceMeters = Math.round(calculatePathDistance(path))

  return {
    fromName: from.name,
    toName: to.name,
    coordinates: path.map((coordinate) => [coordinate.lat, coordinate.lng]),
    distanceMeters,
    durationSeconds: Math.max(60, Math.round(distanceMeters / 1.25)),
    source: 'internal-path',
  }
}

export function buildOSRMWalkingUrl(
  from: GeoCoordinate,
  to: GeoCoordinate,
) {
  const coordinates = `${from.lng},${from.lat};${to.lng},${to.lat}`
  return `${OSRM_BASE_URL}/route/v1/foot/${coordinates}?overview=full&geometries=geojson&steps=false`
}

const fetchOSRMWalkingLeg = async (
  from: NamedGeoCoordinate,
  to: NamedGeoCoordinate,
  signal?: AbortSignal,
): Promise<OSMRouteLeg | null> => {
  const response = await fetch(buildOSRMWalkingUrl(from, to), {
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
    source: 'walking-osrm',
  }
}

export async function getWalkingRouteLeg(
  from: NamedGeoCoordinate,
  to: NamedGeoCoordinate,
  options: WalkingRouteLegOptions = {},
  signal?: AbortSignal,
): Promise<OSMRouteLeg> {
  try {
    const walkingRoute = await fetchOSRMWalkingLeg(from, to, signal)
    if (walkingRoute) return walkingRoute
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
  }

  if (options.internalCoordinates?.length) {
    return createInternalPathLeg(from, to, options.internalCoordinates)
  }

  return createDirectFallbackLeg(from, to)
}

export async function getWalkingRouteLegs(
  points: NamedGeoCoordinate[],
  options: WalkingRouteLegOptions[] = [],
  signal?: AbortSignal,
): Promise<OSMRouteLeg[]> {
  const legs: OSMRouteLeg[] = []

  for (let index = 0; index < points.length - 1; index += 1) {
    if (signal?.aborted) throw new DOMException('Operação cancelada.', 'AbortError')
    legs.push(
      await getWalkingRouteLeg(
        points[index],
        points[index + 1],
        options[index],
        signal,
      ),
    )
  }

  return legs
}
