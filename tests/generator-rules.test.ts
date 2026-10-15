import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { Catalog, type RawExercise } from '../src/lib/catalog'
import { buildLibraryProgram, equipmentProfiles, generate, HEAVY_AXIAL, levels, LIBRARY, MAX_SETS_PER_SESSION, type GeneratorConfig } from '../src/lib/generator'
import { progressionStep } from '../src/lib/progression'

const catalog = new Catalog((JSON.parse(readFileSync('public/exercises_es.json', 'utf8')) as { exercises: RawExercise[] }).exercises)
const BAR = /pull[-_]?up|chin[-_]?up|chest_to_bar|hanging|muscle.?up|toes.?to.?bar/i

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

test('biblioteca: las mismas reglas de nivel y barra, y ningún día sin tirón', () => {
  for (const p of LIBRARY) for (const { id: equipment } of equipmentProfiles) {
    const program = buildLibraryProgram(p, equipment, catalog)
    const real = p.equipment ?? equipment
    const bar = real === 'gym' || (p.extraEquipment ?? []).includes('other')
    for (const day of program.days) {
      const ids = day.exercises.map((x) => x.exercise.id)
      const where = `${p.id}/${equipment}/${day.name}`
      if (!bar) assert.ok(!ids.some((id) => BAR.test(id)), `${where}: barra de dominadas sin barra (${ids.join(', ')})`)
      if (p.level === 'beginner') assert.ok(!day.exercises.some((x) => x.exercise.level === 'expert'), `${where}: experto para principiante (${ids.join(', ')})`)
    }
  }
})

test('generador: kipping y nórdico fuera, y la pauta se ajusta al ejercicio', () => {
  for (const [c, variation] of configs()) {
    for (const day of generate(c, catalog, variation).days) {
      for (const x of day.exercises) {
        const where = `${c.goal}/${c.level}/${c.equipment}: ${x.exercise.id}`
        assert.ok(!/kipping/i.test(x.exercise.id), where)
        if (c.level === 'beginner') assert.ok(!/Glute_Ham|Glute-Ham|Wall_Walk/.test(x.exercise.id), where)
        if (x.exercise.equipment !== 'barbell' && x.exercise.category === 'strength' && !/Glute.?Ham/.test(x.exercise.id)) assert.ok(x.repsMin >= 6, `${where} a ${x.repsMin}-${x.repsMax}`)
      }
      assert.ok(day.exercises.reduce((t, x) => t + x.sets, 0) <= Math.round(c.minutes / 3.4), `${c.minutes} min: demasiadas series en ${day.name}`)
    }
  }
})

test('con barra de dominadas en casa, sí hay dominadas (desde intermedio)', () => {
  const c: GeneratorConfig = { goal: 'hypertrophy', level: 'intermediate', days: 4, minutes: 60, equipment: 'dumbbells' }
  const ids = (cfg: GeneratorConfig) => generate(cfg, catalog).days.flatMap((d) => d.exercises.map((x) => x.exercise.id))
  assert.ok(!ids(c).some((id) => BAR.test(id)))
  assert.ok(ids({ ...c, pullupBar: true }).some((id) => BAR.test(id)), ids({ ...c, pullupBar: true }).join(', '))
})

test('isquios en casa: un ejercicio de isquios de verdad; nórdico a pocas reps; sin pino salvo avanzados', () => {
  for (const [c, variation] of configs()) {
    for (const day of generate(c, catalog, variation).days) {
      for (const x of day.exercises) {
        const where = `${c.goal}/${c.level}/${c.equipment}: ${x.exercise.id}`
        assert.ok(x.exercise.id !== 'Leg_Lift', where)
        if (/Glute.?Ham/.test(x.exercise.id)) assert.ok(x.repsMax <= 6, `${where} a ${x.repsMin}-${x.repsMax}`)
        if (c.level !== 'advanced') assert.ok(!/Wall_Walk|Handstand/.test(x.exercise.id), where)
      }
    }
  }
})
