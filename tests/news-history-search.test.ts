import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CHANGELOG, compareVersions, unseenReleases } from '../src/lib/changelog'
import { searchSessions } from '../src/lib/history'
import { exercise, session, set } from './helpers'

test('novedades: lo nuevo desde la última versión vista', () => {
  assert.equal(compareVersions('0.0.9', '0.0.10'), -1)
  assert.equal(compareVersions('0.1.0', '0.0.99'), 1)
  assert.deepEqual(unseenReleases('0.0.58', '0.0.60').map((r) => r.version), ['0.0.60', '0.0.59'])
  assert.deepEqual(unseenReleases(undefined, '0.0.60').map((r) => r.version), ['0.0.60'])
  assert.deepEqual(unseenReleases('0.0.60', '0.0.60'), [])
  // La lista va de más nueva a más antigua, sin repetir versiones.
  const versions = CHANGELOG.map((r) => r.version)
  assert.deepEqual([...versions].sort((a, b) => compareVersions(b, a)), versions)
  assert.equal(new Set(versions).size, versions.length)
})

test('buscar en el historial: por ejercicio (sin tildes ni plurales), nombre o peso', () => {
  const a = session(0, [exercise('Deadlift', [set(120, 5)], { name: 'Peso muerto' })], { name: 'Pierna' })
  const b = session(1, [exercise('Bench', [set(80, 8)], { name: 'Press de banca' })], { name: 'Torso' })
  const all = [a, b]
  assert.deepEqual(searchSessions(all, 'peso muerto', 'kg'), [a])
  assert.deepEqual(searchSessions(all, 'bancas', 'kg'), [b])
  assert.deepEqual(searchSessions(all, 'torso', 'kg'), [b])
  assert.deepEqual(searchSessions(all, '120', 'kg'), [a])
  assert.deepEqual(searchSessions(all, 'banca 120', 'kg'), [])
  assert.deepEqual(searchSessions(all, '', 'kg'), all)
})
