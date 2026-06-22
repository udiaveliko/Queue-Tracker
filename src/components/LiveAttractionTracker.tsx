import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Attraction, QueueAlert, WaitTimePrediction } from '../types'
import {
  ALERTS_CHANGED_EVENT,
  deactivateAlert,
  evaluateAlertsForPark,
  getActiveAlerts,
  getAlertTypeLabel,
  getLiveTrackerState,
} from '../services/alerts'
import { getPredictionForAttraction } from '../services/predictions'
import { getParkWaitTimes } from '../services/waitTimes'
import { BellFilledIcon, ChevronRightIcon, CloseIcon, MinusIcon } from './Icons'

interface LiveAttractionTrackerProps {
  onOpenAlerts: () => void
  onOpenPlanner: () => void
}

const REFRESH_INTERVAL = 60_000

const stateLabels = {
  FAR_FROM_TARGET: 'Muito longe da meta',
  GETTING_CLOSE: 'Chegando perto',
  GO_NOW: 'Está na hora de ir',
  CLOSED: 'Atração fechada',
  INSUFFICIENT_DATA: 'Dados insuficientes',
}

const normalizeName = (name: string) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function LiveAttractionTracker({
  onOpenAlerts,
  onOpenPlanner,
}: LiveAttractionTrackerProps) {
  const [alert, setAlert] = useState<QueueAlert | null>(() => getActiveAlerts()[0] ?? null)
  const [attraction, setAttraction] = useState<Attraction | null>(null)
  const [prediction, setPrediction] = useState<WaitTimePrediction | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const syncActiveAlert = useCallback(() => {
    const activeAlert = getActiveAlerts()[0] ?? null
    setAlert(activeAlert)
    if (!activeAlert) {
      setAttraction(null)
      setPrediction(null)
    }
  }, [])

  useEffect(() => {
    window.addEventListener(ALERTS_CHANGED_EVENT, syncActiveAlert)
    window.addEventListener('oqt-storage-synced', syncActiveAlert)
    return () => {
      window.removeEventListener(ALERTS_CHANGED_EVENT, syncActiveAlert)
      window.removeEventListener('oqt-storage-synced', syncActiveAlert)
    }
  }, [syncActiveAlert])

  const refresh = useCallback(async () => {
    if (!alert) return
    setIsRefreshing(true)

    try {
      const response = await getParkWaitTimes(alert.parkId)
      const currentAttraction = response.park.attractions.find(
        (item) =>
          item.id === alert.attractionId
          || normalizeName(item.name) === normalizeName(alert.attractionName),
      ) ?? null

      if (!currentAttraction) return
      const currentPrediction = getPredictionForAttraction(
        alert.parkId,
        currentAttraction.id,
      )
      setAttraction(currentAttraction)
      setPrediction(currentPrediction)
      evaluateAlertsForPark(
        alert.parkId,
        response.park.attractions,
        (attractionId) => getPredictionForAttraction(alert.parkId, attractionId),
        response.lastUpdated,
      )
    } finally {
      setIsRefreshing(false)
    }
  }, [alert])

  useEffect(() => {
    if (!alert) return
    void refresh()
    const interval = window.setInterval(() => void refresh(), REFRESH_INTERVAL)
    return () => window.clearInterval(interval)
  }, [alert, refresh])

  const trackerState = useMemo(
    () => alert ? getLiveTrackerState(alert, attraction, prediction) : null,
    [alert, attraction, prediction],
  )

  if (!alert) return null

  const target = alert.targetWaitTime
  const currentWait = attraction?.waitTime
  const progress = target !== undefined && currentWait !== null && currentWait !== undefined
    ? Math.max(8, Math.min(100, target / Math.max(target, currentWait) * 100))
    : prediction?.trend === 'down'
      ? 72
      : prediction?.trend === 'up'
        ? 100
        : 35

  const updatedAt = attraction?.updatedAt
    ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
      .format(new Date(attraction.updatedAt))
    : '—'

  if (isMinimized) {
    return (
      <aside className="live-tracker-minimized">
        <button type="button" onClick={() => setIsMinimized(false)}>
          <span><BellFilledIcon /></span>
          <span>
            <small>Monitorando</small>
            <strong>{alert.attractionName}</strong>
          </span>
          <em>{currentWait ?? '—'} min</em>
          <ChevronRightIcon />
        </button>
      </aside>
    )
  }

  return (
    <aside className={`live-attraction-tracker state-${trackerState?.toLowerCase()}`}>
      <header>
        <span className="live-tracker-icon"><BellFilledIcon /></span>
        <div>
          <small>Monitorando ao vivo</small>
          <strong>{alert.attractionName}</strong>
        </div>
        <button type="button" onClick={() => setIsMinimized(true)} aria-label="Minimizar acompanhamento">
          <MinusIcon />
        </button>
      </header>

      <div className="live-tracker-status">
        <span>{stateLabels[trackerState ?? 'INSUFFICIENT_DATA']}</span>
        <i className={isRefreshing ? 'is-refreshing' : ''} />
      </div>

      <div className="live-tracker-metrics">
        <div><span>Fila atual</span><strong>{currentWait ?? '—'}<small> min</small></strong></div>
        <div><span>Meta</span><strong>{target ?? 'Auto'}{target !== undefined && <small> min</small>}</strong></div>
      </div>

      <div className="live-tracker-progress" aria-label="Progresso até a condição do alerta">
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="live-tracker-progress-labels">
        <span>{currentWait ?? '—'} min</span>
        <span>{target !== undefined ? `${target} min` : getAlertTypeLabel(alert)}</span>
      </div>

      <p>
        {prediction?.predictedWait30Minutes !== null
          && prediction?.predictedWait30Minutes !== undefined
          ? `Previsão: pode chegar a ${prediction.predictedWait30Minutes} min em 30 minutos.`
          : 'Previsão: coletando mais dados para esta atração.'}
      </p>

      <div className="live-tracker-meta">
        <span>Status: {attraction?.status === 'open' ? 'aberta' : 'fechada'}</span>
        <span>Atualizado: {updatedAt}</span>
      </div>

      <div className="live-tracker-actions">
        <button type="button" onClick={onOpenPlanner}>Ver no planner</button>
        <button type="button" onClick={onOpenAlerts}>Todos os alertas</button>
        <button
          type="button"
          className="is-danger"
          onClick={() => deactivateAlert(alert.id)}
          aria-label={`Parar de monitorar ${alert.attractionName}`}
        >
          <CloseIcon />
          Parar
        </button>
      </div>
    </aside>
  )
}
