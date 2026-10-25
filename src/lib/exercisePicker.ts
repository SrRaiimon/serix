import type { Exercise } from './catalog'

// Básicos habituales de gimnasio, en orden orientativo de popularidad para quien aún no tiene historial.
export const POPULAR_EXERCISE_IDS: readonly string[] = [
  'Barbell_Bench_Press_-_Medium_Grip',
  'Barbell_Squat',
  'Barbell_Deadlift',
  'Standing_Military_Press',
  'Pullups',
  'Bent_Over_Barbell_Row',
  'Wide-Grip_Lat_Pulldown',
  'Barbell_Curl',
  'Triceps_Pushdown',
  'Leg_Press',
  'Dumbbell_Lunges',
  'Barbell_Hip_Thrust',
  'Side_Lateral_Raise',
  'Plank',
  'Crunches',
  'Dumbbell_Bench_Press',
  'Incline_Dumbbell_Press',
  'Seated_Cable_Rows',
  'Dumbbell_Shoulder_Press',
  'Romanian_Deadlift',
  'Leg_Extensions',
  'Lying_Leg_Curls',
  'Seated_Leg_Curl',
  'Standing_Calf_Raises',
  'Hammer_Curls',
  'One-Arm_Dumbbell_Row',
  'Dips_-_Chest_Version',
  'Pushups',
  'Face_Pull',
  'Cable_Crossover',
]

const popularity = new Map(POPULAR_EXERCISE_IDS.map((id, index) => [id, index]))

/** Sin búsqueda: usados por fecha, luego básicos y después el resto en su orden original. */
export function orderPickerExercises(list: Exercise[], usage: ReadonlyMap<string, { last: number }>): Exercise[] {
  return [...list].sort((a, b) => {
    const usedA = usage.get(a.id), usedB = usage.get(b.id)
    if (usedA && usedB) return usedB.last - usedA.last
    if (usedA) return -1
    if (usedB) return 1
    return (popularity.get(a.id) ?? popularity.size) - (popularity.get(b.id) ?? popularity.size)
  })
}
