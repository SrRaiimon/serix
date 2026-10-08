import assert from 'node:assert/strict'
import { test } from 'node:test'
import './browser-stubs'
import { backupDue, BACKUP_EVERY_DAYS } from '../src/lib/protect'
import { defaultSettings, type AppData } from '../src/lib/store'

const DAY = 86400000
const now = Date.UTC(2026, 9, 8)
const data = (days: number, settings = {}) => ({
  version: 1, sessions: [], routines: [], measurements: [], exerciseNotes: {}, friends: [], challenges: [], customExercises: [],
  nutrition: { entries: Array.from({ length: days }, (_, i) => ({ id: 'e' + i, day: `2026-10-0${i + 1}`, meal: 'lunch', name: 'Arroz', grams: 100, per100: { kcal: 130, p: 3, c: 28, f: 0 }, at: now })), foods: [], meals: [] },
  settings: { ...defaultSettings, ...settings },
}) as unknown as AppData

test('copia de seguridad: se recuerda con entrenos o con varios días de comidas', () => {
  assert.equal(backupDue(data(0), 2, now), false)
  assert.equal(backupDue(data(0), 3, now), true)
  assert.equal(backupDue(data(4), 0, now), false)
  assert.equal(backupDue(data(5), 0, now), true)
  assert.equal(backupDue(data(5, { lastBackupAt: now - 5 * DAY }), 0, now), false)
  assert.equal(backupDue(data(5, { lastBackupAt: now - (BACKUP_EVERY_DAYS + 1) * DAY }), 0, now), true)
  assert.equal(backupDue(data(5, { backupSnoozeUntil: now + DAY }), 0, now), false)
})
