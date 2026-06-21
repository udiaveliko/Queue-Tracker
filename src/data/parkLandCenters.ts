export interface ParkMapPoint {
  x: number
  y: number
}

export const PARK_CENTER: ParkMapPoint = { x: 50, y: 50 }

export const parkLandCenters: Record<string, Record<string, ParkMapPoint>> = {
  'magic-kingdom': {
    'Main Street, U.S.A.': { x: 50, y: 88 },
    Adventureland: { x: 24, y: 60 },
    Frontierland: { x: 20, y: 36 },
    'Liberty Square': { x: 39, y: 39 },
    Fantasyland: { x: 54, y: 25 },
    Tomorrowland: { x: 80, y: 42 },
  },
  epcot: {
    'World Celebration': { x: 50, y: 76 },
    'World Discovery': { x: 72, y: 61 },
    'World Nature': { x: 28, y: 58 },
    'World Showcase': { x: 50, y: 25 },
  },
  'hollywood-studios': {
    'Hollywood Boulevard': { x: 50, y: 80 },
    'Sunset Boulevard': { x: 24, y: 54 },
    'Echo Lake': { x: 66, y: 61 },
    'Grand Avenue': { x: 76, y: 46 },
    "Star Wars: Galaxy's Edge": { x: 67, y: 22 },
    'Toy Story Land': { x: 39, y: 27 },
  },
  'animal-kingdom': {
    'Discovery Island': { x: 50, y: 53 },
    Pandora: { x: 25, y: 52 },
    Africa: { x: 43, y: 24 },
    Asia: { x: 70, y: 35 },
    'DinoLand U.S.A.': { x: 73, y: 67 },
    'Rafiki’s Planet Watch': { x: 30, y: 9 },
  },
  'universal-studios-florida': {
    'Production Central': { x: 50, y: 84 },
    'Minion Land': { x: 40, y: 75 },
    'New York': { x: 66, y: 62 },
    'San Francisco': { x: 75, y: 48 },
    London: { x: 62, y: 35 },
    'Diagon Alley': { x: 67, y: 27 },
    'World Expo': { x: 43, y: 25 },
    Springfield: { x: 27, y: 39 },
    'Woody Woodpecker’s KidZone': { x: 22, y: 55 },
  },
  'islands-of-adventure': {
    'Port of Entry': { x: 50, y: 87 },
    'Marvel Super Hero Island': { x: 25, y: 68 },
    'Toon Lagoon': { x: 18, y: 48 },
    'Skull Island': { x: 25, y: 34 },
    'Jurassic Park': { x: 43, y: 21 },
    'The Wizarding World': { x: 67, y: 28 },
    'Seuss Landing': { x: 76, y: 62 },
  },
  'epic-universe': {
    'Celestial Park': { x: 50, y: 55 },
    'Super Nintendo World': { x: 23, y: 31 },
    'Dark Universe': { x: 76, y: 27 },
    'Isle of Berk': { x: 78, y: 67 },
    'Ministry of Magic': { x: 28, y: 70 },
  },
  'seaworld-orlando': {
    'Sea of Delight': { x: 50, y: 78 },
    'Sea of Shallows': { x: 30, y: 62 },
    'Sea of Mystery': { x: 25, y: 38 },
    'Sea of Infinity': { x: 48, y: 24 },
    Antarctica: { x: 68, y: 27 },
    'Sea of Legends': { x: 76, y: 49 },
    'Wild Arctic': { x: 70, y: 69 },
    'Surf Zone': { x: 40, y: 42 },
    'Sesame Street Land': { x: 24, y: 76 },
  },
  'busch-gardens-tampa': {
    'Bird Gardens': { x: 45, y: 82 },
    'Edge of Africa': { x: 37, y: 58 },
    Egypt: { x: 28, y: 31 },
    Nairobi: { x: 51, y: 36 },
    Congo: { x: 70, y: 31 },
    Stanleyville: { x: 76, y: 55 },
    Pantopia: { x: 63, y: 73 },
    'Sesame Street Safari of Fun': { x: 35, y: 72 },
  },
}

export const getParkLandOptions = (parkId: string) =>
  Object.entries(parkLandCenters[parkId] ?? {})
    .map(([name, location]) => ({ name, location }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
