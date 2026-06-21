const API_BASE_URL = 'https://api.themeparks.wiki/v1'
const REQUEST_TIMEOUT_MS = 10_000

export type NormalizedAttractionStatus = 'OPEN' | 'CLOSED'

export interface NormalizedLiveAttraction {
  id: string
  name: string
  waitTime: number | null
  status: NormalizedAttractionStatus
  lastUpdated: string
}

interface ApiDestination {
  id: string
  name: string
  parks: Array<{
    id: string
    name: string
  }>
}

interface DestinationsResponse {
  destinations: ApiDestination[]
}

interface ApiQueueType {
  waitTime?: number | null
}

interface ApiLiveEntity {
  id: string
  name: string
  entityType: string
  status: string
  lastUpdated?: string
  queue?: {
    STANDBY?: ApiQueueType
    PAID_STANDBY?: ApiQueueType
  }
}

interface LiveDataResponse {
  id: string
  name: string
  liveData: ApiLiveEntity[]
}

export const THEMEPARKS_PARK_IDS: Record<string, string> = {
  'magic-kingdom': '75ea578a-adc8-4116-a54d-dccb60765ef9',
  epcot: '47f90d2c-e191-4239-a466-5892ef59a88b',
  'hollywood-studios': '288747d1-8b4f-4a64-867e-ea7c9b27bad8',
  'animal-kingdom': '1c84a229-8862-4648-9c71-378ddd2c7693',
  'universal-studios-florida': 'eb3f4560-2383-4a36-9152-6b3e5ed6bc57',
  'islands-of-adventure': '267615cc-8943-4c2a-ae2c-5da728ca591f',
  'epic-universe': '12dbb85b-265f-44e6-bccf-f1faa17211fc',
  'seaworld-orlando': '27d64dee-d85e-48dc-ad6d-8077445cd946',
  'busch-gardens-tampa': 'fc40c99a-be0a-42f4-a483-1e939db275c2',
}

async function fetchApi<T>(path: string): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`ThemeParks Wiki respondeu com status ${response.status}.`)
    }

    return await response.json() as T
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function getThemeParksDestinations(): Promise<ApiDestination[]> {
  const response = await fetchApi<DestinationsResponse>('/destinations')
  return response.destinations
}

const normalizeStatus = (status: string): NormalizedAttractionStatus =>
  status === 'OPERATING' ? 'OPEN' : 'CLOSED'

const getStandbyWaitTime = (entity: ApiLiveEntity) =>
  entity.queue?.STANDBY?.waitTime
  ?? entity.queue?.PAID_STANDBY?.waitTime
  ?? null

export async function getLiveAttractions(
  appParkId: string,
): Promise<NormalizedLiveAttraction[]> {
  const apiParkId = THEMEPARKS_PARK_IDS[appParkId]

  if (!apiParkId) {
    throw new Error('Este parque ainda não possui integração com dados ao vivo.')
  }

  const response = await fetchApi<LiveDataResponse>(`/entity/${apiParkId}/live`)

  return response.liveData
    .filter((entity) => entity.entityType === 'ATTRACTION')
    .map((entity) => ({
      id: entity.id,
      name: entity.name,
      waitTime: getStandbyWaitTime(entity),
      status: normalizeStatus(entity.status),
      lastUpdated: entity.lastUpdated ?? new Date().toISOString(),
    }))
}
