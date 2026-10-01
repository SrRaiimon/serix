import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fakeIndexedDB } from './helpers'
import { currentUndo, defaultSettings, dismissUndo, getData, replaceData, undo, update, withUndo } from '../src/lib/store'
import { exercise, session, set } from './helpers'

fakeIndexedDB()

const reset = () => replaceData({
  version: 1, routines: [], measurements: [], exerciseNotes: {}, settings: { ...defaultSettings },
  sessions: [session(0, [exercise('bench', [set(80, 8), set(80, 8)])], { id: 's1' })],
})

test('deshacer devuelve lo borrado', () => {
  reset()
  withUndo('Entrenamiento eliminado', () => update((d) => { d.sessions = [] }))
  assert.equal(getData().sessions.length, 0)
  assert.equal(currentUndo()?.label, 'Entrenamiento eliminado')
  assert.equal(undo(), true)
  assert.equal(getData().sessions[0].id, 's1')
  // Solo una vez.
  assert.equal(currentUndo(), undefined)
  assert.equal(undo(), false)
})

test('si hay otro cambio después, ya no se puede deshacer (no se pierde lo nuevo)', () => {
  reset()
  withUndo('Serie eliminada', () => update((d) => { d.sessions[0].exercises[0].sets.pop() }))
  update((d) => { d.sessions[0].name = 'Nuevo nombre' })
  assert.equal(currentUndo(), undefined)
  assert.equal(undo(), false)
  assert.equal(getData().sessions[0].name, 'Nuevo nombre')
  assert.equal(getData().sessions[0].exercises[0].sets.length, 1)
})

test('sin cambios no se ofrece deshacer y descartar el aviso lo anula', () => {
  reset()
  withUndo('Nada', () => {})
  assert.equal(currentUndo(), undefined)
  withUndo('Serie eliminada', () => update((d) => { d.sessions[0].exercises[0].sets.pop() }))
  dismissUndo()
  assert.equal(undo(), false)
})
