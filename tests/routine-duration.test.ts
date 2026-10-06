import assert from 'node:assert/strict'
import { test } from 'node:test'
import { defaultSettings, expectedMinutes, routineMinutes, type AppData, type Routine, type Session } from '../src/lib/store'

const routine: Routine = {
  id: 'r', name: 'A', notes: '', order: 0, createdAt: 0,
  exercises: [{ exerciseId: 'x', name: 'X', muscle: 'chest', sets: 3, repsMin: 8, repsMax: 12, rest: 120 }],
}
const session = (start: number, minutes: number | undefined): Session => ({
  id: String(start), name: 'A', routineId: 'r', start, end: minutes === undefined ? undefined : start + minutes * 60000, notes: '', exercises: [],
})
const data = (sessions: Session[]) => ({ sessions, routines: [routine], settings: defaultSettings } as unknown as AppData)

test('duración de la rutina: estimada sin historial y mediana de las últimas sesiones con él', () => {
  // 3 series × (40 s + 120 s) + 90 s de preparación = 570 s ≈ 10 min.
  assert.equal(routineMinutes(routine), 10)
  assert.deepEqual(expectedMinutes(data([]), routine), { minutes: 10, measured: false })
  const DAY = 86400000
  assert.deepEqual(expectedMinutes(data([session(1 * DAY, 50), session(2 * DAY, 62), session(3 * DAY, 70)]), routine), { minutes: 62, measured: true })
  // Se ignoran las que siguen abiertas, las olvidadas abiertas horas y las de menos de 5 min.
  assert.deepEqual(expectedMinutes(data([session(1 * DAY, 60), session(2 * DAY, 400), session(3 * DAY, 2), session(4 * DAY, undefined)]), routine), { minutes: 60, measured: true })
})
