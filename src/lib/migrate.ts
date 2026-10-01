import type { Catalog } from './catalog'
import { getData, update } from './store'

export const CATALOG_VERSION = 2

/**
 * Pasa rutinas, historial y favoritos del catálogo antiguo al actual usando la tabla de
 * equivalencias (public/exercise_ids_v1.json). Los ejercicios sin equivalencia se quedan como
 * estaban: conservan su nombre y datos, solo que sin ilustración.
 */
export function migrateCatalog(catalog: Catalog): void {
  if ((getData().settings.catalogVersion ?? 1) >= CATALOG_VERSION) return
  update((d) => {
    const fix = (e: { exerciseId: string; name: string; muscle: string }, rename: boolean) => {
      const id = catalog.resolve(e.exerciseId)
      if (!id || id === e.exerciseId) return
      const exercise = catalog.get(id)!
      e.exerciseId = id
      e.muscle = exercise.muscle
      // En las rutinas se usa el nombre nuevo; en el historial se respeta el que tenía.
      if (rename) e.name = exercise.name
    }
    d.routines.forEach((r) => r.exercises.forEach((e) => fix(e, true)))
    d.sessions.forEach((s) => s.exercises.forEach((e) => fix(e, false)))
    d.settings.favorites = [...new Set(d.settings.favorites.map((f) => catalog.resolve(f) ?? f))]
    d.exerciseNotes = Object.fromEntries(Object.entries(d.exerciseNotes ?? {}).map(([id, text]) => [catalog.resolve(id) ?? id, text]))
    d.settings.catalogVersion = CATALOG_VERSION
  })
}
