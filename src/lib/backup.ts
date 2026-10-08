import { uid } from './format'
import { cleanBlock } from './block'
import { cleanCustomExercise, MAX_CUSTOM_EXERCISES } from './customExercises'
import { cleanChallenge, cleanSnapshot } from './friends'
import type { AppData, AutoProgress, Measurement, Routine, RoutineExercise, Session, SessionExercise, SetEntry, Settings } from './store'
import { defaultSettings, MAX_EXERCISE_NOTE } from './store'
import { t } from './i18n'
import { PLATE_OPTIONS } from './plates'
import { MEALS, optionals, type FoodEntry, type FoodRef, type MyFood, type NutritionData, type NutritionGoals, type Per100, type PlanPrefs, type Recipe, type SavedMeal } from './nutrition'

// Validación de copias de seguridad importadas. Solo se aceptan los campos conocidos, con su tipo y
// dentro de rangos razonables; lo demás se descarta. Así un archivo manipulado o de otra app no
// puede meter datos extraños (textos enormes, tipos inesperados) que rompan la app.

export const MAX_BACKUP_BYTES = 20 * 1024 * 1024
const MAX_TEXT = 500

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown, fallback = '', max = MAX_TEXT) => (typeof v === 'string' ? v.slice(0, max) : fallback)
const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback
const optNum = (v: unknown, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : undefined
const bool = (v: unknown, fallback = false) => (typeof v === 'boolean' ? v : fallback)
const oneOf = <T extends string>(v: unknown, options: readonly T[]): T | undefined =>
  options.includes(v as T) ? (v as T) : undefined
const list = <T>(v: unknown, parse: (x: unknown) => T | undefined, max = 10000): T[] =>
  Array.isArray(v) ? v.slice(0, max).map(parse).filter((x): x is T => x !== undefined) : []

const TRACKING = ['weight_reps', 'time', 'distance_time'] as const
const SET_KINDS = ['drop', 'amrap', 'failure'] as const
const PROGRESSIONS = ['double', 'linear', 'wave531'] as const

function autoProgress(v: unknown): AutoProgress | undefined {
  if (!isObj(v)) return undefined
  const mode = oneOf(v.mode, ['double', 'linear'] as const)
  if (v.kind === 'up' && mode) {
    const from = optNum(v.from, 0, 2000), to = optNum(v.to, 0, 2000)
    return from !== undefined && to !== undefined ? { kind: 'up', from, to, mode } : undefined
  }
  if (v.kind === 'hold' && mode) return { kind: 'hold', mode }
  if (v.kind === 'wave') {
    const week = optNum(v.week, 1, 4), tm = optNum(v.tm, 0, 2000)
    return week !== undefined && tm !== undefined ? { kind: 'wave', week: Math.round(week), tm } : undefined
  }
  return undefined
}
const DAY = 86400000
const EPOCH_MIN = Date.UTC(2000, 0, 1)
const EPOCH_MAX = Date.now() + 365 * DAY

function routineExercise(v: unknown): RoutineExercise | undefined {
  if (!isObj(v) || typeof v.exerciseId !== 'string') return undefined
  return {
    exerciseId: str(v.exerciseId, '', 200), name: str(v.name, 'Ejercicio'), muscle: str(v.muscle, '', 50),
    sets: num(v.sets, 1, 20, 3), repsMin: num(v.repsMin, 1, 100, 8), repsMax: num(v.repsMax, 1, 100, 12), rest: num(v.rest, 0, 900, 90),
    tracking: oneOf(v.tracking, TRACKING), targetSeconds: optNum(v.targetSeconds, 1, 7200),
    groupId: typeof v.groupId === 'string' ? v.groupId.slice(0, 50) : undefined,
    progression: oneOf(v.progression, PROGRESSIONS),
    trainingMax: optNum(v.trainingMax, 1, 2000),
    tmSince: optNum(v.tmSince, EPOCH_MIN, EPOCH_MAX),
  }
}

function routine(v: unknown): Routine | undefined {
  if (!isObj(v)) return undefined
  return {
    id: str(v.id, uid(), 50), name: str(v.name, 'Rutina', 100), notes: str(v.notes),
    programName: typeof v.programName === 'string' ? v.programName.slice(0, 100) : undefined,
    order: num(v.order, 0, 10000, 0), createdAt: num(v.createdAt, EPOCH_MIN, EPOCH_MAX, Date.now()),
    exercises: list(v.exercises, routineExercise, 100),
  }
}

function setEntry(v: unknown): SetEntry | undefined {
  if (!isObj(v)) return undefined
  return {
    id: str(v.id, uid(), 50), weight: num(v.weight, 0, 2000, 0), reps: num(v.reps, 0, 1000, 0),
    done: bool(v.done), warmup: bool(v.warmup), doneAt: optNum(v.doneAt, EPOCH_MIN, EPOCH_MAX),
    duration: optNum(v.duration, 0, 86400), distance: optNum(v.distance, 0, 1000), rpe: optNum(v.rpe, 1, 10),
    kind: oneOf(v.kind, SET_KINDS),
    side: v.side === 'L' || v.side === 'R' ? v.side : undefined,
  }
}

function sessionExercise(v: unknown): SessionExercise | undefined {
  if (!isObj(v) || typeof v.exerciseId !== 'string') return undefined
  return {
    id: str(v.id, uid(), 50), exerciseId: str(v.exerciseId, '', 200), name: str(v.name, 'Ejercicio'), muscle: str(v.muscle, '', 50),
    rest: num(v.rest, 0, 900, 90), repsMin: num(v.repsMin, 0, 100, 0), repsMax: num(v.repsMax, 0, 100, 0),
    tracking: oneOf(v.tracking, TRACKING), targetSeconds: optNum(v.targetSeconds, 1, 7200),
    groupId: typeof v.groupId === 'string' ? v.groupId.slice(0, 50) : undefined,
    deload: v.deload === true ? true : undefined,
    auto: autoProgress(v.auto),
    assisted: v.assisted === true ? true : undefined,
    unilateral: v.unilateral === true ? true : undefined,
    bodyweight: optNum(v.bodyweight, 20, 400),
    pain: optNum(v.pain, 1, 10),
    painNote: typeof v.painNote === 'string' && v.painNote.trim() ? v.painNote.slice(0, 100) : undefined,
    sets: list(v.sets, setEntry, 100),
  }
}

function session(v: unknown): Session | undefined {
  if (!isObj(v) || typeof v.start !== 'number') return undefined
  const start = num(v.start, EPOCH_MIN, EPOCH_MAX, Date.now())
  return {
    id: str(v.id, uid(), 50), name: str(v.name, 'Entrenamiento', 100), routineId: typeof v.routineId === 'string' ? v.routineId.slice(0, 50) : undefined,
    start, end: optNum(v.end, start, EPOCH_MAX), notes: str(v.notes, '', 2000), exercises: list(v.exercises, sessionExercise, 100),
  }
}

function measurement(v: unknown): Measurement | undefined {
  if (!isObj(v)) return undefined
  return {
    id: str(v.id, uid(), 50), date: num(v.date, EPOCH_MIN, EPOCH_MAX, Date.now()),
    weight: optNum(v.weight, 1, 500), bodyFat: optNum(v.bodyFat, 1, 80), waist: optNum(v.waist, 1, 300),
    chest: optNum(v.chest, 1, 300), arm: optNum(v.arm, 1, 150), thigh: optNum(v.thigh, 1, 200),
  }
}

function settings(v: unknown): Settings {
  const s = isObj(v) ? v : {}
  const d = defaultSettings
  return {
    name: str(s.name, '', 60), unit: oneOf(s.unit, ['kg', 'lb'] as const) ?? d.unit,
    defaultRest: num(s.defaultRest, 0, 900, d.defaultRest), weeklyGoal: num(s.weeklyGoal, 1, 7, d.weeklyGoal),
    activeProgram: str(s.activeProgram, '', 100), onboarded: true,
    goal: oneOf(s.goal, ['hypertrophy', 'strength', 'fatLoss', 'general'] as const) ?? d.goal,
    level: oneOf(s.level, ['beginner', 'intermediate', 'advanced'] as const) ?? d.level,
    days: num(s.days, 2, 6, d.days), minutes: num(s.minutes, 20, 120, d.minutes),
    equipment: oneOf(s.equipment, ['gym', 'dumbbells', 'kettlebell', 'bands', 'bodyweight'] as const) ?? d.equipment,
    favorites: list(s.favorites, (x) => (typeof x === 'string' ? x.slice(0, 200) : undefined), 2000),
    restSound: bool(s.restSound, d.restSound), rpe: bool(s.rpe, d.rpe),
    lockScreenAlert: s.lockScreenAlert === true ? true : undefined,
    voice: s.voice === true ? true : undefined,
    barKg: optNum(s.barKg, 1, 50),
    language: oneOf(s.language, ['es', 'en'] as const),
    theme: oneOf(s.theme, ['light', 'dark'] as const),
    plates: isObj(s.plates) ? {
      kg: list(s.plates.kg, (x) => (typeof x === 'number' && PLATE_OPTIONS.kg.includes(x) ? x : undefined), 20),
      lb: list(s.plates.lb, (x) => (typeof x === 'number' && PLATE_OPTIONS.lb.includes(x) ? x : undefined), 20),
    } : undefined,
    block: cleanBlock(s.block),
    exerciseModes: exerciseModes(s.exerciseModes),
    simpleMode: typeof s.simpleMode === 'boolean' ? s.simpleMode : undefined,
    effortRestOff: s.effortRestOff === true ? true : undefined,
    guideHidden: s.guideHidden === true ? true : undefined,
    guideProgressSeen: s.guideProgressSeen === true ? true : undefined,
    shareBodyWeight: s.shareBodyWeight === true ? true : undefined,
    friendShareAt: optNum(s.friendShareAt, EPOCH_MIN, EPOCH_MAX),
    friendReminderOff: s.friendReminderOff === true ? true : undefined,
    friendReminderSnooze: optNum(s.friendReminderSnooze, EPOCH_MIN, EPOCH_MAX + 365 * DAY),
    catalogVersion: optNum(s.catalogVersion, 1, 99),
    lastBackupAt: optNum(s.lastBackupAt, EPOCH_MIN, EPOCH_MAX),
    backupSnoozeUntil: optNum(s.backupSnoozeUntil, EPOCH_MIN, EPOCH_MAX + 365 * DAY),
    nutrition: nutritionGoals(s.nutrition),
    nutritionCarryOver: s.nutritionCarryOver === false ? false : undefined,
    nutritionTrainingSplit: s.nutritionTrainingSplit === false ? false : undefined,
    nutritionAdviceAt: optNum(s.nutritionAdviceAt, EPOCH_MIN, EPOCH_MAX),
    foodReminders: s.foodReminders === true ? true : undefined,
  }
}

function exerciseModes(v: unknown): Settings['exerciseModes'] {
  if (!isObj(v)) return undefined
  const modes: NonNullable<Settings['exerciseModes']> = {}
  for (const [id, m] of Object.entries(v).slice(0, 2000)) {
    if (!isObj(m) || id.length > 200) continue
    const mode = { ...(m.assisted === true ? { assisted: true } : {}), ...(m.unilateral === true ? { unilateral: true } : {}) }
    if (Object.keys(mode).length) modes[id] = mode
  }
  return Object.keys(modes).length ? modes : undefined
}

function exerciseNotes(v: unknown): Record<string, string> {
  if (!isObj(v)) return {}
  const notes: Record<string, string> = {}
  for (const [id, text] of Object.entries(v).slice(0, 2000)) {
    if (typeof text === 'string' && text.trim() && id.length <= 200) notes[id] = text.slice(0, MAX_EXERCISE_NOTE)
  }
  return notes
}

// MARK: Comidas

function per100(v: unknown): Per100 | undefined {
  if (!isObj(v)) return undefined
  const kcal = optNum(v.kcal, 0, 1000), p = optNum(v.p, 0, 100), c = optNum(v.c, 0, 100), f = optNum(v.f, 0, 100)
  const extra = optionals({ fiber: optNum(v.fiber, 0, 100), sugar: optNum(v.sugar, 0, 100), salt: optNum(v.salt, 0, 100) })
  return kcal !== undefined && p !== undefined && c !== undefined && f !== undefined ? { kcal, p, c, f, ...extra } : undefined
}

function foodRef(v: unknown): FoodRef | undefined {
  if (!isObj(v)) return undefined
  const kind = oneOf(v.kind, ['basic', 'off', 'mine', 'quick'] as const)
  return kind && typeof v.id === 'string' ? { kind, id: v.id.slice(0, 60) } : undefined
}

function foodEntry(v: unknown): FoodEntry | undefined {
  if (!isObj(v) || typeof v.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v.day)) return undefined
  const values = per100(v.per100), meal = oneOf(v.meal, MEALS), grams = optNum(v.grams, 0.1, 5000)
  if (!values || !meal || grams === undefined) return undefined
  return { id: str(v.id, uid(), 50), day: v.day, meal, name: str(v.name, '', 120) || t('Alimento', 'Food'), grams, per100: values, ref: foodRef(v.ref), at: num(v.at, EPOCH_MIN, EPOCH_MAX, Date.now()) }
}

function myFood(v: unknown): MyFood | undefined {
  if (!isObj(v)) return undefined
  const values = per100(v.per100)
  const name = str(v.name, '', 120)
  if (!values || !name) return undefined
  const portion = isObj(v.portion) && optNum(v.portion.g, 0.1, 5000) !== undefined ? { label: str(v.portion.label, '', 60), g: v.portion.g as number } : undefined
  return {
    id: str(v.id, uid(), 50), name, per100: values, source: v.source === 'off' || v.source === 'aesan' ? v.source : 'mine',
    ...(typeof v.brand === 'string' && v.brand ? { brand: v.brand.slice(0, 80) } : {}),
    ...(typeof v.barcode === 'string' && /^\d{8,14}$/.test(v.barcode) ? { barcode: v.barcode } : {}),
    ...(portion ? { portion } : {}),
    ...(recipe(v.recipe) ? { recipe: recipe(v.recipe) } : {}),
  }
}

function recipe(v: unknown): Recipe | undefined {
  if (!isObj(v)) return undefined
  const items = list(v.items, (x) => {
    if (!isObj(x)) return undefined
    const values = per100(x.per100), grams = optNum(x.grams, 0.1, 5000)
    return values && grams !== undefined ? { name: str(x.name, '', 120) || t('Alimento', 'Food'), grams, per100: values, ref: foodRef(x.ref) } : undefined
  }, 60)
  if (!items.length) return undefined
  const cookedG = optNum(v.cookedG, 1, 50000)
  return { items, servings: num(v.servings, 1, 100, 1), ...(cookedG ? { cookedG } : {}) }
}

function savedMeal(v: unknown): SavedMeal | undefined {
  if (!isObj(v)) return undefined
  const items = list(v.items, (x) => {
    if (!isObj(x)) return undefined
    const values = per100(x.per100), grams = optNum(x.grams, 0.1, 5000)
    return values && grams !== undefined ? { name: str(x.name, '', 120) || t('Alimento', 'Food'), grams, per100: values, ref: foodRef(x.ref) } : undefined
  }, 50)
  return items.length ? { id: str(v.id, uid(), 50), name: str(v.name, '', 80) || t('Comida', 'Meal'), items } : undefined
}

function nutrition(v: unknown): NutritionData {
  if (!isObj(v)) return { entries: [], foods: [], meals: [] }
  const prefs = planPrefs(v.prefs)
  const favs = list(v.favorites, (x) => (typeof x === 'string' && /^(basic|off|mine):.{1,60}$/.test(x) ? x : undefined), 60)
  const trainingDays = list(v.trainingDays, (x) => (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : undefined), 400)
  return {
    entries: list(v.entries, foodEntry, 50000), foods: list(v.foods, myFood, 2000), meals: list(v.meals, savedMeal, 200),
    ...(prefs ? { prefs } : {}), ...(trainingDays.length ? { trainingDays } : {}), ...(water(v.water) ? { water: water(v.water) } : {}),
    ...(week(v.week) ? { week: week(v.week) } : {}),
    ...(favs.length ? { favorites: favs } : {}),
  }
}

function week(v: unknown): NutritionData['week'] {
  if (!isObj(v) || !isObj(v.days)) return undefined
  const days: NonNullable<NutritionData['week']>['days'] = {}
  for (let i = 0; i < 7; i++) {
    const items = list((v.days as Record<string, unknown>)[i], (x) => {
      if (!isObj(x)) return undefined
      const values = per100(x.per100), grams = optNum(x.grams, 0.1, 5000), meal = oneOf(x.meal, MEALS)
      return values && grams !== undefined && meal ? { meal, name: str(x.name, '', 120) || t('Alimento', 'Food'), grams, per100: values, ref: foodRef(x.ref) } : undefined
    }, 100)
    if (items.length) days[i] = items
  }
  return Object.keys(days).length ? { saved: num(v.saved, EPOCH_MIN, EPOCH_MAX, Date.now()), days } : undefined
}

function water(v: unknown): Record<string, number> | undefined {
  if (!isObj(v)) return undefined
  const out: Record<string, number> = {}
  for (const [day, n] of Object.entries(v).slice(-2000)) if (/^\d{4}-\d{2}-\d{2}$/.test(day) && typeof n === 'number' && n > 0) out[day] = Math.min(40, Math.round(n))
  return Object.keys(out).length ? out : undefined
}

/** Lo aprendido para el menú propuesto (el menú del día no se copia: se rehace). */
function planPrefs(v: unknown): PlanPrefs | undefined {
  if (!isObj(v)) return undefined
  const dishes: PlanPrefs['dishes'] = {}, removed: PlanPrefs['removed'] = {}
  if (isObj(v.dishes)) for (const [id, x] of Object.entries(v.dishes).slice(0, 500)) {
    if (id.length <= 400 && isObj(x)) dishes[id] = { yes: num(x.yes, 0, 10000, 0), no: num(x.no, 0, 10000, 0) }
  }
  if (isObj(v.removed)) for (const [key, n] of Object.entries(v.removed).slice(0, 500)) {
    if (key.length <= 200) removed[key] = num(n, 0, 10000, 0)
  }
  return Object.keys(dishes).length || Object.keys(removed).length ? { dishes, removed } : undefined
}

function nutritionGoals(v: unknown): NutritionGoals | undefined {
  if (!isObj(v)) return undefined
  const kcal = optNum(v.kcal, 500, 10000), protein = optNum(v.protein, 0, 600), carbs = optNum(v.carbs, 0, 1500), fat = optNum(v.fat, 0, 600)
  if (kcal === undefined || protein === undefined || carbs === undefined || fat === undefined) return undefined
  return {
    kcal, protein, carbs, fat,
    sex: oneOf(v.sex, ['m', 'f'] as const), age: optNum(v.age, 10, 110), heightCm: optNum(v.heightCm, 100, 250),
    weightKg: optNum(v.weightKg, 25, 400), activity: optNum(v.activity, 1, 2.5), aim: oneOf(v.aim, ['lose', 'keep', 'gain'] as const),
    proteinPerKg: optNum(v.proteinPerKg, 1, 3.5),
    proteinOnly: v.proteinOnly === true ? true : undefined,
    adjust: optNum(v.adjust, -3000, 3000) || undefined,
  }
}

/** Convierte el contenido de un archivo en datos válidos, o lanza un error si no es una copia. */
export function parseBackup(text: string): AppData {
  if (text.length > MAX_BACKUP_BYTES) throw new Error(t('El archivo es demasiado grande.', 'The file is too large.'))
  const raw: unknown = JSON.parse(text)
  if (!isObj(raw) || !Array.isArray(raw.sessions) || !Array.isArray(raw.routines)) throw new Error(t('No es una copia de Serix.', 'This is not a Serix backup.'))
  return {
    version: 1,
    routines: list(raw.routines, routine, 1000),
    sessions: list(raw.sessions, session, 20000),
    measurements: list(raw.measurements, measurement, 5000),
    exerciseNotes: exerciseNotes(raw.exerciseNotes),
    friends: list(raw.friends, cleanSnapshot, 200),
    challenges: list(raw.challenges, cleanChallenge, 100),
    customExercises: list(raw.customExercises, cleanCustomExercise, MAX_CUSTOM_EXERCISES),
    nutrition: nutrition(raw.nutrition),
    settings: settings(raw.settings),
  }
}
