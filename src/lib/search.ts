// Búsqueda de texto común a comidas y ejercicios: sin tildes ni mayúsculas, en singular y con sinónimos.

/** Sin tildes y en minúsculas. */
export const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/**
 * Raíz de una palabra para buscar: sin tildes y en singular («huevos» → «huevo», «panes» → «pan»,
 * «nueces» → «nuez»). Es sencilla a propósito: luego se busca como parte de la palabra.
 */
export function stem(word: string): string {
  const w = fold(word)
  // «nueces» → «nuez», pero no «francés» (consonante antes de -ces).
  if (w.length > 4 && /[aeiou]ces$/.test(w)) return `${w.slice(0, -3)}z`
  if (w.length > 4 && /[lnrdj]es$/.test(w)) return w.slice(0, -2)
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1)
  return w
}

export type Term = { typed: string; alts: RegExp[] }

/**
 * Buscador con su lista de sinónimos (grupos de palabras en singular y sin tildes). Cada palabra
 * buscada vale escrita (como parte de una palabra) o como uno de sus sinónimos (palabra entera).
 */
export function makeSearch(synonyms: string[][]) {
  const cache = new Map<string, RegExp[]>()
  const terms = (query: string): Term[] => fold(query).split(/\s+/).filter(Boolean).map((word) => {
    const typed = stem(word)
    let alts = cache.get(typed)
    if (!alts) {
      const group = synonyms.find((g) => g.includes(typed))
      alts = (group ?? []).filter((x) => x !== typed).map((x) => new RegExp(`(^|[^a-z])${x}(e?s)?([^a-z]|$)`))
      cache.set(typed, alts)
    }
    return { typed, alts }
  })
  /** ¿El texto (ya sin tildes) tiene todas las palabras buscadas? */
  const matchesTerms = (folded: string, list: Term[]) => list.every((t) => folded.includes(t.typed) || t.alts.some((r) => r.test(folded)))
  return { terms, matchesTerms }
}
