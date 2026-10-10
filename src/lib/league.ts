import { addDays, startOfWeek } from './format'
import { alignWeeks, sameWeek, WEEKS, type FriendSnapshot } from './friends'

// Liga semanal entre amigos: puntos por constancia y esfuerzo, no por levantar más kilos (así compite
// igual quien empieza que quien lleva años). Se calcula con los resúmenes que os mandáis (sin servidor).
//
// Puntos de la semana: 10 por entreno (hasta 6), 1 por cada 5 series (hasta 30), 5 por récord (hasta 5)
// y 5 de bonus si llevas 4 semanas o más seguidas entrenando.

export interface LeagueRow {
  name: string
  me?: boolean
  points: number
  sessions: number
  sets: number
  prs: number
  streak: number
}

export function leaguePoints(sessions: number, sets: number, prs: number, streak: number): number {
  return Math.min(sessions, 6) * 10 + Math.floor(Math.min(sets, 150) / 5) + Math.min(prs, 5) * 5 + (streak >= 4 ? 5 : 0)
}

const prsThisWeek = (s: FriendSnapshot, now: number) => (s.prs ?? []).filter((p) => sameWeek(p.at, now)).length

/** Clasificación de esta semana: tú y los amigos con resumen de esta semana. */
export function weeklyLeague(mine: FriendSnapshot, friends: FriendSnapshot[], now = Date.now()): LeagueRow[] {
  const rows = [{ ...mine, me: true }, ...friends.filter((f) => sameWeek(f.at, now))].map((s): LeagueRow => {
    const prs = prsThisWeek(s, now)
    return { name: s.name, ...('me' in s ? { me: true } : {}), sessions: s.week.sessions, sets: s.week.sets, prs, streak: s.streak, points: leaguePoints(s.week.sessions, s.week.sets, prs, s.streak) }
  })
  return rows.sort((a, b) => b.points - a.points || b.sessions - a.sessions || Number(!!b.me) - Number(!!a.me))
}

export interface Champion {
  weekStart: number
  name: string
  me?: boolean
}

/**
 * Ganadores de las semanas pasadas (hasta 7), con lo que se sabe de cada uno: entrenos de esa semana
 * y, a igualdad, kilos. Solo cuentan las semanas que el resumen de un amigo ya incluía enteras, y hacen
 * falta al menos dos con datos para que haya ganador.
 */
export function pastChampions(mine: FriendSnapshot, friends: FriendSnapshot[], now = Date.now()): Champion[] {
  const list: Champion[] = []
  const thisWeek = startOfWeek(now).getTime()
  const people = [{ s: mine, me: true }, ...friends.map((s) => ({ s, me: false }))].map(({ s, me }) => {
    const aligned = alignWeeks(s, now)
    const shift = Math.round((thisWeek - startOfWeek(s.at).getTime()) / (7 * 86400000))
    // Semanas completas en su resumen: las anteriores a la semana en que lo hizo.
    return { name: s.name, me, weeks: aligned.map((w, i) => (i < WEEKS - 1 - shift ? w : undefined)) }
  })
  for (let i = 0; i < WEEKS - 1; i++) {
    const entries = people.map((p) => ({ ...p, w: p.weeks[i] })).filter((p) => p.w && p.w[0] > 0)
    if (entries.length < 2) continue
    entries.sort((a, b) => b.w![0] - a.w![0] || b.w![1] - a.w![1])
    const [first, second] = entries
    if (first.w![0] === second.w![0] && first.w![1] === second.w![1]) continue // empate exacto: nadie
    list.push({ weekStart: addDays(new Date(thisWeek), -7 * (WEEKS - 1 - i)).getTime(), name: first.name, ...(first.me ? { me: true } : {}) })
  }
  return list
}

/** Coronas por persona (de más a menos). */
export function crowns(champions: Champion[]): { name: string; me?: boolean; count: number }[] {
  const map = new Map<string, { name: string; me?: boolean; count: number }>()
  for (const c of champions) {
    const key = c.me ? '__me' : c.name
    const row = map.get(key) ?? { name: c.name, ...(c.me ? { me: true } : {}), count: 0 }
    row.count++
    map.set(key, row)
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
}
