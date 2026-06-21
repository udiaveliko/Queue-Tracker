import { appendWaitTimeSamples } from '../database.js'

const API_BASE_URL = 'https://api.themeparks.wiki/v1'
const REQUEST_TIMEOUT_MS = 15_000
const DEVELOPMENT_INTERVAL_MS = 5 * 60 * 1000
const PRODUCTION_INTERVAL_MS = 10 * 60 * 1000

interface ParkConfiguration {
  appId: string
  apiId: string
  name: string
}

interface ApiQueue {
  waitTime?: number | null
}

interface ApiLiveEntity {
  id: string
  name: string
  entityType: string
  status: string
  queue?: {
    STANDBY?: ApiQueue
    PAID_STANDBY?: ApiQueue
  }
}

interface LiveDataResponse {
  liveData: ApiLiveEntity[]
}

export interface CollectorParkResult {
  parkId: string
  parkName: string
  received: number
  saved: number
  valid: number
  suspicious: number
  invalid: number
  duplicatesSkipped: number
  error?: string
}

export interface CollectorRunResult {
  startedAt: string
  finishedAt: string
  parks: CollectorParkResult[]
  totals: {
    received: number
    saved: number
    valid: number
    suspicious: number
    invalid: number
    duplicatesSkipped: number
    errors: number
  }
}

export interface CollectorStatus {
  enabled: boolean
  isRunning: boolean
  intervalMs: number
  lastRunAt: string | null
  nextRunAt: string | null
  lastRunDurationMs: number | null
  lastRunSummary: {
    parksProcessed: number
    attractionsReceived: number
    samplesSaved: number
    valid: number
    suspicious: number
    invalid: number
    duplicatesSkipped: number
    errors: number
  } | null
}

const PARKS: ParkConfiguration[] = [
  { appId: 'magic-kingdom', apiId: '75ea578a-adc8-4116-a54d-dccb60765ef9', name: 'Magic Kingdom' },
  { appId: 'epcot', apiId: '47f90d2c-e191-4239-a466-5892ef59a88b', name: 'EPCOT' },
  { appId: 'hollywood-studios', apiId: '288747d1-8b4f-4a64-867e-ea7c9b27bad8', name: 'Hollywood Studios' },
  { appId: 'animal-kingdom', apiId: '1c84a229-8862-4648-9c71-378ddd2c7693', name: 'Animal Kingdom' },
  { appId: 'universal-studios-florida', apiId: 'eb3f4560-2383-4a36-9152-6b3e5ed6bc57', name: 'Universal Studios Florida' },
  { appId: 'islands-of-adventure', apiId: '267615cc-8943-4c2a-ae2c-5da728ca591f', name: 'Islands of Adventure' },
  { appId: 'epic-universe', apiId: '12dbb85b-265f-44e6-bccf-f1faa17211fc', name: 'Epic Universe' },
  { appId: 'seaworld-orlando', apiId: '27d64dee-d85e-48dc-ad6d-8077445cd946', name: 'SeaWorld Orlando' },
  { appId: 'busch-gardens-tampa', apiId: 'fc40c99a-be0a-42f4-a483-1e939db275c2', name: 'Busch Gardens Tampa' },
]

let collectorTimer: NodeJS.Timeout | null = null
let activeRun: Promise<CollectorRunResult> | null = null
let lastRunAt: string | null = null
let nextRunAt: string | null = null
let lastRunDurationMs: number | null = null
let lastRunSummary: CollectorStatus['lastRunSummary'] = null

const getCollectorInterval = () =>
  process.env.NODE_ENV === 'production'
    ? PRODUCTION_INTERVAL_MS
    : DEVELOPMENT_INTERVAL_MS

const normalizeStatus = (status: string): 'OPEN' | 'CLOSED' =>
  status === 'OPERATING' ? 'OPEN' : 'CLOSED'

const getWaitTime = (entity: ApiLiveEntity) =>
  entity.queue?.STANDBY?.waitTime
  ?? entity.queue?.PAID_STANDBY?.waitTime
  ?? null

const collectPark = async (
  park: ParkConfiguration,
  timestamp: string,
): Promise<CollectorParkResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/entity/${park.apiId}/live`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new Error(`ThemeParks Wiki respondeu com status ${response.status}.`)
    }

    const data = await response.json() as LiveDataResponse
    const attractions = data.liveData.filter(
      (entity) => entity.entityType === 'ATTRACTION',
    )
    const result = appendWaitTimeSamples(
      attractions.map((attraction) => ({
        parkId: park.appId,
        attractionId: attraction.id,
        attractionName: attraction.name,
        waitTime: getWaitTime(attraction),
        status: normalizeStatus(attraction.status),
        timestamp,
      })),
    )

    console.info(
      `[Collector] ${park.name}: ${result.saved}/${attractions.length} atrações salvas`
      + ` (${result.valid} válidas, ${result.suspicious} suspeitas,`
      + ` ${result.invalid} inválidas, ${result.duplicatesSkipped} duplicatas).`,
    )

    return {
      parkId: park.appId,
      parkName: park.name,
      received: attractions.length,
      ...result,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido.'
    console.error(`[Collector] Erro em ${park.name}: ${message}`)

    return {
      parkId: park.appId,
      parkName: park.name,
      received: 0,
      saved: 0,
      valid: 0,
      suspicious: 0,
      invalid: 0,
      duplicatesSkipped: 0,
      error: message,
    }
  }
}

const executeCollectorRun = async (): Promise<CollectorRunResult> => {
  const startedAt = new Date().toISOString()
  const snapshotTimestamp = startedAt
  console.info(`[Collector] Início da coleta em ${startedAt}.`)

  const parks: CollectorParkResult[] = []
  for (const park of PARKS) {
    parks.push(await collectPark(park, snapshotTimestamp))
  }

  const result: CollectorRunResult = {
    startedAt,
    finishedAt: new Date().toISOString(),
    parks,
    totals: {
      received: parks.reduce((sum, park) => sum + park.received, 0),
      saved: parks.reduce((sum, park) => sum + park.saved, 0),
      valid: parks.reduce((sum, park) => sum + park.valid, 0),
      suspicious: parks.reduce((sum, park) => sum + park.suspicious, 0),
      invalid: parks.reduce((sum, park) => sum + park.invalid, 0),
      duplicatesSkipped: parks.reduce(
        (sum, park) => sum + park.duplicatesSkipped,
        0,
      ),
      errors: parks.filter((park) => park.error).length,
    },
  }

  console.info(
    `[Collector] Coleta concluída: ${result.totals.saved}/${result.totals.received} salvas,`
    + ` ${result.totals.suspicious} suspeitas, ${result.totals.invalid} inválidas,`
    + ` ${result.totals.duplicatesSkipped} duplicatas ignoradas,`
    + ` ${result.totals.errors} erros.`,
  )
  return result
}

export function runCollectorOnce(): Promise<CollectorRunResult> {
  if (activeRun) return activeRun

  const startedAtMs = Date.now()
  activeRun = executeCollectorRun()
    .then((result) => {
      lastRunAt = result.finishedAt
      lastRunDurationMs = Date.now() - startedAtMs
      lastRunSummary = {
        parksProcessed: result.parks.length,
        attractionsReceived: result.totals.received,
        samplesSaved: result.totals.saved,
        valid: result.totals.valid,
        suspicious: result.totals.suspicious,
        invalid: result.totals.invalid,
        duplicatesSkipped: result.totals.duplicatesSkipped,
        errors: result.totals.errors,
      }
      return result
    })
    .finally(() => {
      activeRun = null
    })
  return activeRun
}

export function startWaitTimeCollector(): void {
  if (collectorTimer) return

  const interval = getCollectorInterval()

  console.info(
    `[Collector] Agendamento ativo a cada ${interval / 60_000} minutos.`,
  )
  void runCollectorOnce()
  nextRunAt = new Date(Date.now() + interval).toISOString()
  collectorTimer = setInterval(() => {
    nextRunAt = new Date(Date.now() + interval).toISOString()
    void runCollectorOnce()
  }, interval)
  collectorTimer.unref()
}

export function stopWaitTimeCollector(): void {
  if (!collectorTimer) return
  clearInterval(collectorTimer)
  collectorTimer = null
  nextRunAt = null
}

export function isCollectorEnabled(): boolean {
  return process.env.ENABLE_COLLECTOR?.toLowerCase() === 'true'
}

export function getCollectorStatus(): CollectorStatus {
  return {
    enabled: isCollectorEnabled(),
    isRunning: activeRun !== null,
    intervalMs: getCollectorInterval(),
    lastRunAt,
    nextRunAt,
    lastRunDurationMs,
    lastRunSummary,
  }
}
