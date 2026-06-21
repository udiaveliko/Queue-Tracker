import assert from 'node:assert/strict'
import test from 'node:test'
import { parks } from '../src/data/parks.ts'
import { parkVectorMaps } from '../src/data/parkVectorMaps.ts'

test('todos os parques possuem mapa vetorial completo', () => {
  for (const park of parks) {
    const map = parkVectorMaps[park.id]

    assert.ok(map, `Mapa ausente para ${park.id}`)
    assert.ok(map.outline.startsWith('M'))
    assert.ok(map.lands.length > 0)
    assert.ok(map.mainPaths.length > 0)
    assert.ok(map.features.length > 0)
    assert.ok(map.entrance.x >= 0 && map.entrance.x <= 100)
    assert.ok(map.entrance.y >= 0 && map.entrance.y <= 100)
  }
})

test('lands vetoriais usam os mesmos nomes dos centros relativos', () => {
  const magicKingdom = parkVectorMaps['magic-kingdom']
  const landNames = magicKingdom.lands.map((land) => land.name)

  assert.ok(landNames.includes('Tomorrowland'))
  assert.ok(landNames.includes('Fantasyland'))
  assert.ok(landNames.includes('Adventureland'))
})
