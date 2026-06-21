import type { WaitTimeHistoryPoint } from '../types'

interface TrendChartProps {
  points: WaitTimeHistoryPoint[]
  accent: string
}

export function TrendChart({ points, accent }: TrendChartProps) {
  const width = 320
  const height = 104
  const padding = 8
  const maxValue = Math.max(...points.map((point) => point.waitTime), 1)
  const minValue = Math.min(...points.map((point) => point.waitTime))
  const range = Math.max(maxValue - minValue, 10)
  const coordinates = points.map((point, index) => ({
    x: padding + (index / (points.length - 1)) * (width - padding * 2),
    y: padding + ((maxValue - point.waitTime) / range) * (height - padding * 2),
  }))
  const linePath = coordinates
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')
  const areaPath = `${linePath} L ${coordinates.at(-1)?.x} ${height} L ${coordinates[0].x} ${height} Z`
  const gradientId = `trend-${points.map((point) => point.waitTime).join('-')}`

  return (
    <div className="trend-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Tendência da fila ao longo do dia">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity=".28" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="chart-grid" d="M8 26 H312 M8 52 H312 M8 78 H312" />
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={linePath} fill="none" stroke={accent} strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
        {coordinates.map((point, index) => (
          <circle
            key={points[index].time}
            cx={point.x}
            cy={point.y}
            r={index === coordinates.length - 1 ? 3.2 : 1.7}
            fill={accent}
          />
        ))}
      </svg>
      <div className="chart-axis">
        <span>{points[0]?.time}</span>
        <span>{points[Math.floor(points.length / 2)]?.time}</span>
        <span>{points.at(-1)?.time}</span>
      </div>
    </div>
  )
}
