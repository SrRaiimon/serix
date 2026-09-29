import { normalize, type Catalog, type Exercise } from './catalog'
import { equipmentInfo, type EquipmentProfile } from './generator'

// Palabras que no describen el movimiento: material, conectores y ruido de los nombres. Si contaran,
// "Curl con barra" se parecería más a "Remo con barra" que a "Curl con mancuerna".
const ignored = new Set([
  'con', 'en', 'de', 'del', 'la', 'el', 'los', 'las', 'a', 'al', 'y', 'o', 'para', 'sobre',
  'barra', 'mancuerna', 'mancuernas', 'polea', 'maquina', 'palanca', 'smith', 'banda', 'elastica',
  'kettlebell', 'trineo', 'peso', 'corporal', 'cuerda', 'z',
  'with', 'on', 'the', 'and', 'of', 'to', 'barbell', 'dumbbell', 'cable', 'lever', 'leverage', 'band', 'bands',
  'machine', 'ez', 'bar', 'bodyweight', 'weighted', 'resistance', 'rope', 'kettlebells', 'smith', 'grip', 'medium',
])

function movementWords(e: Exercise): Set<string> {
  const words = normalize(`${e.name} ${e.nameEn}`).split(/[^a-zñ0-9]+/)
  return new Set(words.filter((w) => w.length > 1 && !ignored.has(w)))
}

/**
 * Ejercicios que pueden sustituir a otro: mismo músculo principal, ordenados por parecido del
 * movimiento, luego mismo tipo (fuerza, cardio…) y por último los de nombre más corto (los básicos).
 * Si se indica material, solo los que se pueden hacer con él.
 */
export function alternatives(
  catalog: Catalog,
  current: { exerciseId: string; muscle: string },
  equipment: EquipmentProfile | null,
  exclude: Set<string>,
): Exercise[] {
  const base = catalog.get(current.exerciseId)
  const baseWords = base ? movementWords(base) : new Set<string>()
  const allowed = equipment ? new Set(equipmentInfo(equipment).allowed) : null
  const score = (e: Exercise) => {
    let shared = 0
    for (const w of movementWords(e)) if (baseWords.has(w)) shared++
    return shared * 10 + (base && e.category === base.category ? 3 : 0)
  }
  return catalog.exercises
    .filter((e) => e.muscle === current.muscle && e.id !== current.exerciseId && !exclude.has(e.id))
    .filter((e) => !allowed || allowed.has(e.equipment))
    .map((e) => ({ e, s: score(e) }))
    .sort((a, b) => b.s - a.s || a.e.name.length - b.e.name.length)
    .map(({ e }) => e)
}
