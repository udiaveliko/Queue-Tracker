import type {
  Attraction,
  WaitTimeHistoryStats,
  WaitTimePrediction,
} from '../types'
import {
  BellFilledIcon,
  BellIcon,
  ClockIcon,
  MinusIcon,
  TrendDownIcon,
  TrendUpIcon,
} from './Icons'
import { AttractionIcon } from './AttractionIcon'

interface AttractionCardProps {
  attraction: Attraction
  rank: number | null
  index: number
  historyStats: WaitTimeHistoryStats
  prediction: WaitTimePrediction
  parkId: string
  hasActiveAlert: boolean
  onCreateAlert: () => void
}

const statusLabel = {
  open: 'Aberta',
  closed: 'Fechada',
  unavailable: 'Indisponível',
}

const trendContent = {
  up: { label: 'Subindo', icon: TrendUpIcon },
  down: { label: 'Caindo', icon: TrendDownIcon },
  stable: { label: 'Estável', icon: MinusIcon },
}

const getWaitLevel = (attraction: Attraction) => {
  if (attraction.status !== 'open' || attraction.waitTime === null) return 'closed'
  if (attraction.waitTime <= 20) return 'low'
  if (attraction.waitTime <= 50) return 'medium'
  return 'high'
}

const formatUpdateTime = (isoDate?: string) => {
  if (!isoDate) return 'agora'

  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate))
}

const formatHistoryValue = (value: number | null) => value === null ? '—' : `${value} min`

export function AttractionCard({
  attraction,
  rank,
  index,
  historyStats,
  prediction,
  parkId,
  hasActiveAlert,
  onCreateAlert,
}: AttractionCardProps) {
  const isOpen = attraction.status === 'open'
  const trend = trendContent[attraction.trend ?? 'stable']
  const TrendIcon = trend.icon
  const waitLevel = getWaitLevel(attraction)

  return (
    <article
      className={`attraction-card wait-${waitLevel} ${!isOpen ? 'is-muted' : ''}`}
      style={{ '--card-delay': `${Math.min(index, 12) * 35}ms` } as React.CSSProperties}
    >
      <div className="attraction-card-top">
        <div className="attraction-title-row">
          <span className="rank" aria-label={rank ? `Posição ${rank}` : 'Sem posição'}>
            {rank ? String(rank).padStart(2, '0') : '—'}
          </span>
          <div className="attraction-identity">
            <AttractionIcon attraction={attraction} parkId={parkId} />
            <div className="attraction-info">
              <h3>{attraction.name}</h3>
              <p>{attraction.land}</p>
            </div>
          </div>
        </div>

        <div className="attraction-card-actions">
          <button
            type="button"
            className={`attraction-alert-button ${hasActiveAlert ? 'is-active' : ''}`}
            onClick={onCreateAlert}
            aria-label={`${hasActiveAlert ? 'Editar alerta de' : 'Criar alerta para'} ${attraction.name}`}
            aria-pressed={hasActiveAlert}
          >
            {hasActiveAlert ? <BellFilledIcon /> : <BellIcon />}
          </button>
          <div className="wait-time">
            {isOpen && attraction.waitTime !== null ? (
              <>
                <strong>{attraction.waitTime}</strong>
                <span>min</span>
              </>
            ) : (
              <strong className="dash">—</strong>
            )}
          </div>
        </div>
      </div>

      <div className="attraction-card-footer">
        {hasActiveAlert && (
          <span className="monitoring-badge">
            <BellFilledIcon />
            Monitorando
          </span>
        )}
        <span className={`status status-${attraction.status}`}>
          <i />
          {statusLabel[attraction.status]}
        </span>
        <span className={`trend trend-${attraction.trend ?? 'stable'}`}>
          <TrendIcon />
          {trend.label}
        </span>
        <span className="card-updated">
          <ClockIcon />
          {formatUpdateTime(attraction.updatedAt)}
        </span>
      </div>

      <div className="daily-history">
        <div>
          <span>Média hoje</span>
          <strong>{formatHistoryValue(historyStats.averageWait)}</strong>
        </div>
        <div>
          <span>Menor hoje</span>
          <strong>{formatHistoryValue(historyStats.minimumWait)}</strong>
        </div>
        <div>
          <span>Maior hoje</span>
          <strong>{formatHistoryValue(historyStats.maximumWait)}</strong>
        </div>
      </div>

      <div className={`prediction-panel prediction-${prediction.trend}`}>
        <div className="prediction-recommendation">
          <span aria-hidden="true">
            {prediction.trend === 'down' ? '↓' : prediction.trend === 'up' ? '↑' : '→'}
          </span>
          <div>
            <strong>
              {prediction.trend === 'down'
                ? 'Melhor esperar'
                : prediction.trend === 'up'
                  ? 'Entrar agora'
                  : 'Estável'}
            </strong>
            <small>
              {prediction.sampleCount < 3
                ? 'Coletando mais dados'
                : `Confiança ${prediction.confidence === 'high' ? 'alta' : prediction.confidence === 'medium' ? 'média' : 'baixa'}`}
            </small>
          </div>
        </div>
        <div className="prediction-values">
          <div>
            <span>Em 30 min</span>
            <strong>{formatHistoryValue(prediction.predictedWait30Minutes)}</strong>
          </div>
          <div>
            <span>Em 60 min</span>
            <strong>{formatHistoryValue(prediction.predictedWait60Minutes)}</strong>
          </div>
        </div>
      </div>
    </article>
  )
}
