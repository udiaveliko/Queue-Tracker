import type { ReactNode } from 'react'
import type { Attraction } from '../types'
import {
  mapAttractionIcon,
  type AttractionIconCategory,
} from '../utils/attractionIconMapper'

interface AttractionIconProps {
  attraction: Attraction
  parkId?: string
  className?: string
}

const categoryArt: Record<AttractionIconCategory, ReactNode> = {
  coaster: (
    <>
      <path d="M5 20c4-11 8-15 12-10 3 4 5 3 7-3 2-5 5-6 8-2" />
      <path d="M5 25h27M9 25 7 17m8 8-1-12m8 12 2-15m5 15 2-20" />
      <path d="M6 15c7 2 13 1 19-3 3-2 6-4 9-5" />
    </>
  ),
  water: (
    <>
      <path d="M3 22c4-5 8-5 12 0s8 5 12 0 7-5 9-2" />
      <path d="M6 28c4-5 8-5 12 0s8 5 12 0" />
      <path d="m12 16 13-5 7 5-4 4H13l-1-4Z" />
      <path d="M20 11V6l7 5" />
    </>
  ),
  haunted: (
    <>
      <path d="M7 31V15l11-9 11 9v16M4 31h28" />
      <path d="M13 31V20h10v11M11 14V9m14 5V9" />
      <path d="M14 16h2m4 0h2" />
    </>
  ),
  space: (
    <>
      <path d="M18 4c7 5 9 12 5 20l-5 8-5-8c-4-8-2-15 5-20Z" />
      <circle cx="18" cy="14" r="4" />
      <path d="m13 22-6 5v-8l5-4m11 7 6 5v-8l-5-4M14 29l-2 5m10-5 2 5" />
    </>
  ),
  train: (
    <>
      <path d="M9 5h18v20H9zM12 25l-4 6m16-6 4 6M7 31h22" />
      <path d="M13 9h10v7H13z" />
      <circle cx="13" cy="21" r="2" />
      <circle cx="23" cy="21" r="2" />
    </>
  ),
  show: (
    <>
      <path d="M5 28h26M8 28V12h20v16M12 12V7h12v5" />
      <path d="m18 15 2 4 5 .7-3.5 3.3.8 5-4.3-2.4-4.3 2.4.8-5-3.5-3.3 5-.7 2-4Z" />
    </>
  ),
  animal: (
    <>
      <path d="M18 29c-6 0-10-4-10-9 0-6 5-9 10-9s10 3 10 9c0 5-4 9-10 9Z" />
      <circle cx="11" cy="9" r="3" />
      <circle cx="25" cy="9" r="3" />
      <path d="M14 20h1m6 0h1m-7 4c2 1 4 1 6 0" />
    </>
  ),
  car: (
    <>
      <path d="M6 24v-7l4-8h16l4 8v7M4 24h28" />
      <path d="M10 17h16M12 9l-2 8m14-8 2 8" />
      <circle cx="10" cy="25" r="3" />
      <circle cx="26" cy="25" r="3" />
    </>
  ),
  flight: (
    <>
      <path d="m4 20 28-10-9 11-1 10-5-7-8 3 3-7H4Z" />
      <path d="m12 20 8 1" />
    </>
  ),
  kids: (
    <>
      <path d="M6 29h24M9 29l2-16h14l2 16M18 13V6" />
      <path d="M10 13 18 6l8 7" />
      <path d="M13 17v8m5-8v8m5-8v8" />
    </>
  ),
  food: (
    <>
      <path d="M10 5v12m-4-12v7c0 3 2 5 4 5s4-2 4-5V5M10 17v14" />
      <path d="M24 5v26M24 5c5 3 6 8 0 13" />
    </>
  ),
  generic: (
    <>
      <path d="m18 4 4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1 4-9Z" />
      <circle cx="18" cy="18" r="3" />
    </>
  ),
}

const getTone = (attraction: Attraction) => {
  if (attraction.status !== 'open') return 'closed'
  if (
    typeof attraction.waitTime !== 'number'
    || !Number.isFinite(attraction.waitTime)
  ) return 'neutral'
  if (attraction.waitTime <= 20) return 'low'
  if (attraction.waitTime <= 50) return 'medium'
  return 'high'
}

export function AttractionIcon({
  attraction,
  parkId = '',
  className,
}: AttractionIconProps) {
  const mapping = mapAttractionIcon(attraction.name, parkId)
  const tone = getTone(attraction)

  return (
    <span
      className={`attraction-icon tone-${tone} variant-${mapping.variant} ${className ?? ''}`}
      data-category={mapping.category}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 36 36"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {categoryArt[mapping.category]}
      </svg>
    </span>
  )
}
