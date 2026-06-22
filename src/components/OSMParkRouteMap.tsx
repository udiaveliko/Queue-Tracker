import { Fragment, useEffect, useMemo, useState, type CSSProperties } from 'react'
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
  relativeLocationToGeo,
  type GeoCoordinate,
} from '../data/attractionGeoLocations'
import { PARK_CENTER, parkLandCenters } from '../data/parkLandCenters'
import {
  calculateGeoDistance,
  createDirectFallbackLeg,
  createInternalPathLeg,
  getWalkingRouteLegs,
  type NamedGeoCoordinate,
  type OSMRouteLeg,
  type WalkingRouteLegOptions,
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
  coordinates: Array<[number, number]>
  userLocation?: GeoCoordinate
  centerOnUserRequest: number
  fitRequest: number
}

function FitMap({
  coordinates,
  userLocation,
  centerOnUserRequest,
  fitRequest,
}: FitMapProps) {
  const map = useMap()

  useEffect(() => {
    if (centerOnUserRequest > 0 && userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 18)
      return
    }
    if (coordinates.length > 1) {
      map.fitBounds(latLngBounds(coordinates), {
        padding: [32, 32],
        maxZoom: 19,
      })
    }
  }, [centerOnUserRequest, coordinates, fitRequest, map, userLocation])

  return null
}

const formatDistance = (distance: number) =>
  distance >= 1000
    ? `${(distance / 1000).toFixed(1).replace('.', ',')} km`
    : `${distance} m`

const formatDuration = (seconds: number) =>
  `${Math.max(1, Math.round(seconds / 60))} min`

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

const createUserIcon = (accent: string) =>
  divIcon({
    className: 'osm-route-div-icon',
    html: `<span class="osm-user-location-pin" style="--pin-accent:${accent}"><i></i></span>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  })

const getBearing = (
  from: [number, number],
  to: [number, number],
) => Math.atan2(to[1] - from[1], -(to[0] - from[0])) * 180 / Math.PI

const createDirectionIcon = (
  coordinates: Array<[number, number]>,
  accent: string,
  active: boolean,
) => {
  const middleIndex = Math.max(0, Math.floor(coordinates.length / 2) - 1)
  const from = coordinates[middleIndex]
  const to = coordinates[Math.min(coordinates.length - 1, middleIndex + 1)]
  const rotation = getBearing(from, to)

  return divIcon({
    className: 'osm-route-div-icon',
    html: `<span class="osm-route-arrow ${active ? 'is-active' : ''}" style="--pin-accent:${accent};transform:rotate(${rotation}deg)">↑</span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

const getLegMidpoint = (coordinates: Array<[number, number]>) =>
  coordinates[Math.floor(coordinates.length / 2)]

const createInternalPathOptions = (
  parkId: string,
  points: NamedGeoCoordinate[],
  route: PlannedRoute,
  startPoint: RouteStartPoint,
): WalkingRouteLegOptions[] => {
  const config = parkGeoConfigs[parkId]
  if (!config) return []

  return points.slice(0, -1).map((from, index) => {
    const to = points[index + 1]
    const bothInsidePark =
      calculateGeoDistance(from, config) <= 3_000
      && calculateGeoDistance(to, config) <= 3_000

    if (!bothInsidePark) return {}

    const fromLand = index === 0 ? startPoint.land : route.stops[index - 1]?.land
    const toLand = route.stops[index]?.land
    const anchors = [
      fromLand ? parkLandCenters[parkId]?.[fromLand] : undefined,
      fromLand !== toLand ? PARK_CENTER : undefined,
      toLand ? parkLandCenters[parkId]?.[toLand] : undefined,
    ]
      .flatMap((anchor) => {
        if (!anchor) return []
        const geo = relativeLocationToGeo(parkId, anchor)
        return geo ? [geo] : []
      })

    return anchors.length ? { internalCoordinates: anchors } : {}
  })
}

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
  const namedPoints = useMemo<NamedGeoCoordinate[]>(
    () => startGeo
      ? [
          { ...startGeo, name: startPoint.label },
          ...stopLocations.map(({ stop, geo }) => ({
            lat: geo.lat,
            lng: geo.lng,
            name: stop.name,
          })),
        ]
      : [],
    [startGeo, startPoint.label, stopLocations],
  )
  const fallbackLegs = useMemo(
    () => {
      const options = createInternalPathOptions(parkId, namedPoints, route, startPoint)
      return namedPoints.slice(0, -1).map((point, index) => {
        const to = namedPoints[index + 1]
        const internalCoordinates = options[index]?.internalCoordinates
        return internalCoordinates?.length
          ? createInternalPathLeg(point, to, internalCoordinates)
          : createDirectFallbackLeg(point, to)
      })
    },
    [namedPoints, parkId, route, startPoint],
  )
  const walkingOptions = useMemo(
    () => createInternalPathOptions(parkId, namedPoints, route, startPoint),
    [namedPoints, parkId, route, startPoint],
  )
  const [routeLegs, setRouteLegs] = useState<OSMRouteLeg[]>(fallbackLegs)
  const [selectedLegIndex, setSelectedLegIndex] = useState<number | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [centerOnUserRequest, setCenterOnUserRequest] = useState(0)
  const [fitRequest, setFitRequest] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setRouteLegs(fallbackLegs)
    setSelectedLegIndex(null)

    if (namedPoints.length < 2) {
      setIsCalculating(false)
      return () => controller.abort()
    }

    setIsCalculating(true)
    void getWalkingRouteLegs(namedPoints, walkingOptions, controller.signal)
      .then(setRouteLegs)
      .catch(() => setRouteLegs(fallbackLegs))
      .finally(() => {
        if (!controller.signal.aborted) setIsCalculating(false)
      })

    return () => controller.abort()
  }, [fallbackLegs, namedPoints, walkingOptions])

  if (!config || !startGeo) return null

  const osmUrl = `https://www.openstreetmap.org/?mlat=${config.lat}&mlon=${config.lng}#map=${config.zoom}/${config.lat}/${config.lng}`
  const selectedLeg = selectedLegIndex === null ? null : routeLegs[selectedLegIndex]
  const completeCoordinates = routeLegs.flatMap((leg, index) =>
    index === 0 ? leg.coordinates : leg.coordinates.slice(1),
  )
  const fitCoordinates = selectedLeg?.coordinates.length
    ? selectedLeg.coordinates
    : completeCoordinates.length > 1
      ? completeCoordinates
      : namedPoints.map((point) => [point.lat, point.lng] as [number, number])
  const totalDistance = routeLegs.reduce((total, leg) => total + leg.distanceMeters, 0)
  const totalDuration = routeLegs.reduce((total, leg) => total + leg.durationSeconds, 0)
  const hasDirectFallback = routeLegs.some((leg) => leg.source === 'direct-fallback')
  const hasInternalPath = routeLegs.some((leg) => leg.source === 'internal-path')

  return (
    <section className="osm-park-route-map" style={{ '--park-accent': accent } as CSSProperties}>
      <div className="osm-map-heading">
        <div>
          <span className="section-kicker">Mapa real da rota</span>
          <h2>{parkName}</h2>
        </div>
        <div className="osm-map-heading-actions">
          {startPoint.isUserLocation && (
            <button type="button" onClick={() => setCenterOnUserRequest((value) => value + 1)}>
              Centralizar em mim
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setSelectedLegIndex(null)
              setFitRequest((value) => value + 1)
            }}
          >
            Ver rota completa
          </button>
          <a href={osmUrl} target="_blank" rel="noreferrer">
            Abrir no OpenStreetMap
          </a>
        </div>
      </div>

      {isCalculating && (
        <div className="osm-routing-loading" role="status">
          <span />
          Calculando caminho...
        </div>
      )}

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
          <FitMap
            coordinates={fitCoordinates}
            userLocation={startPoint.isUserLocation ? startGeo : undefined}
            centerOnUserRequest={centerOnUserRequest}
            fitRequest={fitRequest}
          />
          {routeLegs.map((leg, index) => {
            const isActive = selectedLegIndex === index
            const isMuted = selectedLegIndex !== null && !isActive
            const positions = leg.coordinates as LatLngExpression[]
            const midpoint = getLegMidpoint(leg.coordinates)

            return (
              <Fragment key={`${leg.fromName}-${leg.toName}-${index}`}>
              <Polyline
                positions={positions}
                pathOptions={{
                  color: accent,
                  weight: isActive ? 8 : 5,
                  opacity: isMuted ? .22 : isActive ? 1 : .72,
                  dashArray: leg.source === 'direct-fallback'
                    ? '8 7'
                    : leg.source === 'internal-path'
                      ? '4 4'
                      : undefined,
                }}
                eventHandlers={{
                  click: () => setSelectedLegIndex(index),
                }}
              >
                <Tooltip sticky>
                  {leg.fromName} → {leg.toName}<br />
                  {formatDistance(leg.distanceMeters)} · {formatDuration(leg.durationSeconds)}
                </Tooltip>
              </Polyline>
              {midpoint && (
                <Marker
                  position={midpoint}
                  icon={createDirectionIcon(leg.coordinates, accent, isActive)}
                  interactive={false}
                />
              )}
              </Fragment>
            )
          })}
          <Marker
            position={[startGeo.lat, startGeo.lng]}
            icon={startPoint.isUserLocation ? createUserIcon(accent) : createStartIcon(accent)}
          >
            <Tooltip direction="top" offset={[0, -12]}>
              {startPoint.isUserLocation ? 'Você está aqui' : `Início: ${startPoint.label}`}
            </Tooltip>
          </Marker>
          {stopLocations.map(({ stop, geo }) => (
            <Marker
              key={stop.id}
              position={[geo.lat, geo.lng]}
              icon={createNumberedIcon(
                stop.order,
                accent,
                stop.order === 1,
                geo.source === 'estimated',
              )}
            >
              <Tooltip direction="top" offset={[0, -12]}>
                {stop.order}. {stop.name}
                {geo.source === 'estimated' ? ' — posição aproximada' : ' — posição verificada'}
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {hasDirectFallback && (
        <p className="osm-routing-warning" role="status">
          Caminho caminhável exato indisponível. Mostrando direção aproximada.
        </p>
      )}
      {hasInternalPath && (
        <p className="osm-routing-warning" role="status">
          Rota estimada por caminhos internos do parque.
        </p>
      )}

      {routeLegs.length > 0 && (
        <div className="route-directions osm-route-directions" aria-label="Como seguir">
          <div className="route-directions-heading">
            <strong>Como seguir</strong>
            <span>{routeLegs.length} trechos</span>
          </div>
          <ol>
            {routeLegs.map((leg, index) => (
              <li key={`${leg.fromName}-${leg.toName}`}>
                <button
                  type="button"
                  className={selectedLegIndex === index ? 'is-active' : ''}
                  aria-pressed={selectedLegIndex === index}
                  onClick={() => {
                    setSelectedLegIndex(index)
                    setFitRequest((value) => value + 1)
                  }}
                >
                  <span className="route-direction-order">{index + 1}</span>
                  <span className="route-direction-copy">
                    <small>{leg.fromName}</small>
                    <strong>{leg.toName}</strong>
                    <em>
                      {leg.source === 'walking-osrm'
                        ? 'Caminho caminhável'
                        : leg.source === 'internal-path'
                          ? 'Caminho interno estimado'
                          : 'Direção aproximada'}
                    </em>
                  </span>
                  <span className="route-direction-distance">
                    <strong>{formatDistance(leg.distanceMeters)}</strong>
                    <small>{formatDuration(leg.durationSeconds)}</small>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="osm-map-summary">
        <span><strong>{formatDistance(totalDistance)}</strong> distância estimada</span>
        <span><strong>{formatDuration(totalDuration)}</strong> caminhada estimada</span>
        <span>
          {hasDirectFallback
            ? 'Rota parcialmente aproximada'
            : hasInternalPath
              ? 'Rota por caminhos internos'
              : 'Caminhada calculada pelo OSRM'}
        </span>
      </div>
      <div className="osm-position-legend" aria-label="Legenda de precisão das posições">
        <span><i className="is-verified" /> posição verificada</span>
        <span><i className="is-estimated" /> posição aproximada</span>
      </div>
      <p className="osm-map-warning">
        Mapa baseado em OpenStreetMap. Caminhos internos podem variar conforme dados disponíveis.
      </p>
    </section>
  )
}
