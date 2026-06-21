import { parkEntrances } from './parkEntrances'
import { parkLandCenters, type ParkMapPoint } from './parkLandCenters'

export interface ParkVectorLand {
  name: string
  points: string
  label: ParkMapPoint
}

export interface ParkVectorFeature {
  path: string
  kind: 'water' | 'green'
}

export interface ParkVectorMap {
  outline: string
  lands: ParkVectorLand[]
  mainPaths: string[]
  features: ParkVectorFeature[]
  entrance: ParkMapPoint
}

const createLandPolygons = (parkId: string, radius = 12): ParkVectorLand[] =>
  Object.entries(parkLandCenters[parkId] ?? {}).map(([name, center], index) => {
    const horizontal = radius + (index % 3)
    const vertical = radius * .68 + (index % 2)
    const points = [
      [center.x - horizontal, center.y],
      [center.x - horizontal * .55, center.y - vertical],
      [center.x + horizontal * .55, center.y - vertical],
      [center.x + horizontal, center.y],
      [center.x + horizontal * .55, center.y + vertical],
      [center.x - horizontal * .55, center.y + vertical],
    ]
      .map(([x, y]) => `${Math.max(3, Math.min(97, x)).toFixed(1)},${Math.max(3, Math.min(97, y)).toFixed(1)}`)
      .join(' ')

    return { name, points, label: center }
  })

const mapSeeds: Record<string, Omit<ParkVectorMap, 'lands' | 'entrance'>> = {
  'magic-kingdom': {
    outline: 'M50 4C73 5 91 20 94 42c4 25-8 46-27 53-17 6-37 2-50-10C5 73 3 52 10 33 17 14 31 4 50 4Z',
    mainPaths: [
      'M50 96V52M50 52C34 50 24 42 18 33M50 52C64 48 76 44 88 35M50 52C46 40 49 25 54 13',
      'M18 61C31 56 41 52 50 52c13 0 25 5 36 13M24 31C40 39 62 39 80 29',
    ],
    features: [
      { kind: 'water', path: 'M29 48c7-8 18-10 27-4 7 5 6 13-2 17-10 5-22 3-27-3-3-4-2-7 2-10Z' },
      { kind: 'green', path: 'M11 65c7-5 14-5 20 0-2 12-8 20-17 22-5-7-6-14-3-22Z' },
    ],
  },
  epcot: {
    outline: 'M50 4C74 4 91 18 94 39c2 15-5 27-10 39-6 13-18 19-34 19S22 91 16 78C10 65 4 54 7 38 11 17 28 4 50 4Z',
    mainPaths: [
      'M50 95V70M50 70C36 66 25 60 18 51M50 70c15-4 25-10 33-20M50 70V39',
      'M18 51C25 30 34 19 50 16 66 19 76 30 83 50M20 51c18 9 42 9 63-1',
    ],
    features: [
      { kind: 'water', path: 'M22 21c15-10 41-12 57 1 8 6 8 17 1 24-13 13-45 13-58 0-8-7-8-18 0-25Z' },
      { kind: 'green', path: 'M10 55c7-6 14-7 21-2-1 12-6 22-15 28-6-6-8-15-6-26Z' },
    ],
  },
  'hollywood-studios': {
    outline: 'M17 10 75 7c12 3 19 13 18 26l-3 45c-2 12-10 18-23 19L20 92C9 88 5 80 7 68l3-43c1-8 3-12 7-15Z',
    mainPaths: [
      'M50 94V76M50 76 24 54M50 76 68 59M68 59 76 25M50 76 40 29',
      'M23 54 39 28 68 23M24 54c17 6 34 7 52 5',
    ],
    features: [
      { kind: 'water', path: 'M57 51c5-6 15-7 21-2 5 4 4 11-2 14-8 4-18 3-21-2-2-4-1-7 2-10Z' },
      { kind: 'green', path: 'M9 62c8-3 15-1 20 5-3 10-10 17-19 19-4-7-5-15-1-24Z' },
    ],
  },
  'animal-kingdom': {
    outline: 'M45 3c21-2 38 8 47 25 7 14 4 31-2 45-7 17-22 25-41 24-20 0-34-9-41-25C1 57 3 38 12 23 20 10 31 5 45 3Z',
    mainPaths: [
      'M50 94V56M50 56 25 52M50 56 70 35M50 56 74 68M50 56 42 24M42 24 30 9',
      'M25 52C30 34 38 24 50 22c14 1 22 8 27 18M25 52c14 9 31 11 49 16',
    ],
    features: [
      { kind: 'water', path: 'M35 43c10-8 23-7 31 1 6 6 3 14-6 18-11 5-25 1-29-7-2-5 0-9 4-12Z' },
      { kind: 'green', path: 'M9 18c11-6 21-5 30 2-4 12-12 20-24 23-7-7-9-15-6-25Z' },
      { kind: 'green', path: 'M66 69c10-4 19-1 26 7-5 10-13 17-24 18-5-8-6-16-2-25Z' },
    ],
  },
  'universal-studios-florida': {
    outline: 'M29 4h38c15 2 24 12 26 27l1 43c-2 13-10 21-24 23H27C14 95 7 87 6 74L8 27C10 14 17 7 29 4Z',
    mainPaths: [
      'M50 95V82M50 82 38 74M50 82 66 63M66 63 74 48M74 48 65 33M38 74 25 55M25 55 42 28',
      'M15 69c21-3 40-11 57-25M20 31c20 8 42 8 64 0',
    ],
    features: [
      { kind: 'water', path: 'M54 38c8-6 19-5 25 2 4 5 1 11-6 14-9 3-20 0-22-7-1-4 0-7 3-9Z' },
      { kind: 'green', path: 'M10 18c8-5 16-4 23 2-2 10-8 17-17 20-6-6-8-13-6-22Z' },
    ],
  },
  'islands-of-adventure': {
    outline: 'M50 3c25 0 43 18 44 43 1 23-14 44-36 50-20 5-40-4-49-21C-1 57 4 34 18 18 27 8 37 3 50 3Z',
    mainPaths: [
      'M50 95C32 87 20 74 17 57 14 37 28 19 48 15c20-4 38 10 42 29 5 20-7 39-27 47',
      'M50 87 25 68M25 68 19 48M19 48 31 29M31 29 51 20M51 20 70 30M70 30 78 61',
    ],
    features: [
      { kind: 'water', path: 'M31 35c12-13 31-15 44-3 10 9 9 23-2 32-13 11-34 10-45-2-8-9-7-19 3-27Z' },
      { kind: 'green', path: 'M58 10c12 0 22 5 29 15-5 8-13 13-24 14-7-9-9-19-5-29Z' },
    ],
  },
  'epic-universe': {
    outline: 'M50 3c26 0 44 17 46 42 2 23-13 44-36 51-23 7-46-4-54-25C-1 51 6 29 23 14 31 7 40 3 50 3Z',
    mainPaths: [
      'M50 94V56M50 56 23 31M50 56 76 27M50 56 78 68M50 56 28 70',
      'M18 51c8-22 18-35 32-39 15 5 26 18 33 39-8 22-18 35-33 41-15-6-25-19-32-41Z',
    ],
    features: [
      { kind: 'water', path: 'M38 42c8-8 19-9 27-3 8 6 8 17 0 23-9 8-24 6-30-3-4-6-2-12 3-17Z' },
      { kind: 'green', path: 'M7 50c6-10 14-15 25-16 5 11 3 21-5 30-9 0-16-5-20-14Z' },
    ],
  },
  'seaworld-orlando': {
    outline: 'M22 5h54c12 4 18 13 18 26l-2 43c-2 14-11 21-26 23H27C14 94 7 86 6 73L8 28C9 16 14 8 22 5Z',
    mainPaths: [
      'M50 94V78M50 78 27 62M50 78 72 68M27 62 24 38M24 38 47 24M47 24 68 28M68 28 76 51',
      'M15 73c21-12 44-18 70-18M17 43c21 9 43 9 66 1',
    ],
    features: [
      { kind: 'water', path: 'M19 30c17-15 43-18 62-4 14 10 13 27-1 37-18 13-47 10-61-6-9-10-9-18 0-27Z' },
      { kind: 'green', path: 'M7 70c9-5 18-5 27 1-3 11-10 18-21 21-6-7-8-14-6-22Z' },
    ],
  },
  'busch-gardens-tampa': {
    outline: 'M17 5 75 4c13 3 20 12 19 25l-3 48c-2 13-11 19-25 20L22 94C10 91 5 83 7 70l3-45c1-10 3-16 7-20Z',
    mainPaths: [
      'M50 94V80M50 80 36 58M36 58 28 31M36 58 55 36M55 36 70 31M55 36 76 56M50 80 67 72',
      'M15 72c20-8 43-11 69-8M18 25c17 10 38 13 64 8',
    ],
    features: [
      { kind: 'water', path: 'M52 48c8-7 20-7 27 0 5 5 3 12-5 15-9 4-20 1-23-5-2-4-1-8 1-10Z' },
      { kind: 'green', path: 'M11 19c13-8 26-7 37 2-4 13-13 21-27 24-9-7-12-16-10-26Z' },
      { kind: 'green', path: 'M65 66c10-3 19 0 26 8-5 10-13 16-24 17-5-8-6-16-2-25Z' },
    ],
  },
}

export const parkVectorMaps: Record<string, ParkVectorMap> = Object.fromEntries(
  Object.entries(mapSeeds).map(([parkId, seed]) => [
    parkId,
    {
      ...seed,
      lands: createLandPolygons(parkId, parkId === 'universal-studios-florida' ? 9 : 11),
      entrance: parkEntrances[parkId] ?? { x: 50, y: 94 },
    },
  ]),
)
