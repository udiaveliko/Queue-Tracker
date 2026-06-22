import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getAlertTriggerMessage,
  getLiveTrackerState,
} from '../src/services/alerts.ts'
import type {
  Attraction,
  QueueAlert,
  WaitTimePrediction,
} from '../src/types/index.ts'

const attraction: Attraction = {
  id: 'tron',
  name: 'TRON Lightcycle / Run',
  land: 'Tomorrowland',
  waitTime: 35,
  status: 'open',
  trend: 'down',
  updatedAt: '2026-06-21T14:00:00.000Z',
}

const prediction: WaitTimePrediction = {
  trend: 'down',
  currentWait: 35,
  predictedWait30Minutes: 25,
  predictedWait60Minutes: 20,
  confidence: 'medium',
  sampleCount: 5,
}

const createAlert = (overrides: Partial<QueueAlert>): QueueAlert => ({
  id: 'alert-1',
  parkId: 'magic-kingdom',
  parkName: 'Magic Kingdom',
  attractionId: attraction.id,
  attractionName: attraction.name,
  attractionLand: attraction.land,
  type: 'WAIT_TIME',
  targetWaitTime: 35,
  active: true,
  createdAt: '2026-06-21T13:00:00.000Z',
  updatedAt: '2026-06-21T13:00:00.000Z',
  lastStatus: 'open',
  lastWaitTime: 55,
  deliveryChannels: ['IN_APP'],
  ...overrides,
})

test('alerta de fila dispara quando a meta é atingida', () => {
  const message = getAlertTriggerMessage(createAlert({}), {
    attraction,
    prediction,
    evaluatedAt: '2026-06-21T14:00:00.000Z',
  })

  assert.equal(message, 'TRON Lightcycle / Run caiu para 35 min. Vá agora.')
})

test('alerta de abertura dispara somente após mudança de status', () => {
  const openedMessage = getAlertTriggerMessage(
    createAlert({ type: 'ATTRACTION_OPEN', targetWaitTime: undefined, lastStatus: 'closed' }),
    { attraction, prediction, evaluatedAt: '2026-06-21T14:00:00.000Z' },
  )
  const alreadyOpenMessage = getAlertTriggerMessage(
    createAlert({ type: 'ATTRACTION_OPEN', targetWaitTime: undefined, lastStatus: 'open' }),
    { attraction, prediction, evaluatedAt: '2026-06-21T14:00:00.000Z' },
  )

  assert.ok(openedMessage?.includes('abriu'))
  assert.equal(alreadyOpenMessage, null)
})

test('previsão de queda exige histórico suficiente', () => {
  const alert = createAlert({ type: 'PREDICTION_DROP', targetWaitTime: undefined })
  const message = getAlertTriggerMessage(alert, {
    attraction,
    prediction,
    evaluatedAt: '2026-06-21T14:00:00.000Z',
  })
  const insufficient = getAlertTriggerMessage(alert, {
    attraction,
    prediction: { ...prediction, sampleCount: 2 },
    evaluatedAt: '2026-06-21T14:00:00.000Z',
  })

  assert.ok(message?.includes('previsão de queda'))
  assert.equal(insufficient, null)
})

test('tracker diferencia longe, perto, meta atingida e atração fechada', () => {
  const alert = createAlert({})

  assert.equal(
    getLiveTrackerState(alert, { ...attraction, waitTime: 80 }, prediction),
    'FAR_FROM_TARGET',
  )
  assert.equal(
    getLiveTrackerState(alert, { ...attraction, waitTime: 43 }, prediction),
    'GETTING_CLOSE',
  )
  assert.equal(getLiveTrackerState(alert, attraction, prediction), 'GO_NOW')
  assert.equal(
    getLiveTrackerState(alert, { ...attraction, status: 'closed', waitTime: null }, prediction),
    'CLOSED',
  )
})
