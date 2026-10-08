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

test('funcional y en casa: filtros y ejercicios propios con pasos en los dos idiomas', () => {
  const raw = (JSON.parse(readFileSync('public/exercises_es.json', 'utf8')) as { exercises: (RawExercise & { extra?: boolean })[] }).exercises
  const own = raw.filter((e) => e.extra)
  assert.ok(own.length >= 40)
  for (const e of own) {
    assert.ok(e.tags?.length, `${e.id} sin etiqueta`)
    assert.ok(e.instructions?.length && e.instructions.length === e.instructionsEn?.length, `${e.id}: pasos`)
    assert.match(e.instructions!.at(-1)!, /^Consejo:/)
  }
  const functional = catalog.filter({ ...emptyFilter, tag: 'functional' }, []).map((e) => e.id)
  for (const id of ['Wall_Ball', 'Burpee', 'Toes_To_Bar', 'Clean_and_Jerk']) assert.ok(functional.includes(id), id)
  const home = catalog.filter({ ...emptyFilter, tag: 'home' }, [])
  assert.ok(home.some((e) => e.id === 'Towel_Door_Row') && home.some((e) => e.id === 'Pushups'))
  assert.ok(home.every((e) => e.equipment === 'bodyweight' || e.tags?.includes('home')))
  assert.ok(find('burpee').length && find('wall ball')[0] === 'Lanzamiento a la pared (wall ball)')
})
