import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fakeIndexedDB } from './helpers'
import { Catalog, type RawExercise } from '../src/lib/catalog'
import { day, editable, parseDecimal, relative } from '../src/lib/format'
import { generate } from '../src/lib/generator'
import { lang, plural, setLang, systemLang, t } from '../src/lib/i18n'
import { muscleLabel } from '../src/lib/labels'
import { relabelExercises } from '../src/lib/migrate'
import { defaultSettings, getData, replaceData, updateSettings } from '../src/lib/store'
import { rpeMeaning } from '../src/lib/tracking'
import { exercise, session, set } from './helpers'

fakeIndexedDB()

/** Ejecuta `fn` en inglés y vuelve al español aunque falle. */
function inEnglish(fn: () => void) {
  setLang('en')
  try {
    fn()
  } finally {
    setLang('es')
  }
}

const raw = (id: string, name: string, nameEn: string): RawExercise => ({
  id, name, nameEn, muscle: 'quads', bodyPart: 'legs', equipment: 'barbell', category: 'strength', level: 'beginner',
  secondaryMuscles: [], instructions: [`Paso de ${name}`], instructionsEn: [`Step for ${nameEn}`],
})

test('idioma del sistema', () => {
  assert.equal(systemLang(), 'es')
  const g = globalThis as { navigator: unknown }
  const saved = g.navigator
  try {
    g.navigator = { language: 'en-US', languages: ['de-DE', 'en-US'] }
    assert.equal(systemLang(), 'en')
    // Manda el idioma preferido, no cualquiera de la lista.
    g.navigator = { language: 'en-US', languages: ['en-US', 'es-MX'] }
    assert.equal(systemLang(), 'en')
    g.navigator = { language: 'es-MX', languages: ['es-MX', 'en-US'] }
    assert.equal(systemLang(), 'es')
  } finally {
    g.navigator = saved
  }
})

test('textos, plurales y etiquetas', () => {
  assert.equal(t('Terminar', 'Finish'), 'Terminar')
  assert.equal(plural(1, ['serie', 'series'], ['set', 'sets']), '1 serie')
  assert.equal(muscleLabel('quads'), 'Cuádriceps')
  inEnglish(() => {
    assert.equal(t('Terminar', 'Finish'), 'Finish')
    assert.equal(plural(3, ['serie', 'series'], ['set', 'sets']), '3 sets')
    assert.equal(muscleLabel('quads'), 'Quads')
    assert.equal(rpeMeaning(10), 'to failure')
    assert.equal(relative(Date.now()), 'Today')
  })
})

test('números y fechas según el idioma', () => {
  const d = new Date(2026, 0, 5)
  assert.equal(editable(62.5), '62,5')
  assert.match(day(d), /^Lunes, 5 de enero$/)
  inEnglish(() => {
    assert.equal(editable(62.5), '62.5')
    // Se acepta el punto y la coma al escribir, en los dos idiomas.
    assert.equal(parseDecimal('62.5'), 62.5)
    assert.equal(parseDecimal('62,5'), 62.5)
    assert.match(day(d), /^Monday,? 5 January$/)
  })
})

test('el catálogo usa los nombres e instrucciones del idioma', () => {
  const list = [raw('Squat', 'Sentadilla', 'Barbell Squat'), raw('Lunge', 'Zancada', 'Lunge')]
  const es = new Catalog(list)
  assert.equal(es.get('Squat')?.name, 'Sentadilla')
  assert.deepEqual(es.get('Squat')?.instructions, ['Paso de Sentadilla'])
  inEnglish(() => {
    const en = new Catalog(list)
    assert.equal(en.get('Squat')?.name, 'Barbell Squat')
    assert.deepEqual(en.get('Squat')?.instructions, ['Step for Barbell Squat'])
    assert.deepEqual(en.exercises.map((e) => e.name), ['Barbell Squat', 'Lunge'])
    // Se puede buscar por el nombre en los dos idiomas.
    assert.equal(en.filter({ query: 'sentadilla', favoritesOnly: false }, []).length, 1)
  })
})

test('al cambiar de idioma, los nombres del catálogo guardados se traducen; los propios no', () => {
  const catalog = () => new Catalog([raw('Squat', 'Sentadilla', 'Barbell Squat')])
  replaceData({
    version: 1,
    routines: [{ id: 'r', name: 'R', notes: '', order: 0, createdAt: 0, exercises: [
      { exerciseId: 'Squat', name: 'Sentadilla', muscle: 'quads', sets: 3, repsMin: 5, repsMax: 5, rest: 120 },
      { exerciseId: 'Squat', name: 'Mi sentadilla', muscle: 'quads', sets: 3, repsMin: 5, repsMax: 5, rest: 120 },
    ] }],
    sessions: [session(0, [exercise('Squat', [set(100, 5)], { name: 'Sentadilla' })])],
    measurements: [], exerciseNotes: {}, friends: [], challenges: [], customExercises: [], nutrition: { entries: [], foods: [], meals: [] }, settings: { ...defaultSettings },
  })
  updateSettings({ language: 'en' })
  assert.equal(lang(), 'en')
  relabelExercises(catalog())
  assert.deepEqual(getData().routines[0].exercises.map((e) => e.name), ['Barbell Squat', 'Mi sentadilla'])
  assert.equal(getData().sessions[0].exercises[0].name, 'Barbell Squat')
  updateSettings({ language: 'es' })
  relabelExercises(catalog())
  assert.equal(getData().routines[0].exercises[0].name, 'Sentadilla')
  updateSettings({ language: undefined })
  assert.equal(lang(), 'es')
})

test('el generador nombra el programa en el idioma actual', () => {
  const list = ['Barbell_Full_Squat', 'Barbell_Bench_Press_-_Medium_Grip', 'Bent_Over_Barbell_Row', 'Barbell_Shoulder_Press']
    .map((id) => raw(id, id, id))
  const config = { goal: 'strength', level: 'beginner', days: 3, minutes: 45, equipment: 'gym' } as const
  assert.match(generate(config, new Catalog(list)).name, /^Cuerpo completo · Fuerza$/)
  inEnglish(() => {
    const p = generate(config, new Catalog(list))
    assert.match(p.name, /^Full body · Strength$/)
    assert.match(p.days[0].name, /^Day 1 · Full body A$/)
    assert.match(p.summary, /^3 days a week/)
  })
})
