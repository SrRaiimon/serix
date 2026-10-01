import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildSegments, DEFAULTS, positionAt, totalSeconds } from '../src/lib/intervals'

test('Tabata: preparación y 8 rondas de 20/10 sin descanso al final', () => {
  const s = buildSegments(DEFAULTS.tabata)
  assert.equal(s.length, 1 + 8 + 7)
  assert.deepEqual(s.slice(0, 3).map((x) => `${x.kind}${x.seconds}r${x.round}`), ['prep10r0', 'work20r1', 'rest10r1'])
  assert.equal(s[s.length - 1].kind, 'work')
  assert.equal(totalSeconds(s), 10 + 8 * 20 + 7 * 10)
})

test('EMOM y AMRAP', () => {
  assert.deepEqual(buildSegments({ ...DEFAULTS.emom, rounds: 3, prep: 0 }).map((x) => `${x.kind}${x.seconds}`), ['work60', 'work60', 'work60'])
  assert.deepEqual(buildSegments(DEFAULTS.amrap).map((x) => `${x.kind}${x.seconds}`), ['prep10', 'work600'])
})

test('posición según el tiempo transcurrido', () => {
  const s = buildSegments(DEFAULTS.tabata)
  assert.deepEqual([positionAt(s, 0).segment.kind, positionAt(s, 0).remaining], ['prep', 10])
  const p = positionAt(s, 12_500) // 10 s de preparación + 2,5 s de trabajo
  assert.equal(p.segment.kind, 'work')
  assert.equal(p.segment.round, 1)
  assert.equal(p.remaining, 17.5)
  assert.equal(positionAt(s, 30_000).segment.kind, 'rest')
  assert.equal(positionAt(s, 40_000).segment.round, 2)
  const end = positionAt(s, totalSeconds(s) * 1000 + 5)
  assert.equal(end.done, true)
  assert.equal(end.totalRemaining, 0)
})
