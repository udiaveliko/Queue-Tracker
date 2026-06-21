import type { AttractionAnalytics } from '../types'
import { ClockIcon, TrendDownIcon, TrendUpIcon } from './Icons'
import { TrendChart } from './TrendChart'

interface AnalyticsCardProps {
  analytics: AttractionAnalytics
  accent: string
  index: number
}

export function AnalyticsCard({ analytics, accent, index }: AnalyticsCardProps) {
  const comparison = analytics.currentWait === null
    ? null
    : analytics.currentWait - analytics.averageWait

  return (
    <article
      className="analytics-card"
      style={{
        '--analytics-accent': accent,
        '--card-delay': `${Math.min(index, 12) * 35}ms`,
      } as React.CSSProperties}
    >
      <div className="analytics-card-heading">
        <div>
          <span>{analytics.land}</span>
          <h2>{analytics.attractionName}</h2>
        </div>
        <div className="analytics-current">
          <strong>{analytics.currentWait ?? '—'}</strong>
          <span>{analytics.currentWait === null ? 'fechada' : 'min agora'}</span>
        </div>
      </div>

      <div className="analytics-metrics">
        <div>
          <span>Média histórica</span>
          <strong>{analytics.averageWait}<small> min</small></strong>
          {comparison !== null && (
            <em className={comparison <= 0 ? 'is-positive' : 'is-negative'}>
              {comparison <= 0 ? <TrendDownIcon /> : <TrendUpIcon />}
              {Math.abs(comparison)} min vs. média
            </em>
          )}
        </div>
        <div>
          <span>Melhor horário</span>
          <strong><ClockIcon />{analytics.bestTime}</strong>
          <small>Menor movimento</small>
        </div>
        <div>
          <span>Pior horário</span>
          <strong><ClockIcon />{analytics.worstTime}</strong>
          <small>Maior movimento</small>
        </div>
      </div>

      <div className="analytics-chart-heading">
        <span>Tendência do dia</span>
        <span>Histórico estimado</span>
      </div>
      <TrendChart points={analytics.history} accent={accent} />
    </article>
  )
}
