import assert from 'node:assert/strict'
import test from 'node:test'
import { getCardinalDirection } from '../src/utils/routeMapDirections.ts'

test('descreve direções cardeais e diagonais no mapa relativo', () => {
  assert.equal(getCardinalDirection({ x: 50, y: 50 }, { x: 50, y: 20 }), 'norte')
  assert.equal(getCardinalDirection({ x: 50, y: 50 }, { x: 80, y: 50 }), 'leste')
  assert.equal(getCardinalDirection({ x: 50, y: 50 }, { x: 20, y: 80 }), 'sudoeste')
  assert.equal(getCardinalDirection({ x: 50, y: 50 }, { x: 54, y: 53 }), 'em frente')
})
