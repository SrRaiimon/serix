// Traducciones de los códigos del catálogo de ejercicios (ver scripts/catalog/build_catalog.py).

const muscles: Record<string, string> = {
  abductors: 'Abductores',
  abs: 'Abdominales',
  adductors: 'Aductores',
  biceps: 'Bíceps',
  calves: 'Gemelos',
  cardio: 'Cardio',
  delts: 'Hombros',
  forearms: 'Antebrazos',
  glutes: 'Glúteos',
  hamstrings: 'Isquiotibiales',
  lats: 'Dorsales',
  'levator-scapulae': 'Elevador de la escápula',
  neck: 'Cuello',
  pectorals: 'Pectorales',
  quads: 'Cuádriceps',
  'serratus-anterior': 'Serrato anterior',
  spine: 'Lumbares',
  traps: 'Trapecios',
  triceps: 'Tríceps',
  'upper-back': 'Espalda alta',
}

const bodyParts: Record<string, string> = {
  chest: 'Pecho',
  back: 'Espalda',
  shoulders: 'Hombros',
  arms: 'Brazos',
  legs: 'Piernas',
  core: 'Core',
  cardio: 'Cardio',
}

export const bodyPartOrder = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio']

const equipment: Record<string, string> = {
  barbell: 'Barra',
  dumbbell: 'Mancuernas',
  cable: 'Polea',
  machine: 'Máquina',
  lever: 'Máquina de palanca',
  smith: 'Máquina Smith',
  sled: 'Prensa',
  bodyweight: 'Peso corporal',
  band: 'Banda elástica',
  kettlebell: 'Kettlebell',
  'ez-bar': 'Barra Z',
  'medicine-ball': 'Balón medicinal',
  'exercise-ball': 'Fitball',
  'foam-roll': 'Rodillo de espuma',
  other: 'Otro',
}

const categories: Record<string, string> = {
  strength: 'Fuerza',
  stretching: 'Estiramiento',
  cardio: 'Cardio',
  plyometrics: 'Pliometría',
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const muscleLabel = (k: string) => muscles[k] ?? cap(k)
export const bodyPartLabel = (k: string) => bodyParts[k] ?? cap(k)
export const equipmentLabel = (k: string) => equipment[k] ?? cap(k)
export const categoryLabel = (k: string) => categories[k] ?? cap(k)
export const categoryKeys = Object.keys(categories)

const levels: Record<string, string> = { beginner: 'Principiante', intermediate: 'Intermedio', expert: 'Avanzado' }
export const levelLabel = (k: string) => levels[k] ?? cap(k)

/** Músculos principales de una rutina, para mostrar debajo de su nombre. */
export function muscleSummary(r: { exercises: { muscle: string }[] }) {
  return [...new Set(r.exercises.map((e) => e.muscle))].slice(0, 4).map(muscleLabel).join(', ')
}
