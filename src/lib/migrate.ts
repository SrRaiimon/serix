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

/**
 * Al cambiar de idioma: los ejercicios de rutinas e historial que llevan el nombre del catálogo (en
 * cualquiera de los dos idiomas) pasan al nombre del idioma actual. Los renombrados a mano se respetan.
 */
export function relabelExercises(catalog: Catalog): void {
  const pending = (e: { exerciseId: string; name: string }) => {
    const x = catalog.get(e.exerciseId)
    return x && e.name !== x.name && (e.name === x.nameEs || e.name === x.nameEn) ? x.name : undefined
  }
  const d = getData()
  const any = [...d.routines.flatMap((r) => r.exercises), ...d.sessions.flatMap((s) => s.exercises)].some((e) => pending(e))
  if (!any) return
  update((draft) => {
    for (const e of [...draft.routines.flatMap((r) => r.exercises), ...draft.sessions.flatMap((s) => s.exercises)]) {
      const name = pending(e)
      if (name) e.name = name
    }
  })
}
