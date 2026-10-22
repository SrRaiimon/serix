import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { Catalog, type RawExercise } from '../src/lib/catalog'
import { buildLibraryProgram, dayMinutes, equipmentProfiles, exerciseCount, generate, HEAVY_AXIAL, levels, LIBRARY, MAX_SETS_PER_SESSION, type GeneratorConfig } from '../src/lib/generator'
import { progressionStep } from '../src/lib/progression'
import { routineMinutes, type Routine } from '../src/lib/store'
import { plannedGroupSets } from '../src/lib/coach'
import { MAIN_GROUPS } from '../src/lib/labels'
import { defaultTracking } from '../src/lib/tracking'
import { ABS_GROUP, countsForVolume, groupRange, pushPullShares } from '../src/lib/volume'

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
      // Con la misma cuenta de minutos que enseña la app (y los 3 min de margen al recortar).
      assert.ok(dayMinutes(day.exercises) <= c.minutes + 3, `${c.minutes} min: ${Math.round(dayMinutes(day.exercises))} min en ${day.name}`)
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

test('casa: desde intermedio, sin sentadilla al aire; 5×5 sin barra con series normales en la bisagra', () => {
  const ids = generate({ goal: 'hypertrophy', level: 'intermediate', days: 4, minutes: 60, equipment: 'bodyweight' }, catalog).days.flatMap((d) => d.exercises.map((x) => x.exercise.id))
  assert.ok(!ids.includes('Bodyweight_Squat'), ids.join(', '))
  const p = LIBRARY.find((x) => x.id === 'strength5x5')!
  for (const day of buildLibraryProgram(p, 'bodyweight', catalog).days) for (const x of day.exercises) assert.ok(x.sets >= 2, `${day.name}: ${x.exercise.id} ${x.sets} series`)
  const gym = buildLibraryProgram(p, 'gym', catalog).days.flatMap((d) => d.exercises).find((x) => x.exercise.id === 'Barbell_Deadlift')
  assert.equal(gym?.sets, 1, 'el peso muerto del 5×5 con barra sigue a 1×5')
})

test('mancuernas: suben a pesos que existen (24 → 26 kg)', () => {
  assert.equal(24 + progressionStep('pectorals', 'kg', 'Dumbbell_Bench_Press', 24), 26)
  assert.equal(25 + progressionStep('pectorals', 'kg', 'Dumbbell_Bench_Press', 25), 27.5)
})

test('biblioteca: se ajusta a los minutos, salvo las pautas cerradas', () => {
  for (const p of LIBRARY) {
    for (const minutes of [30, 45, 60]) {
      const full = buildLibraryProgram(p, p.equipment ?? 'gym', catalog)
      const fitted = buildLibraryProgram(p, p.equipment ?? 'gym', catalog, false, minutes)
      fitted.days.forEach((day, i) => {
        const sets = day.exercises.reduce((t, x) => t + x.sets, 0)
        if (p.fixed) assert.deepEqual(day.exercises.map((x) => x.exercise.id), full.days[i].exercises.map((x) => x.exercise.id), p.id)
        else assert.ok(dayMinutes(day.exercises) <= minutes + 3, `${p.id} a ${minutes} min: ${Math.round(dayMinutes(day.exercises))} min y ${sets} series en ${day.name}`)
      })
    }
  }
})

test('biblioteca: sentadilla y peso muerto con barra no van el mismo día (salvo el 5×5), y el rumano sí tras la sentadilla', () => {
  const BIG = /^(Barbell_(Full_)?Squat|Front_Barbell_Squat|Barbell_Deadlift|Sumo_Deadlift)$/
  for (const p of LIBRARY.filter((x) => !x.fixed)) {
    for (const day of buildLibraryProgram(p, p.equipment ?? 'gym', catalog).days) {
      assert.ok(day.exercises.filter((x) => BIG.test(x.exercise.id)).length <= 1, `${p.id}: ${day.name}`)
    }
  }
  const legsA = buildLibraryProgram(LIBRARY.find((x) => x.id === 'upperlower4')!, 'gym', catalog).days[1].exercises.map((x) => x.exercise.id)
  assert.ok(legsA.includes('Barbell_Full_Squat') && legsA.includes('Romanian_Deadlift'), legsA.join(', '))
})

test('en casa sin material: bíceps el día de tirón y dos días de pierna distintos', () => {
  for (const level of levels.map((l) => l.id)) {
    const days = generate({ goal: 'hypertrophy', level, days: 3, minutes: 60, equipment: 'bodyweight' }, catalog).days
    const pull = days.find((d) => /Tirón|Cuerpo completo A/.test(d.name))!
    assert.ok(pull.exercises.some((x) => x.exercise.muscle === 'biceps'), `${level}: ${pull.exercises.map((x) => x.exercise.id).join(', ')}`)
    const legs = generate({ goal: 'hypertrophy', level, days: 4, minutes: 60, equipment: 'bodyweight' }, catalog).days.filter((d) => /Pierna/.test(d.name))
    // Los gemelos sin material son siempre el mismo ejercicio (y es normal repetirlo): no cuentan.
    const [a, b] = legs.map((d) => new Set(d.exercises.filter((x) => x.exercise.muscle !== 'calves').map((x) => x.exercise.id)))
    const shared = [...a].filter((id) => b.has(id)).length
    assert.ok(shared <= Math.min(a.size, b.size) / 2, `${level}: Pierna A y B comparten ${shared}`)
  }
})

test('la mochila solo sustituye a las pesas cuando no hay pesas', () => {
  for (const equipment of ['gym', 'dumbbells', 'kettlebell'] as const) {
    for (const level of levels.map((l) => l.id)) {
      const ids = generate({ goal: 'hypertrophy', level, days: 4, minutes: 60, equipment }, catalog).days.flatMap((d) => d.exercises.map((x) => x.exercise.id))
      assert.ok(!ids.some((id) => /^Backpack_(Curl|Squat)$/.test(id)), `${equipment}/${level}: ${ids.join(', ')}`)
    }
  }
})

test('perder grasa: el acondicionamiento que promete cabe todos los días, con cualquier tiempo', () => {
  for (const level of levels.map((l) => l.id)) {
    for (const minutes of [30, 45, 60, 90]) {
      for (const equipment of ['gym', 'dumbbells', 'bodyweight'] as const) {
        for (const day of generate({ goal: 'fatLoss', level, days: 4, minutes, equipment }, catalog).days) {
          assert.ok(day.exercises.some((x) => ['cardio', 'plyometrics'].includes(x.exercise.category) || /swing|burpee|climber|jump|rope/i.test(x.exercise.id)), `${level}/${equipment}/${minutes}: ${day.name} sin acondicionamiento`)
        }
      }
    }
  }
})

test('con poco tiempo se quitan series antes que ejercicios: brazos cada semana y el básico del día siempre', () => {
  const weekly = (days: { exercises: { exercise: { muscle: string }; sets: number }[] }[], m: string) => days.flatMap((d) => d.exercises).filter((x) => x.exercise.muscle === m).length
  for (const equipment of ['gym', 'dumbbells'] as const) {
    for (const level of ['intermediate', 'advanced'] as const) {
      const days = generate({ goal: 'hypertrophy', level, days: 4, minutes: 60, equipment }, catalog).days
      assert.ok(weekly(days, 'biceps') >= 1 && weekly(days, 'triceps') >= 1, `${equipment}/${level}: sin brazos`)
    }
  }
  for (const p of LIBRARY.filter((x) => !x.fixed)) {
    const full = buildLibraryProgram(p, p.equipment ?? 'gym', catalog)
    for (const minutes of [30, 45, 60]) {
      buildLibraryProgram(p, p.equipment ?? 'gym', catalog, false, minutes).days.forEach((day, i) => {
        assert.ok(day.exercises.length >= 3, `${p.id} a ${minutes} min: ${day.name} con ${day.exercises.length}`)
        assert.equal(day.exercises[0].exercise.id, full.days[i].exercises[0].exercise.id, `${p.id} a ${minutes} min: perdió su básico`)
      })
    }
    const sixty = buildLibraryProgram(p, p.equipment ?? 'gym', catalog, false, 60).days
    if (p.id === 'upperlower4' || p.id === 'ppl3') assert.ok(weekly(sixty, 'triceps') >= 1 && weekly(sixty, 'biceps') >= 1, `${p.id}: sin brazos a 60 min`)
  }
})

test('sin material: cada día llega a los ejercicios prometidos; con barra, el principiante tiene negativas', () => {
  for (const level of levels.map((l) => l.id)) {
    for (const days of [3, 4]) {
      const c: GeneratorConfig = { goal: 'hypertrophy', level, days, minutes: 60, equipment: 'bodyweight' }
      // O llega a los ejercicios, o el tiempo ya está lleno de series (los avanzados hacen más series de cada uno).
      for (const day of generate(c, catalog).days) {
        const sets = day.exercises.reduce((t, x) => t + x.sets, 0)
        assert.ok(day.exercises.length >= exerciseCount(60) || dayMinutes(day.exercises) >= 50, `${level}/${days}d: ${day.name} con ${day.exercises.length} y ${sets} series`)
      }
    }
  }
  const beginner = generate({ goal: 'hypertrophy', level: 'beginner', days: 4, minutes: 60, equipment: 'bodyweight', pullupBar: true }, catalog)
  const ids = beginner.days.flatMap((d) => d.exercises.map((x) => x.exercise.id))
  assert.ok(ids.includes('Negative_Pull-Up'), ids.join(', '))
  assert.ok(ids.includes('Single_Leg_Calf_Raise'), 'gemelos sin material')
})

test('reglas de casa y de fuerza: sin paralelas fuera del gimnasio, sin supinas tras dominadas, un básico pesado por día', () => {
  for (const [c, variation] of configs()) {
    for (const day of generate(c, catalog, variation).days) {
      const ids = day.exercises.map((x) => x.exercise.id)
      const where = `${c.goal}/${c.level}/${c.equipment}: ${ids.join(', ')}`
      if (c.equipment !== 'gym') assert.ok(!ids.some((id) => /^Dips_-_/.test(id)), where)
      if (ids.some((id) => /^(Pullups|Wide-Grip_Pull_Up)$/.test(id))) assert.ok(!ids.includes('Chin-Up'), where)
      for (const x of day.exercises) if (/^(Pullups|Chin-Up)$/.test(x.exercise.id)) assert.ok(x.repsMax <= 10, `${where} a ${x.repsMin}-${x.repsMax}`)
      if (c.goal === 'strength') assert.ok(day.exercises.filter((x) => x.repsMax <= 5).length <= 1, where)
    }
  }
  // Fuerza 4 días: banca y press militar, cada uno dos veces por semana.
  const weekly = generate({ goal: 'strength', level: 'advanced', days: 4, minutes: 60, equipment: 'gym' }, catalog).days.flatMap((d) => d.exercises.map((x) => x.exercise.id))
  for (const id of ['Barbell_Bench_Press_-_Medium_Grip', 'Barbell_Shoulder_Press']) assert.equal(weekly.filter((x) => x === id).length, 2, id)
  // Y la sentadilla dos veces: pesada en la Pierna A y frontal tras el peso muerto en la B (no prensa y hack seguidas).
  assert.ok(weekly.includes('Barbell_Full_Squat') && weekly.includes('Front_Barbell_Squat'), weekly.join(', '))
  assert.ok(!(weekly.includes('Leg_Press') && weekly.includes('Hack_Squat')), weekly.join(', '))
})

test('a 45 min, el torso pierde la segunda espalda antes que los brazos', () => {
  const days = generate({ goal: 'hypertrophy', level: 'intermediate', days: 4, minutes: 45, equipment: 'gym' }, catalog).days.filter((d) => /Torso/.test(d.name))
  for (const d of days) assert.ok(d.exercises.some((x) => ['biceps', 'triceps'].includes(x.exercise.muscle)), `${d.name}: ${d.exercises.map((x) => x.exercise.id).join(', ')}`)
})

test('propiedades en todos los perfiles: sin repetidos, una bisagra por día, torso con brazos y el tiempo elegido', () => {
  const HINGE = /deadlift|good_morning|swing/i
  for (const goal of ['hypertrophy', 'strength', 'fatLoss', 'general'] as const) {
    for (const { id: level } of levels) {
      for (const { id: equipment } of equipmentProfiles) {
        for (const days of [3, 4, 5]) {
          for (const minutes of [45, 60, 90]) {
            for (const day of generate({ goal, level, days, minutes, equipment }, catalog).days) {
              const ids = day.exercises.map((x) => x.exercise.id)
              const where = `${goal}/${level}/${equipment}/${days}d/${minutes}: ${day.name} (${ids.join(', ')})`
              assert.equal(new Set(ids).size, ids.length, `repetido en ${where}`)
              assert.ok(ids.filter((id) => HINGE.test(id)).length <= 1, `dos bisagras en ${where}`)
              assert.ok(dayMinutes(day.exercises) <= minutes + 3, `${Math.round(dayMinutes(day.exercises))} min en ${where}`)
              // El torso lleva algo de brazos (salvo «Perder grasa» con poco tiempo, que guarda el acondicionamiento).
              if (/Torso/.test(day.name) && !(goal === 'fatLoss' && minutes < 60)) {
                assert.ok(day.exercises.some((x) => ['biceps', 'triceps'].includes(x.exercise.muscle)), `torso sin brazos en ${where}`)
              }
            }
          }
        }
      }
    }
  }
})

test('el tiempo elegido se llena: con 90 minutos, más series que con 60 (con techo para el principiante)', () => {
  for (const level of levels.map((l) => l.id)) {
    const sets = (minutes: number) => generate({ goal: 'fatLoss', level, days: 3, minutes, equipment: 'gym' }, catalog).days[0].exercises.reduce((t, x) => t + x.sets, 0)
    assert.ok(sets(90) > sets(60), `${level}: ${sets(90)} series a 90 min y ${sets(60)} a 60`)
    const day = generate({ goal: 'fatLoss', level, days: 3, minutes: 90, equipment: 'gym' }, catalog).days[0]
    // El principiante, con techo de 18 series de fuerza: el resto del tiempo no se rellena de series.
    const strength = day.exercises.filter((x) => !['cardio', 'plyometrics'].includes(x.exercise.category) && !/climber|swing|jump/i.test(x.exercise.id)).reduce((t, x) => t + x.sets, 0)
    if (level === 'beginner') assert.ok(strength <= 18, `principiante: ${strength} series de fuerza`)
    else assert.ok(dayMinutes(day.exercises) >= 75, `${level}: ${Math.round(dayMinutes(day.exercises))} min de 90`)
  }
})

test('duración: el generador cuenta los minutos igual que la app', () => {
  for (const goal of ['hypertrophy', 'strength', 'fatLoss'] as const) {
    for (const day of generate({ goal, level: 'intermediate', days: 4, minutes: 60, equipment: 'gym' }, catalog).days) {
      const routine = { exercises: day.exercises.map((g) => ({ ...g, exerciseId: g.exercise.id, tracking: defaultTracking(g.exercise), targetSeconds: 60 })) } as unknown as Routine
      assert.equal(Math.round(dayMinutes(day.exercises)), routineMinutes(routine), `${goal}: ${day.name}`)
    }
  }
})

// Lo que el programa da por semana a cada grupo, contado como el entrenador y Progreso › Músculos.
const weekly = (c: GeneratorConfig) => {
  const days = generate(c, catalog).days
  const routines = days.map((d, i) => ({ id: `r${i}`, name: d.name, exercises: d.exercises.map((x) => ({ exerciseId: x.exercise.id, name: x.exercise.name, muscle: x.exercise.muscle, sets: x.sets, repsMin: x.repsMin, repsMax: x.repsMax, rest: x.rest })) })) as unknown as Routine[]
  return plannedGroupSets(routines, days.length, catalog)
}

test('volumen semanal: el programa cumple el rango que luego marca la app', () => {
  // El caso del panel: ganar músculo, intermedio, 4 días de 60 min salía «por debajo» en pecho y bíceps.
  const v = weekly({ goal: 'hypertrophy', level: 'intermediate', days: 4, minutes: 60, equipment: 'gym' })
  v.forEach((sets, g) => {
    const [min, max] = groupRange('hypertrophy', 'intermediate', g)
    assert.ok(sets >= min && sets <= max, `${MAIN_GROUPS[g][0][0]}: ${sets} fuera de ${min}-${max}`)
  })
  // En el gimnasio, con 3 días o más y 60 minutos o más: nada muy por debajo ni muy por encima (antes, 41 series
  // de hombro a 6 días y 7,5 de glúteo a 3).
  for (const goal of ['hypertrophy', 'strength', 'fatLoss', 'general'] as const) for (const { id: level } of levels) for (const days of [3, 4, 5, 6]) for (const minutes of [60, 90]) {
    weekly({ goal, level, days, minutes, equipment: 'gym' }).forEach((sets, g) => {
      const [min, max] = groupRange(goal, level, g)
      assert.ok(sets >= min - 2 && sets <= max + 5, `${goal}/${level}/${days}d/${minutes}: ${MAIN_GROUPS[g][0][0]} ${sets} (rango ${min}-${max})`)
    })
  }
  // «Estar en forma»: algo de abdomen cada semana. Y con 45 minutos o más, también en hipertrofia (salía 0).
  assert.ok(weekly({ goal: 'general', level: 'intermediate', days: 3, minutes: 60, equipment: 'gym' })[ABS_GROUP] >= 4)
  assert.ok(weekly({ goal: 'hypertrophy', level: 'intermediate', days: 4, minutes: 60, equipment: 'gym' })[ABS_GROUP] >= 4)
})

test('volumen semanal: con 45 minutos o más, ningún grupo pasa de su máximo + 2, con cualquier material', () => {
  // Antes, un principiante de 6 días con peso corporal llegaba a 23 series de glúteo (máximo 16).
  for (const goal of ['hypertrophy', 'strength', 'fatLoss', 'general'] as const) for (const { id: level } of levels) for (const { id: equipment } of equipmentProfiles) for (const days of [3, 6]) for (const minutes of [45, 75]) {
    weekly({ goal, level, days, minutes, equipment }).forEach((sets, g) => {
      const [, max] = groupRange(goal, level, g)
      assert.ok(sets <= max + 2, `${goal}/${level}/${equipment}/${days}d/${minutes}: ${MAIN_GROUPS[g][0][0]} ${sets} (máx ${max})`)
    })
  }
})

test('empuje y tirón: con 45 minutos o más, el empuje no pasa de 1,5 veces el tirón', () => {
  // Antes, 307 de 1500 programas (gimnasio fuerza principiante 3 días: 15 series de press y 9 de remo).
  for (const goal of ['hypertrophy', 'strength', 'fatLoss', 'general'] as const) for (const { id: level } of levels) for (const { id: equipment } of equipmentProfiles) for (const days of [3, 4, 6]) {
    let push = 0, pull = 0
    for (const d of generate({ goal, level, days, minutes: 60, equipment }, catalog).days) for (const x of d.exercises) {
      if (!countsForVolume(x.exercise.id, x.exercise.category)) continue
      const [a, b] = pushPullShares(x.exercise.muscle, x.exercise.secondaryMuscles)
      push += a * x.sets; pull += b * x.sets
    }
    assert.ok(push <= 1.5 * pull, `${goal}/${level}/${equipment}/${days}d: empuje ${push}, tirón ${pull}`)
  }
})

test('principiante de 6 días: ninguna bisagra (peso muerto, rumano, buenos días) en días seguidos', () => {
  const hinge = /deadlift|good_morning|stiff/i
  for (const goal of ['hypertrophy', 'strength', 'general'] as const) for (const { id: equipment } of equipmentProfiles) {
    const days = generate({ goal, level: 'beginner', days: 6, minutes: 60, equipment }, catalog).days.map((d) => d.exercises.some((x) => hinge.test(x.exercise.id)))
    days.forEach((h, i) => assert.ok(!(h && days[(i + 1) % days.length]), `${goal}/${equipment}: bisagra en los días ${i + 1} y ${((i + 1) % days.length) + 1}`))
  }
})

test('abdomen: en el gimnasio con 3 días o más, algo desde 45 minutos («Perder grasa», «Estar en forma») o 60 (el resto)', () => {
  // «Perder grasa» de 3 días y 45 min salía sin abdomen: los saltos se comían el tiempo. En fuerza e hipertrofia a 45
  // min los básicos llenan el día (su rango de abdomen empieza en 0).
  for (const goal of ['hypertrophy', 'strength', 'fatLoss', 'general'] as const) for (const { id: level } of levels) for (const days of [3, 4, 5, 6]) for (const minutes of goal === 'fatLoss' || goal === 'general' ? [45, 60, 90] : [60, 90]) {
    assert.ok(weekly({ goal, level, days, minutes, equipment: 'gym' })[ABS_GROUP] > 0, `${goal}/${level}/${days}d/${minutes}`)
  }
})

test('brazos del mismo día: bíceps y tríceps a una serie de diferencia como mucho', () => {
  // Torso B salía con curl martillo 4× y press francés 2×.
  for (const goal of ['hypertrophy', 'general'] as const) for (const { id: level } of levels) for (const days of [4, 5, 6]) {
    for (const d of generate({ goal, level, days, minutes: 60, equipment: 'gym' }, catalog).days) {
      const sets = (m: string) => d.exercises.filter((x) => x.exercise.muscle === m).reduce((n, x) => n + x.sets, 0)
      const [b, tr] = [sets('biceps'), sets('triceps')]
      if (b && tr && d.exercises.filter((x) => ['biceps', 'triceps'].includes(x.exercise.muscle)).length === 2) assert.ok(Math.abs(b - tr) <= 1, `${goal}/${level}/${days}d ${d.name}: bíceps ${b}, tríceps ${tr}`)
    }
  }
})

test('días equilibrados: al quitar lo que sobra, se quita del día más largo', () => {
  // Con kettlebell, fuerza avanzado, 4 días de 75 min: la Pierna A se quedaba en 35 min y el Torso B en 76.
  const minutes = generate({ goal: 'strength', level: 'advanced', days: 4, minutes: 75, equipment: 'kettlebell' }, catalog).days.map((d) => dayMinutes(d.exercises))
  assert.ok(Math.min(...minutes) >= 0.7 * Math.max(...minutes), minutes.map(Math.round).join(' '))
})

test('tope de series por sesión según el nivel: también lo elegido, no solo el relleno', () => {
  const max = { beginner: 18, intermediate: 24, advanced: 28 }
  for (const goal of ['hypertrophy', 'strength', 'fatLoss', 'general'] as const) for (const { id: level } of levels) for (const { id: equipment } of equipmentProfiles) for (const days of [2, 3, 4, 5, 6]) for (const minutes of [60, 90]) {
    for (const day of generate({ goal, level, days, minutes, equipment }, catalog).days) {
      // Sin el bloque de acondicionamiento (escaladores, comba, swing): el tope es de fuerza.
      const sets = day.exercises.filter((x) => !['cardio', 'plyometrics'].includes(x.exercise.category) && !/climber|swing|jump|rope|battling/i.test(x.exercise.id)).reduce((t, x) => t + x.sets, 0)
      assert.ok(sets <= max[level], `${goal}/${level}/${equipment}/${days}d/${minutes}: ${sets} series en ${day.name}`)
    }
  }
})
