export type DataQualityLevel = 'VALID' | 'SUSPICIOUS' | 'INVALID'

export interface WaitTimeSampleInput {
  parkId: string
  attractionId: string
  attractionName: string
  waitTime: number | null
  status: string
  timestamp: string
  quality?: DataQualityLevel
}

export interface DataQualityIssue {
  code: string
  message: string
}

export interface DataQualityResult {
  quality: DataQualityLevel
  issues: DataQualityIssue[]
}

const MAX_WAIT_TIME = 300
const ABRUPT_CHANGE_MINUTES = 60
const ABRUPT_CHANGE_WINDOW_MS = 10 * 60 * 1000

const minuteKey = (timestamp: string) => {
  const date = new Date(timestamp)
  date.setSeconds(0, 0)
  return date.toISOString()
}

export function validateWaitTimeSample(
  sample: WaitTimeSampleInput,
  context: WaitTimeSampleInput[],
): DataQualityResult {
  const invalid: DataQualityIssue[] = []
  const suspicious: DataQualityIssue[] = []
  const timestamp = new Date(sample.timestamp)

  if (!sample.parkId?.trim()) invalid.push({ code: 'EMPTY_PARK_ID', message: 'parkId vazio.' })
  if (!sample.attractionId?.trim()) invalid.push({ code: 'EMPTY_ATTRACTION_ID', message: 'attractionId vazio.' })
  if (!Number.isFinite(timestamp.getTime())) invalid.push({ code: 'INVALID_TIMESTAMP', message: 'Timestamp inválido.' })
  if (sample.status !== 'OPEN' && sample.status !== 'CLOSED') {
    invalid.push({ code: 'INVALID_STATUS', message: 'Status inválido.' })
  }
  if (sample.waitTime !== null && sample.waitTime < 0) {
    invalid.push({ code: 'NEGATIVE_WAIT', message: 'Fila negativa.' })
  }
  if (sample.waitTime !== null && sample.waitTime > MAX_WAIT_TIME) {
    invalid.push({ code: 'EXCESSIVE_WAIT', message: 'Fila acima de 300 minutos.' })
  }

  if (!invalid.length && context.some((entry) =>
    entry.parkId === sample.parkId
    && entry.attractionId === sample.attractionId
    && minuteKey(entry.timestamp) === minuteKey(sample.timestamp),
  )) {
    invalid.push({ code: 'DUPLICATE_MINUTE', message: 'Amostra duplicada no mesmo minuto.' })
  }

  if (!invalid.length && sample.waitTime !== null) {
    const previous = [...context]
      .filter((entry) =>
        entry.parkId === sample.parkId
        && entry.attractionId === sample.attractionId
        && entry.waitTime !== null,
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]

    if (previous?.waitTime !== null && previous) {
      const elapsed = timestamp.getTime() - new Date(previous.timestamp).getTime()
      const change = Math.abs(sample.waitTime - previous.waitTime)
      if (elapsed >= 0 && elapsed <= ABRUPT_CHANGE_WINDOW_MS && change >= ABRUPT_CHANGE_MINUTES) {
        suspicious.push({
          code: 'ABRUPT_CHANGE',
          message: `Mudança de ${change} minutos em menos de 10 minutos.`,
        })
      }
    }
  }

  if (invalid.length) return { quality: 'INVALID', issues: invalid }
  if (suspicious.length || sample.quality === 'SUSPICIOUS') {
    return { quality: 'SUSPICIOUS', issues: suspicious }
  }
  return { quality: 'VALID', issues: [] }
}

export function validateWaitTimeSamples(
  samples: WaitTimeSampleInput[],
  existingContext: WaitTimeSampleInput[] = [],
) {
  const accepted: Array<WaitTimeSampleInput & { quality: Exclude<DataQualityLevel, 'INVALID'> }> = []
  const rejected: Array<{ sample: WaitTimeSampleInput; result: DataQualityResult }> = []
  const context: WaitTimeSampleInput[] = [...existingContext]

  samples.forEach((sample) => {
    const result = validateWaitTimeSample(sample, context)
    if (result.quality === 'INVALID') {
      rejected.push({ sample, result })
      return
    }

    const acceptedSample = {
      ...sample,
      quality: result.quality,
    } as WaitTimeSampleInput & { quality: Exclude<DataQualityLevel, 'INVALID'> }
    accepted.push(acceptedSample)
    context.push(acceptedSample)
  })

  return { accepted, rejected }
}
