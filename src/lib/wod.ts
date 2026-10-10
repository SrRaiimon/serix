import type { Catalog } from './catalog'
import { clock, uid } from './format'
import type { EquipmentProfile, TrainingLevel } from './generator'
import { plural, t } from './i18n'
import type { Session, SessionExercise, SetEntry } from './store'

// WOD del día: un entreno funcional corto que cambia cada día (el mismo para todos los que tengan el
// mismo material y nivel), en formato AMRAP (máximas rondas en un tiempo), EMOM (cada minuto un
// ejercicio) o «por tiempo» (lo antes posible, con tiempo límite). Los sábados toca una prueba fija
// que se repite cada 4 semanas, para compararte con la vez anterior.
//
// Se genera con una semilla sacada de la fecha: sin servidor y sin guardar nada hasta que lo haces.

export type WodFormat = 'amrap' | 'emom' | 'forTime'
type Role = 'legs' | 'push' | 'pull' | 'hinge' | 'core' | 'engine'
/** Material que pide: ninguno, barra de dominadas, cajón, comba, máquinas de cardio, balón… */
type Kit = 'none' | 'bar' | 'box' | 'rope' | 'machine' | 'ball' | 'dumbbell' | 'kettlebell' | 'barbell'

export interface WodMove {
  exerciseId: string
  reps?: number
  meters?: number
  seconds?: number
  /** Con peso a elegir (thruster, swing…). */
  loaded?: boolean
}

export interface Wod {
  /** Identifica el WOD: el día y la variante, o la prueba y sus ejercicios. */
  key: string
  format: WodFormat
  /** Duración (AMRAP y EMOM) o tiempo límite («por tiempo»). */
  minutes: number
  /** «Por tiempo»: rondas. */
  rounds?: number
  /** «Por tiempo» en escalera (21-15-9): repeticiones de cada ronda para todos los ejercicios. */
  ladder?: number[]
  moves: WodMove[]
  /** Prueba fija (1-4) de los sábados. */
  benchmark?: number
}

/** Lo que se guarda en el entrenamiento al terminar un WOD. */
export interface WodRecord {
  key: string
  format: WodFormat
  minutes: number
  /** AMRAP: rondas completas; por tiempo: rondas hechas; EMOM: minutos cumplidos. */
  rounds: number
  /** AMRAP: repeticiones de la ronda a medias. */
  reps?: number
  /** Por tiempo: segundos que tardaste (sin valor si se acabó el tiempo). */
  seconds?: number
  benchmark?: number
}

type Entry = [id: string, kit: Kit, role: Role, amount: Omit<WodMove, 'exerciseId' | 'loaded'>, level: 0 | 1 | 2, loaded?: true]

const R = (reps: number) => ({ reps })
const M = (meters: number) => ({ meters })
const S = (seconds: number) => ({ seconds })

const POOL: Entry[] = [
  ['Bodyweight_Squat', 'none', 'legs', R(15), 0], ['Bodyweight_Walking_Lunge', 'none', 'legs', R(12), 0], ['Freehand_Jump_Squat', 'none', 'legs', R(10), 1],
  ['Pistol_Squat', 'none', 'legs', R(6), 2], ['Wall_Ball', 'ball', 'legs', R(12), 0, true], ['Barbell_Thruster', 'barbell', 'legs', R(9), 1, true],
  ['Dumbbell_Thruster', 'dumbbell', 'legs', R(10), 0, true], ['Kettlebell_Thruster', 'kettlebell', 'legs', R(10), 0, true], ['Goblet_Squat', 'kettlebell', 'legs', R(12), 0, true],
  ['Dumbbell_Lunges', 'dumbbell', 'legs', R(12), 0, true], ['Box_Step_Over', 'box', 'legs', R(12), 0], ['Front_Box_Jump', 'box', 'legs', R(10), 1],
  ['Pushups', 'none', 'push', R(10), 0], ['Pike_Push_Up', 'none', 'push', R(8), 1], ['Handstand_Push-Ups', 'none', 'push', R(5), 2], ['Bench_Dips', 'none', 'push', R(12), 0],
  ['Devil_Press', 'dumbbell', 'push', R(6), 1, true], ['Man_Maker', 'dumbbell', 'push', R(5), 1, true], ['Push_Press', 'barbell', 'push', R(9), 1, true],
  ['Pullups', 'bar', 'pull', R(8), 0], ['Kipping_Pull_Up', 'bar', 'pull', R(10), 1], ['Chest_To_Bar_Pull_Up', 'bar', 'pull', R(8), 2], ['Muscle_Up', 'bar', 'pull', R(3), 2],
  ['Inverted_Row', 'none', 'pull', R(10), 0], ['Towel_Door_Row', 'none', 'pull', R(12), 0], ['Backpack_Row', 'none', 'pull', R(12), 0],
  ['American_Kettlebell_Swing', 'kettlebell', 'hinge', R(15), 0, true], ['Russian_Kettlebell_Swing', 'kettlebell', 'hinge', R(15), 0, true],
  ['Barbell_Deadlift', 'barbell', 'hinge', R(9), 0, true], ['Power_Clean', 'barbell', 'hinge', R(6), 1, true], ['Squat_Clean', 'barbell', 'hinge', R(5), 2, true],
  ['Single_Leg_Deadlift', 'none', 'hinge', R(10), 0],
  ['Sit-Up', 'none', 'core', R(15), 0], ['V_Up', 'none', 'core', R(10), 1], ['Hollow_Rock', 'none', 'core', R(15), 0], ['Plank_Shoulder_Taps', 'none', 'core', R(20), 0],
  ['Toes_To_Bar', 'bar', 'core', R(10), 1], ['Knees_To_Elbows', 'bar', 'core', R(10), 0], ['GHD_Sit_Up', 'machine', 'core', R(12), 1],
  ['Burpee', 'none', 'engine', R(10), 0], ['Sprawl', 'none', 'engine', R(10), 0], ['Mountain_Climbers', 'none', 'engine', R(20), 0], ['Skater_Jumps', 'none', 'engine', R(20), 0],
  ['Jumping_Jacks', 'none', 'engine', S(40), 0], ['High_Knees', 'none', 'engine', S(30), 0], ['Shuttle_Run', 'none', 'engine', R(6), 0],
  ['Rowing_Machine', 'machine', 'engine', M(250), 0], ['Ski_Erg', 'machine', 'engine', M(250), 0], ['Assault_Bike', 'machine', 'engine', S(45), 0],
  ['Double_Unders', 'rope', 'engine', R(30), 1], ['Rope_Jumping', 'rope', 'engine', S(45), 0], ['Burpee_Box_Jump_Over', 'box', 'engine', R(8), 1],
]

const KITS: Record<EquipmentProfile, Kit[]> = {
  gym: ['none', 'bar', 'box', 'rope', 'machine', 'ball', 'dumbbell', 'kettlebell', 'barbell'],
  dumbbells: ['none', 'dumbbell'],
  kettlebell: ['none', 'kettlebell'],
  bands: ['none'],
  bodyweight: ['none'],
}

const LEVEL: Record<TrainingLevel, number> = { beginner: 0, intermediate: 1, advanced: 2 }
const SCALE: Record<TrainingLevel, number> = { beginner: 0.7, intermediate: 1, advanced: 1.25 }

/** Generador pseudoaleatorio con semilla (mulberry32): mismo día, mismo WOD. */
function random(seed: string) {
  let h = 1779033703
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353), h = (h << 13) | (h >>> 19)
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let x = Math.imul(a ^ (a >>> 15), 1 | a)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

function scaled(amount: Entry[3], factor: number): Entry[3] {
  if (amount.reps) return { reps: Math.max(3, Math.round(amount.reps * factor)) }
  if (amount.meters) return { meters: Math.max(100, Math.round((amount.meters * factor) / 50) * 50) }
  return { seconds: Math.max(15, Math.round(((amount.seconds ?? 30) * factor) / 5) * 5) }
}

const move = (e: Entry, factor: number): WodMove => ({ exerciseId: e[0], ...scaled(e[3], factor), ...(e[5] ? { loaded: true } : {}) })

/** Las pruebas de los sábados: cada hueco, el primer ejercicio que permita tu material. */
const BENCHMARKS: { format: WodFormat; minutes: number; rounds?: number; ladder?: number[]; moves: [ids: string[], amount: Entry[3]][] }[] = [
  { format: 'forTime', minutes: 15, ladder: [21, 15, 9], moves: [[['Barbell_Thruster', 'Dumbbell_Thruster', 'Kettlebell_Thruster', 'Bodyweight_Squat'], R(0)], [['Pullups', 'Burpee'], R(0)]] },
  { format: 'amrap', minutes: 20, moves: [[['Pullups', 'Towel_Door_Row'], R(5)], [['Pushups'], R(10)], [['Bodyweight_Squat'], R(15)]] },
  { format: 'forTime', minutes: 25, rounds: 5, moves: [[['Rowing_Machine', 'Shuttle_Run'], { reps: 6, meters: 400 }], [['American_Kettlebell_Swing', 'Russian_Kettlebell_Swing', 'Dumbbell_Thruster', 'Single_Leg_Deadlift'], R(15)], [['Burpee'], R(10)]] },
  { format: 'emom', minutes: 12, moves: [[['Burpee'], R(10)], [['Bodyweight_Squat'], R(15)], [['Pushups'], R(10)]] },
]

const entry = (id: string) => POOL.find((e) => e[0] === id)

function benchmark(n: number, equipment: EquipmentProfile): Wod {
  const b = BENCHMARKS[n - 1]
  const kit = new Set(KITS[equipment])
  const moves = b.moves.map(([ids, amount]) => {
    const id = ids.find((x) => kit.has(entry(x)?.[1] ?? 'none')) ?? ids.at(-1)!
    const e = entry(id)
    // Las distancias solo valen para las máquinas; si no hay, idas y vueltas.
    const use = e?.[3].meters ? { meters: amount.meters ?? e[3].meters } : amount.reps ? { reps: amount.reps } : e?.[3] ?? amount
    return { exerciseId: id, ...use, ...(e?.[5] ? { loaded: true as const } : {}) }
  })
  return { key: `b${n}:${moves.map((m) => m.exerciseId).join('+')}`, format: b.format, minutes: b.minutes, ...(b.rounds ? { rounds: b.rounds } : {}), ...(b.ladder ? { ladder: b.ladder } : {}), moves, benchmark: n }
}

const pad = (n: number) => String(n).padStart(2, '0')
/** Día local (AAAA-MM-DD). */
export const wodDay = (at = Date.now()) => { const d = new Date(at); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

/** El WOD de un día (variante 0) u otro distinto del mismo día (1, 2…), según tu material y nivel. */
export function wodOf(day: string, equipment: EquipmentProfile, level: TrainingLevel, variant = 0, catalog?: Catalog): Wod {
  const date = new Date(`${day}T12:00:00`)
  // Sábados: la prueba fija (cada semana una de las cuatro).
  if (date.getDay() === 6 && variant === 0) {
    const week = Math.floor(date.getTime() / (7 * 86400000))
    return benchmark((week % BENCHMARKS.length) + 1, equipment)
  }
  const rnd = random(`${day}|${equipment}|${level}|${variant}`)
  const pick = <T>(list: T[]) => list[Math.floor(rnd() * list.length)]
  const kit = new Set(KITS[equipment])
  const pool = POOL.filter((e) => kit.has(e[1]) && e[4] <= LEVEL[level] && (!catalog || catalog.get(e[0])))
  const ofRole = (role: Role, used: Set<string>) => pool.filter((e) => e[2] === role && !used.has(e[0]))
  const roll = rnd()
  const format: WodFormat = roll < 0.4 ? 'amrap' : roll < 0.75 ? 'forTime' : 'emom'
  const plans: Role[][] = [['legs', 'push', 'engine'], ['hinge', 'pull', 'core'], ['legs', 'pull', 'engine'], ['hinge', 'push', 'engine'], ['legs', 'core', 'engine'], ['engine', 'pull', 'legs']]
  const roles = format === 'emom' && rnd() < 0.5 ? [...pick(plans), pick<Role>(['core', 'engine'])] : pick(plans)
  const used = new Set<string>()
  const factor = SCALE[level] * (format === 'emom' ? 0.8 : 1)
  const moves: WodMove[] = []
  for (const role of roles) {
    const options = ofRole(role, used)
    const e = options.length ? pick(options) : pick(pool.filter((x) => !used.has(x[0])))
    if (!e) continue
    used.add(e[0])
    moves.push(move(e, factor))
  }
  const key = `${day}#${variant}`
  if (format === 'amrap') return { key, format, minutes: pick([10, 12, 15, 18, 20]), moves }
  if (format === 'emom') return { key, format, minutes: moves.length * pick([3, 4]), moves }
  const rounds = pick([3, 4, 5])
  return { key, format, rounds, minutes: Math.min(25, Math.max(12, rounds * 4)), moves }
}

// MARK: Textos

export function amountText(m: WodMove, wod?: Wod): string {
  if (wod?.ladder && m.reps !== undefined) return wod.ladder.join('-')
  if (m.meters) return `${m.meters} m`
  if (m.seconds) return `${m.seconds} s`
  return String(m.reps ?? '')
}

export function formatTitle(w: Pick<Wod, 'format' | 'minutes' | 'rounds' | 'ladder'>): string {
  if (w.format === 'amrap') return `AMRAP ${w.minutes} min`
  if (w.format === 'emom') return `EMOM ${w.minutes} min`
  return w.ladder ? t(`Por tiempo · ${w.ladder.join('-')}`, `For time · ${w.ladder.join('-')}`)
    : t(`Por tiempo · ${w.rounds} rondas`, `For time · ${w.rounds} rounds`)
}

export function formatHint(w: Wod): string {
  if (w.format === 'amrap') return t(`Haz los ejercicios en orden, una ronda tras otra, tantas como puedas en ${w.minutes} minutos.`, `Do the exercises in order, round after round, as many as you can in ${w.minutes} minutes.`)
  if (w.format === 'emom') return t(`Al empezar cada minuto, haz el ejercicio que toca (van rotando) y descansa lo que sobre del minuto.`, `At the start of each minute do the exercise in turn (they rotate) and rest for the rest of the minute.`)
  return w.ladder
    ? t(`${w.ladder.join(', ')} repeticiones de cada ejercicio, lo antes posible. Tiempo límite: ${w.minutes} min.`, `${w.ladder.join(', ')} reps of each exercise, as fast as you can. Time cap: ${w.minutes} min.`)
    : t(`${w.rounds} rondas de los ejercicios en orden, lo antes posible. Tiempo límite: ${w.minutes} min.`, `${w.rounds} rounds of the exercises in order, as fast as you can. Time cap: ${w.minutes} min.`)
}

export function scoreText(r: WodRecord): string {
  if (r.format === 'amrap') return plural(r.rounds, ['ronda', 'rondas'], ['round', 'rounds']) + (r.reps ? ` + ${r.reps} reps` : '')
  if (r.format === 'emom') return t(`${r.rounds} de ${r.minutes} minutos`, `${r.rounds} of ${r.minutes} minutes`)
  return r.seconds !== undefined ? clock(r.seconds) : t(`Límite · ${plural(r.rounds, ['ronda', 'rondas'], ['round', 'rounds'])}`, `Capped · ${plural(r.rounds, ['round', 'rounds'], ['round', 'rounds'])}`)
}

/** Si `a` es mejor resultado que `b` (mismo WOD). */
export function better(a: WodRecord, b: WodRecord): boolean {
  if (a.format === 'forTime') {
    if (a.seconds !== undefined && b.seconds !== undefined) return a.seconds < b.seconds
    if (a.seconds !== undefined) return true
    if (b.seconds !== undefined) return false
    return a.rounds > b.rounds
  }
  return a.rounds > b.rounds || (a.rounds === b.rounds && (a.reps ?? 0) > (b.reps ?? 0))
}

/** Resultados anteriores de la misma prueba (del más reciente al más antiguo). */
export const previousTries = (sessions: Session[], key: string) =>
  sessions.filter((s) => s.wod?.key === key && s.end).sort((a, b) => b.start - a.start)

// MARK: Guardar

/** Cuántas veces se hizo cada ejercicio según el resultado. */
function timesDone(wod: Wod, r: WodRecord): number[] {
  const n = wod.moves.length
  if (wod.format === 'emom') return wod.moves.map((_, i) => Array.from({ length: r.rounds }, (_, m) => m % n === i).filter(Boolean).length)
  if (wod.format === 'amrap') return wod.moves.map(() => r.rounds)
  return wod.moves.map(() => (r.seconds !== undefined ? wod.ladder?.length ?? wod.rounds ?? 1 : r.rounds))
}

/** El entrenamiento que queda en el historial: una serie por ejercicio con el total hecho. */
export function wodSession(wod: Wod, r: WodRecord, catalog: Catalog, start: number, end: number, loadKg = 0): Session {
  const times = timesDone(wod, r)
  let partial = r.format === 'amrap' ? r.reps ?? 0 : 0
  const exercises: SessionExercise[] = wod.moves.map((m, i): SessionExercise => {
    const e = catalog.get(m.exerciseId)
    const done = wod.ladder ? wod.ladder.slice(0, times[i]).reduce((a, b) => a + b, 0) : times[i]
    // La ronda a medias del AMRAP se reparte por orden entre los primeros ejercicios.
    let extra = 0
    if (m.reps && partial > 0) { extra = Math.min(partial, m.reps); partial -= extra }
    const set: SetEntry = { id: uid(), done: true, warmup: false, doneAt: end, weight: m.loaded ? loadKg : 0, reps: 0 }
    if (m.meters) set.distance = Math.round((m.meters * done) / 10) / 100
    else if (m.seconds) set.duration = m.seconds * done
    else set.reps = wod.ladder ? done : (m.reps ?? 0) * done + extra
    return {
      id: uid(), exerciseId: m.exerciseId, name: e?.name ?? m.exerciseId, muscle: e?.muscle ?? 'quads', rest: 0, repsMin: 0, repsMax: 0,
      tracking: m.meters ? 'distance_time' : m.seconds ? 'time' : 'weight_reps',
      sets: [set],
    }
  }).filter((x) => (x.sets[0].reps ?? 0) > 0 || (x.sets[0].distance ?? 0) > 0 || (x.sets[0].duration ?? 0) > 0)
  return {
    id: uid(), name: `WOD · ${formatTitle(wod)}`, start, end, exercises,
    notes: `${formatTitle(wod)} — ${scoreText(r)}`,
    wod: r,
  }
}
