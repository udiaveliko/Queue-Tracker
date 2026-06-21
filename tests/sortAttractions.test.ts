import assert from 'node:assert/strict'
import test from 'node:test'
import type { Attraction } from '../src/types/index.ts'
import { sortAttractions } from '../src/utils/sortAttractions.ts'

const attraction = (
  id: string,
  waitTime: number | null | undefined,
  status: Attraction['status'] = 'open',
): Attraction => ({
  id,
  name: id,
  land: 'Test Land',
  waitTime: waitTime as number | null,
  status,
})

const ids = (items: Attraction[]) => items.map((item) => item.id)

test('ordena maior fila e envia null e undefined para o final', () => {
  const result = sortAttractions([
    attraction('null', null),
    attraction('low', 10),
    attraction('high', 80),
    attraction('undefined', undefined),
    attraction('closed', 120, 'closed'),
  ], 'longest')

  assert.deepEqual(ids(result), ['high', 'low', 'null', 'undefined', 'closed'])
})

test('ordena menor fila e mantém abertas com tempo primeiro', () => {
  const result = sortAttractions([
    attraction('high', 80),
    attraction('closed', 5, 'closed'),
    attraction('null', null),
    attraction('low', 10),
  ], 'shortest')

  assert.deepEqual(ids(result), ['low', 'high', 'null', 'closed'])
})

test('ordena alfabeticamente', () => {
  const result = sortAttractions([
    attraction('Zulu', 5),
    attraction('Alpha', null),
    attraction('Bravo', 50, 'closed'),
  ], 'alphabetical')

  assert.deepEqual(ids(result), ['Alpha', 'Bravo', 'Zulu'])
})

test('trata NaN como tempo ausente', () => {
  const result = sortAttractions([
    attraction('nan', Number.NaN),
    attraction('real', 30),
  ], 'longest')

  assert.deepEqual(ids(result), ['real', 'nan'])
})
