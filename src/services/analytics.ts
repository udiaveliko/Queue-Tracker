import type {
  Attraction,
  AttractionAnalytics,
  ParkAnalytics,
  WaitTimeHistoryPoint,
} from '../types'
import { getParkWaitTimes } from './waitTimes'

const NETWORK_DELAY_MS = 560
const PARK_HOURS = Array.from({ length: 13 }, (_, index) => index + 9)

const hashString = (value: string) =>
  [...value].reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0)

const seededNoise = (seed: number, index: number) => {
  const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453
  return value - Math.floor(value)
}

const formatHour = (hour: number) => `${String(hour).padStart(2, '0')}:00`

const createHistory = (attraction: Attraction): WaitTimeHistoryPoint[] => {
  const seed = Math.abs(hashString(attraction.id))
  const baseline = attraction.waitTime ?? 20 + (seed % 25)
  const peakHour = 13 + (seed % 5)

  return PARK_HOURS.map((hour, index) => {
    const peakDistance = Math.abs(hour - peakHour)
    const dailyCurve = Math.max(0, 1 - peakDistance / 6)
    const noise = (seededNoise(seed, index) - 0.5) * 12
    const waitTime = Math.max(5, Math.round((baseline * (0.48 + dailyCurve * 0.7) + noise) / 5) * 5)

    return {
      time: formatHour(hour),
      waitTime,
    }
  })
}

const createAttractionAnalytics = (attraction: Attraction): AttractionAnalytics => {
  const history = createHistory(attraction)
  const averageWait = Math.round(
    history.reduce((total, point) => total + point.waitTime, 0) / history.length,
  )
  const bestPoint = history.reduce((best, point) =>
    point.waitTime < best.waitTime ? point : best,
  )
  const worstPoint = history.reduce((worst, point) =>
    point.waitTime > worst.waitTime ? point : worst,
  )

  return {
    attractionId: attraction.id,
    attractionName: attraction.name,
    land: attraction.land,
    currentWait: attraction.status === 'open' ? attraction.waitTime : null,
    averageWait,
    bestTime: bestPoint.time,
    worstTime: worstPoint.time,
    history,
  }
}

export async function getParkAnalytics(parkId: string): Promise<ParkAnalytics> {
  await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS))

  const { park } = await getParkWaitTimes(parkId)

  return {
    parkId: park.id,
    parkName: park.name,
    parkAccent: park.accent,
    generatedAt: new Date().toISOString(),
    attractions: park.attractions.map(createAttractionAnalytics),
  }
}
