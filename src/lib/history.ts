import { fromKg, parseDecimal, type Unit } from './format'
import { fold, makeSearch } from './search'
import type { Session } from './store'

const historySearch = makeSearch([])

/**
 * Entrenamientos que encajan con lo buscado: cada palabra en el nombre o en algún ejercicio (sin tildes
 * ni plurales) y cada número como peso de alguna serie («100» = una serie con 100 kg).
 */
export function searchSessions(sessions: Session[], query: string, unit: Unit): Session[] {
  const words = query.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return sessions
  const numbers = words.map((w) => parseDecimal(w)).filter((n): n is number => n !== null)
  const terms = historySearch.terms(words.filter((w) => parseDecimal(w) === null).join(' '))
  return sessions.filter((s) => {
    const text = fold([s.name, ...s.exercises.map((e) => e.name)].join(' '))
    if (terms.length && !historySearch.matchesTerms(text, terms)) return false
    return numbers.every((n) => s.exercises.some((e) => e.sets.some((x) => x.done && Math.abs(fromKg(x.weight, unit) - n) < 0.01)))
  })
}

