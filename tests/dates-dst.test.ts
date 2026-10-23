import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addDays, dayKey, relative, startOfDay, startOfWeek } from '../src/lib/format'
import { weekRecap } from '../src/lib/recap'
import { streakWeeks } from '../src/lib/stats'
import { defaultSettings, type AppData } from '../src/lib/store'
import { exercise, set } from './helpers'

// npm test pasa los tests con la hora de Madrid y con la de Auckland (scripts/test.mjs): cada una tiene el cambio de
// hora en otras fechas, así que estos tests prueban las semanas con 23 y 25 horas de los dos hemisferios.

/** Lunes de las semanas con cambio de hora en 2026: Europa (29 de marzo y 25 de octubre) y Nueva Zelanda (5 de abril y 27 de septiembre). */
const DST_MONDAYS = [new Date(2026, 2, 23), new Date(2026, 9, 19), new Date(2026, 2, 30), new Date(2026, 8, 21)]

const data = (starts: number[]): AppData => ({
  version: 1, routines: [], measurements: [], exerciseNotes: {}, friends: [], challenges: [], customExercises: [],
  nutrition: { entries: [], foods: [], meals: [] }, settings: { ...defaultSettings, onboarded: true },
  sessions: starts.map((start, i) => ({ id: `d${i}`, name: 'x', start, end: start + 1800000, notes: '', exercises: [exercise('bench', [set(50, 5)])] })),
})

test('fecha local (AAAA-MM-DD) y no la de UTC: a las 00:30 ya es hoy', () => {
  assert.equal(dayKey(new Date(2026, 9, 23, 0, 30)), '2026-10-23')
  assert.equal(dayKey(new Date(2026, 9, 23, 23, 59)), '2026-10-23')
  assert.equal(dayKey(new Date(2026, 0, 1, 0, 5)), '2026-01-01')
})

test('semanas con cambio de hora: el domingo por la noche es de esa semana y el lunes, de la siguiente', () => {
  for (const monday of DST_MONDAYS) {
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 30).getTime()
    const nextMonday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7, 0, 30).getTime()
    const label = dayKey(monday)
    assert.equal(startOfWeek(sunday).getTime(), monday.getTime(), label)
    assert.equal(addDays(monday, 7).getTime(), startOfWeek(nextMonday).getTime(), label)
    assert.equal(weekRecap(data([sunday, nextMonday]), monday.getTime())?.workouts, 1, label)
    // Una semana sí y la siguiente también: racha de 2, aunque una de las dos dure 167 o 169 horas.
    assert.equal(streakWeeks(data([sunday, nextMonday]).sessions, nextMonday), 2, label)
  }
})

test('días entre dos fechas con cambio de hora por medio: «hace 2 días», no 1', () => {
  for (const monday of DST_MONDAYS) {
    const saturday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 5, 20).getTime()
    const nextMonday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7, 9)
    assert.equal(Math.round((startOfDay(nextMonday).getTime() - startOfDay(saturday).getTime()) / 86400000), 2)
  }
  // relative() con la fecha de hoy: siempre «Hoy».
  assert.equal(relative(Date.now()), 'Hoy')
})
