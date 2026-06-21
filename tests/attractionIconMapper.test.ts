import assert from 'node:assert/strict'
import test from 'node:test'
import { mapAttractionIcon } from '../src/utils/attractionIconMapper.ts'

test('mapeia categorias pelas palavras-chave', () => {
  assert.equal(mapAttractionIcon('Seven Dwarfs Mine Train').category, 'coaster')
  assert.equal(mapAttractionIcon('Pirates of the Caribbean').category, 'water')
  assert.equal(mapAttractionIcon('Haunted Mansion').category, 'haunted')
  assert.equal(mapAttractionIcon('Mission: SPACE').category, 'space')
  assert.equal(mapAttractionIcon('Wildlife Express Train').category, 'train')
  assert.equal(mapAttractionIcon('Festival of the Lion King').category, 'show')
  assert.equal(mapAttractionIcon('Kilimanjaro Safaris').category, 'animal')
  assert.equal(mapAttractionIcon('Tomorrowland Speedway').category, 'car')
  assert.equal(mapAttractionIcon('Soarin Around the World').category, 'flight')
  assert.equal(mapAttractionIcon('Caro-Seuss-el Carousel').category, 'kids')
  assert.equal(mapAttractionIcon('Central Park Cafe').category, 'food')
})

test('usa ícone genérico quando não há palavra-chave', () => {
  assert.equal(mapAttractionIcon('Journey Into Imagination').category, 'generic')
})

test('variação é estável para a mesma atração e parque', () => {
  const first = mapAttractionIcon('Space Mountain', 'magic-kingdom')
  const second = mapAttractionIcon('Space Mountain', 'magic-kingdom')

  assert.equal(first.variant, second.variant)
})
