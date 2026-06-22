export type ParkLocationStatus = 'inside' | 'near' | 'outside'

export interface GeoPoint {
  latitude: number
  longitude: number
}

export interface ParkBoundary {
  parkId: string
  center: GeoPoint
  boundingBox: {
    north: number
    south: number
    east: number
    west: number
  }
  radiusMeters: number
  nearbyRadiusMeters: number
}

export const parkBoundaries: Record<string, ParkBoundary> = {
  'magic-kingdom': {
    parkId: 'magic-kingdom',
    center: { latitude: 28.4177, longitude: -81.5812 },
    boundingBox: { north: 28.4242, south: 28.4115, east: -81.5738, west: -81.5888 },
    radiusMeters: 1_050,
    nearbyRadiusMeters: 2_300,
  },
  epcot: {
    parkId: 'epcot',
    center: { latitude: 28.3747, longitude: -81.5494 },
    boundingBox: { north: 28.3834, south: 28.3655, east: -81.5392, west: -81.5598 },
    radiusMeters: 1_450,
    nearbyRadiusMeters: 2_900,
  },
  'hollywood-studios': {
    parkId: 'hollywood-studios',
    center: { latitude: 28.3575, longitude: -81.5584 },
    boundingBox: { north: 28.3641, south: 28.3508, east: -81.5509, west: -81.5659 },
    radiusMeters: 1_000,
    nearbyRadiusMeters: 2_200,
  },
  'animal-kingdom': {
    parkId: 'animal-kingdom',
    center: { latitude: 28.3553, longitude: -81.5904 },
    boundingBox: { north: 28.3672, south: 28.3432, east: -81.5772, west: -81.6038 },
    radiusMeters: 1_650,
    nearbyRadiusMeters: 3_200,
  },
  'universal-studios-florida': {
    parkId: 'universal-studios-florida',
    center: { latitude: 28.4754, longitude: -81.4672 },
    boundingBox: { north: 28.4824, south: 28.4682, east: -81.4592, west: -81.4752 },
    radiusMeters: 1_050,
    nearbyRadiusMeters: 2_300,
  },
  'islands-of-adventure': {
    parkId: 'islands-of-adventure',
    center: { latitude: 28.4718, longitude: -81.4717 },
    boundingBox: { north: 28.479, south: 28.4645, east: -81.4635, west: -81.4799 },
    radiusMeters: 1_050,
    nearbyRadiusMeters: 2_300,
  },
  'epic-universe': {
    parkId: 'epic-universe',
    center: { latitude: 28.4367, longitude: -81.4474 },
    boundingBox: { north: 28.4488, south: 28.4245, east: -81.4336, west: -81.4612 },
    radiusMeters: 1_750,
    nearbyRadiusMeters: 3_300,
  },
  'seaworld-orlando': {
    parkId: 'seaworld-orlando',
    center: { latitude: 28.4112, longitude: -81.4629 },
    boundingBox: { north: 28.4222, south: 28.4001, east: -81.4504, west: -81.4754 },
    radiusMeters: 1_550,
    nearbyRadiusMeters: 3_000,
  },
  'busch-gardens-tampa': {
    parkId: 'busch-gardens-tampa',
    center: { latitude: 28.0373, longitude: -82.4194 },
    boundingBox: { north: 28.0501, south: 28.0244, east: -82.4049, west: -82.4339 },
    radiusMeters: 1_800,
    nearbyRadiusMeters: 3_400,
  },
}

const toRadians = (value: number) => (value * Math.PI) / 180

export function getDistanceMeters(from: GeoPoint, to: GeoPoint): number {
  const earthRadiusMeters = 6_371_000
  const latitudeDelta = toRadians(to.latitude - from.latitude)
  const longitudeDelta = toRadians(to.longitude - from.longitude)
  const fromLatitude = toRadians(from.latitude)
  const toLatitude = toRadians(to.latitude)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine))
}

export function isPointInsideParkBoundingBox(
  point: GeoPoint,
  boundary: ParkBoundary,
): boolean {
  return (
    point.latitude <= boundary.boundingBox.north &&
    point.latitude >= boundary.boundingBox.south &&
    point.longitude <= boundary.boundingBox.east &&
    point.longitude >= boundary.boundingBox.west
  )
}

export function getParkLocationStatus(
  parkId: string,
  point: GeoPoint,
): ParkLocationStatus {
  const boundary = parkBoundaries[parkId]

  if (!boundary) {
    return 'outside'
  }

  const distanceFromCenter = getDistanceMeters(boundary.center, point)
  const isInside =
    isPointInsideParkBoundingBox(point, boundary) &&
    distanceFromCenter <= boundary.radiusMeters

  if (isInside) {
    return 'inside'
  }

  return distanceFromCenter <= boundary.nearbyRadiusMeters ? 'near' : 'outside'
}
