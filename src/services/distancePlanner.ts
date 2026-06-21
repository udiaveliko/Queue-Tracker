import { attractionLocations } from '../data/attractionLocations'
import { PARK_CENTER, parkLandCenters } from '../data/parkLandCenters'
import type {
  Attraction,
  ResolvedAttractionLocation,
} from '../types'

const METERS_PER_MAP_UNIT = 12

const normalizeName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()

export function resolveAttractionLocation(
  parkId: string,
  attraction: Pick<Attraction, 'id' | 'name' | 'land'>,
): ResolvedAttractionLocation {
  const knownLocation = attractionLocations.find((location) =>
    location.parkId === parkId
    && (
      location.attractionId === attraction.id
      || (
        location.attractionName !== undefined
        && normalizeName(location.attractionName) === normalizeName(attraction.name)
      )
    ),
  )

  if (knownLocation) {
    return {
      ...knownLocation,
      attractionId: attraction.id,
      attractionName: attraction.name,
      land: attraction.land || knownLocation.land,
      estimatedLocation: false,
    }
  }

  const landCenter = parkLandCenters[parkId]?.[attraction.land]

  return {
    parkId,
    attractionId: attraction.id,
    attractionName: attraction.name,
    x: landCenter?.x ?? PARK_CENTER.x,
    y: landCenter?.y ?? PARK_CENTER.y,
    land: attraction.land,
    estimatedLocation: true,
  }
}

export function calculateMapDistance(
  from: ResolvedAttractionLocation,
  to: ResolvedAttractionLocation,
) {
  return Math.hypot(to.x - from.x, to.y - from.y)
}

export function estimateWalkingDistance(
  from: ResolvedAttractionLocation,
  to: ResolvedAttractionLocation,
) {
  const directDistance = calculateMapDistance(from, to) * METERS_PER_MAP_UNIT
  const pathFactor = from.land && from.land === to.land ? 1.08 : 1.22
  return Math.round((directDistance * pathFactor) / 10) * 10
}
