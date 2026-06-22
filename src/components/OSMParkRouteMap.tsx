import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { divIcon, latLngBounds, type LatLngExpression } from 'leaflet'
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {
  getAttractionGeoLocation,
  getStartPointGeoLocation,
  parkGeoConfigs,
  type GeoCoordinate,
} from '../data/attractionGeoLocations'
import {
  createDirectRoute,
  getWalkingRoute,
  type OSMRouteResult,
} from '../services/osmRouting'
import type { PlannedRoute, RouteStartPoint } from '../types'

interface OSMParkRouteMapProps {
  parkId: string
  parkName: string
  accent: string
  route: PlannedRoute
  startPoint: RouteStartPoint
}

interface FitMapProps {
  points: GeoCoordinate[]
}

function FitMap({ points }: FitMapProps) {
  const map = useMap()

  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(
        latLngBounds(points.map((point) => [point.lat, point.lng])),
        { padding: [28, 28], maxZoom: 18 },
      )
    }
  }, [map, points])

  return null
}

const formatDistance = (distance: number) =>
  distance >= 1000
    ? `${(distance / 1000).toFixed(1).replace('.', ',')} km`
    : `${distance} m`

const createNumberedIcon = (number: number, accent: string, highlighted: boolean, estimated: boolean) =>
  divIcon({
    className: 'osm-route-div-icon',
    html: `<span class="osm-route-pin ${highlighted ? 'is-current' : ''} ${estimated ? 'is-estimated' : ''}" style="--pin-accent:${accent}"><b>${number}</b></span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })

const createStartIcon = (accent: string) =>
  divIcon({
    className: 'osm-route-div-icon',
    html: `<span class="osm-route-start-pin" style="--pin-accent:${accent}"><i></i></span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })

export function OSMParkRouteMap({
  parkId,
  parkName,
  accent,
  route,
  startPoint,
}: OSMParkRouteMapProps) {
  const config = parkGeoConfigs[parkId]
  const startGeo = useMemo(
    () => getStartPointGeoLocation(parkId, startPoint),
    [parkId, startPoint],
  )
  const stopLocations = useMemo(
    () => route.stops.flatMap((stop) => {
      const geo = getAttractionGeoLocation(parkId, {
        id: stop.id,
        name: stop.name,
        location: stop.location,
      })
      return geo ? [{ stop, geo }] : []
    }),
    [parkId, route.stops],
  )
  const allPoints = useMemo(
    () => startGeo ? [startGeo, ...stopLocations.map((item) => item.geo)] : [],
    [startGeo, stopLocations],
  )
  const [walkingRoute, setWalkingRoute] = useState<OSMRouteResult>(() => createDirectRoute(allPoints))

  useEffect(() => {
    const controller = new AbortController()
    setWalkingRoute(createDirectRoute(allPoints))
    void getWalkingRoute(allPoints, controller.signal).then(setWalkingRoute).catch(() => undefined)
    return () => controller.abort()
  }, [allPoints])

  if (!config || !startGeo) return null

  const osmUrl = `https://www.openstreetmap.org/?mlat=${config.lat}&mlon=${config.lng}#map=${config.zoom}/${config.lat}/${config.lng}`
  const linePositions = walkingRoute.coordinates.map(
    (point) => [point.lat, point.lng] as LatLngExpression,
  )

  return (
    <section className="osm-park-route-map" style={{ '--park-accent': accent } as CSSProperties}>
      <div className="osm-map-heading">
        <div>
          <span className="section-kicker">Mapa real da rota</span>
          <h2>{parkName}</h2>
        </div>
        <a href={osmUrl} target="_blank" rel="noreferrer">
          Abrir no OpenStreetMap
        </a>
      </div>

      <div className="osm-map-shell">
        <MapContainer
          key={parkId}
          center={[config.lat, config.lng]}
          zoom={config.zoom}
          scrollWheelZoom={false}
          className="osm-leaflet-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitMap points={allPoints} />
          {linePositions.length > 1 && (
            <Polyline positions={linePositions} pathOptions={{ color: accent, weight: 5, opacity: .9 }} />
          )}
          <Marker position={[startGeo.lat, startGeo.lng]} icon={createStartIcon(accent)}>
            <Tooltip direction="top" offset={[0, -12]}>Início: {startPoint.label}</Tooltip>
          </Marker>
          {stopLocations.map(({ stop, geo }) => (
            <Marker
              key={stop.id}
              position={[geo.lat, geo.lng]}
              icon={createNumberedIcon(
                stop.order,
                accent,
                stop.order === 1,
                Boolean(geo.estimated || stop.location.estimatedLocation),
              )}
            >
              <Tooltip direction="top" offset={[0, -12]}>
                {stop.order}. {stop.name}
                {geo.estimated ? ' — posição aproximada' : ''}
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="osm-map-summary">
        <span><strong>{formatDistance(walkingRoute.distanceMeters)}</strong> distância estimada</span>
        <span><strong>{walkingRoute.durationMinutes} min</strong> caminhada estimada</span>
        <span>{walkingRoute.source === 'osrm' ? 'Traçado OSRM' : 'Linha direta aproximada'}</span>
      </div>
      <p className="osm-map-warning">
        Mapa baseado em OpenStreetMap. Caminhos internos podem variar conforme dados disponíveis.
      </p>
    </section>
  )
}
