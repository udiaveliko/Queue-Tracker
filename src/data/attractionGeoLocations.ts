import { attractionLocations } from './attractionLocations'
import { parks } from './parks'
import type {
  AttractionLocation,
  PlannedRoute,
  RouteStartPoint,
} from '../types'

export interface GeoCoordinate {
  lat: number
  lng: number
}

export type GeoLocationSource = 'verified' | 'estimated'

export interface AttractionGeoLocation extends GeoCoordinate {
  parkId: string
  attractionId: string
  name: string
  source: GeoLocationSource
}

export interface ParkGeoConfig extends GeoCoordinate {
  zoom: number
  latitudeSpan: number
  longitudeSpan: number
}

export const parkGeoConfigs: Record<string, ParkGeoConfig> = {
  'magic-kingdom': { lat: 28.4177, lng: -81.5812, zoom: 16, latitudeSpan: .012, longitudeSpan: .014 },
  epcot: { lat: 28.3747, lng: -81.5494, zoom: 15, latitudeSpan: .017, longitudeSpan: .019 },
  'hollywood-studios': { lat: 28.3575, lng: -81.5583, zoom: 16, latitudeSpan: .011, longitudeSpan: .013 },
  'animal-kingdom': { lat: 28.3553, lng: -81.5901, zoom: 15, latitudeSpan: .018, longitudeSpan: .020 },
  'universal-studios-florida': { lat: 28.4754, lng: -81.4672, zoom: 16, latitudeSpan: .012, longitudeSpan: .014 },
  'islands-of-adventure': { lat: 28.4717, lng: -81.471, zoom: 16, latitudeSpan: .012, longitudeSpan: .014 },
  'epic-universe': { lat: 28.4407, lng: -81.4476, zoom: 15, latitudeSpan: .017, longitudeSpan: .019 },
  'seaworld-orlando': { lat: 28.411, lng: -81.4613, zoom: 15, latitudeSpan: .016, longitudeSpan: .018 },
  'busch-gardens-tampa': { lat: 28.038, lng: -82.4212, zoom: 15, latitudeSpan: .019, longitudeSpan: .021 },
}

export const normalizeAttractionName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
    .replace(/^the/, '')

const attractionNameAliases: Record<string, string> = {
  disneyandpixarshortfilmfestival: 'disneypixarshortfilmfestival',
  beautyandthebeastsingalong: 'impressionsdefrancebeautyandthebeastsingalong',
  expeditioneverest: 'expeditioneverestlegendoftheforbiddenmountain',
  hagridsmagicalcreaturesmotorbikeadventure: 'hagridsmotorbikeadventure',
  incrediblehulkcoaster: 'incrediblehulk',
  granfiestatour: 'granfiestatourstarringthethreecaballeros',
}

const canonicalAttractionName = (name: string) => {
  const normalized = normalizeAttractionName(name)
  return attractionNameAliases[normalized] ?? normalized
}

type VerifiedSeed = [
  parkId: string,
  name: string,
  lat: number,
  lng: number,
]

// Coordenadas verificadas em objetos nomeados do OpenStreetMap/Overpass.
const verifiedSeeds: VerifiedSeed[] = [
  ['magic-kingdom', 'TRON Lightcycle / Run', 28.4205136, -81.5767204],
  ['magic-kingdom', 'Seven Dwarfs Mine Train', 28.4206338, -81.5800516],
  ['magic-kingdom', "Peter Pan's Flight", 28.4201540, -81.5819994],
  ['magic-kingdom', 'Space Mountain', 28.4191503, -81.5772484],
  ['magic-kingdom', 'Jungle Cruise', 28.4179433, -81.5834703],
  ['magic-kingdom', 'The Many Adventures of Winnie the Pooh', 28.4199628, -81.5803534],
  ['magic-kingdom', 'Pirates of the Caribbean', 28.4177224, -81.5849315],
  ['magic-kingdom', 'Haunted Mansion', 28.4208495, -81.5829048],
  ['magic-kingdom', 'Buzz Lightyear’s Space Ranger Spin', 28.4180156, -81.5797768],
  ['magic-kingdom', 'Big Thunder Mountain Railroad', 28.4203061, -81.5847249],
  ['magic-kingdom', 'Under the Sea – Journey of The Little Mermaid', 28.4213316, -81.5798830],
  ['magic-kingdom', 'Dumbo the Flying Elephant', 28.4204326, -81.5789452],
  ['magic-kingdom', 'The Barnstormer', 28.4205635, -81.5784286],
  ['magic-kingdom', 'Magic Carpets of Aladdin', 28.4184538, -81.5834838],
  ['magic-kingdom', 'Tomorrowland Speedway', 28.4193925, -81.5793199],
  ['magic-kingdom', 'Mad Tea Party', 28.4199785, -81.5797559],
  ['magic-kingdom', 'PeopleMover', 28.4184918, -81.5791797],

  ['epcot', 'Guardians of the Galaxy: Cosmic Rewind', 28.3755204, -81.5469465],
  ['epcot', "Remy's Ratatouille Adventure", 28.3679240, -81.5528604],
  ['epcot', 'Frozen Ever After', 28.3708027, -81.5462347],
  ['epcot', 'Test Track', 28.3726296, -81.5465197],
  ['epcot', 'Soarin’ Around the World', 28.3728529, -81.5526987],
  ['epcot', 'Mission: SPACE', 28.3739006, -81.5467164],
  ['epcot', 'Spaceship Earth', 28.3752928, -81.5493965],
  ['epcot', 'The Seas with Nemo & Friends', 28.3753336, -81.5508942],
  ['epcot', 'Journey Into Imagination With Figment', 28.3726056, -81.5515338],
  ['epcot', 'Living with the Land', 28.3738961, -81.5527721],
  ['epcot', 'Gran Fiesta Tour', 28.3719194, -81.5468737],
  ['epcot', 'Turtle Talk With Crush', 28.3751340, -81.5509342],
  ['epcot', 'Disney and Pixar Short Film Festival', 28.3723321, -81.5507613],
  ['epcot', 'Beauty and the Beast Sing-Along', 28.3687300, -81.5531797],

  ['islands-of-adventure', 'Hagrid’s Magical Creatures Motorbike Adventure', 28.4734362, -81.4735089],
  ['islands-of-adventure', 'Jurassic World VelociCoaster', 28.4710990, -81.4724911],
  ['islands-of-adventure', 'Harry Potter and the Forbidden Journey', 28.4717484, -81.4739547],
  ['islands-of-adventure', 'The Amazing Adventures of Spider-Man', 28.4700548, -81.4696594],
  ['islands-of-adventure', 'Skull Island: Reign of Kong', 28.4690610, -81.4730493],
  ['islands-of-adventure', 'Jurassic Park River Adventure', 28.4702908, -81.4739361],
  ['islands-of-adventure', 'The Incredible Hulk Coaster', 28.4715017, -81.4687757],
  ['islands-of-adventure', 'Popeye & Bluto’s Bilge-Rat Barges', 28.4706075, -81.4716921],
  ['islands-of-adventure', 'Dudley Do-Right’s Ripsaw Falls', 28.4692144, -81.4718298],
  ['islands-of-adventure', 'The Cat in the Hat', 28.4728879, -81.4687844],
  ['islands-of-adventure', 'Flight of the Hippogriff', 28.4724470, -81.4738336],
  ['islands-of-adventure', 'Caro-Seuss-el', 28.4728858, -81.4696472],
  ['islands-of-adventure', 'Pteranodon Flyers', 28.4703491, -81.4726163],

  ['universal-studios-florida', 'Harry Potter and the Escape from Gringotts', 28.4801577, -81.4700371],
  ['universal-studios-florida', 'Despicable Me Minion Mayhem', 28.4753097, -81.4681943],
  ['universal-studios-florida', 'TRANSFORMERS: The Ride-3D', 28.4764000, -81.4684387],
  ['universal-studios-florida', 'Revenge of the Mummy', 28.4768628, -81.4699854],
  ['universal-studios-florida', 'The Simpsons Ride', 28.4794526, -81.4675090],
  ['universal-studios-florida', 'MEN IN BLACK Alien Attack', 28.4809055, -81.4675869],
  ['universal-studios-florida', 'Race Through New York Starring Jimmy Fallon', 28.4757063, -81.4694820],
  ['universal-studios-florida', 'E.T. Adventure', 28.4776184, -81.4665567],
  ['universal-studios-florida', 'Fast & Furious – Supercharged', 28.4783932, -81.4701356],
  ['universal-studios-florida', 'Illumination’s Villain-Con Minion Blast', 28.4755685, -81.4678641],
  ['universal-studios-florida', 'Kang & Kodos’ Twirl ‘n’ Hurl', 28.4792652, -81.4680428],

  ['epic-universe', 'Harry Potter and the Battle at the Ministry', 28.4437530, -81.4481744],
  ['epic-universe', 'Mario Kart: Bowser’s Challenge', 28.4382893, -81.4479510],
  ['epic-universe', 'Mine-Cart Madness', 28.4381273, -81.4488692],
  ['epic-universe', 'Stardust Racers', 28.4415551, -81.4465421],
  ['epic-universe', 'Monsters Unchained: The Frankenstein Experiment', 28.4407507, -81.4509709],
  ['epic-universe', 'Hiccup’s Wing Gliders', 28.4412520, -81.4444943],
  ['epic-universe', 'Yoshi’s Adventure', 28.4388954, -81.4482496],
  ['epic-universe', 'Curse of the Werewolf', 28.4396832, -81.4496367],
  ['epic-universe', 'Dragon Racer’s Rally', 28.4414496, -81.4453430],
  ['epic-universe', 'Constellation Carousel', 28.4402932, -81.4477835],
  ['epic-universe', 'Fyre Drill', 28.4403742, -81.4452706],
  ['epic-universe', 'Astronomica', 28.4407755, -81.4479429],

  ['animal-kingdom', 'Avatar Flight of Passage', 28.3548608, -81.5928263],
  ['animal-kingdom', 'Na’vi River Journey', 28.3547644, -81.5921919],
  ['animal-kingdom', 'Kilimanjaro Safaris', 28.3597274, -81.5924065],
  ['animal-kingdom', 'Expedition Everest', 28.3586105, -81.5872016],
  ['animal-kingdom', 'Kali River Rapids', 28.3595357, -81.5880624],
  ['animal-kingdom', 'Wildlife Express Train', 28.3613099, -81.5906955],
  ['animal-kingdom', 'Gorilla Falls Exploration Trail', 28.3598875, -81.5920370],
  ['animal-kingdom', 'Maharajah Jungle Trek', 28.3598059, -81.5892014],

  ['hollywood-studios', 'Star Wars: Rise of the Resistance', 28.3542873, -81.5604814],
  ['hollywood-studios', 'Slinky Dog Dash', 28.3566403, -81.5629350],
  ['hollywood-studios', 'Rock ’n’ Roller Coaster', 28.3596420, -81.5615210],
  ['hollywood-studios', 'Mickey & Minnie’s Runaway Railway', 28.3562553, -81.5604470],
  ['hollywood-studios', 'Millennium Falcon: Smugglers Run', 28.3535237, -81.5617034],
  ['hollywood-studios', 'The Twilight Zone Tower of Terror', 28.3600158, -81.5599404],
  ['hollywood-studios', 'Toy Story Mania!', 28.3560234, -81.5613348],
  ['hollywood-studios', 'Alien Swirling Saucers', 28.3556535, -81.5627252],
  ['hollywood-studios', 'Star Tours', 28.3552258, -81.5587049],

  ['seaworld-orlando', 'Penguin Trek', 28.4117802, -81.4596600],
  ['seaworld-orlando', 'Mako', 28.4100046, -81.4573849],
  ['seaworld-orlando', 'Ice Breaker', 28.4088998, -81.4635205],
  ['seaworld-orlando', 'Kraken', 28.4115852, -81.4582022],
  ['seaworld-orlando', 'Infinity Falls', 28.4078653, -81.4601379],
  ['seaworld-orlando', 'Journey to Atlantis', 28.4130651, -81.4592223],
  ['seaworld-orlando', 'Manta', 28.4121201, -81.4608762],
  ['seaworld-orlando', 'Super Grover’s Box Car Derby', 28.4070700, -81.4631044],

  ['busch-gardens-tampa', 'Cheetah Hunt', 28.0358309, -82.4206020],
  ['busch-gardens-tampa', 'Cobra’s Curse', 28.0345431, -82.4181992],
  ['busch-gardens-tampa', 'Montu', 28.0351543, -82.4169976],
]

const verifiedAttractionGeoLocations: AttractionGeoLocation[] = verifiedSeeds.map(
  ([parkId, name, lat, lng]) => {
    const localAttraction = parks
      .find((park) => park.id === parkId)
      ?.attractions.find(
        (attraction) =>
          canonicalAttractionName(attraction.name) === canonicalAttractionName(name),
      )

    return {
      parkId,
      attractionId: localAttraction?.id ?? canonicalAttractionName(name),
      name: localAttraction?.name ?? name,
      lat,
      lng,
      source: 'verified',
    }
  },
)

const verifiedKeys = new Set(
  verifiedAttractionGeoLocations.map(
    (location) => `${location.parkId}|${canonicalAttractionName(location.name)}`,
  ),
)

const estimatedAttractionGeoLocations: AttractionGeoLocation[] = parks.flatMap((park) =>
  park.attractions.flatMap((attraction) => {
    const key = `${park.id}|${canonicalAttractionName(attraction.name)}`
    if (verifiedKeys.has(key)) return []

    const relativeLocation = attractionLocations.find((location) =>
      location.parkId === park.id && location.attractionId === attraction.id,
    )
    if (!relativeLocation) return []

    const geo = relativeLocationToGeo(park.id, relativeLocation)
    if (!geo) return []

    return [{
      parkId: park.id,
      attractionId: attraction.id,
      name: attraction.name,
      ...geo,
      source: 'estimated' as const,
    }]
  }),
)

export const attractionGeoLocations: AttractionGeoLocation[] = [
  ...verifiedAttractionGeoLocations,
  ...estimatedAttractionGeoLocations,
]

export function relativeLocationToGeo(
  parkId: string,
  location: Pick<AttractionLocation, 'x' | 'y'>,
): GeoCoordinate | null {
  const config = parkGeoConfigs[parkId]
  if (!config) return null

  return {
    lat: config.lat + ((50 - location.y) / 100) * config.latitudeSpan,
    lng: config.lng + ((location.x - 50) / 100) * config.longitudeSpan,
  }
}

export function geoLocationToRelative(
  parkId: string,
  location: GeoCoordinate,
): Pick<AttractionLocation, 'x' | 'y'> | null {
  const config = parkGeoConfigs[parkId]
  if (!config) return null

  return {
    x: 50 + ((location.lng - config.lng) / config.longitudeSpan) * 100,
    y: 50 - ((location.lat - config.lat) / config.latitudeSpan) * 100,
  }
}

export function getAttractionGeoLocation(
  parkId: string,
  attraction: { id: string; name: string; location?: AttractionLocation },
): AttractionGeoLocation | null {
  const canonicalName = canonicalAttractionName(attraction.name)
  const known = attractionGeoLocations.find((location) =>
    location.parkId === parkId
    && (
      location.attractionId === attraction.id
      || canonicalAttractionName(location.name) === canonicalName
    ),
  )

  if (known) {
    return {
      ...known,
      attractionId: attraction.id,
      name: attraction.name,
    }
  }

  const projected = attraction.location
    ? relativeLocationToGeo(parkId, attraction.location)
    : null

  return projected
    ? {
        parkId,
        attractionId: attraction.id,
        name: attraction.name,
        ...projected,
        source: 'estimated',
      }
    : null
}

export function getStartPointGeoLocation(
  parkId: string,
  startPoint: RouteStartPoint,
): GeoCoordinate | null {
  if (
    typeof startPoint.latitude === 'number'
    && typeof startPoint.longitude === 'number'
  ) {
    return {
      lat: startPoint.latitude,
      lng: startPoint.longitude,
    }
  }
  return relativeLocationToGeo(parkId, startPoint)
}

export function hasEnoughOSMCoordinates(
  parkId: string,
  route: PlannedRoute,
  startPoint: RouteStartPoint,
) {
  if (!parkGeoConfigs[parkId]) return false
  if (!getStartPointGeoLocation(parkId, startPoint)) return false
  return route.stops.every((stop) =>
    getAttractionGeoLocation(parkId, {
      id: stop.id,
      name: stop.name,
      location: stop.location,
    }) !== null,
  )
}
