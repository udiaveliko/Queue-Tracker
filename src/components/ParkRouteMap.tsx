import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { parkVectorMaps } from '../data/parkVectorMaps'
import type {
  AttractionLocation,
  PlannedRoute,
  RouteStartPoint,
} from '../types'

interface ParkRouteMapProps {
  parkId: string
  parkName: string
  accent: string
  route: PlannedRoute
  startPoint: RouteStartPoint
}

type MapDetail = 'compact' | 'detailed'

const shortLabel = (name: string) => {
  const words = name.split(/\s+/).slice(0, 3).join(' ')
  return words.length > 24 ? `${words.slice(0, 22)}…` : words
}

const getFocusedViewBox = (points: AttractionLocation[]) => {
  if (points.length < 2) return '0 0 100 100'

  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const minimumSize = 46
  const padding = 12
  const minX = Math.max(0, Math.min(...xs) - padding)
  const minY = Math.max(0, Math.min(...ys) - padding)
  const maxX = Math.min(100, Math.max(...xs) + padding)
  const maxY = Math.min(100, Math.max(...ys) + padding)
  const width = Math.max(minimumSize, maxX - minX)
  const height = Math.max(minimumSize, maxY - minY)
  const centeredX = Math.max(0, Math.min(100 - width, (minX + maxX - width) / 2))
  const centeredY = Math.max(0, Math.min(100 - height, (minY + maxY - height) / 2))

  return `${centeredX} ${centeredY} ${Math.min(100, width)} ${Math.min(100, height)}`
}

const createRouteSegment = (from: AttractionLocation, to: AttractionLocation) => {
  const middleX = (from.x + to.x) / 2
  const middleY = (from.y + to.y) / 2
  const bendX = middleX + (to.y - from.y) * .05
  const bendY = middleY - (to.x - from.x) * .05
  return `M${from.x} ${from.y} Q${bendX} ${bendY} ${to.x} ${to.y}`
}

export function ParkRouteMap({
  parkId,
  parkName,
  accent,
  route,
  startPoint,
}: ParkRouteMapProps) {
  const [detail, setDetail] = useState<MapDetail>('detailed')
  const [isRouteCentered, setIsRouteCentered] = useState(false)
  const map = parkVectorMaps[parkId]
  const points = useMemo(
    () => [startPoint, ...route.stops.map((stop) => stop.location)],
    [route.stops, startPoint],
  )
  const markerId = `route-arrow-${parkId}`
  const clipId = `park-outline-${parkId}`
  const viewBox = isRouteCentered ? getFocusedViewBox(points) : '0 0 100 100'
  const legend = [
    `Início: ${startPoint.label}`,
    ...route.stops.map((stop) => `${stop.order}. ${stop.name}`),
  ].join(' → ')

  useEffect(() => {
    setIsRouteCentered(false)
  }, [parkId, route.stops.length, startPoint.x, startPoint.y])

  if (!map) return null

  return (
    <figure
      className={`park-route-map is-${detail}`}
      style={{ '--park-accent': accent } as CSSProperties}
    >
      <div className="park-route-map-heading">
        <div>
          <span className="section-kicker">Mapa vetorial da rota</span>
          <h2>{parkName}</h2>
        </div>
        <div className="route-map-actions">
          <button
            type="button"
            className={isRouteCentered ? 'is-active' : ''}
            aria-pressed={isRouteCentered}
            onClick={() => setIsRouteCentered((current) => !current)}
          >
            {isRouteCentered ? 'Ver parque inteiro' : 'Centralizar rota'}
          </button>
          <div role="group" aria-label="Nível de detalhe do mapa">
            <button
              type="button"
              className={detail === 'compact' ? 'is-active' : ''}
              aria-pressed={detail === 'compact'}
              onClick={() => setDetail('compact')}
            >
              Compacto
            </button>
            <button
              type="button"
              className={detail === 'detailed' ? 'is-active' : ''}
              aria-pressed={detail === 'detailed'}
              onClick={() => setDetail('detailed')}
            >
              Detalhado
            </button>
          </div>
        </div>
      </div>

      <div className="park-route-map-canvas">
        <svg
          viewBox={viewBox}
          role="img"
          aria-label={`Mapa vetorial simplificado da rota em ${parkName}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <clipPath id={clipId}>
              <path d={map.outline} />
            </clipPath>
            <marker id={markerId} viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto">
              <path d="M0 0 6 3 0 6Z" className="route-map-arrow" />
            </marker>
          </defs>

          <rect width="100" height="100" className="route-map-background" />
          <path d={map.outline} className="route-map-park-outline" />

          <g clipPath={`url(#${clipId})`}>
            {map.lands.map((land, index) => (
              <g key={land.name}>
                <polygon
                  points={land.points}
                  className={`route-map-land route-map-land-${index % 4}`}
                />
                {detail === 'detailed' && (
                  <text
                    x={land.label.x}
                    y={land.label.y}
                    textAnchor="middle"
                    className="route-map-area-label"
                  >
                    {shortLabel(land.name)}
                  </text>
                )}
              </g>
            ))}

            {map.features.map((feature, index) => (
              <path
                key={`${feature.kind}-${index}`}
                d={feature.path}
                className={`route-map-feature route-map-${feature.kind}`}
              />
            ))}

            {map.mainPaths.map((path, index) => (
              <g key={`main-path-${index}`}>
                <path d={path} className="route-map-main-path-shadow" />
                <path d={path} className="route-map-main-path" />
              </g>
            ))}
          </g>

          <g className="route-map-entrance" transform={`translate(${map.entrance.x} ${map.entrance.y})`}>
            <path d="M-3 2V-2L0-5l3 3v4M-4 2h8" />
            {detail === 'detailed' && <text x="5" y="1">Entrada</text>}
          </g>

          {points.slice(0, -1).map((point, index) => {
            const nextPoint = points[index + 1]
            return (
              <path
                key={`${point.attractionId}-${nextPoint.attractionId}-${index}`}
                d={createRouteSegment(point, nextPoint)}
                className="route-map-path"
                markerEnd={`url(#${markerId})`}
              />
            )
          })}

          <g transform={`translate(${startPoint.x} ${startPoint.y})`}>
            <circle r="4.2" className="route-map-start-ring" />
            <circle r="2.2" className="route-map-start-dot" />
            <text x="5.5" y="-2.5" className="route-map-label route-map-start-label">
              {shortLabel(startPoint.label)}
            </text>
            {detail === 'detailed' && <text x="5.5" y="1.2" className="route-map-land-label">Ponto inicial</text>}
          </g>

          {route.stops.map((stop) => (
            <g
              key={stop.id}
              transform={`translate(${stop.location.x} ${stop.location.y})`}
              className={stop.order === 1 ? 'is-first-stop' : undefined}
            >
              <circle
                r={stop.order === 1 ? 4.6 : 3.8}
                className={`route-map-stop ${stop.location.estimatedLocation ? 'is-estimated' : ''}`}
              />
              <text textAnchor="middle" y="1.35" className="route-map-stop-number">{stop.order}</text>
              <text x="5.2" y="-1.8" className="route-map-label">{shortLabel(stop.name)}</text>
              {detail === 'detailed' && (
                <>
                  <text x="5.2" y="1.8" className="route-map-land-label">{stop.land}</text>
                  {stop.location.estimatedLocation && (
                    <text x="5.2" y="4.8" className="route-map-estimated-label">posição estimada</text>
                  )}
                </>
              )}
            </g>
          ))}

          <g className="route-map-compass" transform="translate(90 11)" aria-hidden="true">
            <circle r="6.5" />
            <path d="M0-4 2 1 0 0-2 1Z" />
            <text textAnchor="middle" y="-7.8">N</text>
          </g>
        </svg>
      </div>

      <div className="route-map-key" aria-label="Legenda do mapa">
        <span><i className="key-route" /> Rota sugerida</span>
        <span><i className="key-start" /> Ponto inicial</span>
        <span><i className="key-stop" /> Atração</span>
        <span><i className="key-estimated" /> Posição estimada</span>
      </div>

      <figcaption>{legend}</figcaption>
    </figure>
  )
}
