import type { Park } from '../types'
import { ChevronRightIcon } from './Icons'
import { ParkHeroArt } from './ParkHeroArt'
import { ParkIcon } from './ParkIcon'

interface ParkCardProps {
  park: Omit<Park, 'attractions'>
  index: number
  onSelect: (parkId: string) => void
}

export function ParkCard({ park, index, onSelect }: ParkCardProps) {
  return (
    <button
      className="park-card"
      onClick={() => onSelect(park.id)}
      aria-label={`Abrir filas do ${park.name}`}
      style={{ '--park-accent': park.accent, '--delay': `${index * 45}ms` } as React.CSSProperties}
    >
      <ParkHeroArt parkId={park.id} compact />
      <span className="park-icon-shell">
        <ParkIcon parkId={park.id} />
      </span>
      <span className="park-card-copy">
        <span className="park-resort">{park.resort}</span>
        <strong>{park.name}</strong>
        <span className="park-location">{park.location}</span>
      </span>
      <span className="park-arrow"><ChevronRightIcon /></span>
    </button>
  )
}
