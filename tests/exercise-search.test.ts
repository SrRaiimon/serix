import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { Catalog, emptyFilter, type RawExercise } from '../src/lib/catalog'

const catalog = new Catalog((JSON.parse(readFileSync('public/exercises_es.json', 'utf8')) as { exercises: RawExercise[] }).exercises)
const find = (query: string) => catalog.filter({ ...emptyFilter, query }, []).map((e) => e.name)

test('buscar ejercicios: plurales, tildes y nombres de gimnasio', () => {
  assert.ok(find('curls').some((n) => n.startsWith('Curl')))
  assert.ok(find('remos').some((n) => n.startsWith('Remo')))
  assert.ok(find('elevaciones laterales').some((n) => /elevaci[oó]n lateral/i.test(n)))
  assert.ok(find('biceps').length > 0 && find('bíceps').length === find('biceps').length)
  assert.ok(find('multipower').some((n) => n.includes('Smith')))
  assert.ok(find('pajaros').some((n) => /posterior|Pájaro/.test(n)))
  assert.ok(find('rompecraneos').includes('Press francés'))
  assert.ok(find('pantorrillas').some((n) => n.includes('gemelos')))
  assert.ok(find('trapecio').some((n) => n.startsWith('Encogimiento')))
})

test('buscar ejercicios: primero lo que se llama así', () => {
  assert.equal(find('dominadas')[0].startsWith('Dominada'), true)
  assert.match(find('press banca')[0], /^Press de banca/)
  assert.equal(find('sentadilla')[0], find('sentadilla').filter((n) => n.startsWith('Sentadilla')).sort((a, b) => a.length - b.length)[0])
  // Lo que solo coincide por músculo va detrás de lo que lo lleva en el nombre.
  const gemelos = find('gemelos')
  const lastNamed = gemelos.map((n) => /gemelo/i.test(n)).lastIndexOf(true)
  assert.ok(gemelos.slice(0, lastNamed + 1).every((n) => /gemelo|pantorrilla/i.test(n)))
})

test('buscar ejercicios: «press francés» (no confundir -ces con nueces → nuez)', () => {
  assert.ok(find('press frances').includes('Press francés'))
  assert.ok(find('press francés').includes('Press francés'))
})
