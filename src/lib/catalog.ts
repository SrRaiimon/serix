import { lang, locale } from './i18n'
import { customToRaw, type CustomExercise } from './customExercises'
import { bodyPartLabel, equipmentLabel, muscleLabel } from './labels'
import { fold, makeSearch } from './search'
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

/** Nombres de gimnasio que el catálogo llama de otra forma (en singular y sin tildes). */
const SYNONYMS = [
  ['multipower', 'smith'], ['gemelo', 'pantorrilla'], ['abdominal', 'abdomen', 'crunch'], ['pajaro', 'posterior'],
  ['rompecraneo', 'frances'], ['trapecio', 'encogimiento'], ['lumbar', 'hiperextension'], ['femoral', 'isquiotibial', 'isquio'],
  ['hombro', 'deltoide'], ['pecho', 'pectoral'], ['dorsal', 'espalda'], ['culo', 'gluteo'], ['zancada', 'estocada', 'lunge'],
  ['kettlebell', 'pesa'], ['fondo', 'dip'], ['dominada', 'pullup', 'chinup'], ['jalon', 'pulldown'], ['sentadilla', 'squat'],
]
const exerciseSearch = makeSearch(SYNONYMS)

export const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export class Catalog {
  readonly exercises: Exercise[]
  private byId = new Map<string, Exercise>()
  private keys = new Map<string, string>()
  /** Solo el nombre (sin tildes): para poner primero lo que se llama como lo buscado. */
  private names = new Map<string, string>()

  constructor(raw: RawExercise[], private legacy: Record<string, string> = {}, custom: CustomExercise[] = []) {
    const en = lang() === 'en'
    const list: Exercise[] = [...raw, ...custom.map(customToRaw)].map(({ instructionsEn, ...e }) => ({
      ...e, nameEs: e.name, name: en ? e.nameEn : e.name,
      instructions: en ? (instructionsEn?.length ? instructionsEn : e.instructions) : e.instructions,
    }))
    this.exercises = [...list].sort((a, b) => a.name.localeCompare(b.name, locale()))
    for (const e of list) {
      this.byId.set(e.id, e)
      this.names.set(e.id, fold(e.name))
      this.keys.set(e.id, fold(
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

  /**
   * Con texto buscado vale en plural o singular, sin tildes y con nombres de gimnasio («multipower»,
   * «pájaros»…), y sale primero lo que se llama así: lo que empieza por lo buscado, luego lo que lo
   * lleva en el nombre (el más corto antes: el ejercicio básico antes que sus variantes) y al final lo
   * que coincide solo por músculo, material o nombre en inglés.
   */
  filter(f: ExerciseFilter, favorites: string[]): Exercise[] {
    const terms = exerciseSearch.terms(f.query)
    const favs = f.favoritesOnly ? new Set(favorites) : null
    const list = this.exercises.filter((e) => {
      if (f.bodyPart && e.bodyPart !== f.bodyPart) return false
      if (f.muscle && e.muscle !== f.muscle) return false
      if (f.equipment && e.equipment !== f.equipment) return false
      if (f.category && e.category !== f.category) return false
      if (favs && !favs.has(e.id)) return false
      if (f.allowedEquipment && !f.allowedEquipment.includes(e.equipment)) return false
      return !terms.length || exerciseSearch.matchesTerms(this.keys.get(e.id) ?? '', terms)
    })
    if (!terms.length) return list
    const rank = this.relevance(f.query)
    const score = new Map(list.map((e) => [e.id, rank(e)]))
    return list.sort((a, b) => score.get(a.id)! - score.get(b.id)! || a.name.length - b.name.length)
  }

  /** Lo bien que encaja un ejercicio con lo buscado: 0 empieza así, 1 lo lleva en el nombre, 2 el resto. */
  relevance(query: string): (e: Exercise) => number {
    const terms = exerciseSearch.terms(query)
    const start = terms.map((x) => x.typed).join(' ')
    return (e) => {
      const name = this.names.get(e.id) ?? ''
      return name.startsWith(start) ? 0 : exerciseSearch.matchesTerms(name, terms) ? 1 : 2
    }
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
  /** Material con el que se pueden hacer (el de tu perfil); sin valor = todos. */
  allowedEquipment?: string[]
}

export const emptyFilter: ExerciseFilter = { query: '', favoritesOnly: false }

export async function loadCatalog(): Promise<CatalogData> {
  const [res, legacyRes] = await Promise.all([fetch('exercises_es.json'), fetch('exercise_ids_v1.json')])
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as { exercises: RawExercise[] }
  const legacy = legacyRes.ok ? ((await legacyRes.json()) as Record<string, string>) : {}
  return { exercises: data.exercises, legacy }
}
