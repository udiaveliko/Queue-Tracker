import type {
  AlertEvaluationSnapshot,
  Attraction,
  LiveTrackerState,
  QueueAlert,
  QueueAlertType,
  WaitTimePrediction,
} from '../types'
import { storageClient } from './storage/storageClient'

export const ALERTS_CHANGED_EVENT = 'oqt-alerts-changed'
export const ALERT_TRIGGERED_EVENT = 'oqt-alert-triggered'

export interface CreateQueueAlertInput {
  parkId: string
  parkName: string
  attraction: Attraction
  type: QueueAlertType
  targetWaitTime?: number
}

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `alert-${Date.now()}-${Math.random().toString(16).slice(2)}`

const notifyAlertsChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ALERTS_CHANGED_EVENT))
  }
}

const saveAlerts = (alerts: QueueAlert[]) => {
  storageClient.set('alerts', alerts)
  notifyAlertsChanged()
}

const normalizeAttractionName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()

export const getAlerts = () =>
  [...storageClient.get('alerts')]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

export const getActiveAlerts = () => getAlerts().filter((alert) => alert.active)

export const getActiveAlertsForAttraction = (parkId: string, attractionId: string) =>
  getActiveAlerts().filter(
    (alert) => alert.parkId === parkId && alert.attractionId === attractionId,
  )

export function createQueueAlert(input: CreateQueueAlertInput): QueueAlert {
  const now = new Date().toISOString()
  const alert: QueueAlert = {
    id: createId(),
    parkId: input.parkId,
    parkName: input.parkName,
    attractionId: input.attraction.id,
    attractionName: input.attraction.name,
    attractionLand: input.attraction.land,
    type: input.type,
    targetWaitTime: input.type === 'WAIT_TIME'
      ? Math.max(0, Math.round(input.targetWaitTime ?? 30))
      : undefined,
    active: true,
    createdAt: now,
    updatedAt: now,
    lastStatus: input.attraction.status,
    lastWaitTime: input.attraction.waitTime,
    deliveryChannels: ['IN_APP'],
  }

  saveAlerts([alert, ...getAlerts().filter((item) => item.id !== alert.id)])
  return alert
}

export function deactivateAlert(alertId: string) {
  saveAlerts(getAlerts().map((alert) =>
    alert.id === alertId
      ? { ...alert, active: false, updatedAt: new Date().toISOString() }
      : alert,
  ))
}

export function reactivateAlert(alertId: string) {
  saveAlerts(getAlerts().map((alert) =>
    alert.id === alertId
      ? {
          ...alert,
          active: true,
          triggeredAt: undefined,
          triggerMessage: undefined,
          updatedAt: new Date().toISOString(),
        }
      : alert,
  ))
}

export function removeAlert(alertId: string) {
  saveAlerts(getAlerts().filter((alert) => alert.id !== alertId))
}

export function getAlertTypeLabel(alert: QueueAlert) {
  if (alert.type === 'WAIT_TIME') {
    return `Fila em até ${alert.targetWaitTime ?? 0} min`
  }
  if (alert.type === 'ATTRACTION_OPEN') return 'Avisar quando abrir'
  if (alert.type === 'PREDICTION_DROP') return 'Previsão de queda'
  return 'Melhor momento para ir'
}

export const getAlertTriggerMessage = (
  alert: QueueAlert,
  snapshot: AlertEvaluationSnapshot,
): string | null => {
  const { attraction, prediction } = snapshot

  if (
    alert.type === 'WAIT_TIME'
    && attraction.status === 'open'
    && attraction.waitTime !== null
    && attraction.waitTime <= (alert.targetWaitTime ?? 0)
  ) {
    return `${attraction.name} caiu para ${attraction.waitTime} min. Vá agora.`
  }

  if (
    alert.type === 'ATTRACTION_OPEN'
    && attraction.status === 'open'
    && alert.lastStatus !== 'open'
  ) {
    return `${attraction.name} abriu. É uma boa hora para conferir a fila.`
  }

  if (
    alert.type === 'PREDICTION_DROP'
    && attraction.status === 'open'
    && prediction.sampleCount >= 3
    && prediction.trend === 'down'
  ) {
    return `${attraction.name} tem previsão de queda. Pode valer a pena esperar.`
  }

  if (
    alert.type === 'BEST_TIME'
    && attraction.status === 'open'
    && attraction.waitTime !== null
    && (
      (prediction.sampleCount >= 3 && prediction.trend === 'up')
      || attraction.waitTime <= 20
    )
  ) {
    return `${attraction.name}: este é um bom momento para ir.`
  }

  return null
}

export function evaluateAlertsForPark(
  parkId: string,
  attractions: Attraction[],
  getPrediction: (attractionId: string) => WaitTimePrediction,
  evaluatedAt = new Date().toISOString(),
): QueueAlert[] {
  const alerts = getAlerts()
  const attractionMap = new Map(attractions.map((attraction) => [attraction.id, attraction]))
  const attractionNameMap = new Map(
    attractions.map((attraction) => [normalizeAttractionName(attraction.name), attraction]),
  )
  const triggered: QueueAlert[] = []
  let hasChanges = false

  const nextAlerts = alerts.map((alert) => {
    if (!alert.active || alert.parkId !== parkId) return alert
    const attraction = attractionMap.get(alert.attractionId)
      ?? attractionNameMap.get(normalizeAttractionName(alert.attractionName))
    if (!attraction) return alert

    const snapshot: AlertEvaluationSnapshot = {
      attraction,
      prediction: getPrediction(attraction.id),
      evaluatedAt,
    }
    const triggerMessage = getAlertTriggerMessage(alert, snapshot)
    hasChanges = true

    const updatedAlert: QueueAlert = {
      ...alert,
      active: triggerMessage ? false : alert.active,
      triggeredAt: triggerMessage ? evaluatedAt : alert.triggeredAt,
      triggerMessage: triggerMessage ?? alert.triggerMessage,
      lastStatus: attraction.status,
      lastWaitTime: attraction.waitTime,
      updatedAt: evaluatedAt,
    }

    if (triggerMessage) triggered.push(updatedAlert)
    return updatedAlert
  })

  if (hasChanges) saveAlerts(nextAlerts)

  if (typeof window !== 'undefined') {
    triggered.forEach((alert) => {
      window.dispatchEvent(new CustomEvent<QueueAlert>(ALERT_TRIGGERED_EVENT, {
        detail: alert,
      }))
    })
  }

  return triggered
}

export function getLiveTrackerState(
  alert: QueueAlert,
  attraction: Attraction | null,
  prediction: WaitTimePrediction | null,
): LiveTrackerState {
  if (!attraction || !prediction) return 'INSUFFICIENT_DATA'
  if (attraction.status !== 'open') return 'CLOSED'
  if (attraction.waitTime === null) return 'INSUFFICIENT_DATA'

  if (alert.type !== 'WAIT_TIME') {
    if (prediction.sampleCount < 3) return 'INSUFFICIENT_DATA'
    if (prediction.trend === 'up') return 'GO_NOW'
    if (prediction.trend === 'down') return 'GETTING_CLOSE'
    return 'FAR_FROM_TARGET'
  }

  const target = alert.targetWaitTime ?? 0
  if (attraction.waitTime <= target) return 'GO_NOW'
  if (attraction.waitTime <= target + Math.max(10, target * .35)) return 'GETTING_CLOSE'
  return 'FAR_FROM_TARGET'
}
