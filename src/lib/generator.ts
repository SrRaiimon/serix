import type { Catalog, Exercise } from './catalog'
import { t } from './i18n'
import type { Progression } from './store'

export type TrainingGoal = 'hypertrophy' | 'strength' | 'fatLoss' | 'general'
export type TrainingLevel = 'beginner' | 'intermediate' | 'advanced'
export type EquipmentProfile = 'gym' | 'dumbbells' | 'kettlebell' | 'bands' | 'bodyweight'

// Los textos son getters para que salgan en el idioma actual cada vez que se leen.
export const goals: { id: TrainingGoal; label: string; short: string; detail: string }[] = [
  { id: 'hypertrophy', get label() { return t('Ganar músculo', 'Build muscle') }, get short() { return t('Hipertrofia', 'Hypertrophy') }, get detail() { return t('Series de 6-15 repeticiones y volumen moderado-alto.', 'Sets of 6-15 reps and moderate-to-high volume.') } },
  { id: 'strength', get label() { return t('Ganar fuerza', 'Get stronger') }, get short() { return t('Fuerza', 'Strength') }, get detail() { return t('Básicos pesados a pocas repeticiones y descansos largos.', 'Heavy compound lifts, low reps and long rests.') } },
  { id: 'fatLoss', get label() { return t('Perder grasa', 'Lose fat') }, get short() { return t('Definición', 'Fat loss') }, get detail() { return t('Circuitos con más repeticiones, descansos cortos y cardio.', 'Circuits with higher reps, short rests and cardio.') } },
  { id: 'general', get label() { return t('Estar en forma', 'Get fit') }, get short() { return t('Salud', 'Fitness') }, get detail() { return t('Un poco de todo para moverte mejor y sentirte bien.', 'A bit of everything to move better and feel good.') } },
]

export const levels: { id: TrainingLevel; label: string; detail: string }[] = [
  { id: 'beginner', get label() { return t('Principiante', 'Beginner') }, get detail() { return t('Menos de 6 meses entrenando con regularidad.', 'Less than 6 months of regular training.') } },
  { id: 'intermediate', get label() { return t('Intermedio', 'Intermediate') }, get detail() { return t('Entre 6 meses y 2 años entrenando.', 'Between 6 months and 2 years of training.') } },
  { id: 'advanced', get label() { return t('Avanzado', 'Advanced') }, get detail() { return t('Más de 2 años y dominas la técnica de los básicos.', 'Over 2 years and solid technique on the main lifts.') } },
]

export const equipmentProfiles: { id: EquipmentProfile; label: string; allowed: string[] }[] = [
  { id: 'gym', get label() { return t('Gimnasio completo', 'Full gym') }, allowed: ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'band', 'kettlebell', 'ez-bar', 'medicine-ball', 'exercise-ball'] },
  { id: 'dumbbells', get label() { return t('Mancuernas y banco', 'Dumbbells and bench') }, allowed: ['dumbbell', 'bodyweight'] },
  { id: 'kettlebell', get label() { return t('Kettlebells', 'Kettlebells') }, allowed: ['kettlebell', 'bodyweight'] },
  { id: 'bands', get label() { return t('Bandas elásticas', 'Resistance bands') }, allowed: ['band', 'bodyweight'] },
  { id: 'bodyweight', get label() { return t('Solo peso corporal', 'Bodyweight only') }, allowed: ['bodyweight'] },
]

export const goalInfo = (g: TrainingGoal) => goals.find((x) => x.id === g)!
export const levelInfo = (l: TrainingLevel) => levels.find((x) => x.id === l)!
export const equipmentInfo = (e: EquipmentProfile) => equipmentProfiles.find((x) => x.id === e)!

export interface GeneratorConfig {
  goal: TrainingGoal
  level: TrainingLevel
  days: number
  minutes: number
  equipment: EquipmentProfile
}

export interface GeneratedExercise {
  exercise: Exercise
  sets: number
  repsMin: number
  repsMax: number
  rest: number
  /** Sin valor: doble progresión (en los de peso y repeticiones). */
  progression?: Progression
  trainingMax?: number
}

export interface GeneratedProgram {
  name: string
  summary: string
  days: { name: string; exercises: GeneratedExercise[] }[]
}

// Cada hueco tiene ejercicios preferidos (identificadores del catálogo, comprobados por
// scripts/catalog/check_ids.py) de más a menos equipamiento; si ninguno encaja se busca por músculo.

type Kind = 'compound' | 'accessory' | 'core' | 'conditioning'

interface Slot {
  kind: Kind
  muscles: string[]
  preferred: string[]
  /** Si se indica, el respaldo solo acepta ejercicios cuyo nombre en inglés encaje (mismo movimiento). */
  match?: RegExp
}

const slots = {
  squat: { kind: 'compound', muscles: ['quads', 'glutes'], preferred: ['Barbell_Full_Squat', 'Front_Barbell_Squat', 'Dumbbell_Squat', 'Goblet_Squat', 'Squats_-_With_Bands', 'Bodyweight_Squat', 'Split_Squats'] },
  hinge: { kind: 'compound', muscles: ['hamstrings', 'glutes'], preferred: ['Barbell_Deadlift', 'Romanian_Deadlift', 'Stiff-Legged_Dumbbell_Deadlift', 'One-Arm_Kettlebell_Swings', 'Band_Good_Morning', 'Barbell_Hip_Thrust', 'Single_Leg_Glute_Bridge'] },
  legPress: { kind: 'compound', muscles: ['quads', 'glutes'], preferred: ['Leg_Press', 'Barbell_Walking_Lunge', 'Dumbbell_Lunges', 'Lunge_Pass_Through', 'Dumbbell_Step_Ups', 'Bodyweight_Walking_Lunge'] },
  lunge: { kind: 'accessory', muscles: ['quads', 'glutes'], preferred: ['Dumbbell_Lunges', 'Barbell_Lunge', 'Split_Squat_with_Dumbbells', 'Bodyweight_Walking_Lunge', 'Split_Squats'] },
  legCurl: { kind: 'accessory', muscles: ['hamstrings'], match: /curl|glute.?ham/i, preferred: ['Lying_Leg_Curls', 'Seated_Leg_Curl', 'Ball_Leg_Curl', 'Floor_Glute-Ham_Raise'] },
  legExtension: { kind: 'accessory', muscles: ['quads'], match: /extension|sissy/i, preferred: ['Leg_Extensions', 'Single-Leg_Leg_Extension', 'Weighted_Sissy_Squat'] },
  calves: { kind: 'accessory', muscles: ['calves'], match: /calf/i, preferred: ['Standing_Calf_Raises', 'Standing_Barbell_Calf_Raise', 'Standing_Dumbbell_Calf_Raise', 'Seated_Calf_Raise', 'Calf_Raises_-_With_Bands'] },
  chestPress: { kind: 'compound', muscles: ['pectorals'], preferred: ['Barbell_Bench_Press_-_Medium_Grip', 'Dumbbell_Bench_Press', 'Alternating_Floor_Press', 'Bench_Press_-_With_Bands', 'Pushups'] },
  inclinePress: { kind: 'compound', muscles: ['pectorals'], preferred: ['Barbell_Incline_Bench_Press_-_Medium_Grip', 'Incline_Dumbbell_Press', 'One-Arm_Kettlebell_Floor_Press', 'Dips_-_Chest_Version', 'Decline_Push-Up'] },
  chestFly: { kind: 'accessory', muscles: ['pectorals'], match: /fly|flye|cross|butterfly/i, preferred: ['Cable_Crossover', 'Butterfly', 'Dumbbell_Flyes', 'Cross_Over_-_With_Bands', 'Incline_Dumbbell_Flyes', 'Push-Up_Wide'] },
  verticalPull: { kind: 'compound', muscles: ['lats'], match: /pull-?up|pullup|chin|pulldown/i, preferred: ['Pullups', 'Wide-Grip_Lat_Pulldown', 'Full_Range-Of-Motion_Lat_Pulldown', 'Close-Grip_Front_Lat_Pulldown', 'Chin-Up', 'Band_Assisted_Pull-Up'] },
  horizontalPull: { kind: 'compound', muscles: ['upper-back', 'lats'], match: /row/i, preferred: ['Bent_Over_Barbell_Row', 'Seated_Cable_Rows', 'Bent_Over_Two-Dumbbell_Row', 'One-Arm_Dumbbell_Row', 'Two-Arm_Kettlebell_Row', 'Inverted_Row'] },
  shoulderPress: { kind: 'compound', muscles: ['delts'], preferred: ['Barbell_Shoulder_Press', 'Dumbbell_Shoulder_Press', 'Seated_Dumbbell_Press', 'Kettlebell_Seated_Press', 'Shoulder_Press_-_With_Bands', 'Handstand_Push-Ups'] },
  lateralRaise: { kind: 'accessory', muscles: ['delts'], match: /lateral|side|deltoid raise/i, preferred: ['Side_Lateral_Raise', 'Cable_Seated_Lateral_Raise', 'Seated_Side_Lateral_Raise', 'Lateral_Raise_-_With_Bands', 'Kettlebell_Arnold_Press'] },
  rearDelt: { kind: 'accessory', muscles: ['delts'], match: /rear|reverse fly|face pull|pull apart|back fly/i, preferred: ['Face_Pull', 'Reverse_Flyes', 'Seated_Bent-Over_Rear_Delt_Raise', 'Back_Flyes_-_With_Bands', 'Band_Pull_Apart'] },
  shrug: { kind: 'accessory', muscles: ['traps'], match: /shrug|upright|high pull/i, preferred: ['Barbell_Shrug', 'Dumbbell_Shrug', 'Kettlebell_Sumo_High_Pull', 'Upright_Row_-_With_Bands', 'Scapular_Pull-Up'] },
  biceps: { kind: 'accessory', muscles: ['biceps'], match: /curl|chin/i, preferred: ['Barbell_Curl', 'Dumbbell_Bicep_Curl', 'EZ-Bar_Curl', 'Standing_Biceps_Cable_Curl', 'Close-Grip_EZ-Bar_Curl_with_Band', 'Chin-Up'] },
  hammer: { kind: 'accessory', muscles: ['biceps'], match: /hammer|curl/i, preferred: ['Hammer_Curls', 'Cable_Hammer_Curls_-_Rope_Attachment', 'Alternate_Hammer_Curl', 'Chin-Up'] },
  triceps: { kind: 'accessory', muscles: ['triceps'], match: /tricep|dip|skull|kickback|pushdown|close/i, preferred: ['Triceps_Pushdown', 'Lying_Triceps_Press', 'Standing_Dumbbell_Triceps_Extension', 'Band_Skull_Crusher', 'Dips_-_Triceps_Version', 'Push-Ups_-_Close_Triceps_Position', 'Bench_Dips'] },
  core: { kind: 'core', muscles: ['abs'], preferred: ['Hanging_Leg_Raise', 'Dead_Bug', 'Crunches', 'Russian_Twist', 'Plank', 'Kettlebell_Windmill', 'Cable_Crunch'] },
  // Acondicionamiento: se elige por tipo (cardio o pliometría), no por músculo.
  conditioning: { kind: 'conditioning', muscles: [], preferred: ['Mountain_Climbers', 'Rope_Jumping', 'One-Arm_Kettlebell_Swings', 'Box_Jump_Multiple_Response', 'Freehand_Jump_Squat', 'Battling_Ropes'] },
} satisfies Record<string, Slot>

type SlotName = keyof typeof slots
type Template = { name: [es: string, en: string]; slots: [SlotName, number][] }

const T = (name: [string, string], list: [SlotName, number][]): Template => ({ name, slots: list })

const fullBodyA = T(['Cuerpo completo A', 'Full body A'], [['squat', 0], ['chestPress', 0], ['horizontalPull', 0], ['shoulderPress', 0], ['legCurl', 0], ['biceps', 0], ['core', 0], ['calves', 0]])
const fullBodyB = T(['Cuerpo completo B', 'Full body B'], [['hinge', 1], ['inclinePress', 0], ['verticalPull', 0], ['lateralRaise', 0], ['lunge', 0], ['triceps', 0], ['core', 1], ['rearDelt', 0]])
const fullBodyC = T(['Cuerpo completo C', 'Full body C'], [['legPress', 0], ['chestPress', 1], ['horizontalPull', 1], ['shoulderPress', 1], ['legExtension', 0], ['hammer', 0], ['conditioning', 0], ['calves', 1]])
const pushA = T(['Empuje', 'Push'], [['chestPress', 0], ['shoulderPress', 0], ['inclinePress', 0], ['lateralRaise', 0], ['chestFly', 0], ['triceps', 0], ['triceps', 1], ['core', 0]])
const pullA = T(['Tirón', 'Pull'], [['verticalPull', 0], ['horizontalPull', 0], ['horizontalPull', 1], ['rearDelt', 0], ['biceps', 0], ['hammer', 0], ['shrug', 0], ['core', 1]])
const legsA = T(['Pierna', 'Legs'], [['squat', 0], ['hinge', 1], ['legPress', 0], ['legCurl', 0], ['legExtension', 0], ['calves', 0], ['core', 0], ['lunge', 0]])
const pushB = T(['Empuje B', 'Push B'], [['inclinePress', 1], ['shoulderPress', 1], ['chestPress', 1], ['lateralRaise', 1], ['chestFly', 1], ['triceps', 2], ['triceps', 3], ['core', 2]])
const pullB = T(['Tirón B', 'Pull B'], [['horizontalPull', 2], ['verticalPull', 1], ['horizontalPull', 3], ['rearDelt', 1], ['biceps', 1], ['hammer', 1], ['shrug', 1], ['core', 3]])
const legsB = T(['Pierna B', 'Legs B'], [['hinge', 0], ['squat', 1], ['lunge', 1], ['legCurl', 1], ['legExtension', 0], ['calves', 1], ['core', 2], ['legPress', 1]])
const upperA = T(['Torso A', 'Upper A'], [['chestPress', 0], ['horizontalPull', 0], ['shoulderPress', 0], ['verticalPull', 0], ['lateralRaise', 0], ['biceps', 0], ['triceps', 0], ['rearDelt', 0]])
const upperB = T(['Torso B', 'Upper B'], [['inclinePress', 0], ['verticalPull', 1], ['shoulderPress', 1], ['horizontalPull', 1], ['chestFly', 0], ['hammer', 0], ['triceps', 1], ['lateralRaise', 1]])
const lowerA = T(['Pierna A', 'Legs A'], [['squat', 0], ['hinge', 1], ['legCurl', 0], ['lunge', 0], ['calves', 0], ['core', 0], ['legExtension', 0], ['core', 1]])
const lowerB = T(['Pierna B', 'Legs B'], [['hinge', 0], ['legPress', 0], ['squat', 1], ['legCurl', 1], ['legExtension', 0], ['calves', 1], ['core', 2], ['lunge', 1]])

function split(c: GeneratorConfig): [string, Template[]] {
  if (c.days <= 2) return [t('Cuerpo completo', 'Full body'), [fullBodyA, fullBodyB]]
  if (c.days === 3) {
    return c.level === 'beginner' || c.goal === 'fatLoss'
      ? [t('Cuerpo completo', 'Full body'), [fullBodyA, fullBodyB, fullBodyC]]
      : [t('Empuje / Tirón / Pierna', 'Push / Pull / Legs'), [pushA, pullA, legsA]]
  }
  if (c.days === 4) return [t('Torso / Pierna', 'Upper / Lower'), [upperA, lowerA, upperB, lowerB]]
  if (c.days === 5) return [t('Híbrido PPL + Torso / Pierna', 'PPL + Upper / Lower hybrid'), [pushA, pullA, legsA, upperB, lowerB]]
  return [t('Empuje / Tirón / Pierna ×2', 'Push / Pull / Legs ×2'), [pushA, pullA, legsA, pushB, pullB, legsB]]
}

function exerciseCount(minutes: number) {
  if (minutes < 40) return 4
  if (minutes < 55) return 5
  if (minutes < 70) return 6
  if (minutes < 85) return 7
  return 8
}

function scheme(kind: Kind, c: GeneratorConfig) {
  const table: Record<TrainingGoal, Record<Kind, [number, number, number, number]>> = {
    strength: { compound: [4, 3, 5, 180], accessory: [3, 6, 10, 120], core: [3, 12, 15, 60], conditioning: [3, 10, 15, 45] },
    hypertrophy: { compound: [4, 6, 10, 120], accessory: [3, 10, 15, 75], core: [3, 12, 15, 60], conditioning: [3, 10, 15, 45] },
    fatLoss: { compound: [3, 10, 15, 75], accessory: [3, 12, 20, 45], core: [3, 15, 20, 30], conditioning: [3, 15, 20, 30] },
    general: { compound: [3, 8, 12, 90], accessory: [3, 10, 15, 60], core: [3, 12, 15, 60], conditioning: [3, 10, 15, 45] },
  }
  let [sets, repsMin, repsMax, rest] = table[c.goal][kind]
  if (c.level === 'beginner' && (kind === 'compound' || kind === 'accessory')) sets = Math.max(2, sets - 1)
  if (c.level === 'advanced' && kind === 'compound') sets += 1
  return { sets, repsMin, repsMax, rest }
}

function pick(slot: Slot, variant: number, allowed: Set<string>, used: Set<string>, catalog: Catalog): Exercise | undefined {
  const preferred = slot.preferred.map((id) => catalog.get(id)).filter((e): e is Exercise => !!e && allowed.has(e.equipment))
  for (let offset = 0; offset < preferred.length; offset++) {
    const candidate = preferred[(variant + offset) % preferred.length]
    if (!used.has(candidate.id)) return candidate
  }
  // Alternativa: el ejercicio más básico (nombre más corto, nivel más fácil) que encaje.
  const fits = (e: Exercise) => slot.kind === 'conditioning'
    ? e.category === 'cardio' || e.category === 'plyometrics'
    : slot.muscles.includes(e.muscle) && e.category === 'strength' && (!slot.match || slot.match.test(e.nameEn))
  const levelRank: Record<string, number> = { beginner: 0, intermediate: 1, expert: 2 }
  const fallback = catalog.exercises
    .filter((e) => fits(e) && allowed.has(e.equipment) && !used.has(e.id))
    .sort((a, b) => (levelRank[a.level] ?? 1) - (levelRank[b.level] ?? 1) || a.nameEn.length - b.nameEn.length)
  return fallback.length ? fallback[Math.min(variant, fallback.length - 1)] : undefined
}

/** `variation` desplaza la elección en cada hueco para obtener una alternativa al mismo plan. */
export function generate(c: GeneratorConfig, catalog: Catalog, variation = 0): GeneratedProgram {
  const [splitName, templates] = split(c)
  const n = exerciseCount(c.minutes)
  const allowed = new Set(equipmentInfo(c.equipment).allowed)

  const days = templates.map((template, index) => {
    const used = new Set<string>()
    const list: [SlotName, number][] = template.slots.slice(0, n)
    if (c.goal === 'fatLoss' && !list.some(([s]) => s === 'conditioning')) list.push(['conditioning', index])
    const exercises: GeneratedExercise[] = []
    for (const [name, variant] of list) {
      const slot: Slot = slots[name]
      const exercise = pick(slot, variant + variation, allowed, used, catalog)
      if (!exercise) continue
      used.add(exercise.id)
      exercises.push({ exercise, ...scheme(slot.kind, c) })
    }
    return { name: `${t(`Día ${index + 1}`, `Day ${index + 1}`)} · ${t(...template.name)}`, exercises }
  })

  return {
    name: `${splitName} · ${goalInfo(c.goal).short}`,
    summary: `${t(`${c.days} días por semana`, `${c.days} days a week`)} · ${c.minutes} min · ${levelInfo(c.level).label} · ${equipmentInfo(c.equipment).label}`,
    days,
  }
}
