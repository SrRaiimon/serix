import type { RawExercise } from './catalog'
import { EQUIPMENT_KEYS, MUSCLE_BODY_PART, MUSCLE_KEYS } from './labels'
import type { Tracking } from './tracking'

// Ejercicios propios: los que no están en el catálogo (una máquina concreta de tu gimnasio, una
// variante…). Se guardan con el resto de tus datos y se mezclan con el catálogo, así que sirven en
// rutinas, entrenamientos, récords y estadísticas como cualquier otro.

export interface CustomExercise {
  /** Siempre empieza por «custom-», para no chocar nunca con el catálogo. */
  id: string
  name: string
  muscle: string
  secondaryMuscles: string[]
  equipment: string
  tracking: Tracking
  /** Notas de ejecución (una por línea). */
  notes: string
  createdAt: number
}

export const MAX_CUSTOM_EXERCISES = 500
export const MAX_CUSTOM_NAME = 60
const MAX_NOTES = 1000
const TRACKINGS: Tracking[] = ['weight_reps', 'time', 'distance_time']

export const isCustomId = (id: string) => id.startsWith('custom-')

export const newCustomId = () => 'custom-' + Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, '0')).join('')

/** Como ejercicio del catálogo (el mismo nombre en los dos idiomas). */
export function customToRaw(c: CustomExercise): RawExercise & { custom: true; tracking: Tracking } {
  const instructions = c.notes.split('\n').map((l) => l.trim()).filter(Boolean)
  return {
    id: c.id, name: c.name, nameEn: c.name, muscle: c.muscle, bodyPart: MUSCLE_BODY_PART[c.muscle] ?? 'core', equipment: c.equipment,
    category: c.tracking === 'distance_time' ? 'cardio' : 'strength', level: 'intermediate',
    secondaryMuscles: c.secondaryMuscles, instructions, instructionsEn: instructions, custom: true, tracking: c.tracking,
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Ejercicio propio válido (copias de seguridad y rutinas compartidas), o `undefined`. */
export function cleanCustomExercise(v: unknown): CustomExercise | undefined {
  if (!isObj(v) || typeof v.id !== 'string' || !/^custom-[a-z0-9]{4,24}$/.test(v.id)) return undefined
  const name = typeof v.name === 'string' ? v.name.trim().slice(0, MAX_CUSTOM_NAME) : ''
  if (!name || typeof v.muscle !== 'string' || !MUSCLE_KEYS.includes(v.muscle)) return undefined
  const secondary = Array.isArray(v.secondaryMuscles) ? v.secondaryMuscles.filter((m): m is string => typeof m === 'string' && MUSCLE_KEYS.includes(m) && m !== v.muscle) : []
  return {
    id: v.id, name, muscle: v.muscle, secondaryMuscles: [...new Set(secondary)].slice(0, 6),
    equipment: typeof v.equipment === 'string' && EQUIPMENT_KEYS.includes(v.equipment) ? v.equipment : 'other',
    tracking: TRACKINGS.find((x) => x === v.tracking) ?? 'weight_reps',
    notes: typeof v.notes === 'string' ? v.notes.slice(0, MAX_NOTES) : '',
    createdAt: typeof v.createdAt === 'number' && Number.isFinite(v.createdAt) ? v.createdAt : Date.now(),
  }
}
