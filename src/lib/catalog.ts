import { lang, locale } from './i18n'
import { customToRaw, type CustomExercise } from './customExercises'
import { bodyPartLabel, equipmentLabel, muscleLabel } from './labels'
import type { Tracking } from './tracking'

/**
 * Ejercicio del catálogo propio (public/exercises_es.json), generado con
 * scripts/catalog/build_catalog.py. Solo lleva datos de hecho (nombre, músculos, material, nivel);
 * la imagen es el mapa muscular propio (components/MuscleMap.tsx).
 */
export interface Exercise {
  id: string
  /** Nombre en el idioma de la app. */
  name: string
  nameEs: string
  /** Nombre original en inglés (también se puede buscar por él en español). */
  nameEn: string
  muscle: string
  bodyPart: string
  equipment: string
  category: string
  level: string
  secondaryMuscles: string[]
  /** Pasos de ejecución en el idioma de la app (texto propio; vacío si no hay). */
  instructions: string[]
  /** Ejercicio creado por el usuario (no del catálogo). */
  custom?: boolean
  /** Solo los propios: cómo se registra cada serie. */
  tracking?: Tracking
}

/** Ejercicio tal como viene en exercises_es.json (los dos idiomas). */
export interface RawExercise extends Omit<Exercise, 'nameEs' | 'instructions'> {
  instructions: string[]
  instructionsEn?: string[]
}

export interface CatalogData {
  exercises: RawExercise[]
  legacy: Record<string, string>
}

export const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export class Catalog {
  readonly exercises: Exercise[]
  private byId = new Map<string, Exercise>()
  private keys = new Map<string, string>()

  constructor(raw: RawExercise[], private legacy: Record<string, string> = {}, custom: CustomExercise[] = []) {
    const en = lang() === 'en'
    const list: Exercise[] = [...raw, ...custom.map(customToRaw)].map(({ instructionsEn, ...e }) => ({
      ...e, nameEs: e.name, name: en ? e.nameEn : e.name,
      instructions: en ? (instructionsEn?.length ? instructionsEn : e.instructions) : e.instructions,
    }))
    this.exercises = [...list].sort((a, b) => a.name.localeCompare(b.name, locale()))
    for (const e of list) {
      this.byId.set(e.id, e)
      this.keys.set(e.id, normalize(
        `${e.nameEs} ${muscleLabel(e.muscle)} ${equipmentLabel(e.equipment)} ${bodyPartLabel(e.bodyPart)} ${e.nameEn}`,
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
    return [...new Set(this.exercises.map((e) => e.muscle))].sort((a, b) => muscleLabel(a).localeCompare(muscleLabel(b), locale()))
  }

  get equipments() {
    return [...new Set(this.exercises.map((e) => e.equipment))].sort((a, b) => equipmentLabel(a).localeCompare(equipmentLabel(b), locale()))
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

export async function loadCatalog(): Promise<CatalogData> {
  const [res, legacyRes] = await Promise.all([fetch('exercises_es.json'), fetch('exercise_ids_v1.json')])
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as { exercises: RawExercise[] }
  const legacy = legacyRes.ok ? ((await legacyRes.json()) as Record<string, string>) : {}
  return { exercises: data.exercises, legacy }
}
