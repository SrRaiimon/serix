import { normalize, type Catalog, type Exercise } from './catalog'
import { toKg, uid, type Unit } from './format'
import { normalizeGroups } from './groups'
import type { Session, SessionExercise, SetEntry, SetKind } from './store'
import type { Tracking } from './tracking'

// Importar el historial exportado desde otras apps (Strong y Hevy) en CSV. Todo se procesa en el
// móvil: el archivo no sale de él.
//
// Strong: Date, Workout Name, Duration, Exercise Name, Set Order, Weight, Reps, Distance, Seconds,
//   Notes, Workout Notes, RPE. Fecha «2020-12-30 18:51:52», duración «2h 38m», peso en la unidad
//   del usuario (el archivo no lo dice) y «Set Order» con número o W/D/F (calentamiento, drop set,
//   al fallo).
// Hevy: title, start_time, end_time, description, exercise_title, superset_id, exercise_notes,
//   set_index, set_type, weight_kg (o weight_lbs), reps, distance_km (o distance_miles),
//   duration_seconds, rpe. Fechas «22 Dec 2025, 08:00»; set_type normal/warmup/dropset/failure.

export type CsvFormat = 'strong' | 'hevy'

/** CSV con comillas (RFC 4180). El separador se deduce de la cabecera (coma o punto y coma). */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '')
  const firstLine = clean.slice(0, clean.indexOf('\n') >>> 0)
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i]
    if (quoted) {
      if (c === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++ } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === sep) { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && clean[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((f) => f !== '')) rows.push(row)
      row = []
    } else field += c
  }
  row.push(field)
  if (row.some((f) => f !== '')) rows.push(row)
  return rows
}

export function detectFormat(header: string[]): CsvFormat | undefined {
  const h = new Set(header.map((x) => x.trim()))
  if (h.has('Exercise Name') && h.has('Set Order')) return 'strong'
  if (h.has('exercise_title') && h.has('start_time')) return 'hevy'
  return undefined
}

export interface ImportedSet {
  weight: number
  reps: number
  duration?: number
  distance?: number
  rpe?: number
  warmup: boolean
  kind?: SetKind
}

export interface ImportedExercise {
  /** Nombre tal cual viene en el archivo. */
  name: string
  group?: string
  notes?: string
  sets: ImportedSet[]
}

export interface ImportedWorkout {
  name: string
  start: number
  end: number
  notes: string
  exercises: ImportedExercise[]
}

const num = (v: string | undefined) => {
  const n = Number((v ?? '').trim().replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
const optRpe = (v: string | undefined) => {
  const n = num(v)
  return n >= 1 && n <= 10 ? n : undefined
}

/** «2h 38m», «45m», «1h», «30s» → milisegundos. */
export function parseDuration(text: string): number {
  let ms = 0
  for (const [, n, u] of text.matchAll(/(\d+(?:[.,]\d+)?)\s*([hms])/gi)) {
    const v = Number(n.replace(',', '.'))
    ms += v * (u.toLowerCase() === 'h' ? 3600000 : u.toLowerCase() === 'm' ? 60000 : 1000)
  }
  return ms
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  ene: 0, abr: 3, ago: 7, dic: 11,
}

/** Fechas de Strong («2020-12-30 18:51:52») y Hevy («22 Dec 2025, 08:00»), en hora local. */
export function parseDate(text: string): number | undefined {
  const s = text.trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0)).getTime()
  m = s.match(/^(\d{1,2}) ([A-Za-z]{3})[a-z]*\.? (\d{4}),? (\d{1,2}):(\d{2})/)
  if (m && MONTHS[m[2].toLowerCase()] !== undefined) return new Date(+m[3], MONTHS[m[2].toLowerCase()], +m[1], +m[4], +m[5]).getTime()
  const parsed = Date.parse(s)
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * Convierte el CSV en entrenamientos. `unit` es la unidad del peso cuando el archivo no la indica
 * (Strong); las distancias en esa misma unidad se toman como km (kg) o millas (lb).
 */
export function parseWorkouts(text: string, unit: Unit): { format: CsvFormat; workouts: ImportedWorkout[] } {
  const rows = parseCsv(text)
  const header = rows[0]?.map((h) => h.trim()) ?? []
  const format = detectFormat(header)
  if (!format) throw new Error('unknown-format')
  const col = (name: string) => header.indexOf(name)
  const get = (row: string[], name: string) => (col(name) >= 0 ? row[col(name)] ?? '' : '')
  const byKey = new Map<string, ImportedWorkout>()
  const lastExercise = new Map<string, ImportedExercise>()
  const MI = 1.609344

  for (const row of rows.slice(1)) {
    const isStrong = format === 'strong'
    const startText = isStrong ? get(row, 'Date') : get(row, 'start_time')
    const name = (isStrong ? get(row, 'Workout Name') : get(row, 'title')).trim() || 'Workout'
    const start = parseDate(startText)
    const exerciseName = (isStrong ? get(row, 'Exercise Name') : get(row, 'exercise_title')).trim()
    if (start === undefined || !exerciseName) continue
    const key = `${start}|${name}`
    let workout = byKey.get(key)
    if (!workout) {
      const end = isStrong ? start + parseDuration(get(row, 'Duration')) : (parseDate(get(row, 'end_time')) ?? start)
      workout = { name, start, end: Math.max(end, start), notes: (isStrong ? get(row, 'Workout Notes') : get(row, 'description')).trim(), exercises: [] }
      byKey.set(key, workout)
    }

    // Tipo de serie.
    let warmup = false
    let kind: SetKind | undefined
    if (isStrong) {
      const order = get(row, 'Set Order').trim().toUpperCase()
      if (order === 'W') warmup = true
      else if (order === 'D') kind = 'drop'
      else if (order === 'F') kind = 'failure'
      else if (!/^\d+$/.test(order)) continue // filas que no son series (p. ej. «Rest Timer»)
    } else {
      const type = get(row, 'set_type').trim().toLowerCase()
      if (type === 'warmup') warmup = true
      else if (type === 'dropset') kind = 'drop'
      else if (type === 'failure') kind = 'failure'
    }

    // Peso en kg y distancia en km.
    let weight: number
    let distance: number
    if (isStrong) {
      weight = toKg(num(get(row, 'Weight')), unit)
      distance = num(get(row, 'Distance')) * (unit === 'lb' ? MI : 1)
    } else {
      weight = col('weight_kg') >= 0 ? num(get(row, 'weight_kg')) : toKg(num(get(row, 'weight_lbs')), 'lb')
      distance = col('distance_km') >= 0 ? num(get(row, 'distance_km')) : num(get(row, 'distance_miles')) * MI
    }
    const set: ImportedSet = {
      weight: Math.max(0, weight), reps: Math.max(0, Math.round(num(get(row, isStrong ? 'Reps' : 'reps')))), warmup,
      ...(kind ? { kind } : {}),
    }
    const seconds = num(get(row, isStrong ? 'Seconds' : 'duration_seconds'))
    if (seconds > 0) set.duration = Math.round(seconds)
    if (distance > 0) set.distance = Math.round(distance * 1000) / 1000
    const rpe = optRpe(get(row, isStrong ? 'RPE' : 'rpe'))
    if (rpe !== undefined) set.rpe = rpe
    if (!set.reps && !set.duration && !set.distance && !set.weight) continue

    // Las series seguidas del mismo ejercicio van juntas.
    const group = isStrong ? undefined : get(row, 'superset_id').trim() || undefined
    const previous = lastExercise.get(key)
    if (previous && previous.name === exerciseName) previous.sets.push(set)
    else {
      const exercise: ImportedExercise = {
        name: exerciseName, sets: [set],
        ...(group ? { group } : {}),
        notes: (isStrong ? get(row, 'Notes') : get(row, 'exercise_notes')).trim() || undefined,
      }
      workout.exercises.push(exercise)
      lastExercise.set(key, exercise)
    }
  }
  const workouts = [...byKey.values()].filter((w) => w.exercises.length).sort((a, b) => a.start - b.start)
  return { format, workouts }
}

// MARK: Emparejar ejercicios con el catálogo

/** Nombres habituales en Strong y Hevy → ejercicio del catálogo (comprobados en los tests). */
export const ALIASES: Record<string, string> = {
  'bench press (barbell)': 'Barbell_Bench_Press_-_Medium_Grip',
  'bench press (dumbbell)': 'Dumbbell_Bench_Press',
  'bench press (smith machine)': 'Smith_Machine_Bench_Press',
  'incline bench press (barbell)': 'Barbell_Incline_Bench_Press_-_Medium_Grip',
  'incline bench press (dumbbell)': 'Incline_Dumbbell_Press',
  'decline bench press (barbell)': 'Decline_Barbell_Bench_Press',
  'close grip bench press (barbell)': 'Close-Grip_Barbell_Bench_Press',
  'squat (barbell)': 'Barbell_Squat',
  'full squat': 'Barbell_Full_Squat',
  'front squat (barbell)': 'Front_Barbell_Squat',
  'squat (smith machine)': 'Smith_Machine_Squat',
  'goblet squat (kettlebell)': 'Goblet_Squat',
  'goblet squat (dumbbell)': 'Goblet_Squat',
  'hack squat': 'Hack_Squat',
  'hack squat (machine)': 'Hack_Squat',
  'deadlift (barbell)': 'Barbell_Deadlift',
  'deadlift (trap bar)': 'Trap_Bar_Deadlift',
  'trap bar deadlift': 'Trap_Bar_Deadlift',
  'sumo deadlift (barbell)': 'Sumo_Deadlift',
  'romanian deadlift (barbell)': 'Romanian_Deadlift',
  'romanian deadlift (dumbbell)': 'Stiff-Legged_Dumbbell_Deadlift',
  'good morning (barbell)': 'Good_Morning',
  'overhead press (barbell)': 'Standing_Military_Press',
  'strict military press (barbell)': 'Standing_Military_Press',
  'shoulder press (dumbbell)': 'Dumbbell_Shoulder_Press',
  'seated overhead press (dumbbell)': 'Seated_Dumbbell_Press',
  'shoulder press (machine)': 'Machine_Shoulder_Military_Press',
  'seated shoulder press (machine)': 'Machine_Shoulder_Military_Press',
  'arnold press (dumbbell)': 'Arnold_Dumbbell_Press',
  'push press': 'Push_Press',
  'push press (barbell)': 'Push_Press',
  'lateral raise (dumbbell)': 'Side_Lateral_Raise',
  'front raise (dumbbell)': 'Front_Dumbbell_Raise',
  'reverse fly (dumbbell)': 'Reverse_Flyes',
  'face pull (cable)': 'Face_Pull',
  'face pull': 'Face_Pull',
  'upright row (barbell)': 'Upright_Barbell_Row',
  'shrug (barbell)': 'Barbell_Shrug',
  'shrug (dumbbell)': 'Dumbbell_Shrug',
  'pull up': 'Pullups',
  'pull up (assisted)': 'Band_Assisted_Pull-Up',
  'chin up': 'Chin-Up',
  'lat pulldown (cable)': 'Wide-Grip_Lat_Pulldown',
  'lat pulldown (machine)': 'Wide-Grip_Lat_Pulldown',
  'bent over row (barbell)': 'Bent_Over_Barbell_Row',
  'bent over one arm row (dumbbell)': 'One-Arm_Dumbbell_Row',
  'dumbbell row': 'One-Arm_Dumbbell_Row',
  'seated row (cable)': 'Seated_Cable_Rows',
  'seated cable row - v grip (cable)': 'Seated_Cable_Rows',
  't bar row': 'T-Bar_Row_with_Handle',
  'inverted row': 'Inverted_Row',
  'bicep curl (barbell)': 'Barbell_Curl',
  'bicep curl (dumbbell)': 'Dumbbell_Bicep_Curl',
  'bicep curl (cable)': 'Standing_Biceps_Cable_Curl',
  'hammer curl (dumbbell)': 'Hammer_Curls',
  'preacher curl (barbell)': 'Preacher_Curl',
  'concentration curl (dumbbell)': 'Concentration_Curls',
  'triceps pushdown (cable - straight bar)': 'Triceps_Pushdown',
  'triceps pushdown': 'Triceps_Pushdown',
  'triceps rope pushdown': 'Triceps_Pushdown_-_Rope_Attachment',
  'triceps pushdown (cable)': 'Triceps_Pushdown',
  'skullcrusher (barbell)': 'EZ-Bar_Skullcrusher',
  'skull crusher (barbell)': 'EZ-Bar_Skullcrusher',
  'triceps extension (dumbbell)': 'Standing_Dumbbell_Triceps_Extension',
  'overhead triceps extension (cable)': 'Cable_Rope_Overhead_Triceps_Extension',
  'triceps dip': 'Dips_-_Triceps_Version',
  'chest dip': 'Dips_-_Chest_Version',
  'bench dip': 'Bench_Dips',
  'chest fly (dumbbell)': 'Dumbbell_Flyes',
  'chest fly (machine)': 'Butterfly',
  'cable crossover': 'Cable_Crossover',
  'cable fly crossovers': 'Cable_Crossover',
  'push up': 'Pushups',
  'leg press': 'Leg_Press',
  'leg press (machine)': 'Leg_Press',
  'leg extension (machine)': 'Leg_Extensions',
  'lying leg curl (machine)': 'Lying_Leg_Curls',
  'seated leg curl (machine)': 'Seated_Leg_Curl',
  'leg curl (machine)': 'Lying_Leg_Curls',
  'standing calf raise (machine)': 'Standing_Calf_Raises',
  'seated calf raise (machine)': 'Seated_Calf_Raise',
  'calf raise': 'Standing_Calf_Raises',
  'hip thrust (barbell)': 'Barbell_Hip_Thrust',
  'lunge (dumbbell)': 'Dumbbell_Lunges',
  'lunge (barbell)': 'Barbell_Lunge',
  'walking lunge (barbell)': 'Barbell_Walking_Lunge',
  'bulgarian split squat': 'Split_Squat_with_Dumbbells',
  'bulgarian split squat (dumbbell)': 'Split_Squat_with_Dumbbells',
  'glute ham raise': 'Glute_Ham_Raise',
  'back extension': 'Hyperextensions_Back_Extensions',
  'hyperextension': 'Hyperextensions_Back_Extensions',
  'crunch': 'Crunches',
  'cable crunch': 'Cable_Crunch',
  'sit up': 'Sit-Up',
  'plank': 'Plank',
  'side plank': 'Side_Bridge',
  'hanging leg raise': 'Hanging_Leg_Raise',
  'russian twist': 'Russian_Twist',
  'reverse crunch': 'Reverse_Crunch',
  'ab wheel': 'Ab_Roller',
  'mountain climber': 'Mountain_Climbers',
  'jump rope': 'Rope_Jumping',
  'box jump': 'Box_Jump_Multiple_Response',
  'kettlebell swing': 'One-Arm_Kettlebell_Swings',
  'farmers walk': 'Farmers_Walk',
  'running (treadmill)': 'Running_Treadmill',
  'treadmill': 'Running_Treadmill',
  'walking': 'Walking_Treadmill',
  'rowing (machine)': 'Rowing_Stationary',
  'cycling (indoor)': 'Bicycling_Stationary',
  'cycling': 'Bicycling',
  'elliptical trainer': 'Elliptical_Trainer',
  'stair stepper': 'Stairmaster',
  'clean (barbell)': 'Clean',
  'power clean': 'Power_Clean',
  'snatch (barbell)': 'Snatch',
  'clean and jerk (barbell)': 'Clean_and_Jerk',
  'overhead squat (barbell)': 'Overhead_Squat',
  'pec deck (machine)': 'Butterfly',
  'hip abduction (machine)': 'Thigh_Abductor',
  'hip adduction (machine)': 'Thigh_Adductor',
  'battle ropes': 'Battling_Ropes',
  'stiff leg deadlift (barbell)': 'Stiff-Legged_Barbell_Deadlift',
  'reverse grip lat pulldown (cable)': 'Underhand_Cable_Pulldowns',
  'rear delt fly (machine)': 'Reverse_Machine_Flyes',
  'rear delt reverse fly (machine)': 'Reverse_Machine_Flyes',
  'wrist curl (barbell)': 'Seated_Palm-Up_Barbell_Wrist_Curl',
  'shoulder press (plate loaded)': 'Leverage_Shoulder_Press',
  'chest press (machine)': 'Leverage_Chest_Press',
}

const EQUIPMENT: Record<string, string> = {
  barbell: 'barbell', dumbbell: 'dumbbell', cable: 'cable', machine: 'machine', 'smith machine': 'machine',
  kettlebell: 'kettlebell', band: 'band', bodyweight: 'bodyweight', assisted: 'bodyweight', weighted: 'bodyweight',
  'ez bar': 'ez-bar', 'trap bar': 'other', 'medicine ball': 'medicine-ball', 'plate loaded': 'machine',
}

// Palabras que no ayudan a reconocer el movimiento.
const STOP = new Set(['the', 'with', 'on', 'and', 'of', 'a', 'to', '-', 'grip', 'medium'])
const words = (s: string) =>
  normalize(s).replace(/pull[\s-]?ups?/g, 'pullup').replace(/chin[\s-]?ups?/g, 'chinup').replace(/push[\s-]?ups?/g, 'pushup')
    .replace(/sit[\s-]?ups?/g, 'situp').split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w)).map((w) => w.replace(/(es|s)$/, ''))

/**
 * Ejercicio del catálogo que corresponde a un nombre de Strong o Hevy: primero por la tabla de
 * nombres habituales y, si no está, por las palabras en común (el material entre paréntesis
 * desempata). Sin una coincidencia clara, `undefined`: se importa con su nombre original.
 */
export function matchExercise(name: string, catalog: Catalog): Exercise | undefined {
  const key = normalize(name).replace(/\s+/g, ' ').trim()
  const alias = ALIASES[key]
  if (alias && catalog.get(alias)) return catalog.get(alias)
  const equipMatch = key.match(/\(([^)]+)\)/)
  const equipment = equipMatch ? EQUIPMENT[equipMatch[1].trim()] : undefined
  const base = new Set(words(key.replace(/\([^)]*\)/g, ' ')))
  if (!base.size) return undefined
  let best: Exercise | undefined
  let bestScore = 0
  for (const e of catalog.exercises) {
    const w = new Set(words(e.nameEn))
    let shared = 0
    for (const x of base) if (w.has(x)) shared++
    if (!shared) continue
    // Proporción de palabras en común respecto a las dos (las palabras de más restan).
    let score = (2 * shared) / (base.size + w.size)
    if (equipment && e.equipment === equipment) score += 0.15
    if (shared === base.size) score += 0.1
    if (score > bestScore) { bestScore = score; best = e }
  }
  return bestScore >= 0.6 ? best : undefined
}

// MARK: Convertir en sesiones de Serix

/** Identificador para ejercicios sin equivalencia en el catálogo (conservan su nombre). */
export const customId = (name: string) => `custom:${normalize(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`

/** Clave para no importar dos veces el mismo entrenamiento. */
export const workoutKey = (start: number, name: string) => `${Math.round(start / 60000)}|${name.trim().toLowerCase()}`

export function toSessions(workouts: ImportedWorkout[], mapping: Map<string, Exercise | undefined>, existing: Session[]): Session[] {
  const seen = new Set(existing.map((s) => workoutKey(s.start, s.name)))
  const sessions: Session[] = []
  for (const w of workouts) {
    if (seen.has(workoutKey(w.start, w.name))) continue
    seen.add(workoutKey(w.start, w.name))
    const groups = new Map<string, string>()
    const exercises: SessionExercise[] = w.exercises.map((x) => {
      const match = mapping.get(x.name)
      const timed = x.sets.every((s) => !s.weight && !s.reps)
      const tracking: Tracking = !timed ? 'weight_reps' : x.sets.some((s) => s.distance) ? 'distance_time' : 'time'
      const sets: SetEntry[] = x.sets.map((s) => ({
        id: uid(), weight: s.weight, reps: s.reps, done: true, warmup: s.warmup, doneAt: w.start,
        ...(s.kind ? { kind: s.kind } : {}),
        ...(s.duration ? { duration: s.duration } : {}),
        ...(s.distance ? { distance: s.distance } : {}),
        ...(s.rpe !== undefined ? { rpe: s.rpe } : {}),
      }))
      return {
        id: uid(),
        exerciseId: match?.id ?? customId(x.name),
        name: match?.name ?? x.name,
        muscle: match?.muscle ?? '',
        rest: 90, repsMin: 0, repsMax: 0,
        ...(tracking !== 'weight_reps' ? { tracking } : {}),
        ...(x.group ? { groupId: groups.get(x.group) ?? groups.set(x.group, uid()).get(x.group)! } : {}),
        sets,
      }
    })
    normalizeGroups(exercises)
    sessions.push({ id: uid(), name: w.name, start: w.start, end: w.end, notes: w.notes, exercises })
  }
  return sessions
}
