import { startOfWeek, toKg, type Unit } from './format'
import { e1rm, loadSets, streakWeeks } from './stats'
import { dayKey, dayStatus, dayTotals, shiftDay, type FoodEntry, type NutritionGoals } from './nutrition'
import type { Measurement, Session } from './store'

// Logros calculados a partir del historial (no se guardan: siempre salen de los datos). Cada logro
// sabe en qué entrenamiento se consiguió, para avisar en el resumen al terminar.

export type AchievementGroup = 'consistency' | 'volume' | 'records' | 'strength' | 'variety' | 'time' | 'food'

export interface AchievementDef {
  id: string
  group: AchievementGroup
  title: [es: string, en: string]
  detail: [es: string, en: string]
}

export interface AchievementState extends AchievementDef {
  /** Fecha y entrenamiento en que se consiguió; sin valor = pendiente. */
  unlockedAt?: number
  sessionId?: string
  /** Progreso hacia el objetivo (pendientes medibles). */
  progress?: [current: number, target: number]
}

const BENCH = new Set(['Barbell_Bench_Press_-_Medium_Grip', 'Wide-Grip_Barbell_Bench_Press', 'Close-Grip_Barbell_Bench_Press', 'Bench_Press_-_Powerlifting'])
const SQUAT = new Set(['Barbell_Squat', 'Barbell_Full_Squat', 'Front_Barbell_Squat', 'Olympic_Squat'])
const DEADLIFT = new Set(['Barbell_Deadlift', 'Sumo_Deadlift', 'Trap_Bar_Deadlift'])
const BIG3 = new Set([...BENCH, ...SQUAT, ...DEADLIFT])

/** Peso corporal registrado más reciente en esa fecha (kg). */
function bodyWeightAt(measurements: Measurement[], at: number): number | undefined {
  let best: Measurement | undefined
  for (const m of measurements) if (m.weight !== undefined && m.date <= at && (!best || m.date > best.date)) best = m
  return best?.weight
}

export function achievementDefs(unit: Unit): AchievementDef[] {
  // Los umbrales de peso se dicen en la unidad de cada uno (100 kg o 225 lb, etc.).
  const club = unit === 'kg' ? [100, 140] : [225, 315]
  return [
    ...[1, 10, 25, 50, 100, 250].map((n): AchievementDef => ({
      id: `sessions-${n}`, group: 'consistency',
      title: n === 1 ? ['Primer entrenamiento', 'First workout'] : [`${n} entrenamientos`, `${n} workouts`],
      detail: n === 1 ? ['Terminaste tu primer entrenamiento.', 'You finished your first workout.'] : [`Has completado ${n} entrenamientos.`, `You have completed ${n} workouts.`],
    })),
    ...[4, 12, 26, 52].map((n): AchievementDef => ({
      id: `streak-${n}`, group: 'consistency',
      title: [`Racha de ${n} semanas`, `${n}-week streak`],
      detail: [`Entrenaste al menos una vez a la semana durante ${n} semanas seguidas.`, `You trained at least once a week for ${n} weeks in a row.`],
    })),
    ...[10, 100, 1000].map((n): AchievementDef => ({
      id: `volume-${n}`, group: 'volume',
      title: [`${n.toLocaleString('es-ES')} toneladas`, `${n.toLocaleString('en-GB')} tonnes`],
      detail: [`Has levantado ${n.toLocaleString('es-ES')} toneladas en total (peso × repeticiones).`, `You have lifted ${n.toLocaleString('en-GB')} tonnes in total (weight × reps).`],
    })),
    ...[10, 50].map((n): AchievementDef => ({
      id: `records-${n}`, group: 'records',
      title: [`${n} récords`, `${n} records`],
      detail: [`Has batido ${n} récords personales.`, `You have broken ${n} personal records.`],
    })),
    {
      id: 'club-1', group: 'strength',
      title: [`Club de los ${club[0]} ${unit}`, `${club[0]} ${unit} club`],
      detail: [`Una serie de ${club[0]} ${unit} o más en press de banca, sentadilla o peso muerto.`, `A set of ${club[0]} ${unit} or more on bench press, squat or deadlift.`],
    },
    {
      id: 'club-2', group: 'strength',
      title: [`Club de los ${club[1]} ${unit}`, `${club[1]} ${unit} club`],
      detail: [`Una serie de ${club[1]} ${unit} o más en sentadilla o peso muerto.`, `A set of ${club[1]} ${unit} or more on squat or deadlift.`],
    },
    {
      id: 'bench-bodyweight', group: 'strength',
      title: ['Tu peso en banca', 'Bodyweight bench'],
      detail: ['Una serie de press de banca con tu peso corporal (según tus medidas).', 'A bench press set with your body weight (from your measurements).'],
    },
    {
      id: 'deadlift-double', group: 'strength',
      title: ['Doble de tu peso', 'Double bodyweight'],
      detail: ['Una serie de peso muerto con el doble de tu peso corporal.', 'A deadlift set with twice your body weight.'],
    },
    {
      id: 'variety-25', group: 'variety',
      title: ['25 ejercicios distintos', '25 different exercises'],
      detail: ['Has probado 25 ejercicios diferentes.', 'You have tried 25 different exercises.'],
    },
    {
      id: 'early-bird', group: 'time',
      title: ['Madrugador', 'Early bird'],
      detail: ['Un entrenamiento que empezó antes de las 7 de la mañana.', 'A workout that started before 7 am.'],
    },
    {
      id: 'night-owl', group: 'time',
      title: ['Nocturno', 'Night owl'],
      detail: ['Un entrenamiento que empezó a las 10 de la noche o más tarde.', 'A workout that started at 10 pm or later.'],
    },
  ]
}

export function achievements(sessions: Session[], measurements: Measurement[], unit: Unit): AchievementState[] {
  const states = new Map<string, AchievementState>(achievementDefs(unit).map((d) => [d.id, { ...d }]))
  const unlock = (id: string, s: Session) => {
    const a = states.get(id)
    if (a && a.unlockedAt === undefined) {
      a.unlockedAt = s.end ?? s.start
      a.sessionId = s.id
    }
  }
  const club = (unit === 'kg' ? [100, 140] : [225, 315]).map((v) => toKg(v, unit) - 1e-6)
  const sorted = sessions.filter((s) => s.end !== undefined).sort((a, b) => a.start - b.start)
  const weeks = new Set<number>()
  const best = new Map<string, number>()
  const exercises = new Set<string>()
  let volume = 0
  let recordCount = 0
  let streak = 0
  let lastWeek: number | undefined

  sorted.forEach((s, i) => {
    const n = i + 1
    for (const target of [1, 10, 25, 50, 100, 250]) if (n === target) unlock(`sessions-${target}`, s)

    // Racha: semanas seguidas (de lunes a domingo) con algún entrenamiento.
    const week = startOfWeek(s.start).getTime()
    if (!weeks.has(week)) {
      weeks.add(week)
      const previous = new Date(week)
      previous.setDate(previous.getDate() - 7)
      streak = lastWeek === previous.getTime() ? streak + 1 : 1
      lastWeek = week
      for (const target of [4, 12, 26, 52]) if (streak >= target) unlock(`streak-${target}`, s)
    }

    const hour = new Date(s.start).getHours()
    if (hour < 7) unlock('early-bird', s)
    if (hour >= 22) unlock('night-owl', s)

    const bodyWeight = bodyWeightAt(measurements, s.start)
    for (const e of s.exercises) {
      const sets = loadSets(e)
      if (!sets.length) continue
      exercises.add(e.exerciseId)
      for (const x of sets) {
        volume += x.weight * x.reps
        if (x.reps <= 0 || x.weight <= 0) continue
        if (BIG3.has(e.exerciseId) && x.weight >= club[0]) unlock('club-1', s)
        if ((SQUAT.has(e.exerciseId) || DEADLIFT.has(e.exerciseId)) && x.weight >= club[1]) unlock('club-2', s)
        if (bodyWeight && BENCH.has(e.exerciseId) && x.weight >= bodyWeight) unlock('bench-bodyweight', s)
        if (bodyWeight && DEADLIFT.has(e.exerciseId) && x.weight >= 2 * bodyWeight) unlock('deadlift-double', s)
      }
      // Récord: mejora del mejor 1RM estimado del ejercicio (la primera vez no cuenta).
      const top = Math.max(...sets.map((x) => e1rm(x.weight, x.reps)))
      const prev = best.get(e.exerciseId)
      if (prev !== undefined && top > prev + 0.01) recordCount++
      if (prev === undefined || top > prev) best.set(e.exerciseId, top)
    }
    for (const target of [10, 100, 1000]) if (volume >= target * 1000) unlock(`volume-${target}`, s)
    for (const target of [10, 50]) if (recordCount >= target) unlock(`records-${target}`, s)
    if (exercises.size >= 25) unlock('variety-25', s)
  })

  // Progreso de los pendientes medibles.
  const progress: Record<string, [number, number]> = {}
  for (const target of [1, 10, 25, 50, 100, 250]) progress[`sessions-${target}`] = [sorted.length, target]
  // La racha actual (si ya se cortó, empieza de cero), no la última que hubo.
  const current = streakWeeks(sorted)
  for (const target of [4, 12, 26, 52]) progress[`streak-${target}`] = [current, target]
  for (const target of [10, 100, 1000]) progress[`volume-${target}`] = [Math.floor(volume / 1000), target]
  for (const target of [10, 50]) progress[`records-${target}`] = [recordCount, target]
  progress['variety-25'] = [exercises.size, 25]
  for (const a of states.values()) if (a.unlockedAt === undefined && progress[a.id]) a.progress = progress[a.id]
  return [...states.values()]
}

// MARK: Comida

const FOOD_DEFS: AchievementDef[] = [
  { id: 'food-first', group: 'food', title: ['Primer día apuntado', 'First day logged'], detail: ['Apuntaste lo que comiste por primera vez.', 'You logged your food for the first time.'] },
  ...[7, 30].map((n): AchievementDef => ({
    id: `food-streak-${n}`, group: 'food',
    title: [`${n} días seguidos apuntando`, `${n} days logging in a row`],
    detail: [`Apuntaste lo que comiste ${n} días seguidos.`, `You logged your food ${n} days in a row.`],
  })),
  ...[10, 50].map((n): AchievementDef => ({
    id: `food-protein-${n}`, group: 'food',
    title: [`Proteína: ${n} días`, `Protein: ${n} days`],
    detail: [`Llegaste a tu proteína (al menos un 90 %) ${n} días.`, `You hit your protein (at least 90%) on ${n} days.`],
  })),
  ...[20, 100].map((n): AchievementDef => ({
    id: `food-target-${n}`, group: 'food',
    title: [`En tu objetivo: ${n} días`, `On target: ${n} days`],
    detail: [`${n} días con las calorías dentro de tu objetivo (±10 %).`, `${n} days with calories within your goal (±10%).`],
  })),
]

/**
 * Logros de comida a partir de los días apuntados. La proteína y las calorías se miden con el objetivo
 * de cada día (`goalsOf`); sin objetivo, solo cuentan los de apuntar.
 */
export function foodAchievements(entries: FoodEntry[], goalsOf: (day: string) => NutritionGoals | undefined): AchievementState[] {
  const states = new Map<string, AchievementState>(FOOD_DEFS.map((d) => [d.id, { ...d }]))
  const unlock = (id: string, day: string) => {
    const a = states.get(id)
    if (a && a.unlockedAt === undefined) a.unlockedAt = new Date(`${day}T12:00:00`).getTime()
  }
  const byDay = new Map<string, FoodEntry[]>()
  for (const e of entries) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e])
  const days = [...byDay.keys()].sort()
  let streak = 0
  let protein = 0
  let target = 0
  days.forEach((day, i) => {
    if (i === 0) unlock('food-first', day)
    streak = i > 0 && shiftDay(days[i - 1], 1) === day ? streak + 1 : 1
    for (const n of [7, 30]) if (streak >= n) unlock(`food-streak-${n}`, day)
    const goals = goalsOf(day)
    if (!goals) return
    const v = dayTotals(byDay.get(day)!)
    if (v.p >= goals.protein * 0.9) protein++
    if (!goals.proteinOnly && dayStatus(v, goals) === 'met') target++
    for (const n of [10, 50]) if (protein >= n) unlock(`food-protein-${n}`, day)
    for (const n of [20, 100]) if (target >= n) unlock(`food-target-${n}`, day)
  })
  // La racha actual: si ayer no se apuntó nada (y hoy tampoco), empieza de cero.
  const today = dayKey()
  const current = days.length && (days.at(-1) === today || days.at(-1) === shiftDay(today, -1)) ? streak : 0
  const progress: Record<string, [number, number]> = {
    'food-first': [days.length ? 1 : 0, 1], 'food-streak-7': [current, 7], 'food-streak-30': [current, 30],
    'food-protein-10': [protein, 10], 'food-protein-50': [protein, 50], 'food-target-20': [target, 20], 'food-target-100': [target, 100],
  }
  for (const a of states.values()) if (a.unlockedAt === undefined) a.progress = progress[a.id]
  return [...states.values()]
}
