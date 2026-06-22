import type { AttractionLocation } from '../types'

export const getCardinalDirection = (
  from: Pick<AttractionLocation, 'x' | 'y'>,
  to: Pick<AttractionLocation, 'x' | 'y'>,
) => {
  const horizontal = to.x - from.x
  const vertical = to.y - from.y
  const horizontalDirection = Math.abs(horizontal) > 8
    ? horizontal > 0 ? 'leste' : 'oeste'
    : ''
  const verticalDirection = Math.abs(vertical) > 8
    ? vertical > 0 ? 'sul' : 'norte'
    : ''

  if (verticalDirection && horizontalDirection) {
    if (verticalDirection === 'norte') {
      return horizontalDirection === 'leste' ? 'nordeste' : 'noroeste'
    }
    return horizontalDirection === 'leste' ? 'sudeste' : 'sudoeste'
  }
  return verticalDirection || horizontalDirection || 'em frente'
}
