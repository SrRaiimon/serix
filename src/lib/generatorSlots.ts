// Los huecos del generador (qué ejercicios caben en cada uno) y las plantillas de cada día: los datos de
// generator.ts, aparte de la lógica que elige, ajusta al tiempo y equilibra la semana.

// Cada hueco tiene ejercicios preferidos (identificadores del catálogo, comprobados por
// scripts/catalog/check_ids.py) de más a menos equipamiento; si ninguno encaja se busca por músculo.

export type Kind = 'compound' | 'accessory' | 'core' | 'conditioning'

export interface Slot {
  kind: Kind
  muscles: string[]
  preferred: string[]
  /** Si se indica, el respaldo solo acepta ejercicios cuyo nombre en inglés encaje (mismo movimiento). */
  match?: RegExp
}

export const slots = {
  squat: { kind: 'compound', muscles: ['quads', 'glutes'], match: /squat|lunge|split|step|leg press/i, preferred: ['Barbell_Full_Squat', 'Front_Barbell_Squat', 'Leg_Press', 'Hack_Squat', 'Dumbbell_Squat', 'Goblet_Squat', 'Split_Squat_with_Dumbbells', 'Front_Squats_With_Two_Kettlebells', 'Squats_-_With_Bands', 'Bodyweight_Bulgarian_Split_Squat', 'Pistol_Squat', 'Backpack_Squat', 'Bodyweight_Squat', 'Split_Squats'] },
  // El respaldo solo acepta bisagras de verdad: sin esto, sin material salían patadas de tijera como «peso muerto».
  hinge: { kind: 'compound', muscles: ['hamstrings', 'glutes'], match: /deadlift|good morning|hip thrust|bridge|swing|pull.?through|hyperextension/i, preferred: ['Barbell_Deadlift', 'Romanian_Deadlift', 'Stiff-Legged_Dumbbell_Deadlift', 'Barbell_Hip_Thrust', 'One-Arm_Kettlebell_Swings', 'Band_Good_Morning', 'Suspension_Hip_Bridge', 'Single_Leg_Glute_Bridge'] },
  legPress: { kind: 'compound', muscles: ['quads', 'glutes'], preferred: ['Leg_Press', 'Barbell_Walking_Lunge', 'Dumbbell_Lunges', 'Lunge_Pass_Through', 'Dumbbell_Step_Ups', 'Step-up_with_Knee_Raise', 'Bodyweight_Walking_Lunge'] },
  lunge: { kind: 'accessory', muscles: ['quads', 'glutes'], match: /lunge|split|step/i, preferred: ['Dumbbell_Lunges', 'Barbell_Lunge', 'Split_Squat_with_Dumbbells', 'Dumbbell_Rear_Lunge', 'Lunge_Pass_Through', 'Bodyweight_Walking_Lunge', 'Step-up_with_Knee_Raise', 'Split_Squats', 'Kettlebell_Reverse_Lunge', 'Kettlebell_Split_Squat', 'Bodyweight_Reverse_Lunge'] },
  // Sin máquinas, el curl femoral de verdad es el nórdico (desde intermedio); el peso muerto a una pierna queda
  // para cuando el día no tiene ya otra bisagra (ver `hingeUsed`).
  legCurl: { kind: 'accessory', muscles: ['hamstrings'], match: /curl|glute.?ham/i, preferred: ['Lying_Leg_Curls', 'Seated_Leg_Curl', 'Ball_Leg_Curl', 'Suspension_Leg_Curl', 'Band_Lying_Leg_Curl', 'Natural_Glute_Ham_Raise', 'Floor_Glute-Ham_Raise', 'Stiff-Legged_Dumbbell_Deadlift', 'Kettlebell_One-Legged_Deadlift', 'Single_Leg_Deadlift'] },
  legExtension: { kind: 'accessory', muscles: ['quads'], match: /extension|sissy/i, preferred: ['Leg_Extensions', 'Single-Leg_Leg_Extension', 'Weighted_Sissy_Squat', 'Wall_Sit'] },
  calves: { kind: 'accessory', muscles: ['calves'], match: /calf/i, preferred: ['Standing_Calf_Raises', 'Standing_Barbell_Calf_Raise', 'Standing_Dumbbell_Calf_Raise', 'Seated_Calf_Raise', 'Calf_Raises_-_With_Bands', 'Suspender_Calf_Raise', 'Single_Leg_Calf_Raise'] },
  chestPress: { kind: 'compound', muscles: ['pectorals'], preferred: ['Barbell_Bench_Press_-_Medium_Grip', 'Dumbbell_Bench_Press', 'Alternating_Floor_Press', 'Bench_Press_-_With_Bands', 'Suspended_Push-Up', 'Pushups'] },
  inclinePress: { kind: 'compound', muscles: ['pectorals'], preferred: ['Barbell_Incline_Bench_Press_-_Medium_Grip', 'Incline_Dumbbell_Press', 'One-Arm_Kettlebell_Floor_Press', 'Dips_-_Chest_Version', 'Decline_Push-Up'] },
  chestFly: { kind: 'accessory', muscles: ['pectorals'], match: /fly|flye|cross|butterfly/i, preferred: ['Cable_Crossover', 'Butterfly', 'Dumbbell_Flyes', 'Cross_Over_-_With_Bands', 'Incline_Dumbbell_Flyes', 'Push-Up_Wide'] },
  verticalPull: { kind: 'compound', muscles: ['lats'], match: /pull-?up|pullup|chin|pulldown/i, preferred: ['Pullups', 'Wide-Grip_Lat_Pulldown', 'Full_Range-Of-Motion_Lat_Pulldown', 'Close-Grip_Front_Lat_Pulldown', 'Chin-Up', 'Band_Assisted_Pull-Up', 'Negative_Pull-Up', 'Band_Lat_Pulldown', 'Suspension_Self_Assisted_Pull_Up'] },
  horizontalPull: { kind: 'compound', muscles: ['upper-back', 'lats'], match: /row/i, preferred: ['Bent_Over_Barbell_Row', 'Seated_Cable_Rows', 'Bent_Over_Two-Dumbbell_Row', 'One-Arm_Dumbbell_Row', 'Two-Arm_Kettlebell_Row', 'Inverted_Row', 'Band_Row', 'Suspended_Row'] },
  shoulderPress: { kind: 'compound', muscles: ['delts'], preferred: ['Barbell_Shoulder_Press', 'Dumbbell_Shoulder_Press', 'Seated_Dumbbell_Press', 'Kettlebell_Seated_Press', 'Shoulder_Press_-_With_Bands', 'Handstand_Push-Ups'] },
  lateralRaise: { kind: 'accessory', muscles: ['delts'], match: /^(?!.*press).*(lateral|side|deltoid raise)/i, preferred: ['Side_Lateral_Raise', 'Cable_Seated_Lateral_Raise', 'Seated_Side_Lateral_Raise', 'Lateral_Raise_-_With_Bands'] },
  rearDelt: { kind: 'accessory', muscles: ['delts'], match: /rear|reverse fly|face pull|pull apart|back fly/i, preferred: ['Face_Pull', 'Reverse_Flyes', 'Seated_Bent-Over_Rear_Delt_Raise', 'Back_Flyes_-_With_Bands', 'Band_Pull_Apart', 'Suspender_Face_Pull', 'Reverse_Snow_Angels', 'Band_Face_Pull'] },
  shrug: { kind: 'accessory', muscles: ['traps'], match: /shrug|upright|high pull/i, preferred: ['Barbell_Shrug', 'Dumbbell_Shrug', 'Kettlebell_Sumo_High_Pull', 'Upright_Row_-_With_Bands', 'Scapular_Pull-Up'] },
  biceps: { kind: 'accessory', muscles: ['biceps'], match: /curl|chin/i, preferred: ['Barbell_Curl', 'Dumbbell_Bicep_Curl', 'EZ-Bar_Curl', 'Standing_Biceps_Cable_Curl', 'Close-Grip_EZ-Bar_Curl_with_Band', 'Kettlebell_Curl', 'Backpack_Curl', 'Chin-Up', 'Band_Curl'] },
  hammer: { kind: 'accessory', muscles: ['biceps'], match: /hammer|curl/i, preferred: ['Hammer_Curls', 'Cable_Hammer_Curls_-_Rope_Attachment', 'Alternate_Hammer_Curl', 'Kettlebell_Curl', 'Backpack_Curl', 'Chin-Up', 'Kettlebell_Hammer_Curl', 'Band_Hammer_Curl'] },
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

export type SlotName = keyof typeof slots
export type Template = { name: [es: string, en: string]; slots: [SlotName, number][] }

export const T = (name: [string, string], list: [SlotName, number][]): Template => ({ name, slots: list })

export const fullBodyA = T(['Cuerpo completo A', 'Full body A'], [['squat', 0], ['chestPress', 0], ['horizontalPull', 0], ['shoulderPress', 0], ['legCurl', 0], ['biceps', 0], ['core', 0], ['calves', 0]])
export const fullBodyB = T(['Cuerpo completo B', 'Full body B'], [['hinge', 1], ['inclinePress', 0], ['verticalPull', 0], ['lateralRaise', 0], ['lunge', 0], ['triceps', 0], ['core', 1], ['rearDelt', 0]])
export const fullBodyC = T(['Cuerpo completo C', 'Full body C'], [['legPress', 0], ['chestPress', 1], ['horizontalPull', 1], ['shoulderPress', 1], ['legExtension', 0], ['hammer', 0], ['conditioning', 0], ['calves', 1]])
export const pushA = T(['Empuje', 'Push'], [['chestPress', 0], ['shoulderPress', 0], ['inclinePress', 0], ['lateralRaise', 0], ['chestFly', 0], ['triceps', 0], ['triceps', 1], ['core', 0]])
export const pullA = T(['Tirón', 'Pull'], [['verticalPull', 0], ['horizontalPull', 0], ['horizontalPull', 1], ['rearDelt', 0], ['biceps', 0], ['hammer', 0], ['shrug', 0], ['core', 1]])
export const legsA = T(['Pierna', 'Legs'], [['squat', 0], ['hinge', 1], ['legPress', 0], ['legCurl', 0], ['legExtension', 0], ['calves', 0], ['core', 0], ['lunge', 0]])
export const pushB = T(['Empuje B', 'Push B'], [['inclinePress', 1], ['shoulderPress', 1], ['chestPress', 1], ['lateralRaise', 1], ['chestFly', 1], ['triceps', 2], ['triceps', 3], ['core', 2]])
export const pullB = T(['Tirón B', 'Pull B'], [['horizontalPull', 2], ['verticalPull', 1], ['horizontalPull', 3], ['rearDelt', 1], ['biceps', 1], ['hammer', 1], ['shrug', 1], ['core', 3]])
export const legsB = T(['Pierna B', 'Legs B'], [['hinge', 0], ['squat', 1], ['lunge', 1], ['legCurl', 1], ['legExtension', 0], ['calves', 1], ['core', 2], ['legPress', 1]])
// Torso: con 6 ejercicios (60 min) entran los 6 primeros, así que los brazos se reparten entre los dos días:
// tríceps y elevación lateral en A; bíceps y tríceps en B (con aperturas en B, el tríceps se quedaba en 3 series
// a la semana en el híbrido de 5 días).
export const upperA = T(['Torso A', 'Upper A'], [['chestPress', 0], ['horizontalPull', 0], ['shoulderPress', 0], ['verticalPull', 0], ['triceps', 0], ['lateralRaise', 0], ['biceps', 0], ['rearDelt', 0]])
export const upperB = T(['Torso B', 'Upper B'], [['inclinePress', 0], ['verticalPull', 1], ['shoulderPress', 1], ['horizontalPull', 1], ['hammer', 0], ['triceps', 1], ['chestFly', 0], ['lateralRaise', 1]])
// Fuerza: banca y press militar dos veces por semana, cada uno pesado un día y de volumen el otro.
export const strengthUpperB = T(['Torso B', 'Upper B'], [['shoulderPress', 0], ['verticalPull', 1], ['chestPress', 0], ['horizontalPull', 1], ['hammer', 0], ['chestFly', 0], ['triceps', 1], ['lateralRaise', 1]])
// Y la sentadilla dos veces: pesada el día A y frontal (de volumen) tras el peso muerto el día B, en vez de
// prensa y hack seguidas.
export const strengthLowerB = T(['Pierna B', 'Legs B'], [['hinge', 0], ['squat', 1], ['legCurl', 1], ['lunge', 1], ['calves', 1], ['core', 2], ['legPress', 0], ['legExtension', 0]])
export const lowerA = T(['Pierna A', 'Legs A'], [['squat', 0], ['hinge', 1], ['legCurl', 0], ['lunge', 0], ['calves', 0], ['core', 0], ['legExtension', 0], ['glute', 0]])
// Pierna B: peso muerto, una sentadilla de máquina y zancada (antes peso muerto, prensa y hack seguidas, y la
// prensa repetida con la Pierna del híbrido de 5 días).
export const lowerB = T(['Pierna B', 'Legs B'], [['hinge', 0], ['squat', 1], ['lunge', 1], ['legCurl', 1], ['legExtension', 0], ['calves', 1], ['core', 2], ['legPress', 0]])
