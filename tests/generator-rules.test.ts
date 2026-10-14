import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { Catalog, type RawExercise } from '../src/lib/catalog'
import { equipmentProfiles, generate, HEAVY_AXIAL, levels, MAX_SETS_PER_SESSION, type GeneratorConfig } from '../src/lib/generator'
import { progressionStep } from '../src/lib/progression'

const catalog = new Catalog((JSON.parse(readFileSync('public/exercises_es.json', 'utf8')) as { exercises: RawExercise[] }).exercises)
const BAR = /pull-?up|pullup|chin-?up|chest_to_bar|hanging|muscle.?up|toes.?to.?bar/i

/** Todos los perfiles: objetivo, nivel, días, minutos y material, con dos variaciones. */
function* configs(): Generator<[GeneratorConfig, number]> {
  for (const goal of ['hypertrophy', 'strength', 'fatLoss', 'general'] as const)
    for (const { id: level } of levels)
      for (const days of [3, 5])
        for (const minutes of [45, 75])
          for (const { id: equipment } of equipmentProfiles)
            for (const variation of [0, 1]) yield [{ goal, level, days, minutes, equipment }, variation]
}

test('generador: reglas de nivel, material y volumen en todos los perfiles', () => {
  for (const [c, variation] of configs()) {
    const where = `${c.goal}/${c.level}/${c.days}d/${c.minutes}min/${c.equipment}/v${variation}`
    for (const day of generate(c, catalog, variation).days) {
      const ids = day.exercises.map((x) => x.exercise.id)
      if (c.equipment !== 'gym') assert.ok(!ids.some((id) => BAR.test(id)), `${where}: ejercicio de barra de dominadas sin barra (${ids.join(', ')})`)
      if (c.level === 'beginner') {
        assert.ok(!day.exercises.some((x) => x.exercise.level === 'expert'), `${where}: ejercicio de experto para principiante`)
        assert.ok(!ids.some((id) => /^(Pullups|Chin-Up|Pistol_Squat|Handstand_Push-Ups|Floor_Glute-Ham_Raise)$/.test(id)), `${where}: demasiado difícil para empezar (${ids.join(', ')})`)
      }
      if (c.equipment !== 'bodyweight') assert.ok(!ids.includes('Bodyweight_Squat'), `${where}: sentadilla sin peso teniendo carga`)
      assert.ok(ids.filter((id) => HEAVY_AXIAL.test(id)).length <= 1, `${where}: más de un básico pesado de columna (${ids.join(', ')})`)
      const perMuscle = new Map<string, number>()
      for (const x of day.exercises) if (x.exercise.category !== 'cardio' && x.exercise.category !== 'plyometrics') perMuscle.set(x.exercise.muscle, (perMuscle.get(x.exercise.muscle) ?? 0) + x.sets)
      for (const [m, sets] of perMuscle) assert.ok(sets <= MAX_SETS_PER_SESSION, `${where}: ${sets} series de ${m} en ${day.name}`)
    }
  }
})

test('peso muerto: sube como la pierna (5 kg)', () => {
  assert.equal(progressionStep('spine', 'kg', 'Barbell_Deadlift'), 5)
})
