import { parks } from './parks'
import type { AttractionLocation } from '../types'
import { PARK_CENTER, parkLandCenters } from './parkLandCenters'

interface LandCenter {
  x: number
  y: number
}

const featuredLocations: Record<string, LandCenter> = {
  'magic-kingdom|Space Mountain': { x: 82, y: 18 },
  'magic-kingdom|TRON Lightcycle / Run': { x: 88, y: 22 },
  'magic-kingdom|Seven Dwarfs Mine Train': { x: 61, y: 21 },
  'epcot|Guardians of the Galaxy: Cosmic Rewind': { x: 76, y: 57 },
  "hollywood-studios|Star Wars: Rise of the Resistance": { x: 73, y: 18 },
  'animal-kingdom|Avatar Flight of Passage': { x: 20, y: 48 },
  'universal-studios-florida|Harry Potter and the Escape from Gringotts': { x: 70, y: 24 },
  'islands-of-adventure|Hagrid’s Magical Creatures Motorbike Adventure': { x: 69, y: 22 },
  'epic-universe|Stardust Racers': { x: 52, y: 48 },
  'seaworld-orlando|Mako': { x: 20, y: 35 },
  'busch-gardens-tampa|Iron Gwazi': { x: 43, y: 86 },
}

const stableOffset = (value: string, axis: number) => {
  let hash = axis * 17
  for (const character of value) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0
  return (Math.abs(hash) % 11) - 5
}

export const attractionLocations: AttractionLocation[] = parks.flatMap((park) =>
  park.attractions.map((attraction) => {
    const landCenter = parkLandCenters[park.id]?.[attraction.land] ?? PARK_CENTER
    const featured = featuredLocations[`${park.id}|${attraction.name}`]

    return {
      parkId: park.id,
      attractionId: attraction.id,
      attractionName: attraction.name,
      x: featured?.x ?? Math.max(0, Math.min(100, landCenter.x + stableOffset(attraction.id, 1))),
      y: featured?.y ?? Math.max(0, Math.min(100, landCenter.y + stableOffset(attraction.id, 2))),
      land: attraction.land,
    }
  }),
)
