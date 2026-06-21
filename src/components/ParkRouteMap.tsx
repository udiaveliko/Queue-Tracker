import type { CSSProperties } from 'react'
import type { PlannedRoute, RouteStartPoint } from '../types'

interface ParkRouteMapProps {
  parkId: string
  parkName: string
  accent: string
  route: PlannedRoute
  startPoint: RouteStartPoint
}

const shortLabel = (name: string) => {
  const words = name.split(/\s+/).slice(0, 3).join(' ')
  return words.length > 24 ? `${words.slice(0, 22)}…` : words
}

export function ParkRouteMap({
  parkId,
  parkName,
  accent,
  route,
  startPoint,
}: ParkRouteMapProps) {
  const points = [startPoint, ...route.stops.map((stop) => stop.location)]
  const markerId = `route-arrow-${parkId}`
  const legend = [
    `Início: ${startPoint.label}`,
    ...route.stops.map((stop) => `${stop.order}. ${stop.name}`),
  ].join(' → ')

  return (
    <figure
      className="park-route-map"
      style={{ '--park-accent': accent } as CSSProperties}
    >
      <div className="park-route-map-heading">
        <div>
          <span className="section-kicker">Mapa da rota</span>
          <h2>{parkName}</h2>
        </div>
        <span>{route.stops.length} paradas</span>
      </div>

      <div className="park-route-map-canvas">
        <svg
          viewBox="0 0 100 100"
          role="img"
          aria-label={`Mapa esquemático da rota em ${parkName}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern id={`map-grid-${parkId}`} width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" className="route-map-grid-line" />
            </pattern>
            <marker id={markerId} viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto">
              <path d="M0 0 6 3 0 6Z" className="route-map-arrow" />
            </marker>
          </defs>

          <rect width="100" height="100" rx="8" className="route-map-background" />
          <rect width="100" height="100" rx="8" fill={`url(#map-grid-${parkId})`} />
          <path
            d="M8 72C22 58 20 35 38 25c18-10 25 13 39 3 9-6 10-15 16-20M5 43c18 8 30-5 43 6 14 12 29 5 47 15M22 94c4-21 22-21 30-34 9-15 9-36 17-52"
            className="route-map-terrain"
          />

          {points.slice(0, -1).map((point, index) => {
            const nextPoint = points[index + 1]
            return (
              <line
                key={`${point.attractionId}-${nextPoint.attractionId}-${index}`}
                x1={point.x}
                y1={point.y}
                x2={nextPoint.x}
                y2={nextPoint.y}
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
            <text x="5.5" y="1.2" className="route-map-land-label">Início</text>
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
              <text x="5.2" y="1.8" className="route-map-land-label">{stop.land}</text>
            </g>
          ))}
        </svg>
      </div>

      <figcaption>
        <span className="route-map-legend-dot" aria-hidden="true" />
        {legend}
      </figcaption>
    </figure>
  )
}
