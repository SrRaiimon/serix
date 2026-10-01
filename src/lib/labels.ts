import { lang } from './i18n'

// Traducciones de los códigos del catálogo de ejercicios (ver scripts/catalog/build_catalog.py),
// en español e inglés.

type Labels = Record<string, [es: string, en: string]>

const muscles: Labels = {
  abductors: ['Abductores', 'Abductors'],
  abs: ['Abdominales', 'Abs'],
  adductors: ['Aductores', 'Adductors'],
  biceps: ['Bíceps', 'Biceps'],
  calves: ['Gemelos', 'Calves'],
  cardio: ['Cardio', 'Cardio'],
  delts: ['Hombros', 'Shoulders'],
  forearms: ['Antebrazos', 'Forearms'],
  glutes: ['Glúteos', 'Glutes'],
  hamstrings: ['Isquiotibiales', 'Hamstrings'],
  lats: ['Dorsales', 'Lats'],
  'levator-scapulae': ['Elevador de la escápula', 'Levator scapulae'],
  neck: ['Cuello', 'Neck'],
  pectorals: ['Pectorales', 'Chest'],
  quads: ['Cuádriceps', 'Quads'],
  'serratus-anterior': ['Serrato anterior', 'Serratus anterior'],
  spine: ['Lumbares', 'Lower back'],
  traps: ['Trapecios', 'Traps'],
  triceps: ['Tríceps', 'Triceps'],
  'upper-back': ['Espalda alta', 'Upper back'],
}

const bodyParts: Labels = {
  chest: ['Pecho', 'Chest'],
  back: ['Espalda', 'Back'],
  shoulders: ['Hombros', 'Shoulders'],
  arms: ['Brazos', 'Arms'],
  legs: ['Piernas', 'Legs'],
  core: ['Core', 'Core'],
  cardio: ['Cardio', 'Cardio'],
}

export const bodyPartOrder = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio']

const equipment: Labels = {
  barbell: ['Barra', 'Barbell'],
  dumbbell: ['Mancuernas', 'Dumbbells'],
  cable: ['Polea', 'Cable'],
  machine: ['Máquina', 'Machine'],
  lever: ['Máquina de palanca', 'Lever machine'],
  smith: ['Máquina Smith', 'Smith machine'],
  sled: ['Prensa', 'Sled'],
  bodyweight: ['Peso corporal', 'Bodyweight'],
  band: ['Banda elástica', 'Band'],
  kettlebell: ['Kettlebell', 'Kettlebell'],
  'ez-bar': ['Barra Z', 'EZ bar'],
  'medicine-ball': ['Balón medicinal', 'Medicine ball'],
  'exercise-ball': ['Fitball', 'Exercise ball'],
  'foam-roll': ['Rodillo de espuma', 'Foam roller'],
  other: ['Otro', 'Other'],
}

const categories: Labels = {
  strength: ['Fuerza', 'Strength'],
  stretching: ['Estiramiento', 'Stretching'],
  cardio: ['Cardio', 'Cardio'],
  plyometrics: ['Pliometría', 'Plyometrics'],
}

const levels: Labels = {
  beginner: ['Principiante', 'Beginner'],
  intermediate: ['Intermedio', 'Intermediate'],
  expert: ['Avanzado', 'Advanced'],
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const label = (labels: Labels, k: string) => labels[k]?.[lang() === 'en' ? 1 : 0] ?? cap(k)

export const muscleLabel = (k: string) => label(muscles, k)
export const bodyPartLabel = (k: string) => label(bodyParts, k)
export const equipmentLabel = (k: string) => label(equipment, k)
export const categoryLabel = (k: string) => label(categories, k)
export const categoryKeys = Object.keys(categories)
export const levelLabel = (k: string) => label(levels, k)

/** Músculos principales de una rutina, para mostrar debajo de su nombre. */
export function muscleSummary(r: { exercises: { muscle: string }[] }) {
  return [...new Set(r.exercises.map((e) => e.muscle))].slice(0, 4).map(muscleLabel).join(', ')
}
