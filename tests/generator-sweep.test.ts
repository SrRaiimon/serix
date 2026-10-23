import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { Catalog, type RawExercise } from '../src/lib/catalog'
import { dayMinutes, equipmentProfiles, generate, levels, type GeneratedProgram, type GeneratorConfig } from '../src/lib/generator'
import { MAIN_GROUPS } from '../src/lib/labels'
import { ABS_GROUP, countsForVolume, groupRange, groupShares, pushPullShares } from '../src/lib/volume'

// Todas las combinaciones del cuestionario (1500): los tests de reglas con unas pocas dejaban pasar casos (un grupo a
// máx + 6 con kettlebell, empuje 16,5/9 con bandas a 2 días). Cada regla, con su tolerancia y sus excepciones dichas.
const catalog = new Catalog((JSON.parse(readFileSync('public/exercises_es.json', 'utf8')) as { exercises: RawExercise[] }).exercises)
const goals = ['hypertrophy', 'strength', 'fatLoss', 'general'] as const
const all: { c: GeneratorConfig; p: GeneratedProgram; tag: string }[] = []
for (const goal of goals) for (const { id: level } of levels) for (const { id: equipment } of equipmentProfiles) for (const days of [2, 3, 4, 5, 6]) for (const minutes of [30, 45, 60, 75, 90]) {
  const c: GeneratorConfig = { goal, level, days, minutes, equipment, pullupBar: true }
  all.push({ c, p: generate(c, catalog), tag: `${goal}/${level}/${equipment}/${days}d/${minutes}` })
}

const weekly = (p: GeneratedProgram) => {
  const v = new Array<number>(MAIN_GROUPS.length + 2).fill(0)
  for (const d of p.days) for (const x of d.exercises) {
    if (!countsForVolume(x.exercise.id, x.exercise.category)) continue
    ;[...groupShares(x.exercise.muscle, x.exercise.secondaryMuscles), ...pushPullShares(x.exercise.muscle, x.exercise.secondaryMuscles)].forEach((s, g) => { v[g] += s * x.sets })
  }
  return v
}
const fails = (list: string[], max = 0) => assert.ok(list.length <= max, `${list.length} casos:\n${list.slice(0, Number(process.env.SWEEP_LIST ?? 8)).join('\n')}`)

test('barrido: con 45 minutos o más, ningún grupo pasa de su máximo + 2', () => {
  fails(all.filter(({ c }) => c.minutes >= 45).flatMap(({ c, p, tag }) => weekly(p).slice(0, MAIN_GROUPS.length).flatMap((v, g) => {
    const [, max] = groupRange(c.goal, c.level, g)
    return v > max + 2 ? [`${tag}: ${MAIN_GROUPS[g][0][0]} ${v}/${max}`] : []
  })))
})

test('barrido: siempre algún tirón, y con 3 días o más y 45 minutos o más el empuje no pasa de 1,5 veces el tirón', () => {
  // Con 2 días todos los grupos van justos: bajar un press deja el pecho por debajo de su mínimo.
  const n = MAIN_GROUPS.length
  fails(all.flatMap(({ c, p, tag }) => {
    const v = weekly(p)
    return v[n + 1] === 0 || (c.minutes >= 45 && c.days >= 3 && v[n] > 1.5 * v[n + 1]) ? [`${tag}: empuje ${v[n]}, tirón ${v[n + 1]}`] : []
  }))
})

test('barrido: «Perder grasa» y «Estar en forma» con 45 minutos o más tienen abdomen', () => {
  // Excepción conocida: con bandas, 3 días de 45 minutos son solo básicos en su mínimo de series y el acondicionamiento
  // que promete «Perder grasa»; hacer sitio al abdomen deja la espalda y el bíceps más bajos de lo que gana.
  const known = new Set(['fatLoss/intermediate/bands/3d/45', 'fatLoss/advanced/bands/3d/45'])
  fails(all.filter(({ c, tag }) => c.minutes >= 45 && (c.goal === 'fatLoss' || c.goal === 'general') && !known.has(tag)).flatMap(({ p, tag }) => (weekly(p)[ABS_GROUP] > 0 ? [] : [tag])))
})

test('barrido: como mucho un ejercicio de abdomen por día', () => {
  fails(all.flatMap(({ p, tag }) => p.days.filter((d) => d.exercises.filter((x) => x.exercise.muscle === 'abs').length > 1).map((d) => `${tag} ${d.name}`)))
})

test('barrido: ningún día de un solo ejercicio (ni de dos con 45 minutos o más) ni por debajo del 40 % del más largo', () => {
  // Con 30 minutos, dos básicos de 4 series ya llenan la sesión. Y con 6 días sin gimnasio, el máximo semanal de
  // pierna deja la Pierna A en unos 30 de 60 minutos: corta, pero sin pasarse de volumen.
  fails(all.flatMap(({ c, p, tag }) => {
    const m = p.days.map((d) => dayMinutes(d.exercises))
    return p.days.filter((d, i) => d.exercises.length < (c.minutes >= 45 ? 3 : 2) || m[i] < 0.4 * Math.max(...m)).map((d) => `${tag} ${d.name}: ${d.exercises.length} ejercicios, ${Math.round(dayMinutes(d.exercises))} min`)
  }))
})

test('barrido: los días de cuerpo completo llevan tirón', () => {
  fails(all.flatMap(({ p, tag }) => p.days.filter((d) => /Cuerpo completo|Full body/.test(d.name) && !d.exercises.some((x) => ['lats', 'upper-back'].includes(x.exercise.muscle))).map((d) => `${tag} ${d.name}`)))
})

test('barrido: en el gimnasio, el mismo ejercicio de aislamiento no se repite en días seguidos', () => {
  // En casa no siempre hay otro (zancada con mancuernas, swing con kettlebell): ahí se prefiere otro si existe.
  fails(all.filter(({ c }) => c.equipment === 'gym').flatMap(({ p, tag }) => p.days.slice(1).flatMap((d, i) => {
    const prev = new Set(p.days[i].exercises.map((x) => x.exercise.id))
    return d.exercises.filter((x) => prev.has(x.exercise.id) && x.exercise.category !== 'cardio' && x.exercise.category !== 'plyometrics' && countsForVolume(x.exercise.id, x.exercise.category) && !/squat|deadlift|press|row|pull/i.test(x.exercise.id)).map((x) => `${tag} ${d.name}: ${x.exercise.id}`)
  })))
})

test('barrido: hipertrofia con 3 días o más y 45 minutos o más lleva bíceps y tríceps directos, con cualquier material', () => {
  // Con bandas, intermedio, 3 días de 45 minutos salía sin un solo curl ni extensión, aunque ya hay curl con banda.
  // Excepción conocida: con bandas, 3 días de 45 minutos en intermedio y avanzado llevan curl, pero el tríceps solo de
  // rebote (unas 7,5 series): con las bandas a 12-20 y 90 s no cabe otro ejercicio sin descompensar empuje y tirón.
  const known = new Set(['hypertrophy/intermediate/bands/3d/45: sin tríceps', 'hypertrophy/advanced/bands/3d/45: sin tríceps'])
  fails(all.filter(({ c }) => c.goal === 'hypertrophy' && c.days >= 3 && c.minutes >= 45).flatMap(({ p, tag }) => {
    const has = (m: string) => p.days.some((d) => d.exercises.some((x) => x.exercise.muscle === m))
    return [...(has('biceps') ? [] : [`${tag}: sin bíceps`]), ...(has('triceps') ? [] : [`${tag}: sin tríceps`])].filter((x) => !known.has(x))
  }))
})

test('barrido: con banda, a 12-20 también los aislamientos; con el material «Bandas», todo el día salvo las excepciones dichas', () => {
  // Excepciones: dominadas (a 6-10), negativas y nórdico (a 3-6) y las flexiones y remos fáciles de principiante.
  const exempt = /pull-?up|chin-?up|negative|glute.?ham|^(Pushups|Push-Up_Wide|Decline_Push-Up|Push-Ups_-_Close_Triceps_Position|Inverted_Row)$/i
  fails(all.flatMap(({ c, p, tag }) => p.days.flatMap((d) => d.exercises.flatMap((x) => {
    const band = x.exercise.equipment === 'band'
    if (!band && c.equipment !== 'bands') return []
    if (x.exercise.category !== 'strength' || x.repsMin >= 12 || (!band && exempt.test(x.exercise.id))) return []
    return [`${tag}: ${x.exercise.id} ${x.repsMin}-${x.repsMax}`]
  }))))
})
