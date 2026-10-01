import assert from 'node:assert/strict'
import { test } from 'node:test'
import { groupSlots, linkWithNext, normalizeGroups, unlink } from '../src/lib/groups'

const ids = (list: { groupId?: string }[]) => list.map((x) => x.groupId ?? '-')

test('grupos válidos: tramos seguidos de dos o más', () => {
  const list = [{ groupId: 'a' }, {}, { groupId: 'a' }, { groupId: 'b' }, { groupId: 'b' }, { groupId: 'c' }]
  normalizeGroups(list)
  assert.deepEqual(ids(list), ['-', '-', '-', 'b', 'b', '-'])
})

test('un grupo partido conserva solo el primer tramo', () => {
  const list = [{ groupId: 'a' }, { groupId: 'a' }, {}, { groupId: 'a' }, { groupId: 'a' }]
  normalizeGroups(list)
  assert.deepEqual(ids(list), ['a', 'a', '-', '-', '-'])
})

test('unir, fusionar y separar', () => {
  const list: { groupId?: string }[] = [{}, {}, {}, {}]
  linkWithNext(list, 0)
  linkWithNext(list, 2)
  assert.equal(list[0].groupId, list[1].groupId)
  assert.equal(list[2].groupId, list[3].groupId)
  linkWithNext(list, 1)
  assert.equal(new Set(ids(list)).size, 1)
  unlink(list, 1)
  assert.equal(list[1].groupId, undefined)
  // Queda [x] suelto delante (se disuelve) y [2, 3] detrás como superserie.
  assert.equal(list[0].groupId, undefined)
  assert.ok(list[2].groupId && list[2].groupId === list[3].groupId)
})

test('letras y posiciones', () => {
  const slots = groupSlots([{ groupId: 'x' }, { groupId: 'x' }, {}, { groupId: 'y' }, { groupId: 'y' }, { groupId: 'y' }])
  assert.deepEqual(slots.map((s) => `${s.letter ?? '-'}${s.position}/${s.size}`), ['A1/2', 'A2/2', '-1/1', 'B1/3', 'B2/3', 'B3/3'])
  assert.ok(slots[5].last && slots[3].first)
})
