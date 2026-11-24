import assert from 'node:assert/strict'
import { test } from 'node:test'
import { splitRecovery, type RecoveryGroup } from '../src/lib/recoverySummary'

const g = (label: string, ready: number, hoursLeft: number): RecoveryGroup => ({ label, ready, hoursLeft })

test('recuperación: tres o más «recuperándose» con horas distintas van en una fila con el tramo', () => {
  const groups = [g('Pecho', 1, 0), g('Espalda', 0.7, 14), g('Piernas', 0.3, 40), g('Hombros', 0.2, 48), g('Brazos', 0.4, 36)]
  const { rows, summary } = splitRecovery(groups)
  assert.deepEqual(rows.map((x) => x.label), ['Pecho', 'Espalda'])
  assert.deepEqual(summary?.groups.map((x) => x.label), ['Piernas', 'Hombros', 'Brazos'])
  assert.equal(summary?.minHours, 36)
  assert.equal(summary?.maxHours, 48)
  assert.ok(Math.abs((summary?.ready ?? 0) - 0.3) < 1e-9)
})

test('recuperación: con menos de tres, cada grupo en su fila', () => {
  const groups = [g('Pecho', 0.3, 40), g('Espalda', 0.2, 48), g('Piernas', 1, 0)]
  const { rows, summary } = splitRecovery(groups)
  assert.equal(summary, undefined)
  assert.equal(rows.length, 3)
})
