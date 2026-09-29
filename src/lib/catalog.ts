import { bodyPartLabel, equipmentLabel, muscleLabel } from './labels'

/**
 * Ejercicio del catálogo propio (public/exercises_es.json), generado con
 * scripts/catalog/build_catalog.py. Solo lleva datos de hecho (nombre, músculos, material, nivel);
 * la imagen es el mapa muscular propio (components/MuscleMap.tsx).
 */
export interface Exercise {
  id: string
  name: string
  /** Nombre original en inglés (también se puede buscar por él). */
  nameEn: string
  muscle: string
  bodyPart: string
  equipment: string
  category: string
  level: string
  secondaryMuscles: string[]
  /** Pasos de ejecución, solo de fuentes con licencia verificada (vacío si no hay). */
  instructions: string[]
}

export const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export class Catalog {
  readonly exercises: Exercise[]
  private byId = new Map<string, Exercise>()
  private keys = new Map<string, string>()

  constructor(list: Exercise[], private legacy: Record<string, string> = {}) {
    this.exercises = [...list].sort((a, b) => a.name.localeCompare(b.name, 'es'))
    for (const e of list) {
      this.byId.set(e.id, e)
      this.keys.set(e.id, normalize(
        `${e.name} ${muscleLabel(e.muscle)} ${equipmentLabel(e.equipment)} ${bodyPartLabel(e.bodyPart)} ${e.nameEn}`,
      ))
    }
  }

  /** Acepta también identificadores del catálogo anterior (ver exercise_ids_v1.json). */
  get(id: string) {
    return this.byId.get(id) ?? this.byId.get(this.legacy[id])
  }

  /** Identificador actual equivalente, o undefined si el ejercicio no tiene equivalencia. */
  resolve(id: string): string | undefined {
    if (this.byId.has(id)) return id
    const mapped = this.legacy[id]
    return mapped && this.byId.has(mapped) ? mapped : undefined
  }

  filter(f: ExerciseFilter, favorites: string[]): Exercise[] {
    const terms = normalize(f.query).split(/\s+/).filter(Boolean)
    const favs = f.favoritesOnly ? new Set(favorites) : null
    return this.exercises.filter((e) => {
      if (f.bodyPart && e.bodyPart !== f.bodyPart) return false
      if (f.muscle && e.muscle !== f.muscle) return false
      if (f.equipment && e.equipment !== f.equipment) return false
      if (f.category && e.category !== f.category) return false
      if (favs && !favs.has(e.id)) return false
      if (terms.length) {
        const key = this.keys.get(e.id) ?? ''
        return terms.every((t) => key.includes(t))
      }
      return true
    })
  }

  get muscles() {
    return [...new Set(this.exercises.map((e) => e.muscle))].sort((a, b) => muscleLabel(a).localeCompare(muscleLabel(b), 'es'))
  }

  get equipments() {
    return [...new Set(this.exercises.map((e) => e.equipment))].sort((a, b) => equipmentLabel(a).localeCompare(equipmentLabel(b), 'es'))
  }
}

export interface ExerciseFilter {
  query: string
  bodyPart?: string
  muscle?: string
  equipment?: string
  category?: string
  favoritesOnly: boolean
}

export const emptyFilter: ExerciseFilter = { query: '', favoritesOnly: false }

export async function loadCatalog(): Promise<Catalog> {
  const [res, legacyRes] = await Promise.all([fetch('exercises_es.json'), fetch('exercise_ids_v1.json')])
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as { exercises: Exercise[] }
  const legacy = legacyRes.ok ? ((await legacyRes.json()) as Record<string, string>) : {}
  return new Catalog(data.exercises, legacy)
}
