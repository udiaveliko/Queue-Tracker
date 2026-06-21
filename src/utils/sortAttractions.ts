import type { Attraction } from '../types'

export type AttractionSortOption = 'shortest' | 'longest' | 'alphabetical'

const hasNumericWaitTime = (attraction: Attraction) =>
  attraction.status === 'open'
  && typeof attraction.waitTime === 'number'
  && Number.isFinite(attraction.waitTime)

const getPriority = (attraction: Attraction) => {
  if (hasNumericWaitTime(attraction)) return 0
  if (attraction.status === 'open') return 1
  return 2
}

export function sortAttractions(
  attractions: Attraction[],
  option: AttractionSortOption,
): Attraction[] {
  return [...attractions].sort((a, b) => {
    if (option === 'alphabetical') {
      return a.name.localeCompare(b.name, 'pt-BR')
    }

    const priorityDifference = getPriority(a) - getPriority(b)
    if (priorityDifference !== 0) return priorityDifference

    if (hasNumericWaitTime(a) && hasNumericWaitTime(b)) {
      return option === 'longest'
        ? b.waitTime! - a.waitTime!
        : a.waitTime! - b.waitTime!
    }

    return a.name.localeCompare(b.name, 'pt-BR')
  })
}
