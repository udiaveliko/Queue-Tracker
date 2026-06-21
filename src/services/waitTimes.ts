import { parks } from '../data/parks'
import type { Attraction, ParkWaitTimes } from '../types'
import { getLiveAttractions } from './themeparksApi'
import {
  getHistoryForAttraction,
  saveWaitTimeSnapshots,
} from './waitTimeHistory'
import { calculateWaitTimePrediction } from './predictions'
import {
  evaluatePendingPredictions,
  savePrediction,
} from './predictionAccuracy'

const NETWORK_DELAY_MS = 420

const simulateWaitTimeVariation = (attraction: Attraction): Attraction => {
  const updatedAt = new Date().toISOString()

  if (attraction.status !== 'open' || attraction.waitTime === null) {
    return {
      ...attraction,
      trend: 'stable',
      updatedAt,
    }
  }

  const variation = Math.floor(Math.random() * 3 - 1) * 5

  return {
    ...attraction,
    waitTime: Math.max(0, attraction.waitTime + variation),
    trend: variation > 0 ? 'up' : variation < 0 ? 'down' : 'stable',
    updatedAt,
  }
}

export const getParkWaitTimes = async (parkId: string): Promise<ParkWaitTimes> => {
  const park = parks.find((item) => item.id === parkId)

  if (!park) {
    throw new Error('Parque não encontrado.')
  }

  try {
    const liveAttractions = await getLiveAttractions(parkId)

    if (!liveAttractions.length) {
      throw new Error('A API não retornou atrações para este parque.')
    }

    const mockAttractionsByName = new Map(
      park.attractions.map((attraction) => [normalizeName(attraction.name), attraction]),
    )
    const latestUpdate = liveAttractions.reduce(
      (latest, attraction) =>
        new Date(attraction.lastUpdated) > new Date(latest)
          ? attraction.lastUpdated
          : latest,
      liveAttractions[0].lastUpdated,
    )

    const snapshotTimestamp = new Date().toISOString()

    const acceptedSnapshots = saveWaitTimeSnapshots(
      liveAttractions.map((attraction) => ({
        parkId,
        attractionId: attraction.id,
        attractionName: attraction.name,
        waitTime: attraction.waitTime,
        status: attraction.status,
        timestamp: snapshotTimestamp,
      })),
    )

    evaluatePendingPredictions(
      parkId,
      acceptedSnapshots
        .filter((snapshot) => snapshot.quality === 'VALID')
        .map((snapshot) => ({
          attractionId: snapshot.attractionId,
          waitTime: snapshot.waitTime,
          status: snapshot.status,
      })),
      snapshotTimestamp,
    )

    acceptedSnapshots
      .filter((snapshot) => snapshot.quality === 'VALID')
      .forEach((snapshot) => {
      savePrediction(
        parkId,
        snapshot.attractionId,
        snapshot.attractionName,
        calculateWaitTimePrediction(getHistoryForAttraction(parkId, snapshot.attractionId)),
        snapshotTimestamp,
      )
      })

    return {
      park: {
        ...park,
        attractions: liveAttractions.map((attraction) => {
          const matchingMock = mockAttractionsByName.get(normalizeName(attraction.name))

          return {
            id: attraction.id,
            name: attraction.name,
            land: matchingMock?.land ?? 'Área não informada',
            waitTime: attraction.waitTime,
            status: attraction.status === 'OPEN' ? 'open' : 'closed',
            trend: 'stable',
            updatedAt: attraction.lastUpdated,
          }
        }),
      },
      lastUpdated: latestUpdate,
      dataSource: 'live',
    }
  } catch {
    await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS))

    return {
      park: {
        ...park,
        attractions: park.attractions.map(simulateWaitTimeVariation),
      },
      lastUpdated: new Date().toISOString(),
      dataSource: 'mock',
      warning: 'Não foi possível acessar os dados ao vivo. Exibindo dados simulados temporariamente.',
    }
  }
}

const normalizeName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[™®©*’'":!–—-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

export const getParks = () => parks.map((park) => ({
  id: park.id,
  name: park.name,
  resort: park.resort,
  location: park.location,
  initials: park.initials,
  accent: park.accent,
  coordinates: park.coordinates,
}))
