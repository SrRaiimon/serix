import { alternatives } from './alternatives'
import { blockWeek } from './block'
import type { Catalog, Exercise } from './catalog'
import { startOfWeek } from './format'
import { equipmentInfo, STAPLES } from './generator'
import { MAIN_GROUPS } from './labels'
import { readinessScore } from './readiness'
import { stalls, streakWeeks } from './stats'
import { defaultTracking } from './tracking'
import type { AppData, Routine, Session, Settings } from './store'
import { weekDone } from './schedule'
import { countsForVolume, groupShares, weeklyRange } from './volume'

// El entrenador de la semana: junta lo que ya calcula la app (estancamientos, volumen por grupo,
// cómo llegas a entrenar) y lo convierte en pocos consejos con un botón que lo aplica a tus rutinas.
// Nada se cambia solo: cada consejo se aplica al tocarlo y se puede quitar «hasta la semana que viene».

export type CoachTip =
  /** Varios ejercicios atascados o llegas cansado: una semana más suave (menos series y −10 % de peso). */
  | { id: string; kind: 'easyWeek'; stalled: number; tired: boolean }
  /** Un ejercicio de tu programa no mejora: cambiarlo por uno parecido. */
  | { id: string; kind: 'swap'; exerciseId: string; name: string; alt: Exercise; routines: string[] }
  /** Pocas series semanales de un grupo: una serie más en el ejercicio que ya lo trabaja. */
  | { id: string; kind: 'moreSets'; group: number; planned: number; min: number; routineId: string; index: number; exerciseName: string }
  /** Un grupo que tu programa no trabaja: añadir un ejercicio básico. */
  | { id: string; kind: 'addExercise'; group: number; exercise: Exercise; routineId: string; routineName: string; planned: number }
  /** Muchas series de un grupo: quitar una. */
  | { id: string; kind: 'fewerSets'; group: number; planned: number; max: number; routineId: string; index: number; exerciseName: string }

export const COACH_MIN_SESSIONS = 4
const DAY = 86400000

/** Las rutinas del programa activo (si no hay o está vacío, todas). */
export function programRoutines(d: Pick<AppData, 'routines' | 'settings'>): Routine[] {
  const own = d.routines.filter((r) => r.programName && r.programName === d.settings.activeProgram)
  return own.length ? own : d.routines
}

/**
 * Series semanales previstas por grupo (orden de MAIN_GROUPS) con tu programa: cada rutina se hace
 * `weeklyGoal / rutinas` veces por semana; cuenta como Progreso (groupShares).
 */

export function plannedGroupSets(routines: Routine[], weeklyGoal: number, catalog: Catalog): number[] {
  if (!routines.length) return MAIN_GROUPS.map(() => 0)
  const times = weeklyGoal / routines.length
  const load = MAIN_GROUPS.map(() => 0)
  for (const r of routines) {
    for (const e of r.exercises) {
      // El cardio y los saltos (escaladores, burpees, sentadilla con salto) son para el gasto, no series de
      // fuerza: contados, «Perder grasa» recién generado salía con «quita una serie de escaladores».
      const c = catalog.get(e.exerciseId)
      if (!countsForVolume(e.exerciseId, c?.category)) continue
      groupShares(e.muscle, c?.secondaryMuscles ?? []).forEach((share, g) => { load[g] += share * e.sets * times })
    }
  }
  return load.map((v) => Math.round(v * 2) / 2)
}

/** El ejercicio del programa que más series le da a un grupo (donde añadir o quitar una). */
function mainExerciseOf(routines: Routine[], group: number): { routine: Routine; index: number } | undefined {
  const muscles = MAIN_GROUPS[group][1]
  let best: { routine: Routine; index: number; sets: number } | undefined
  for (const routine of routines) {
    routine.exercises.forEach((e, index) => {
      if (muscles.includes(e.muscle) && (!best || e.sets > best.sets)) best = { routine, index, sets: e.sets }
    })
  }
  return best
}

export interface CoachInput {
  routines: Routine[]
  sessions: Session[]
  settings: Settings
  catalog: Catalog
  now?: number
}

/** Los consejos de esta semana, del más importante al menos (como mucho `max`). */
export function coachTips({ routines: all, sessions, settings, catalog, now = Date.now() }: CoachInput, max = 3): CoachTip[] {
  if (sessions.length < COACH_MIN_SESSIONS) return []
  const routines = programRoutines({ routines: all, settings })
  const tips: CoachTip[] = []
  const week = startOfWeek(now).getTime()
  const hidden = settings.coachHidden?.week === week ? new Set(settings.coachHidden.ids) : new Set<string>()
  const inProgram = new Set(routines.flatMap((r) => r.exercises.map((e) => e.exerciseId)))

  // Atascos en ejercicios de tu programa (el último mes).
  const stuck = stalls(sessions, now - 30 * DAY).filter((s) => inProgram.has(s.exerciseId))
  const recent = [...sessions].filter((s) => s.readiness).sort((a, b) => b.start - a.start).slice(0, 3)
  const tired = recent.length === 3 && recent.reduce((n, s) => n + readinessScore(s.readiness!), 0) / 3 < 2.5
  const easing = settings.easyWeek === week || blockWeek(settings.block, now)?.deload
  // Con la semana ya cumplida, «hacerla esta semana» no tiene sentido: se propone la que viene, el lunes.
  if (!easing && !weekDone({ sessions, settings }, now) && streakWeeks(sessions, now) >= 4 && (stuck.length >= 3 || tired)) {
    tips.push({ id: 'easy', kind: 'easyWeek', stalled: stuck.length, tired })
  }

  // Un consejo principal: si toca descargar, los cambios de ejercicio esperan (descargar y cambiar a la vez no se
  // sabía cuál hacer). Si se oculta la descarga, vuelven. Con la descarga ya en marcha, también esperan a la semana
  // siguiente: lo que la descarga desatasca no se cambia antes de probarlo.
  const deloadFirst = !!easing || tips.some((x) => x.kind === 'easyWeek' && !hidden.has(x.id))
  for (const s of deloadFirst ? [] : stuck.slice(0, 2)) {
    const owners = routines.filter((r) => r.exercises.some((e) => e.exerciseId === s.exerciseId))
    const muscle = owners[0]?.exercises.find((e) => e.exerciseId === s.exerciseId)?.muscle ?? catalog.get(s.exerciseId)?.muscle ?? ''
    const exclude = new Set(owners.flatMap((r) => r.exercises.map((e) => e.exerciseId)))
    const alt = alternatives(catalog, { exerciseId: s.exerciseId, muscle }, settings.equipment, exclude)[0]
    if (alt) tips.push({ id: `swap:${s.exerciseId}`, kind: 'swap', exerciseId: s.exerciseId, name: catalog.get(s.exerciseId)?.name ?? s.name, alt, routines: owners.map((r) => r.id) })
  }

  // Volumen: solo con el programa ya en marcha (dos semanas entrenándolo). Recién creado no se corrige: el
  // generador y la biblioteca lo montan a propósito (un Empuje/Tirón/Pierna de 3 días da 8 series por grupo)
  // y la app no debe contradecirse antes del primer entreno; con la práctica, el entrenador lo ajusta.
  const ids = new Set(routines.map((r) => r.id))
  const firstUse = Math.min(...sessions.filter((s) => s.routineId && ids.has(s.routineId)).map((s) => s.start))
  if (routines.length && now - firstUse >= 14 * DAY) {
    const [min, maxSets] = weeklyRange(settings.goal, settings.level)
    const planned = plannedGroupSets(routines, settings.weeklyGoal, catalog)
    const allowed = new Set(equipmentInfo(settings.equipment).allowed)
    // Del que más falta al que menos; el abdomen no (lo trabajan de rebote casi todos los básicos).
    const order = planned.map((sets, group) => ({ sets, group })).filter((x) => MAIN_GROUPS[x.group][0][0] !== 'Abdomen')
    for (const { sets, group } of [...order].sort((a, b) => a.sets - min - (b.sets - min))) {
      if (sets >= min - 1) break
      const main = mainExerciseOf(routines, group)
      if (main) {
        const e = main.routine.exercises[main.index]
        tips.push({ id: `low:${group}`, kind: 'moreSets', group, planned: sets, min, routineId: main.routine.id, index: main.index, exerciseName: e.name })
      } else {
        // Sin ningún ejercicio propio: aunque le llegue algo de rebote (tríceps en los press), si no llega al
        // mínimo se propone uno. Antes solo con 0 series, y un programa sin tríceps directo no decía nada.
        const muscles = MAIN_GROUPS[group][1]
        const pick = catalog.exercises
          .filter((e) => muscles.includes(e.muscle) && e.category === 'strength' && allowed.has(e.equipment))
          .sort((a, b) => Number(STAPLES.has(b.id)) - Number(STAPLES.has(a.id)) || a.nameEn.length - b.nameEn.length)[0]
        const target = [...routines].sort((a, b) => a.exercises.length - b.exercises.length)[0]
        if (pick && target) tips.push({ id: `add:${group}`, kind: 'addExercise', group, exercise: pick, routineId: target.id, routineName: target.name, planned: sets })
      }
    }
    for (const { sets, group } of [...order].sort((a, b) => b.sets - a.sets)) {
      if (sets <= maxSets + 4) break
      const main = mainExerciseOf(routines, group)
      if (main && main.routine.exercises[main.index].sets > 2) {
        tips.push({ id: `high:${group}`, kind: 'fewerSets', group, planned: sets, max: maxSets, routineId: main.routine.id, index: main.index, exerciseName: main.routine.exercises[main.index].name })
      }
    }
  }

  return tips.filter((x) => !hidden.has(x.id)).slice(0, max)
}

/** Aplica un consejo a los datos (dentro de `update`). */
export function applyTip(d: AppData, tip: CoachTip, now = Date.now()) {
  if (tip.kind === 'easyWeek') d.settings.easyWeek = startOfWeek(now).getTime()
  if (tip.kind === 'swap') {
    const tracking = defaultTracking(tip.alt)
    for (const r of d.routines) {
      if (!tip.routines.includes(r.id)) continue
      r.exercises = r.exercises.map((e) => e.exerciseId !== tip.exerciseId ? e : {
        exerciseId: tip.alt.id, name: tip.alt.name, muscle: tip.alt.muscle, sets: e.sets, repsMin: e.repsMin, repsMax: e.repsMax, rest: e.rest, tracking,
        ...(e.groupId ? { groupId: e.groupId } : {}),
        ...(tracking === 'weight_reps' && e.progression && e.progression !== 'wave531' && e.progression !== 'percent' ? { progression: e.progression } : {}),
        ...(tracking === 'time' ? { targetSeconds: e.targetSeconds ?? 45 } : {}),
      })
    }
  }
  if (tip.kind === 'moreSets' || tip.kind === 'fewerSets') {
    const e = d.routines.find((r) => r.id === tip.routineId)?.exercises[tip.index]
    if (e) e.sets = Math.max(1, Math.min(10, e.sets + (tip.kind === 'moreSets' ? 1 : -1)))
  }
  if (tip.kind === 'addExercise') {
    const r = d.routines.find((x) => x.id === tip.routineId)
    const tracking = defaultTracking(tip.exercise)
    r?.exercises.push({
      exerciseId: tip.exercise.id, name: tip.exercise.name, muscle: tip.exercise.muscle, sets: 3, repsMin: 8, repsMax: 12, rest: d.settings.defaultRest, tracking,
      ...(tracking === 'time' ? { targetSeconds: 45 } : {}),
    })
  }
}

/** «Ahora no»: se oculta hasta el lunes. */
export function hideTip(d: AppData, id: string, now = Date.now()) {
  const week = startOfWeek(now).getTime()
  const ids = d.settings.coachHidden?.week === week ? d.settings.coachHidden.ids : []
  d.settings.coachHidden = { week, ids: [...ids, id].slice(-30) }
}

export { forgottenGroups } from './forgotten'
