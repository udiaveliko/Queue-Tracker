export type AttractionIconCategory =
  | 'coaster'
  | 'water'
  | 'haunted'
  | 'space'
  | 'train'
  | 'show'
  | 'animal'
  | 'car'
  | 'flight'
  | 'kids'
  | 'food'
  | 'generic'

export interface AttractionIconMapping {
  category: AttractionIconCategory
  variant: 0 | 1 | 2
}

const categoryKeywords: Array<{
  category: AttractionIconCategory
  keywords: string[]
}> = [
  {
    category: 'coaster',
    keywords: [
      'roller coaster', 'coaster', 'mountain', 'mine train', 'velocicoaster',
      'mummy', 'hulk', 'gwazi', 'kumba', 'montu', 'kraken', 'mako', 'tigris',
    ],
  },
  {
    category: 'water',
    keywords: [
      'boat', 'river', 'pirates', 'splash', 'water', 'sea', 'falls', 'rapids',
      'bilge', 'flume', 'atlantis', 'nemo', 'aquarium',
    ],
  },
  {
    category: 'haunted',
    keywords: [
      'dark ride', 'haunted', 'mansion', 'phantom', 'monster', 'frankenstein',
      'werewolf', 'terror', 'curse',
    ],
  },
  {
    category: 'space',
    keywords: [
      'space', 'galaxy', 'star', 'mission', 'cosmic', 'tron', 'alien',
      'celestial', 'astronomica', 'transformers',
    ],
  },
  {
    category: 'train',
    keywords: [
      'train', 'railroad', 'railway', 'express', 'locomotive',
    ],
  },
  {
    category: 'show',
    keywords: [
      'show', 'theater', 'theatre', 'sing', 'concert', 'festival', 'vision',
      'academy', 'experience', 'talk', 'film', 'fun',
    ],
  },
  {
    category: 'animal',
    keywords: [
      'animal', 'safari', 'jungle', 'lion', 'bird', 'gorilla', 'penguin',
      'turtle', 'hippogriff', 'dragon', 'dinosaur', 'wildlife',
    ],
  },
  {
    category: 'kids',
    keywords: [
      'kids', 'carousel', 'playground', 'caro-seuss', 'tea party', 'saucers',
      'twirl', 'barnstormer', 'grover', 'yoshi',
    ],
  },
  {
    category: 'flight',
    keywords: [
      'flight', 'soarin', 'sky', 'spinner', 'flying', 'flyer', 'dumbo',
      'carpets', 'wing', 'aerial',
    ],
  },
  {
    category: 'car',
    keywords: [
      'car', 'speedway', 'test track', 'race', 'racing', 'fast & furious',
      'kart', 'vehicle',
    ],
  },
  {
    category: 'food',
    keywords: [
      'food', 'restaurant', 'cafe', 'café', 'dining', 'kitchen', 'grill',
    ],
  },
]

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const hash = (value: string) =>
  [...value].reduce(
    (result, character) => ((result * 31) + character.charCodeAt(0)) >>> 0,
    7,
  )

export function mapAttractionIcon(
  attractionName: string,
  parkId = '',
): AttractionIconMapping {
  const normalizedName = normalize(attractionName)
  const category = categoryKeywords.find(({ keywords }) =>
    keywords.some((keyword) => normalizedName.includes(normalize(keyword))),
  )?.category ?? 'generic'

  return {
    category,
    variant: (hash(`${parkId}:${normalizedName}`) % 3) as 0 | 1 | 2,
  }
}
