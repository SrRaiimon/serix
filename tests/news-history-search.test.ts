import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CHANGELOG, compareVersions, headline, unseenReleases } from '../src/lib/changelog'
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

test('novedades: el titular de Inicio es lo primero que se nota, nunca un «Por dentro» si hay otra cosa', () => {
  const r = (version: string, ...items: string[]) => ({ version, items: items.map((es) => [es, es] as [string, string]) })
  assert.equal(headline([r('3', 'Por dentro: tests'), r('2', 'Récords con trofeo', 'Otra')])?.[0], 'Récords con trofeo')
  assert.equal(headline([r('3', 'Por dentro: tests')])?.[0], 'Por dentro: tests')
  assert.equal(headline([]), undefined)
  // Quien viene de la 0.0.84 a la 0.0.92 ve algo de las 8 versiones, no la nota interna de la última.
  const line = headline(unseenReleases('0.0.84', '0.0.92'))
  assert.ok(line && !/^Por dentro/.test(line[0]), String(line?.[0]))
  assert.equal(unseenReleases('0.0.84', '0.0.92').length, 8)
})

