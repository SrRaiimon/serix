import type { Catalog, Exercise } from './catalog'
import { t } from './i18n'
import { isIsolation } from './isolation'
import { MAIN_GROUPS } from './labels'
import { defaultTracking, exerciseSeconds, PROGRAM_TARGET_SECONDS } from './tracking'
import type { Progression } from './store'
import { ABS_GROUP, countsForVolume, groupRange, groupShares } from './volume'

export type TrainingGoal = 'hypertrophy' | 'strength' | 'fatLoss' | 'general'
export type TrainingLevel = 'beginner' | 'intermediate' | 'advanced'
export type EquipmentProfile = 'gym' | 'dumbbells' | 'kettlebell' | 'bands' | 'bodyweight'

// Los textos son getters para que salgan en el idioma actual cada vez que se leen.
export const goals: { id: TrainingGoal; label: string; short: string; detail: string }[] = [
  { id: 'hypertrophy', get label() { return t('Ganar músculo', 'Build muscle') }, get short() { return t('Hipertrofia', 'Hypertrophy') }, get detail() { return t('Series de 6-15 repeticiones y volumen moderado-alto.', 'Sets of 6-15 reps and moderate-to-high volume.') } },
  { id: 'strength', get label() { return t('Ganar fuerza', 'Get stronger') }, get short() { return t('Fuerza', 'Strength') }, get detail() { return t('Básicos pesados a pocas repeticiones y descansos largos.', 'Heavy compound lifts, low reps and long rests.') } },
  { id: 'fatLoss', get label() { return t('Perder grasa', 'Lose fat') }, get short() { return t('Definición', 'Fat loss') }, get detail() { return t('Básicos pesados para conservar músculo, accesorios con menos descanso y algo de cardio.', 'Heavy compound lifts to keep muscle, accessories with shorter rests and some cardio.') } },
  { id: 'general', get label() { return t('Estar en forma', 'Get fit') }, get short() { return t('Salud', 'Fitness') }, get detail() { return t('Un poco de todo para moverte mejor y sentirte bien.', 'A bit of everything to move better and feel good.') } },
]

export const levels: { id: TrainingLevel; label: string; detail: string }[] = [
  { id: 'beginner', get label() { return t('Principiante', 'Beginner') }, get detail() { return t('Menos de 6 meses entrenando con regularidad.', 'Less than 6 months of regular training.') } },
  { id: 'intermediate', get label() { return t('Intermedio', 'Intermediate') }, get detail() { return t('Entre 6 meses y 2 años entrenando.', 'Between 6 months and 2 years of training.') } },
  { id: 'advanced', get label() { return t('Avanzado', 'Advanced') }, get detail() { return t('Más de 2 años y dominas la técnica de los básicos.', 'Over 2 years and solid technique on the main lifts.') } },
]

export const equipmentProfiles: { id: EquipmentProfile; label: string; detail: string; allowed: string[] }[] = [
  { id: 'gym', get label() { return t('Gimnasio completo', 'Full gym') }, get detail() { return t('Barras, máquinas, poleas y mancuernas.', 'Barbells, machines, cables and dumbbells.') }, allowed: ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'band', 'kettlebell', 'ez-bar', 'medicine-ball', 'exercise-ball'] },
  { id: 'dumbbells', get label() { return t('Mancuernas y banco', 'Dumbbells and bench') }, get detail() { return t('En casa o en un gimnasio pequeño, con pesos que puedas cambiar.', 'At home or in a small gym, with adjustable weights.') }, allowed: ['dumbbell', 'bodyweight'] },
  { id: 'kettlebell', get label() { return t('Kettlebells', 'Kettlebells') }, get detail() { return t('Una o varias pesas rusas.', 'One or more kettlebells.') }, allowed: ['kettlebell', 'bodyweight'] },
  { id: 'bands', get label() { return t('Bandas elásticas', 'Resistance bands') }, get detail() { return t('Gomas de varias resistencias, para casa o de viaje.', 'Bands of several strengths, for home or travel.') }, allowed: ['band', 'bodyweight'] },
  { id: 'bodyweight', get label() { return t('Solo peso corporal', 'Bodyweight only') }, get detail() { return t('Sin material: en casa, en un parque o de viaje.', 'No equipment: at home, in a park or on the road.') }, allowed: ['bodyweight'] },
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
  /** Barra de dominadas en casa (en el gimnasio se da por hecha). */
  pullupBar?: boolean
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
  squat: { kind: 'compound', muscles: ['quads', 'glutes'], match: /squat|lunge|split|step|leg press/i, preferred: ['Barbell_Full_Squat', 'Front_Barbell_Squat', 'Leg_Press', 'Hack_Squat', 'Dumbbell_Squat', 'Goblet_Squat', 'Split_Squat_with_Dumbbells', 'Front_Squats_With_Two_Kettlebells', 'Squats_-_With_Bands', 'Bodyweight_Bulgarian_Split_Squat', 'Pistol_Squat', 'Backpack_Squat', 'Bodyweight_Squat', 'Split_Squats'] },
  // El respaldo solo acepta bisagras de verdad: sin esto, sin material salían patadas de tijera como «peso muerto».
  hinge: { kind: 'compound', muscles: ['hamstrings', 'glutes'], match: /deadlift|good morning|hip thrust|bridge|swing|pull.?through|hyperextension/i, preferred: ['Barbell_Deadlift', 'Romanian_Deadlift', 'Stiff-Legged_Dumbbell_Deadlift', 'Barbell_Hip_Thrust', 'One-Arm_Kettlebell_Swings', 'Band_Good_Morning', 'Single_Leg_Glute_Bridge'] },
  legPress: { kind: 'compound', muscles: ['quads', 'glutes'], preferred: ['Leg_Press', 'Barbell_Walking_Lunge', 'Dumbbell_Lunges', 'Lunge_Pass_Through', 'Dumbbell_Step_Ups', 'Step-up_with_Knee_Raise', 'Bodyweight_Walking_Lunge'] },
  lunge: { kind: 'accessory', muscles: ['quads', 'glutes'], match: /lunge|split|step/i, preferred: ['Dumbbell_Lunges', 'Barbell_Lunge', 'Split_Squat_with_Dumbbells', 'Dumbbell_Rear_Lunge', 'Lunge_Pass_Through', 'Bodyweight_Walking_Lunge', 'Step-up_with_Knee_Raise', 'Split_Squats'] },
  // Sin máquinas, el curl femoral de verdad es el nórdico (desde intermedio); el peso muerto a una pierna queda
  // para cuando el día no tiene ya otra bisagra (ver `hingeUsed`).
  legCurl: { kind: 'accessory', muscles: ['hamstrings'], match: /curl|glute.?ham/i, preferred: ['Lying_Leg_Curls', 'Seated_Leg_Curl', 'Ball_Leg_Curl', 'Natural_Glute_Ham_Raise', 'Floor_Glute-Ham_Raise', 'Stiff-Legged_Dumbbell_Deadlift', 'Kettlebell_One-Legged_Deadlift', 'Single_Leg_Deadlift'] },
  legExtension: { kind: 'accessory', muscles: ['quads'], match: /extension|sissy/i, preferred: ['Leg_Extensions', 'Single-Leg_Leg_Extension', 'Weighted_Sissy_Squat', 'Wall_Sit'] },
  calves: { kind: 'accessory', muscles: ['calves'], match: /calf/i, preferred: ['Standing_Calf_Raises', 'Standing_Barbell_Calf_Raise', 'Standing_Dumbbell_Calf_Raise', 'Seated_Calf_Raise', 'Calf_Raises_-_With_Bands', 'Single_Leg_Calf_Raise'] },
  chestPress: { kind: 'compound', muscles: ['pectorals'], preferred: ['Barbell_Bench_Press_-_Medium_Grip', 'Dumbbell_Bench_Press', 'Alternating_Floor_Press', 'Bench_Press_-_With_Bands', 'Pushups'] },
  inclinePress: { kind: 'compound', muscles: ['pectorals'], preferred: ['Barbell_Incline_Bench_Press_-_Medium_Grip', 'Incline_Dumbbell_Press', 'One-Arm_Kettlebell_Floor_Press', 'Dips_-_Chest_Version', 'Decline_Push-Up'] },
  chestFly: { kind: 'accessory', muscles: ['pectorals'], match: /fly|flye|cross|butterfly/i, preferred: ['Cable_Crossover', 'Butterfly', 'Dumbbell_Flyes', 'Cross_Over_-_With_Bands', 'Incline_Dumbbell_Flyes', 'Push-Up_Wide'] },
  verticalPull: { kind: 'compound', muscles: ['lats'], match: /pull-?up|pullup|chin|pulldown/i, preferred: ['Pullups', 'Wide-Grip_Lat_Pulldown', 'Full_Range-Of-Motion_Lat_Pulldown', 'Close-Grip_Front_Lat_Pulldown', 'Chin-Up', 'Band_Assisted_Pull-Up', 'Negative_Pull-Up'] },
  horizontalPull: { kind: 'compound', muscles: ['upper-back', 'lats'], match: /row/i, preferred: ['Bent_Over_Barbell_Row', 'Seated_Cable_Rows', 'Bent_Over_Two-Dumbbell_Row', 'One-Arm_Dumbbell_Row', 'Two-Arm_Kettlebell_Row', 'Inverted_Row'] },
  shoulderPress: { kind: 'compound', muscles: ['delts'], preferred: ['Barbell_Shoulder_Press', 'Dumbbell_Shoulder_Press', 'Seated_Dumbbell_Press', 'Kettlebell_Seated_Press', 'Shoulder_Press_-_With_Bands', 'Handstand_Push-Ups'] },
  lateralRaise: { kind: 'accessory', muscles: ['delts'], match: /^(?!.*press).*(lateral|side|deltoid raise)/i, preferred: ['Side_Lateral_Raise', 'Cable_Seated_Lateral_Raise', 'Seated_Side_Lateral_Raise', 'Lateral_Raise_-_With_Bands'] },
  rearDelt: { kind: 'accessory', muscles: ['delts'], match: /rear|reverse fly|face pull|pull apart|back fly/i, preferred: ['Face_Pull', 'Reverse_Flyes', 'Seated_Bent-Over_Rear_Delt_Raise', 'Back_Flyes_-_With_Bands', 'Band_Pull_Apart', 'Reverse_Snow_Angels'] },
  shrug: { kind: 'accessory', muscles: ['traps'], match: /shrug|upright|high pull/i, preferred: ['Barbell_Shrug', 'Dumbbell_Shrug', 'Kettlebell_Sumo_High_Pull', 'Upright_Row_-_With_Bands', 'Scapular_Pull-Up'] },
  biceps: { kind: 'accessory', muscles: ['biceps'], match: /curl|chin/i, preferred: ['Barbell_Curl', 'Dumbbell_Bicep_Curl', 'EZ-Bar_Curl', 'Standing_Biceps_Cable_Curl', 'Close-Grip_EZ-Bar_Curl_with_Band', 'Kettlebell_Curl', 'Backpack_Curl', 'Chin-Up'] },
  hammer: { kind: 'accessory', muscles: ['biceps'], match: /hammer|curl/i, preferred: ['Hammer_Curls', 'Cable_Hammer_Curls_-_Rope_Attachment', 'Alternate_Hammer_Curl', 'Kettlebell_Curl', 'Backpack_Curl', 'Chin-Up'] },
  triceps: { kind: 'accessory', muscles: ['triceps'], match: /tricep|dip|skull|kickback|pushdown|close/i, preferred: ['Triceps_Pushdown', 'Lying_Triceps_Press', 'Standing_Dumbbell_Triceps_Extension', 'Band_Skull_Crusher', 'Dips_-_Triceps_Version', 'Push-Ups_-_Close_Triceps_Position', 'Bench_Dips'] },
  // Glúteo directo: solo lo añade el equilibrado semanal (balanceWeek) cuando las piernas no llegan.
  glute: { kind: 'accessory', muscles: ['glutes'], match: /hip thrust|bridge|kickback|hip extension|hip lift/i, preferred: ['Barbell_Hip_Thrust', 'Barbell_Glute_Bridge', 'One-Legged_Cable_Kickback', 'Hip_Extension_with_Bands', 'Single_Leg_Glute_Bridge', 'Butt_Lift_Bridge'] },
  core: { kind: 'core', muscles: ['abs'], preferred: ['Hanging_Leg_Raise', 'Dead_Bug', 'Crunches', 'Russian_Twist', 'Plank', 'Kettlebell_Windmill', 'Cable_Crunch'] },
  // Acondicionamiento: se elige por tipo (cardio o pliometría), no por músculo.
  conditioning: { kind: 'conditioning', muscles: [], preferred: ['Mountain_Climbers', 'Rope_Jumping', 'One-Arm_Kettlebell_Swings', 'Box_Jump_Multiple_Response', 'Freehand_Jump_Squat', 'Battling_Ropes'] },
  // Funcional (estilo box): movimientos completos, gimnásticos y «motor» (remo, bici, comba).
  fnSquat: { kind: 'compound', muscles: ['quads', 'glutes'], preferred: ['Barbell_Thruster', 'Wall_Ball', 'Front_Barbell_Squat', 'Dumbbell_Thruster', 'Kettlebell_Thruster', 'Goblet_Squat', 'Burpee'] },
  fnHinge: { kind: 'compound', muscles: ['hamstrings', 'glutes'], preferred: ['Barbell_Deadlift', 'American_Kettlebell_Swing', 'Squat_Clean', 'Russian_Kettlebell_Swing', 'Devil_Press', 'Single_Leg_Deadlift'] },
  fnPull: { kind: 'compound', muscles: ['lats', 'upper-back'], match: /pull-?up|row/i, preferred: ['Chest_To_Bar_Pull_Up', 'Kipping_Pull_Up', 'Pullups', 'Bent_Over_Two-Dumbbell_Row', 'Inverted_Row'] },
  fnPush: { kind: 'compound', muscles: ['delts', 'pectorals'], preferred: ['Push_Press', 'Handstand_Push-Ups', 'Man_Maker', 'Dumbbell_Shoulder_Press', 'Pike_Push_Up', 'Pushups'] },
  fnCore: { kind: 'core', muscles: ['abs'], preferred: ['Toes_To_Bar', 'GHD_Sit_Up', 'Knees_To_Elbows', 'V_Up', 'Hollow_Rock', 'L_Sit'] },
  fnEngine: { kind: 'conditioning', muscles: [], preferred: ['Rowing_Machine', 'Double_Unders', 'Assault_Bike', 'Burpee_Box_Jump_Over', 'Ski_Erg', 'Box_Step_Over', 'Burpee', 'Shuttle_Run'] },
  // En casa sin material (o con una mochila, una toalla y una silla).
  homeLegs: { kind: 'compound', muscles: ['quads', 'glutes', 'hamstrings'], preferred: ['Bodyweight_Bulgarian_Split_Squat', 'Single_Leg_Deadlift', 'Wall_Sit', 'Pistol_Squat', 'Bodyweight_Squat', 'Split_Squats'] },
  homePush: { kind: 'compound', muscles: ['pectorals', 'delts', 'triceps'], preferred: ['Pushups', 'Pike_Push_Up', 'Archer_Push_Up', 'Push-Ups_-_Close_Triceps_Position'] },
  homePull: { kind: 'compound', muscles: ['upper-back', 'lats'], match: /row|superman|angel/i, preferred: ['Towel_Door_Row', 'Backpack_Row', 'Reverse_Snow_Angels', 'Inverted_Row', 'Superman'] },
  homeCore: { kind: 'core', muscles: ['abs'], preferred: ['Hollow_Hold', 'Plank_Shoulder_Taps', 'Bird_Dog', 'V_Up', 'Dead_Bug', 'Plank'] },
  hiit: { kind: 'conditioning', muscles: [], preferred: ['Burpee', 'Jumping_Jacks', 'High_Knees', 'Mountain_Climbers', 'Skater_Jumps', 'Sprawl', 'Plank_Jacks', 'Shadow_Boxing'] },
} satisfies Record<string, Slot>

/** Los ejercicios de siempre (los preferidos de cada hueco): al buscar salen antes que las variantes raras. */
export const STAPLES: ReadonlySet<string> = new Set(Object.values(slots).flatMap((s) => s.preferred))

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
// Torso: con 6 ejercicios (60 min) entran los 6 primeros, así que los brazos se reparten entre los dos días:
// tríceps y elevación lateral en A; bíceps y tríceps en B (con aperturas en B, el tríceps se quedaba en 3 series
// a la semana en el híbrido de 5 días).
const upperA = T(['Torso A', 'Upper A'], [['chestPress', 0], ['horizontalPull', 0], ['shoulderPress', 0], ['verticalPull', 0], ['triceps', 0], ['lateralRaise', 0], ['biceps', 0], ['rearDelt', 0]])
const upperB = T(['Torso B', 'Upper B'], [['inclinePress', 0], ['verticalPull', 1], ['shoulderPress', 1], ['horizontalPull', 1], ['hammer', 0], ['triceps', 1], ['chestFly', 0], ['lateralRaise', 1]])
// Fuerza: banca y press militar dos veces por semana, cada uno pesado un día y de volumen el otro.
const strengthUpperB = T(['Torso B', 'Upper B'], [['shoulderPress', 0], ['verticalPull', 1], ['chestPress', 0], ['horizontalPull', 1], ['hammer', 0], ['chestFly', 0], ['triceps', 1], ['lateralRaise', 1]])
// Y la sentadilla dos veces: pesada el día A y frontal (de volumen) tras el peso muerto el día B, en vez de
// prensa y hack seguidas.
const strengthLowerB = T(['Pierna B', 'Legs B'], [['hinge', 0], ['squat', 1], ['legCurl', 1], ['lunge', 1], ['calves', 1], ['core', 2], ['legPress', 0], ['legExtension', 0]])
const lowerA = T(['Pierna A', 'Legs A'], [['squat', 0], ['hinge', 1], ['legCurl', 0], ['lunge', 0], ['calves', 0], ['core', 0], ['legExtension', 0], ['core', 1]])
// Pierna B: peso muerto, una sentadilla de máquina y zancada (antes peso muerto, prensa y hack seguidas, y la
// prensa repetida con la Pierna del híbrido de 5 días).
const lowerB = T(['Pierna B', 'Legs B'], [['hinge', 0], ['squat', 1], ['lunge', 1], ['legCurl', 1], ['legExtension', 0], ['calves', 1], ['core', 2], ['legPress', 0]])

function split(c: GeneratorConfig): [string, Template[]] {
  if (c.days <= 2) return [t('Cuerpo completo', 'Full body'), [fullBodyA, fullBodyB]]
  if (c.days === 3) {
    // Con 3 días, cuerpo completo salvo para avanzados: cada músculo dos o tres veces por semana. El empuje / tirón /
    // pierna de 3 días entrena cada uno una sola vez (sigue en la biblioteca para quien lo quiera).
    return c.level !== 'advanced' || c.goal === 'fatLoss'
      ? [t('Cuerpo completo', 'Full body'), [fullBodyA, fullBodyB, fullBodyC]]
      : [t('Empuje / Tirón / Pierna', 'Push / Pull / Legs'), [pushA, pullA, legsA]]
  }
  if (c.days === 4) return [t('Torso / Pierna', 'Upper / Lower'), c.goal === 'strength' ? [upperA, lowerA, strengthUpperB, strengthLowerB] : [upperA, lowerA, upperB, lowerB]]
  // Principiante con 5-6 días: torso y pierna más días de cuerpo completo suave, en vez de PPL a diario.
  if (c.level === 'beginner' && c.days >= 5) {
    return [t('Torso / Pierna + Cuerpo completo', 'Upper / Lower + Full body'), [upperA, lowerA, fullBodyC, upperB, lowerB, ...(c.days >= 6 ? [fullBodyB] : [])]]
  }
  if (c.days === 5) return [t('Híbrido PPL + Torso / Pierna', 'PPL + Upper / Lower hybrid'), [pushA, pullA, legsA, upperB, lowerB]]
  return [t('Empuje / Tirón / Pierna ×2', 'Push / Pull / Legs ×2'), [pushA, pullA, legsA, pushB, pullB, legsB]]
}

/** El reparto semanal que saldrá con esta configuración («Torso / Pierna») y cuántos días distintos tiene. */
export function splitPreview(c: GeneratorConfig): { name: string; days: number } {
  const [name, templates] = split(c)
  return { name, days: templates.length }
}

/** Ejercicios por sesión según los minutos (lo enseña el cuestionario). */
export function exerciseCount(minutes: number) {
  if (minutes < 40) return 4
  if (minutes < 55) return 5
  if (minutes < 70) return 6
  if (minutes < 85) return 7
  return 8
}

/** Tope de series de fuerza por sesión al rellenar el tiempo, por nivel. */
const MAX_DAY_SETS: Record<TrainingLevel, number> = { beginner: 18, intermediate: 24, advanced: 28 }

/** Tope de series de un mismo músculo principal en una sesión. */
export const MAX_SETS_PER_SESSION = 10

const SCHEMES: Record<TrainingGoal, Record<Kind, [number, number, number, number]>> = {
  strength: { compound: [4, 3, 5, 180], accessory: [3, 6, 10, 120], core: [3, 12, 15, 60], conditioning: [3, 10, 15, 45] },
  hypertrophy: { compound: [4, 6, 10, 120], accessory: [3, 10, 15, 75], core: [3, 12, 15, 60], conditioning: [3, 10, 15, 45] },
  // Perder grasa: en déficit, los básicos siguen pesados (es lo que conserva el músculo); el gasto
  // extra lo ponen los accesorios con menos descanso y el bloque de acondicionamiento.
  fatLoss: { compound: [3, 6, 10, 120], accessory: [3, 10, 15, 60], core: [3, 12, 15, 45], conditioning: [3, 15, 20, 30] },
  general: { compound: [3, 8, 12, 90], accessory: [3, 10, 15, 60], core: [3, 12, 15, 60], conditioning: [3, 10, 15, 45] },
}

/**
 * Cómo serán las series con este objetivo (lo enseña el cuestionario): repeticiones de los básicos a los
 * accesorios y el descanso de los básicos.
 */
export function goalPreview(goal: TrainingGoal): { repsMin: number; repsMax: number; rest: number; cardio: boolean } {
  const [, repsMin, , rest] = SCHEMES[goal].compound
  const [, , repsMax] = SCHEMES[goal].accessory
  return { repsMin, repsMax, rest, cardio: goal === 'fatLoss' }
}

function scheme(kind: Kind, c: GeneratorConfig) {
  const table = SCHEMES
  let [sets, repsMin, repsMax, rest] = table[c.goal][kind]
  if (c.level === 'beginner' && (kind === 'compound' || kind === 'accessory')) sets = Math.max(2, sets - 1)
  if (c.level === 'advanced' && kind === 'compound') sets += 1
  // «Perder grasa» avanzado: más densidad (accesorios y core con 15 s menos de descanso). En el mismo tiempo
  // caben más series; si no, con los minutos llenos, intermedio y avanzado salían idénticos.
  if (c.goal === 'fatLoss' && c.level === 'advanced' && (kind === 'accessory' || kind === 'core')) rest = Math.max(30, rest - 15)
  return { sets, repsMin, repsMax, rest }
}

/** Necesitan una barra de dominadas (o algo de donde colgarse): solo se proponen con gimnasio. */
const NEEDS_BAR = /pull[-_]?up|chin[-_]?up|chest_to_bar|hanging|muscle.?up|toes.?to.?bar/i
/** Demasiado para empezar aunque el catálogo los ponga de nivel básico: dominadas, nórdico, pistol, pino. */
const HARD_START = /^(Pullups|Chin-Up|Kipping_Pull_Up|Chest_To_Bar_Pull_Up|Floor_Glute-Ham_Raise|Natural_Glute_Ham_Raise|Pistol_Squat|Handstand_Push-Ups|Wall_Walk)$/
/** Con carga a mano, la sentadilla o el puente sin peso no son un básico (se quedan para quien entrena solo con su cuerpo). */
const UNLOADED_SQUAT = /^(Bodyweight_Squat|Wall_Sit|Single_Leg_Glute_Bridge)$/
/** Básicos pesados que cargan la columna: uno por día como mucho. */
export const HEAVY_AXIAL = /^(Barbell_(Full_)?Squat|Front_Barbell_Squat|Barbell_Deadlift|Sumo_Deadlift|Romanian_Deadlift|Stiff-Legged_Barbell_Deadlift|Good_Morning)$/
/** Los dos grandes (sentadilla y peso muerto con barra): en los programas clásicos, nunca los dos el mismo día. */
const BIG_LIFT = /^(Barbell_(Full_)?Squat|Front_Barbell_Squat|Barbell_Deadlift|Sumo_Deadlift)$/
/** Bisagras de cadera (pesos muertos, buenos días y el swing): una por día. */
const HINGE = /deadlift|good_morning|swing/i
/** Dominadas de verdad (no las de ayuda ni las negativas): tras ellas, otra supina no. */
const PULLUP = /^(?!.*(assisted|negative)).*(pull[-_]?up|chin[-_]?up)/i
/** La mochila sustituye a las pesas: con mancuernas o pesa rusa, mejor las de verdad. */
const BACKPACK_LOAD = /^Backpack_(Curl|Squat|Row)$/

interface PickRules {
  level?: TrainingLevel
  /** Hay barra de dominadas. */
  bar?: boolean
  /** Ya hay un básico pesado de columna ese día. */
  axialUsed?: boolean
  /** Ya hay sentadilla o peso muerto con barra ese día. */
  bigLiftUsed?: boolean
  equipment?: EquipmentProfile
  /** Programas de fuerza e hipertrofia: sin gestos de CrossFit como la dominada con kipping. */
  strict?: boolean
  /** Ya hay una dominada ese día. */
  pullupUsed?: boolean
  /** Ya hay un peso muerto (o buenos días) ese día. */
  hingeUsed?: boolean
}

/** Lo que el día ya lleva y cambia lo que encaja en él (un básico de columna, una dominada, una bisagra). */
function dayRules(chosen: GeneratedExercise[]): PickRules {
  const has = (re: RegExp) => chosen.some((x) => re.test(x.exercise.id))
  return { axialUsed: has(HEAVY_AXIAL), bigLiftUsed: has(BIG_LIFT), pullupUsed: has(PULLUP), hingeUsed: has(HINGE) }
}

function suits(e: Exercise, r: PickRules): boolean {
  if (r.strict && /kipping/i.test(e.id)) return false
  if (r.bar === false && NEEDS_BAR.test(e.id)) return false
  if (r.level === 'beginner' && (e.level === 'expert' || HARD_START.test(e.id))) return false
  // Cualquier dominada (barra V, agarre abierto…) es tan dura para empezar como la normal: remos hasta poder.
  if (r.level === 'beginner' && /pull[-_]?up|chin[-_]?up/i.test(e.id) && !/assisted|negative/i.test(e.id)) return false
  // Fondos en paralelas: fuera del gimnasio no hay paralelas (los de banco, con una silla, sí).
  if (r.equipment && r.equipment !== 'gym' && /^Dips_-_/.test(e.id)) return false
  // Tras unas dominadas, el bíceps no se trabaja con más dominadas (supinas): un curl.
  if (r.pullupUsed && /chin[-_]?up/i.test(e.id)) return false
  // Una bisagra por día: con peso muerto o rumano, el femoral va con curl o nórdico, no con otro peso muerto.
  if (r.hingeUsed && HINGE.test(e.id)) return false
  // Tras nuca: carga el hombro en mala posición sin aportar nada sobre la normal. Nunca en un programa.
  if (/rear_pull|behind.?(the.?)?neck/i.test(e.id)) return false
  if (r.level === 'intermediate' && e.level === 'expert' && e.equipment === 'bodyweight') return false
  // Habilidades de pino (wall walk, flexión en pino): solo para avanzados, nunca como press de hombro corriente.
  if (r.level !== 'advanced' && /wall_walk|handstand/i.test(e.id)) return false
  if (r.equipment && r.equipment !== 'bodyweight' && UNLOADED_SQUAT.test(e.id)) return false
  // Solo con el cuerpo, la sentadilla al aire es para empezar: desde intermedio, búlgara y similares.
  if (r.equipment === 'bodyweight' && r.level !== 'beginner' && /^(Bodyweight_Squat|Wall_Sit)$/.test(e.id)) return false
  if (r.axialUsed && HEAVY_AXIAL.test(e.id)) return false
  if (r.bigLiftUsed && BIG_LIFT.test(e.id)) return false
  // Solo con pesas de verdad (mancuernas, kettlebell, gimnasio): con bandas tampoco hay curl con banda en el
  // catálogo, y sin la mochila el día de torso se quedaba sin brazos (tres remos).
  if (r.equipment !== 'bodyweight' && r.equipment !== 'bands' && BACKPACK_LOAD.test(e.id)) return false
  return true
}

/** Material casero que no es «peso corporal» en el catálogo, pero que hay en cualquier casa (una toalla, una mochila). */
const HOME_EXTRAS = new Set(['Towel_Door_Row', 'Backpack_Row', 'Backpack_Curl', 'Backpack_Squat'])

function pick(slot: Slot, variant: number, allowed: Set<string>, used: Set<string>, catalog: Catalog, rules: PickRules = {}): Exercise | undefined {
  // La goblet del catálogo es con kettlebell, pero con una mancuerna es igual (y es la sentadilla de casa por excelencia).
  const usable = (e: Exercise) => allowed.has(e.equipment) || (rules.equipment !== undefined && rules.equipment !== 'gym' && HOME_EXTRAS.has(e.id))
    || (rules.equipment === 'dumbbells' && e.id === 'Goblet_Squat')
  // Los estiramientos del catálogo (Superman, Split_Squats…) no cuentan como series de fuerza.
  const strengthy = (e: Exercise) => slot.kind === 'conditioning' || e.category !== 'stretching'
  // Lo de no juntar sentadilla y peso muerto se mira al elegir, no al ordenar: si no, quitar el peso muerto
  // correría la variante un puesto y la Pierna A perdería el rumano tras la sentadilla.
  const preferred = slot.preferred.map((id) => catalog.get(id)).filter((e): e is Exercise => !!e && usable(e) && strengthy(e) && suits(e, { ...rules, bigLiftUsed: false }))
  for (let offset = 0; offset < preferred.length; offset++) {
    const candidate = preferred[(variant + offset) % preferred.length]
    if (!used.has(candidate.id) && !(rules.bigLiftUsed && BIG_LIFT.test(candidate.id))) return candidate
  }
  // Alternativa: el ejercicio más básico (nombre más corto, nivel más fácil) que encaje.
  const fits = (e: Exercise) => slot.kind === 'conditioning'
    ? e.category === 'cardio' || e.category === 'plyometrics'
    : slot.muscles.includes(e.muscle) && e.category === 'strength' && (!slot.match || slot.match.test(e.nameEn))
  const levelRank: Record<string, number> = { beginner: 0, intermediate: 1, expert: 2 }
  const fallback = catalog.exercises
    .filter((e) => fits(e) && usable(e) && strengthy(e) && !used.has(e.id) && suits(e, rules))
    .sort((a, b) => (levelRank[a.level] ?? 1) - (levelRank[b.level] ?? 1) || a.nameEn.length - b.nameEn.length)
  return fallback.length ? fallback[Math.min(variant, fallback.length - 1)] : undefined
}

/** Si un hueco se queda sin ejercicio (sin barra, sin material…), otro que trabaje lo mismo. */
const SUBSTITUTES: Partial<Record<SlotName, string>> = {
  verticalPull: 'horizontalPull homePull rearDelt',
  lateralRaise: 'rearDelt',
  biceps: 'homePull',
  hammer: 'homePull',
  fnPull: 'homePull',
  horizontalPull: 'homePull',
  shoulderPress: 'homePush',
  legCurl: 'hinge',
  // Sin máquina de extensiones, una zancada o una sentadilla más.
  legExtension: 'lunge squat',
}

function pickOrSubstitute(name: SlotName, variant: number, allowed: Set<string>, used: Set<string>, catalog: Catalog, rules: PickRules): { exercise: Exercise; slot: Slot } | undefined {
  for (const n of [name, ...((SUBSTITUTES[name]?.split(' ') ?? []) as SlotName[])]) {
    const exercise = pick(slots[n], variant, allowed, used, catalog, rules)
    if (exercise) return { exercise, slot: slots[n] }
  }
  return undefined
}

/**
 * La pauta del hueco ajustada al ejercicio que ha tocado: los aislamientos, a 8-12 o más y sin descansos
 * de básico; lo que no va con barra, nunca a 3-5 (un goblet o una prensa no se hacen a 3 repeticiones);
 * el swing, a 10-15; y las piernas sin carga, a 12-20 para que cuesten.
 */
/** Empujes y remos con el propio cuerpo: desde intermedio se hacen más de 15 seguidas, así que a 12-20. */
const EASY_BODYWEIGHT = /^(Pushups|Push-Up_Wide|Decline_Push-Up|Push-Ups_-_Close_Triceps_Position|Inverted_Row|Towel_Door_Row|Backpack_Row)$/

function fitScheme(e: Exercise, kind: Kind, s: { sets: number; repsMin: number; repsMax: number; rest: number }, level?: TrainingLevel) {
  const out = { ...s }
  // Pierna sin carga de verdad (sin material o con la mochila): 12-20 para que cueste.
  const unloadedLegs = (e.equipment === 'bodyweight' || e.id === 'Backpack_Squat') && ['quads', 'glutes', 'hamstrings'].includes(e.muscle)
  if (kind === 'conditioning' || kind === 'core') return out
  // El nórdico es durísimo: pocas repeticiones (bajando despacio) y descanso largo, nunca 12-20.
  if (/glute.?ham/i.test(e.id)) Object.assign(out, { repsMin: 3, repsMax: 6, rest: Math.max(out.rest, 120) })
  // La pistol es a una pierna y muy exigente: 6-10 por pierna, no 12-20 como una sentadilla al aire.
  else if (/pistol/i.test(e.id)) Object.assign(out, { repsMin: 6, repsMax: 10, rest: Math.max(out.rest, 90) })
  // Peso muerto convencional: a más de 8 repeticiones la técnica se degrada con la fatiga (la espalda baja es lo
  // primero que cede). A 5-8, el volumen lo ponen otros ejercicios.
  else if (/^(Barbell_Deadlift|Sumo_Deadlift)$/.test(e.id) && out.repsMax > 8) Object.assign(out, { repsMin: 5, repsMax: 8, rest: Math.max(out.rest, 150) })
  // La negativa es solo la bajada, lenta: pocas y bien hechas.
  else if (/negative/i.test(e.id)) Object.assign(out, { repsMin: 3, repsMax: 6, rest: Math.max(out.rest, 90) })
  // Dominadas estrictas: a 6-10 aunque ocupen un hueco de accesorio (unas supinas a 10-15 son para muy pocos).
  else if (PULLUP.test(e.id) && !/kipping|chest_to_bar|assisted/i.test(e.id)) Object.assign(out, { repsMin: 6, repsMax: 10, rest: Math.max(out.rest, 90) })
  // El hip thrust y el puente con carga: aunque vayan con barra, no son un básico a 3-5 repeticiones (el puente
  // sin peso va con la pierna sin carga, más abajo).
  else if (/hip_thrust|glute_bridge/i.test(e.id) && !unloadedLegs && out.repsMin < 6) Object.assign(out, { repsMin: 6, repsMax: 10, rest: Math.min(out.rest, 120) })
  else if (isIsolation(e.id)) Object.assign(out, { repsMin: Math.max(out.repsMin, 8), repsMax: Math.max(out.repsMax, 12), rest: Math.min(out.rest, 90) })
  else if (/swing/i.test(e.id)) Object.assign(out, { repsMin: 10, repsMax: 15, rest: Math.min(out.rest, 90) })
  else if (unloadedLegs) Object.assign(out, { repsMin: 12, repsMax: 20, rest: Math.min(out.rest, 90) })
  else if (level && level !== 'beginner' && EASY_BODYWEIGHT.test(e.id)) Object.assign(out, { repsMin: 12, repsMax: 20, rest: Math.min(out.rest, 90) })
  else if (e.equipment !== 'barbell' && out.repsMin < 6) Object.assign(out, { repsMin: 6, repsMax: 10, rest: Math.min(out.rest, 120) })
  return out
}

/**
 * Minutos de un día con la misma cuenta que enseña la app (exerciseSeconds, también en routineMinutes). Antes el
 * generador contaba series (3,4 min cada una) y la app minutos: fuerza, con descansos de 3 min, salía a 65 min con
 * 60 elegidos, y «Perder grasa» de principiante a 62 con 90.
 */
export function dayMinutes(list: GeneratedExercise[]): number {
  return list.reduce((n, e) => n + exerciseSeconds(asRoutineExercise(e)), 0) / 60
}
/** Un ejercicio generado como quedará en la rutina (registro y objetivo de tiempo). */
const asRoutineExercise = (e: GeneratedExercise) => ({ sets: e.sets, rest: e.rest, tracking: defaultTracking(e.exercise), targetSeconds: PROGRAM_TARGET_SECONDS })
/** Lo que añade una serie más (para rellenar el tiempo). */
const setSeconds = (e: GeneratedExercise) => exerciseSeconds({ ...asRoutineExercise(e), sets: 1 }) - 150 - e.rest

type Chosen = { exercise: Exercise; slot: Slot }

/**
 * Un día de programa, en dos pasos. Primero se eligen los ejercicios de cada hueco (con el tope de series por
 * músculo: más de ~10 de un mismo músculo en un día ya no suman). Después se ajusta al tiempo (`fitToTime`).
 * Lo usan el generador y la biblioteca, así las dos cuentan igual.
 */
type Picked = { ex: GeneratedExercise; kind: Kind }

function buildDay(...args: Parameters<typeof buildPicked>): GeneratedExercise[] {
  return buildPicked(...args).map((p) => p.ex)
}

function buildPicked(list: [SlotName, number][], time: TimeFit,
  choose: (name: SlotName, variant: number, chosen: GeneratedExercise[], used: Set<string>) => Chosen | undefined,
  schemeFor: (found: Chosen, name: SlotName, picked: Picked[]) => { sets: number; repsMin: number; repsMax: number; rest: number },
  extra: (found: Chosen) => Partial<GeneratedExercise> = () => ({}),
  reserve: [SlotName, number][] = []): Picked[] {
  const used = new Set<string>()
  const picked: Picked[] = []
  const perMuscle = new Map<string, number>()
  const counts = (e: Exercise) => e.category !== 'cardio' && e.category !== 'plyometrics'
  const full = (e: Exercise) => counts(e) && (perMuscle.get(e.muscle) ?? 0) > MAX_SETS_PER_SESSION - 2
  const add = ([name, variant]: [SlotName, number], at = picked.length) => {
    let found = choose(name, variant, picked.map((p) => p.ex), used)
    // El acondicionamiento no se pierde por el tope de un músculo: si la sentadilla con salto no cabe en un día
    // de pierna, otro del bloque (comba, escaladores…). «Perder grasa» lo promete cada día.
    for (let k = 1; found && found.slot.kind === 'conditioning' && full(found.exercise) && k < 8; k++) found = choose(name, variant + k, picked.map((p) => p.ex), used)
    if (!found) return
    const s = schemeFor(found, name, picked)
    // Cuenta todo lo de fuerza (también un swing en el bloque de acondicionamiento); el cardio, no.
    const { exercise } = found
    const done = perMuscle.get(exercise.muscle) ?? 0
    if (full(exercise)) return
    if (counts(exercise)) {
      s.sets = Math.min(s.sets, MAX_SETS_PER_SESSION - done)
      perMuscle.set(exercise.muscle, done + s.sets)
    }
    // Solo lo que entra cuenta como usado: lo descartado aún puede ocupar otro hueco.
    used.add(exercise.id)
    picked.splice(at, 0, { ex: { exercise, ...s, ...extra(found) }, kind: found.slot.kind })
  }
  list.forEach((slot) => add(slot))
  // Si algún hueco se quedó vacío (sin máquina de extensiones, sin barra…), los siguientes de la plantilla
  // ocupan su sitio, delante del acondicionamiento: el día tiene los ejercicios prometidos y dura lo elegido.
  const want = list.filter(([n]) => slots[n].kind !== 'conditioning').length
  for (const slot of reserve) {
    if (picked.filter((p) => p.kind !== 'conditioning').length >= want) break
    const at = picked.findIndex((p) => p.kind === 'conditioning')
    add(slot, at < 0 ? picked.length : at)
  }
  return fitToTime(picked, time)
}

const TIME_SLACK = 3

/** El tiempo de un día: los minutos (Infinity = sin recortar) y, si se rellena hasta ellos, el nivel. */
interface TimeFit {
  minutes: number
  /** Rellenar con series hasta el tiempo elegido (el generador; la biblioteca respeta su pauta). */
  fill?: TrainingLevel
}

/**
 * Deja el día en el tiempo elegido. Antes de quitar un ejercicio entero se quitan series: un tríceps a 2 series
 * vale más que una cuarta serie de press. Por orden: los básicos de 4-5 series a 3, los accesorios a 2 y, si aún
 * no cabe, fuera ejercicios desde el final. Nunca el primero (el básico del día) ni el acondicionamiento de
 * «Perder grasa», que es lo que promete ese objetivo. Si sobra tiempo (y `fill`), se añaden series hasta llenarlo:
 * con 90 minutos, un principiante hacía 20 series en ~62.
 */
function fitToTime(picked: Picked[], { minutes, fill }: TimeFit): Picked[] {
  // 3 minutos de margen al recortar (30 min dejaban 2 ejercicios: con 3 son ~32); al rellenar, sin pasarse.
  // Con `fill` (el generador), también el tope de series del nivel: antes solo frenaba el relleno, y un
  // principiante de fuerza a 90 min salía con 21 series en un día.
  const over = () => dayMinutes(picked.map((p) => p.ex)) > minutes + TIME_SLACK || (!!fill && strengthSets(picked) > MAX_DAY_SETS[fill])
  // De atrás adelante y de una en una, para repartir el recorte entre los ejercicios.
  const trim = (applies: (kind: Kind) => boolean, floor: number) => {
    for (let changed = true; changed && over();) {
      changed = false
      for (let i = picked.length - 1; i >= 0 && over(); i--) {
        if (applies(picked[i].kind) && picked[i].ex.sets > floor) { picked[i].ex.sets--; changed = true }
      }
    }
  }
  trim((k) => k === 'compound', 3)
  trim((k) => k === 'accessory' || k === 'core', 2)
  // Fuera ejercicios desde el final, primero los de una zona que ya trabaja otro: a 45 min, el torso pierde la
  // segunda espalda (dominadas tras el remo) antes que el único de brazos. Luego, si aún no cabe, cualquiera.
  // En pierna, por músculo: el femoral o el core no se van porque haya sentadilla (con peso corporal a 45 min, cero
  // series de femoral y de core a la semana).
  const zone = (e: Exercise) => (e.bodyPart === 'legs' ? e.muscle : e.bodyPart)
  const repeated = (i: number) => picked.some((p, j) => j !== i && p.kind !== 'conditioning' && zone(p.ex.exercise) === zone(picked[i].ex.exercise))
  for (const strict of [true, false]) {
    for (let i = picked.length - 1; i > 0 && over(); i--) {
      if (picked[i].kind !== 'conditioning' && (!strict || repeated(i))) picked.splice(i, 1)
    }
  }
  trim(() => true, 2)
  if (fill && Number.isFinite(minutes)) fillTime(picked, minutes, fill)
  return picked
}

/** Series de fuerza de un día (sin el acondicionamiento). */
const strengthSets = (picked: Picked[]) => picked.reduce((n, p) => n + (p.kind === 'conditioning' ? 0 : p.ex.sets), 0)

/** Series como mucho por ejercicio: 5 en los básicos y 4 en el resto; uno menos al empezar. */
const setCap = (k: Kind, level: TrainingLevel) => (k === 'compound' ? 5 : k === 'conditioning' ? 0 : 4) - (level === 'beginner' ? 1 : 0)

/**
 * Series de más hasta llenar el tiempo, de una en una y por orden (los básicos primero), sin pasar del tope por
 * ejercicio (5 en los básicos y 4 en el resto; uno menos al empezar) ni de MAX_SETS_PER_SESSION por músculo.
 */
function fillTime(picked: Picked[], minutes: number, level: TrainingLevel) {
  const cap = (k: Kind) => setCap(k, level)
  // Techo de series de fuerza por sesión: más no suma y cansa (un principiante a 90 min llegaba a 30). El tiempo que
  // sobra queda para calentar, el cardio o irse antes.
  const maxSets = MAX_DAY_SETS[level]
  const muscleSets = (m: string) => picked.reduce((n, p) => n + (p.ex.exercise.muscle === m ? p.ex.sets : 0), 0)
  for (const kinds of [['compound'], ['accessory', 'core']] as Kind[][]) {
    for (let changed = true; changed;) {
      changed = false
      for (const p of picked) {
        if (!kinds.includes(p.kind) || p.ex.sets >= cap(p.kind) || muscleSets(p.ex.exercise.muscle) >= MAX_SETS_PER_SESSION || strengthSets(picked) >= maxSets) continue
        if (dayMinutes(picked.map((x) => x.ex)) + (setSeconds(p.ex) + p.ex.rest) / 60 > minutes) continue
        p.ex.sets++
        changed = true
      }
    }
  }
}

/** Huecos con los que se puede añadir un ejercicio para un grupo (orden de MAIN_GROUPS) que no llega. */
const GROUP_SLOTS = ['chestFly inclinePress', 'horizontalPull verticalPull', 'lateralRaise rearDelt', 'biceps hammer', 'triceps',
  'legExtension lunge', 'legCurl', 'glute', 'core'].map((x) => x.split(' ') as SlotName[])
/** Grupos de pierna: lo que se añade para ellos va a un día que ya tenga pierna (y lo de torso, a uno de torso). */
const LEG_MUSCLES = new Set(['quads', 'hamstrings', 'glutes'])
const isLegGroup = (g: number) => MAIN_GROUPS[g][1].some((m) => LEG_MUSCLES.has(m))
const ARM_GROUPS = new Set(MAIN_GROUPS.flatMap(([, muscles], g) => (muscles.includes('biceps') || muscles.includes('triceps') ? [g] : [])))

/**
 * Ajusta la semana al rango de series por grupo que luego usan el entrenador y Progreso › Músculos (groupRange):
 * el programa recién creado no debe salir «por debajo» en su propio análisis ni pedir «quita series» a las dos
 * semanas (con 6 días salían 41 series de hombro y con 4, 9 de bíceps). Paso a paso, el cambio que más acerca la
 * semana al rango: una serie más o menos, cambiar una serie de un ejercicio a otro del mismo día (cuando el día
 * ya está lleno), quitar un accesorio que sobra o añadir uno para un grupo que no tiene ninguno. Siempre dentro
 * del tiempo (con el margen de TIME_SLACK), del tope de series por ejercicio, por músculo y por día.
 */
function balanceWeek(days: Picked[][], c: GeneratorConfig, add: (day: number, slot: SlotName) => Picked | undefined) {
  const ranges = MAIN_GROUPS.map((_, g) => groupRange(c.goal, c.level, g))
  const shares = (p: Picked) => (p.kind === 'conditioning' || !countsForVolume(p.ex.exercise.id, p.ex.exercise.category)
    ? MAIN_GROUPS.map(() => 0) : groupShares(p.ex.exercise.muscle, p.ex.exercise.secondaryMuscles))
  /** El grupo del músculo principal (-1 si no es de ninguno: gemelo, trapecio, lumbar). */
  const mainGroup = (p: Picked) => shares(p).indexOf(1)
  const totals = () => {
    const v = MAIN_GROUPS.map(() => 0)
    for (const day of days) for (const p of day) shares(p).forEach((x, g) => { v[g] += x * p.ex.sets })
    return v
  }
  const badness = (v: number[]) => v.reduce((n, x, g) => n + Math.max(0, ranges[g][0] - x) + Math.max(0, x - ranges[g][1]), 0)
  const floor = (p: Picked) => (p.kind === 'compound' ? 3 : 2)
  const strengthy = (p: Picked) => p.ex.exercise.category !== 'cardio' && p.ex.exercise.category !== 'plyometrics'
  const fits = (day: Picked[], minutes = c.minutes + TIME_SLACK) => dayMinutes(day.map((p) => p.ex)) <= minutes && strengthSets(day) <= MAX_DAY_SETS[c.level]
    // El tope por músculo cuenta como buildPicked: también lo de fuerza del acondicionamiento (escaladores).
    && day.every((p) => !strengthy(p) || day.reduce((n, q) => n + (strengthy(q) && q.ex.exercise.muscle === p.ex.exercise.muscle ? q.ex.sets : 0), 0) <= MAX_SETS_PER_SESSION)
  /** Si p es el único de brazos (bíceps o tríceps) del día: no se quita, aunque el tríceps vaya sobrado de rebote con los press (el torso se quedaba sin brazos). */
  const onlyOne = (day: Picked[], p: Picked) => ARM_GROUPS.has(mainGroup(p)) && !day.some((q) => q !== p && q.kind !== 'conditioning' && mainGroup(q) === mainGroup(p))
  /** Si a p le cabe una serie más en su día. */
  const roomFor = (day: Picked[], p: Picked, minutes?: number) => {
    if (p.kind === 'conditioning' || p.ex.sets >= setCap(p.kind, c.level)) return false
    p.ex.sets++
    const ok = fits(day, minutes)
    p.ex.sets--
    return ok
  }
  for (let step = 0; step < 200; step++) {
    const now = totals()
    const base = badness(now)
    if (base === 0) break
    const low = (g: number) => g >= 0 && now[g] < ranges[g][0]
    const high = (g: number) => g >= 0 && now[g] > ranges[g][1]
    let best: { gain: number; apply: () => void } | undefined
    const consider = (gain: number, apply: () => void) => { if (gain > 1e-6 && (!best || gain > best.gain + 1e-9)) best = { gain, apply } }
    const after = (changes: [Picked, number][]) => {
      const v = [...now]
      for (const [p, n] of changes) shares(p).forEach((x, g) => { v[g] += x * n })
      return base - badness(v)
    }
    // Solo se toca lo que es directamente del grupo que no cuadra: bajar el press de banca porque el hombro (de
    // rebote) se pasa le quitaba series al básico del día. El primero del día no baja nunca.
    for (const day of days) {
      day.forEach((p, i) => {
        if (p.kind === 'conditioning') return
        const g = mainGroup(p)
        if (low(g) && roomFor(day, p)) consider(after([[p, 1]]) - p.ex.sets * 0.001, () => { p.ex.sets++ })
        if (high(g) && i > 0 && p.ex.sets > floor(p)) consider(after([[p, -1]]) + p.ex.sets * 0.001, () => { p.ex.sets-- })
        // Quitar uno entero que sobra (un segundo remo en el día de tirón): nunca el primero del día.
        if (high(g) && i > 0 && !onlyOne(day, p)) consider(after([[p, -p.ex.sets]]) - (p.kind === 'compound' ? 0.05 : 0.01), () => { day.splice(day.indexOf(p), 1) })
        // El día ya no da para más: una serie de otro ejercicio pasa a este.
        if (low(g) && p.ex.sets < setCap(p.kind, c.level)) {
          day.forEach((q, j) => {
            if (q === p || j === 0 || q.kind === 'conditioning' || q.ex.sets <= floor(q)) return
            p.ex.sets++; q.ex.sets--
            const ok = fits(day)
            p.ex.sets--; q.ex.sets++
            if (ok) consider(after([[p, 1], [q, -1]]) - 0.002, () => { p.ex.sets++; q.ex.sets-- })
          })
        }
      })
    }
    // Un grupo bajo: añadir un ejercicio suyo (al día de su zona con más tiempo libre) o, si el día no da para más,
    // en lugar de un accesorio de otro grupo que va sobrado.
    if (!best) {
      now.forEach((v, g) => {
        if (v >= ranges[g][0] || best) return
        // La zona de un día, por los grupos de sus ejercicios: el gemelo o el abdomen no hacen de un día de pierna
        // uno de torso (salían aperturas en la Pierna A).
        const leg = isLegGroup(g)
        const order = days.map((day, d) => ({ d, free: c.minutes + TIME_SLACK - dayMinutes(day.map((p) => p.ex)),
          zone: g === ABS_GROUP || day.some((p) => { const m = mainGroup(p); return m >= 0 && m !== ABS_GROUP && isLegGroup(m) === leg }) }))
          .filter((x) => x.zone).sort((a, b) => b.free - a.free)
        for (const { d } of order) {
          for (const slot of GROUP_SLOTS[g]) {
            const p = add(d, slot)
            if (!p || mainGroup(p) !== g) continue
            p.ex.sets = 2
            const at = days[d].findIndex((x) => x.kind === 'conditioning')
            const where = at < 0 ? days[d].length : at
            days[d].splice(where, 0, p)
            const ok = fits(days[d])
            days[d].splice(where, 1)
            if (ok) { consider(after([[p, 2]]), () => { days[d].splice(where, 0, p) }); return }
            for (const q of days[d].slice(1)) {
              if (q.kind === 'compound' || q.kind === 'conditioning' || mainGroup(q) === g || onlyOne(days[d], q)) continue
              const day = days[d]
              const sets = Math.min(3, Math.max(2, q.ex.sets))
              const i = day.indexOf(q)
              day.splice(i, 1, p)
              p.ex.sets = sets
              const swapOk = fits(day)
              day.splice(i, 1, q)
              if (swapOk) consider(after([[p, sets], [q, -q.ex.sets]]) - 0.02, () => { p.ex.sets = sets; day.splice(day.indexOf(q), 1, p) })
            }
          }
        }
      })
    }
    if (!best) break
    best.apply()
  }
  // Lo que se ha quitado deja tiempo libre: se vuelve a llenar, pero solo con grupos que aún tienen margen (el que
  // va más holgado primero), sin sacar ninguno de su rango.
  for (let step = 0; step < 200; step++) {
    const now = totals()
    let best: { room: number; p: Picked } | undefined
    for (const day of days) {
      for (const p of day) {
        const sh = shares(p)
        if (mainGroup(p) < 0 || !roomFor(day, p, c.minutes) || sh.some((x, g) => x > 0 && now[g] + x > ranges[g][1])) continue
        const room = ranges[mainGroup(p)][1] - now[mainGroup(p)] - p.ex.sets * 0.01
        if (!best || room > best.room) best = { room, p }
      }
    }
    if (!best) return
    best.p.ex.sets++
  }
}

/** `variation` desplaza la elección en cada hueco para obtener una alternativa al mismo plan. */
export function generate(c: GeneratorConfig, catalog: Catalog, variation = 0): GeneratedProgram {
  const [splitName, templates] = split(c)
  const n = exerciseCount(c.minutes)
  const allowed = new Set(equipmentInfo(c.equipment).allowed)

  const choose = (template: Template, name: SlotName, variant: number, chosen: GeneratedExercise[], used: Set<string>) =>
    pickOrSubstitute(name, variant + variation, allowed, used, catalog,
      // En la Pierna B de fuerza, la sentadilla frontal (secundaria, a 6-10) sí va tras el peso muerto pesado.
      { level: c.level, bar: c.equipment === 'gym' || !!c.pullupBar, equipment: c.equipment, strict: true, ...dayRules(chosen), bigLiftUsed: false, ...(template === strengthLowerB && name === 'squat' ? { axialUsed: false } : {}) })
  const schemeFor = ({ exercise, slot }: Chosen, picked: Picked[]) => {
    const s = scheme(slot.kind, c)
    // Fuerza: pesado (3-5) solo el básico principal del día; los demás básicos, de volumen. Si no, un día de
    // pierna eran 15 series a 3-5 (peso muerto, prensa y hack).
    if (c.goal === 'strength' && slot.kind === 'compound' && picked.some((p) => p.kind === 'compound')) {
      Object.assign(s, { sets: Math.max(3, s.sets - 1), repsMin: 6, repsMax: 10, rest: 120 })
    }
    return fitScheme(exercise, slot.kind, s, c.level)
  }
  const picked = templates.map((template, index) => {
    const list: [SlotName, number][] = template.slots.slice(0, n)
    if (c.goal === 'fatLoss' && !list.some(([s]) => s === 'conditioning')) list.push(['conditioning', index])
    return buildPicked(list, { minutes: c.minutes, fill: c.level },
      (name, variant, chosen, used) => choose(template, name, variant, chosen, used),
      (found, _name, done) => schemeFor(found, done),
      undefined,
      template.slots.slice(n).filter(([s]) => s !== 'conditioning'))
  })
  balanceWeek(picked, c, (d, slot) => {
    const day = picked[d]
    const found = choose(templates[d], slot, d, day.map((p) => p.ex), new Set(picked.flatMap((x) => x.map((p) => p.ex.exercise.id))))
    return found && { ex: { exercise: found.exercise, ...schemeFor(found, day) }, kind: found.slot.kind }
  })
  const days = templates.map((template, index) => ({ name: `${t(`Día ${index + 1}`, `Day ${index + 1}`)} · ${t(...template.name)}`, exercises: picked[index].map((p) => p.ex) }))

  return {
    name: `${splitName} · ${goalInfo(c.goal).short}`,
    // Sin «unos 60 min»: al lado sale la duración calculada (~63′) y eran dos cifras para lo mismo.
    summary: `${t(`${c.days} días por semana`, `${c.days} days a week`)} · ${levelInfo(c.level).label} · ${equipmentInfo(c.equipment).label}`,
    days,
  }
}

// MARK: Biblioteca de programas
//
// Programas clásicos con nombres genéricos (sin copiar programas con marca). Usan los mismos huecos que
// el generador, así que se adaptan al material elegido: con mancuernas, la sentadilla pasa a ser
// sentadilla con mancuernas o goblet, etc.

type SchemeRow = [sets: number, repsMin: number, repsMax: number, rest: number]

export interface LibraryProgram {
  id: string
  name: [es: string, en: string]
  description: [es: string, en: string]
  days: number
  level: TrainingLevel
  /** Material fijo (programas pensados para casa); sin valor, el que elijas. */
  equipment?: EquipmentProfile
  /** Material de más que da por hecho (cajón y comba en el box; mochila o toalla en casa). */
  extraEquipment?: string[]
  templates: Template[]
  scheme: Record<Kind, SchemeRow>
  /** Series de un hueco concreto (en el 5×5, el peso muerto va a 1×5: con 5 series se acumula demasiada fatiga). */
  setsFor?: Partial<Record<SlotName, number>>
  progression?: Progression
  /** Pauta cerrada que no se recorta por tiempo (el 5×5, los circuitos): su duración ya va en la descripción. */
  fixed?: boolean
}

const HYPERTROPHY: Record<Kind, SchemeRow> = { compound: [3, 6, 10, 120], accessory: [3, 10, 15, 75], core: [3, 12, 15, 60], conditioning: [3, 10, 15, 45] }
const BEGINNER: Record<Kind, SchemeRow> = { compound: [3, 8, 12, 90], accessory: [2, 10, 15, 60], core: [2, 12, 15, 45], conditioning: [3, 10, 15, 45] }
const STRENGTH_5X5: Record<Kind, SchemeRow> = { compound: [5, 5, 5, 180], accessory: [3, 8, 12, 90], core: [3, 10, 15, 60], conditioning: [3, 10, 15, 45] }
const FUNCTIONAL: Record<Kind, SchemeRow> = { compound: [4, 6, 10, 90], accessory: [3, 10, 15, 60], core: [3, 10, 15, 45], conditioning: [4, 12, 20, 45] }
const HIIT: Record<Kind, SchemeRow> = { compound: [3, 10, 15, 30], accessory: [3, 12, 15, 30], core: [3, 10, 20, 20], conditioning: [4, 20, 30, 20] }
const HOME: Record<Kind, SchemeRow> = { compound: [3, 10, 15, 75], accessory: [3, 12, 20, 45], core: [3, 15, 20, 30], conditioning: [3, 30, 40, 30] }

const strengthA = T(['Fuerza A', 'Strength A'], [['squat', 0], ['chestPress', 0], ['horizontalPull', 0]])
const strengthB = T(['Fuerza B', 'Strength B'], [['squat', 0], ['shoulderPress', 0], ['hinge', 0]])
const homeA = T(['Casa A', 'Home A'], [['squat', 2], ['chestPress', 1], ['horizontalPull', 2], ['shoulderPress', 1], ['lunge', 0], ['core', 0]])
const homeB = T(['Casa B', 'Home B'], [['hinge', 2], ['inclinePress', 1], ['horizontalPull', 3], ['lateralRaise', 0], ['biceps', 1], ['triceps', 2], ['core', 1]])
const quickA = T(['Exprés A', 'Express A'], [['squat', 0], ['chestPress', 0], ['horizontalPull', 0], ['core', 0]])
const functionalA = T(['Funcional A', 'Functional A'], [['fnSquat', 0], ['fnPull', 0], ['fnEngine', 0], ['fnCore', 0], ['fnHinge', 1]])
const functionalB = T(['Funcional B', 'Functional B'], [['fnHinge', 0], ['fnPush', 0], ['fnEngine', 1], ['fnCore', 1], ['fnSquat', 1]])
const functionalC = T(['Funcional C', 'Functional C'], [['fnSquat', 2], ['fnPull', 1], ['fnPush', 1], ['fnEngine', 2], ['fnCore', 2]])
const hiitA = T(['HIIT A', 'HIIT A'], [['homeLegs', 0], ['homePush', 0], ['hiit', 0], ['homePull', 0], ['hiit', 1], ['homeCore', 0]])
const hiitB = T(['HIIT B', 'HIIT B'], [['homeLegs', 1], ['homePush', 1], ['hiit', 2], ['homePull', 1], ['hiit', 3], ['homeCore', 1]])
const quickB = T(['Exprés B', 'Express B'], [['hinge', 1], ['shoulderPress', 0], ['verticalPull', 0], ['lunge', 0]])

export const LIBRARY: LibraryProgram[] = [
  {
    id: 'fullbody3', name: ['Cuerpo completo · 3 días', 'Full body · 3 days'], days: 3, level: 'beginner',
    description: ['El mejor punto de partida: todo el cuerpo en cada sesión, tres días alternos. Pocas series y técnica primero.', 'The best starting point: the whole body every session, three non-consecutive days. Few sets and technique first.'],
    templates: [fullBodyA, fullBodyB, fullBodyC], scheme: BEGINNER,
  },
  {
    id: 'express2', name: ['Exprés · 2 días', 'Express · 2 days'], days: 2, level: 'beginner',
    description: ['Para semanas con poco tiempo: 4 ejercicios básicos por sesión, unos 40 minutos.', 'For busy weeks: 4 basic exercises per session, about 40 minutes.'],
    templates: [quickA, quickB], scheme: BEGINNER,
  },
  {
    id: 'strength5x5', name: ['Fuerza 5×5 · 3 días', 'Strength 5×5 · 3 days'], days: 3, level: 'beginner', progression: 'linear',
    description: ['Dos sesiones (A y B) que se alternan: 5 series de 5 en los básicos (1 de 5 en peso muerto) y subida de peso en cada sesión si completas todas. Clásico para ganar fuerza rápido al principio.', 'Two sessions (A and B) that alternate: 5 sets of 5 on the main lifts (1 set of 5 on deadlifts) and a weight increase each session if you complete them all. A classic for fast early strength gains.'],
    templates: [strengthA, strengthB], scheme: STRENGTH_5X5, setsFor: { hinge: 1 }, fixed: true,
  },
  {
    id: 'ppl3', name: ['Empuje / Tirón / Pierna · 3 días', 'Push / Pull / Legs · 3 days'], days: 3, level: 'intermediate',
    description: ['Cada grupo una vez por semana con bastante volumen por sesión.', 'Each group once a week with plenty of volume per session.'],
    templates: [pushA, pullA, legsA], scheme: HYPERTROPHY,
  },
  {
    id: 'upperlower4', name: ['Torso / Pierna · 4 días', 'Upper / Lower · 4 days'], days: 4, level: 'intermediate',
    description: ['Cada músculo dos veces por semana: el reparto más equilibrado para ganar músculo con 4 días.', 'Every muscle twice a week: the most balanced split for building muscle on 4 days.'],
    templates: [upperA, lowerA, upperB, lowerB], scheme: HYPERTROPHY,
  },
  {
    id: 'ppl6', name: ['Empuje / Tirón / Pierna · 6 días', 'Push / Pull / Legs · 6 days'], days: 6, level: 'advanced',
    description: ['Cada grupo dos veces por semana con dos variantes de cada sesión. Mucho volumen: para quien ya entrena con constancia.', 'Each group twice a week with two variants of each session. High volume: for people who already train consistently.'],
    templates: [pushA, pullA, legsA, pushB, pullB, legsB], scheme: HYPERTROPHY,
  },
  {
    id: 'home-dumbbells', name: ['En casa con mancuernas · 3 días', 'Home with dumbbells · 3 days'], days: 3, level: 'beginner', equipment: 'dumbbells',
    description: ['Solo mancuernas y un banco (o una silla firme). Alterna A y B.', 'Just dumbbells and a bench (or a sturdy chair). Alternate A and B.'],
    templates: [homeA, homeB, homeA], scheme: HOME,
  },
  {
    id: 'home-bodyweight', name: ['Peso corporal · 3 días', 'Bodyweight · 3 days'], days: 3, level: 'beginner', equipment: 'bodyweight',
    description: ['Sin material: flexiones, sentadillas, zancadas, remo invertido (con una mesa) y core.', 'No equipment: push-ups, squats, lunges, inverted rows (under a table) and core.'],
    templates: [homeA, homeB, homeA], scheme: HOME,
  },
  {
    id: 'functional3', name: ['Funcional · 3 días', 'Functional · 3 days'], days: 3, level: 'intermediate', extraEquipment: ['other'],
    description: ['Al estilo de un box: un básico con barra o mancuernas, gimnásticos (dominadas, pies a la barra) y un bloque de motor (remo, bici, comba). Hazlo seguido, con poco descanso.', 'Box style: a barbell or dumbbell lift, gymnastics (pull-ups, toes to bar) and an engine block (row, bike, rope). Go through it with little rest.'],
    templates: [functionalA, functionalB, functionalC], scheme: FUNCTIONAL, fixed: true,
  },
  {
    id: 'home-hiit', name: ['HIIT en casa · 3 días', 'Home HIIT · 3 days'], days: 3, level: 'beginner', equipment: 'bodyweight', extraEquipment: ['other'],
    description: ['Intenso y sin material: pierna, empuje, remo con una toalla en la puerta y bloques de burpees, saltos y skipping. Unos 30 minutos.', 'Intense and equipment-free: legs, push, towel door rows and blocks of burpees, jumps and high knees. About 30 minutes.'],
    templates: [hiitA, hiitB, hiitA], scheme: HIIT, fixed: true,
  },
]

/**
 * Un programa de la biblioteca con los ejercicios del material indicado. Con `minutes`, cada día se queda
 * en las series que caben en ese tiempo (un Torso / Pierna entero son 24 series, más de una hora):
 * se recortan los últimos ejercicios, que son los accesorios.
 */
export function buildLibraryProgram(p: LibraryProgram, equipment: EquipmentProfile, catalog: Catalog, pullupBar = false, minutes?: number): GeneratedProgram {
  const time: TimeFit = { minutes: minutes && !p.fixed ? minutes : Infinity }
  const allowed = new Set([...equipmentInfo(p.equipment ?? equipment).allowed, ...(p.extraEquipment ?? [])])
  const days = p.templates.map((template, index) => {
    const exercises = buildDay(template.slots, time,
      // Las reglas de nivel y material del generador (la barra de dominadas, solo con gimnasio o material
      // extra). Sentadilla y peso muerto con barra, no los dos el mismo día (peso muerto y sentadilla frontal
      // juntos es demasiado; sentadilla y rumano, sí), salvo en las pautas cerradas: el 5×5 los junta a propósito.
      (name, variant, chosen, used) => pickOrSubstitute(name, variant, allowed, used, catalog, {
        level: p.level, bar: (p.equipment ?? equipment) === 'gym' || allowed.has('other') || pullupBar, equipment: p.equipment ?? equipment,
        strict: !(p.extraEquipment ?? []).includes('other'), ...dayRules(chosen), axialUsed: false, bigLiftUsed: !p.fixed && dayRules(chosen).bigLiftUsed,
      }),
      // La pauta del programa, ajustada al ejercicio que ha tocado con tu material (un 5×5 sin barra no es
      // sentadilla al aire a 5 repeticiones). setsFor es para el ejercicio pensado (el peso muerto 1×5 del 5×5);
      // si el hueco lo ocupa otro (sin barra, un puente), lleva las series normales.
      (found, name) => {
        const [schemeSets, repsMin, repsMax, rest] = p.scheme[found.slot.kind]
        const own = found.slot === slots[name] && found.exercise.equipment === 'barbell'
        return fitScheme(found.exercise, found.slot.kind, { sets: (own ? p.setsFor?.[name] : undefined) ?? schemeSets, repsMin, repsMax, rest }, p.level)
      },
      (found) => (p.progression && found.slot.kind === 'compound' ? { progression: p.progression } : {}))
    return { name: `${t(`Día ${index + 1}`, `Day ${index + 1}`)} · ${t(...template.name)}`, exercises }
  })
  const level = levelInfo(p.level).label
  return {
    name: t(...p.name),
    summary: `${t(`${p.days} días por semana`, `${p.days} days a week`)} · ${level} · ${equipmentInfo(p.equipment ?? equipment).label}`,
    days,
  }
}
