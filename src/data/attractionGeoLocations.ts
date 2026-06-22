import { attractionLocations } from './attractionLocations'
import { parks } from './parks'
import type {
  AttractionLocation,
  PlannedRoute,
  RouteStartPoint,
} from '../types'

export interface GeoCoordinate {
  lat: number
  lng: number
}

export interface AttractionGeoLocation extends GeoCoordinate {
  parkId: string
  attractionId: string
  name: string
  estimated?: boolean
}

export interface ParkGeoConfig extends GeoCoordinate {
  zoom: number
  latitudeSpan: number
  longitudeSpan: number
}

export const parkGeoConfigs: Record<string, ParkGeoConfig> = {
  'magic-kingdom': { lat: 28.4177, lng: -81.5812, zoom: 16, latitudeSpan: .012, longitudeSpan: .014 },
  epcot: { lat: 28.3747, lng: -81.5494, zoom: 15, latitudeSpan: .017, longitudeSpan: .019 },
  'hollywood-studios': { lat: 28.3575, lng: -81.5583, zoom: 16, latitudeSpan: .011, longitudeSpan: .013 },
  'animal-kingdom': { lat: 28.3553, lng: -81.5901, zoom: 15, latitudeSpan: .018, longitudeSpan: .020 },
  'universal-studios-florida': { lat: 28.4754, lng: -81.4672, zoom: 16, latitudeSpan: .012, longitudeSpan: .014 },
  'islands-of-adventure': { lat: 28.4717, lng: -81.471, zoom: 16, latitudeSpan: .012, longitudeSpan: .014 },
  'epic-universe': { lat: 28.4407, lng: -81.4476, zoom: 15, latitudeSpan: .017, longitudeSpan: .019 },
  'seaworld-orlando': { lat: 28.411, lng: -81.4613, zoom: 15, latitudeSpan: .016, longitudeSpan: .018 },
  'busch-gardens-tampa': { lat: 28.038, lng: -82.4212, zoom: 15, latitudeSpan: .019, longitudeSpan: .021 },
}

const normalizeName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()

export function relativeLocationToGeo(
  parkId: string,
  location: Pick<AttractionLocation, 'x' | 'y'>,
): GeoCoordinate | null {
  const config = parkGeoConfigs[parkId]
  if (!config) return null

  return {
    lat: config.lat + ((50 - location.y) / 100) * config.latitudeSpan,
    lng: config.lng + ((location.x - 50) / 100) * config.longitudeSpan,
  }
}

export const attractionGeoLocations: AttractionGeoLocation[] = parks.flatMap((park) =>
  park.attractions.flatMap((attraction) => {
    const relativeLocation = attractionLocations.find((location) =>
      location.parkId === park.id && location.attractionId === attraction.id,
    )
    if (!relativeLocation) return []

    const geo = relativeLocationToGeo(park.id, relativeLocation)
    if (!geo) return []

    return [{
      parkId: park.id,
      attractionId: attraction.id,
      name: attraction.name,
      ...geo,
      estimated: true,
    }]
  }),
)

export function getAttractionGeoLocation(
  parkId: string,
  attraction: { id: string; name: string; location?: AttractionLocation },
): AttractionGeoLocation | null {
  const known = attractionGeoLocations.find((location) =>
    location.parkId === parkId
    && (
      location.attractionId === attraction.id
      || normalizeName(location.name) === normalizeName(attraction.name)
    ),
  )

  if (known) {
    return {
      ...known,
      attractionId: attraction.id,
      name: attraction.name,
    }
  }

  const projected = attraction.location
    ? relativeLocationToGeo(parkId, attraction.location)
    : null

  return projected
    ? {
        parkId,
        attractionId: attraction.id,
        name: attraction.name,
        ...projected,
        estimated: true,
      }
    : null
}

export function getStartPointGeoLocation(
  parkId: string,
  startPoint: RouteStartPoint,
): GeoCoordinate | null {
  return relativeLocationToGeo(parkId, startPoint)
}

export function hasEnoughOSMCoordinates(
  parkId: string,
  route: PlannedRoute,
  startPoint: RouteStartPoint,
) {
  if (!parkGeoConfigs[parkId]) return false
  if (!getStartPointGeoLocation(parkId, startPoint)) return false
  return route.stops.every((stop) =>
    getAttractionGeoLocation(parkId, {
      id: stop.id,
      name: stop.name,
      location: stop.location,
    }) !== null,
  )
}
