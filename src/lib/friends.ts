import { dayTotals, type FoodEntry } from './nutrition'
import { normalize } from './catalog'
import { addDays, startOfDay, startOfWeek } from './format'
import { t } from './i18n'
import { MAIN_GROUPS } from './labels'
import { canCompress, fromBase64Url, shareLink, toBase64Url, transform } from './share'
import { periodStats, records, sessionVolume, setCount, streakWeeks, workingSets, type PeriodStats } from './stats'
import { finishedSessions, getData, updateSettings, type AppData, type Session } from './store'

// Retos entre amigos sin servidor: cada uno comparte por enlace (o QR) un resumen de su semana y su
// mes, y la app compara los resúmenes guardados. Solo viaja lo que se ve aquí; nada más del historial.
//
// Los retos con objetivo y fecha viajan dentro del mismo resumen: quien lo crea lo comparte con el
// suyo, cada uno calcula su progreso en su móvil y lo manda en su siguiente resumen.

export type ChallengeMetric = 'sessions' | 'volume' | 'sets' | 'reps' | 'logDays' | 'proteinDays'

export interface Challenge {
  id: string
  metric: ChallengeMetric
  /** Índice de MAIN_GROUPS (solo series de un grupo; sin valor = todas). */
  group?: number
  /** Ejercicio de «más repeticiones en una serie». */
  exerciseId?: string
  exerciseName?: string
  /** Objetivo opcional; sin él gana quien más sume al acabar. */
  target?: number
  start: number
  end: number
  /** Quién lo creó. */
  by: string
  /** Clasificación final, guardada al terminar (solo en este móvil; no viaja en los enlaces). */
  final?: FinalRow[]
}

export interface FinalRow {
  name: string
  value: number
  me?: boolean
}

export interface ChallengeEntry {
  challenge: Challenge
  value: number
}

export interface RecentRecord {
  exerciseId: string
  name: string
  weight: number
  reps: number
  at: number
}

export interface FriendStats {
  sessions: number
  /** kg levantados (peso × repeticiones). */
  volume: number
  sets: number
  /** Minutos entrenados. */
  minutes: number
}

export interface FriendSnapshot {
  name: string
  /** Cuándo se hizo el resumen. */
  at: number
  week: FriendStats
  month: FriendStats
  streak: number
  total: number
  /** Mejor 1RM estimado (kg) en los tres básicos. */
  lifts: { bench?: number; squat?: number; deadlift?: number }
  /** Últimas 8 semanas, de la más antigua a la actual: [entrenamientos, kg]. */
  weeks?: [number, number][]
  /** Series de los últimos 28 días por grupo (orden de MAIN_GROUPS). */
  muscles?: number[]
  /** Récords de los últimos 30 días (los 3 más recientes). */
  prs?: RecentRecord[]
  /** Peso corporal (kg), solo si quiere compartirlo (fuerza relativa). */
  bodyWeight?: number
  /** Retos en los que participa, con su progreso. */
  challenges?: ChallengeEntry[]
  /** Trofeos de retos: oros, platas, bronces y objetivos cumplidos. */
  trophies?: Trophies
}

export type Trophies = [gold: number, silver: number, bronze: number, completed: number]

export const WEEKS = 8
const MUSCLE_DAYS = 28
const MAX_CHALLENGES = 10
/** Un reto terminado se sigue compartiendo dos semanas (para ver quién ganó). */
const CHALLENGE_GRACE = 14 * 86400000

// MARK: Retos

/** Lo de comida que necesitan los retos de comida: lo apuntado y tu objetivo de proteína. */
export interface ChallengeFood { entries: FoodEntry[]; protein?: number }
export const challengeFood = (d: Pick<AppData, 'nutrition' | 'settings'>): ChallengeFood => ({ entries: d.nutrition.entries, protein: d.settings.nutrition?.protein })

/** Progreso propio en un reto, calculado con el historial (y, en los de comida, con lo apuntado). */
export function challengeProgress(c: Challenge, sessions: Session[], food?: ChallengeFood): number {
  const inRange = sessions.filter((s) => s.end !== undefined && s.start >= c.start && s.start < c.end)
  if (c.metric === 'logDays' || c.metric === 'proteinDays') {
    const byDay = new Map<string, FoodEntry[]>()
    for (const e of food?.entries ?? []) {
      const at = new Date(`${e.day}T12:00:00`).getTime()
      if (at >= c.start && at < c.end) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e])
    }
    if (c.metric === 'logDays') return byDay.size
    // Días con al menos el 90 % de tu objetivo de proteína (sin objetivo, 0).
    const goal = food?.protein
    return goal ? [...byDay.values()].filter((list) => dayTotals(list).p >= goal * 0.9).length : 0
  }
  switch (c.metric) {
    case 'sessions':
      return inRange.length
    case 'volume':
      return Math.round(inRange.reduce((t, s) => t + sessionVolume(s), 0))
    case 'sets': {
      const muscles = c.group !== undefined ? MAIN_GROUPS[c.group]?.[1] : undefined
      return inRange.reduce((t, s) => t + s.exercises.reduce((n, e) => n + (!muscles || muscles.includes(e.muscle) ? setCount(e) : 0), 0), 0)
    }
    case 'reps':
      return Math.max(0, ...inRange.flatMap((s) => s.exercises.filter((e) => e.exerciseId === c.exerciseId).flatMap((e) => workingSets(e).map((x) => x.reps))))
  }
}

export type ChallengeStatus = 'upcoming' | 'active' | 'finished'
export const challengeStatus = (c: Challenge, now = Date.now()): ChallengeStatus => (now < c.start ? 'upcoming' : now < c.end ? 'active' : 'finished')

/** Reto nuevo desde hoy (a las 0:00) durante `days` días. */
export function newChallenge(fields: Omit<Challenge, 'id' | 'start' | 'end'>, days: number, now = Date.now()): Challenge {
  const start = startOfDay(now)
  const id = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 10)
  return { ...fields, id, start: start.getTime(), end: addDays(start, days).getTime() }
}

export interface Standing {
  name: string
  me?: boolean
  value: number
  /** Cuándo se calculó (el resumen del amigo puede ser antiguo). */
  at: number
}

/** Clasificación de un reto: tú y los amigos cuyo último resumen lo incluye. */
export function standings(c: Challenge, myName: string, myValue: number, friends: FriendSnapshot[], now = Date.now()): Standing[] {
  const rows: Standing[] = [{ name: myName, me: true, value: myValue, at: now }]
  for (const f of friends) {
    const entry = f.challenges?.find((e) => e.challenge.id === c.id)
    if (entry) rows.push({ name: f.name, value: entry.value, at: f.at })
  }
  return rows.sort((a, b) => b.value - a.value || (a.me ? -1 : b.me ? 1 : 0))
}

/** Retos de los amigos a los que aún no te has unido (y que no han terminado). */
export function invitations(friends: FriendSnapshot[], joined: Challenge[], now = Date.now()): Challenge[] {
  const known = new Set(joined.map((c) => c.id))
  const found = new Map<string, Challenge>()
  for (const f of friends) for (const e of f.challenges ?? []) {
    if (!known.has(e.challenge.id) && challengeStatus(e.challenge, now) !== 'finished') found.set(e.challenge.id, e.challenge)
  }
  return [...found.values()]
}

// MARK: Trofeos

/**
 * Guarda la clasificación de los retos terminados. Durante las dos semanas siguientes se completa con
 * los resúmenes que lleguen tarde (nunca baja un valor ya guardado). Devuelve la lista nueva, o
 * `undefined` si no cambia nada.
 */
export function settleChallenges(d: AppData, sessions: Session[], now = Date.now()): Challenge[] | undefined {
  let changed = false
  const next = d.challenges.map((c) => {
    if (challengeStatus(c, now) !== 'finished' || (c.final && now > c.end + CHALLENGE_GRACE)) return c
    const live = standings(c, d.settings.name.trim() || t('Sin nombre', 'No name'), challengeProgress(c, sessions, challengeFood(d)), d.friends, now)
    const rows = new Map<string, FinalRow>()
    const key = (r: { name: string; me?: boolean }) => (r.me ? '\u0000me' : friendKey(r.name))
    for (const r of c.final ?? []) rows.set(key(r), r)
    for (const r of live) {
      const prev = rows.get(key(r))
      // Lo propio se recalcula (por si se editó un entrenamiento); lo de los amigos solo sube.
      const value = r.me ? r.value : Math.max(prev?.value ?? 0, r.value)
      rows.set(key(r), { name: r.me ? r.name : prev?.name ?? r.name, value, ...(r.me ? { me: true } : {}) })
    }
    const final = [...rows.values()].sort((a, b) => b.value - a.value || (a.me ? -1 : b.me ? 1 : 0))
    if (JSON.stringify(final) === JSON.stringify(c.final)) return c
    changed = true
    return { ...c, final }
  })
  return changed ? next : undefined
}

export type Medal = 'gold' | 'silver' | 'bronze'

export interface ChallengeResult {
  /** Puesto (empates comparten puesto) y participantes. */
  place: number
  of: number
  value: number
  /** Medalla: solo con rivales y habiendo sumado algo. */
  medal?: Medal
  completed: boolean
}

export function challengeResult(c: Challenge): ChallengeResult | undefined {
  const me = c.final?.find((r) => r.me)
  if (!c.final || !me) return undefined
  const place = 1 + c.final.filter((r) => r.value > me.value).length
  const of = c.final.length
  const medal = of >= 2 && me.value > 0 && place <= 3 ? (['gold', 'silver', 'bronze'] as const)[place - 1] : undefined
  return { place, of, value: me.value, medal, completed: !!c.target && me.value >= c.target }
}

export function trophyCounts(challenges: Challenge[]): Trophies {
  const counts: Trophies = [0, 0, 0, 0]
  for (const c of challenges) {
    const r = challengeResult(c)
    if (!r) continue
    if (r.medal) counts[r.medal === 'gold' ? 0 : r.medal === 'silver' ? 1 : 2]++
    if (r.completed) counts[3]++
  }
  return counts
}

export const MEDAL_EMOJI: Record<Medal, string> = { gold: '🥇', silver: '🥈', bronze: '🥉' }

/** «🥇2 🥈1 🎯3» (vacío si no hay ninguno). */
export const trophyText = (t: Trophies | undefined) =>
  t ? [['🥇', t[0]], ['🥈', t[1]], ['🥉', t[2]], ['🎯', t[3]]].filter(([, n]) => n).map(([e, n]) => `${e}${n}`).join(' ') : ''

/** Retos que aún se comparten: en curso, por empezar o terminados hace poco. */
export const liveChallenges = (list: Challenge[], now = Date.now()) =>
  list.filter((c) => c.end + CHALLENGE_GRACE > now).sort((a, b) => a.end - b.end).slice(0, MAX_CHALLENGES)

// MARK: Comparativas

function weeksHistory(sessions: Session[], now: number): [number, number][] {
  const current = startOfWeek(now)
  return Array.from({ length: WEEKS }, (_, i) => {
    const from = addDays(current, -7 * (WEEKS - 1 - i)).getTime()
    const to = addDays(current, -7 * (WEEKS - 2 - i)).getTime()
    const inWeek = sessions.filter((s) => s.start >= from && s.start < to)
    return [inWeek.length, Math.round(inWeek.reduce((t, s) => t + sessionVolume(s), 0))]
  })
}

function muscleSets(sessions: Session[], now: number): number[] {
  const since = now - MUSCLE_DAYS * 86400000
  const counts = MAIN_GROUPS.map(() => 0)
  for (const s of sessions) {
    if (s.start < since || s.start > now) continue
    for (const e of s.exercises) {
      const g = MAIN_GROUPS.findIndex(([, muscles]) => muscles.includes(e.muscle))
      if (g >= 0) counts[g] += setCount(e)
    }
  }
  return counts
}

function recentRecords(sessions: Session[], now: number): RecentRecord[] {
  // Una sola pasada en orden: el mejor 1RM estimado de cada ejercicio hasta cada sesión (igual que
  // newRecords, pero sin recalcular todo el historial para cada sesión).
  const since = now - 30 * 86400000
  const bestBefore = new Map<string, number>()
  const found = new Map<string, RecentRecord>()
  for (const s of [...sessions].sort((a, b) => a.start - b.start)) {
    if (s.start > now) break
    const mine = records([s])
    for (const r of mine) {
      const prev = bestBefore.get(r.exerciseId)
      if (s.start >= since && prev !== undefined && r.e1rm > prev + 0.01) {
        found.set(r.exerciseId, { exerciseId: r.exerciseId, name: r.name, weight: r.weight, reps: r.reps, at: r.date })
      }
    }
    for (const r of mine) bestBefore.set(r.exerciseId, Math.max(bestBefore.get(r.exerciseId) ?? 0, r.e1rm))
  }
  return [...found.values()].sort((a, b) => b.at - a.at).slice(0, 3)
}

/** Peso corporal más reciente (kg). */
export function latestBodyWeight(data: AppData): number | undefined {
  let best: { date: number; weight: number } | undefined
  for (const m of data.measurements) if (m.weight !== undefined && (!best || m.date > best.date)) best = { date: m.date, weight: m.weight }
  return best?.weight
}

const LIFTS = {
  bench: ['Barbell_Bench_Press_-_Medium_Grip', 'Wide-Grip_Barbell_Bench_Press', 'Close-Grip_Barbell_Bench_Press', 'Bench_Press_-_Powerlifting'],
  squat: ['Barbell_Squat', 'Barbell_Full_Squat', 'Front_Barbell_Squat', 'Olympic_Squat'],
  deadlift: ['Barbell_Deadlift', 'Sumo_Deadlift', 'Trap_Bar_Deadlift'],
} as const

const lite = (p: PeriodStats): FriendStats => ({ sessions: p.sessions, volume: Math.round(p.volume), sets: p.sets, minutes: Math.round(p.time / 60000) })

export function mySnapshot(data: AppData, sessions: Session[], now = Date.now()): FriendSnapshot {
  const d = new Date(now)
  const best = new Map(records(sessions).map((r) => [r.exerciseId, r.e1rm]))
  const top = (ids: readonly string[]) => {
    const v = Math.max(0, ...ids.map((id) => best.get(id) ?? 0))
    return v > 0 ? Math.round(v * 10) / 10 : undefined
  }
  const snapshot: FriendSnapshot = {
    name: data.settings.name.trim() || t('Sin nombre', 'No name'),
    at: now,
    week: lite(periodStats(sessions, startOfWeek(now).getTime(), now + 1)),
    month: lite(periodStats(sessions, new Date(d.getFullYear(), d.getMonth(), 1).getTime(), now + 1)),
    streak: streakWeeks(sessions, now),
    total: sessions.length,
    lifts: { bench: top(LIFTS.bench), squat: top(LIFTS.squat), deadlift: top(LIFTS.deadlift) },
    weeks: weeksHistory(sessions, now),
    muscles: muscleSets(sessions, now),
    prs: recentRecords(sessions, now),
    challenges: liveChallenges(data.challenges, now).map((c) => ({ challenge: c, value: challengeProgress(c, sessions, challengeFood(data)) })),
  }
  const trophies = trophyCounts(settleChallenges(data, sessions, now) ?? data.challenges)
  if (trophies.some((n) => n > 0)) snapshot.trophies = trophies
  const bodyWeight = data.settings.shareBodyWeight ? latestBodyWeight(data) : undefined
  if (bodyWeight) snapshot.bodyWeight = bodyWeight
  return snapshot
}

// MARK: Enlace

// v1: hasta los básicos. v2 añade semanas, grupos, récords, peso corporal y retos.
type PackedChallenge = [id: string, metric: ChallengeMetric, start: number, end: number, by: string, target: number | null, group: number | null, exerciseId: string | null, exerciseName: string | null]

const packChallenge = (c: Challenge): PackedChallenge =>
  [c.id, c.metric, c.start, c.end, c.by, c.target ?? null, c.group ?? null, c.exerciseId ?? null, c.exerciseName ?? null]

export async function encodeSnapshot(s: FriendSnapshot): Promise<string> {
  const packed = [2, s.name, s.at, [s.week.sessions, s.week.volume, s.week.sets, s.week.minutes], [s.month.sessions, s.month.volume, s.month.sets, s.month.minutes],
    s.streak, s.total, [s.lifts.bench ?? null, s.lifts.squat ?? null, s.lifts.deadlift ?? null],
    s.weeks ?? [], s.muscles ?? [], (s.prs ?? []).map((r) => [r.exerciseId, r.name, r.weight, r.reps, r.at]), s.bodyWeight ?? null,
    (s.challenges ?? []).map((e) => [packChallenge(e.challenge), e.value]), s.trophies ?? null]
  const json = new TextEncoder().encode(JSON.stringify(packed))
  return canCompress() ? 'z' + toBase64Url(await transform(json, new CompressionStream('deflate-raw'))) : 'j' + toBase64Url(json)
}

// MARK: Validación (enlaces recibidos y copias de seguridad): todo acotado, nada se toma tal cual.

const DAY = 86400000
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const int = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.round(v))) : 0)
const kg = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 && v < 2000 ? Math.round(v * 10) / 10 : undefined)
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const date = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > Date.UTC(2000, 0, 1) && v < Date.now() + 400 * DAY ? Math.round(v) : undefined)
const stats = (v: unknown): FriendStats => {
  if (isObj(v)) return { sessions: int(v.sessions, 1000), volume: int(v.volume, 1e8), sets: int(v.sets, 100000), minutes: int(v.minutes, 1e6) }
  const a = Array.isArray(v) ? v : []
  return { sessions: int(a[0], 1000), volume: int(a[1], 1e8), sets: int(a[2], 100000), minutes: int(a[3], 1e6) }
}
const METRICS: ChallengeMetric[] = ['sessions', 'volume', 'sets', 'reps', 'logDays', 'proteinDays']

/** Reto válido (o `undefined`): fechas razonables, como mucho 1 año, y campos acotados. */
export function cleanChallenge(v: unknown): Challenge | undefined {
  const o: Record<string, unknown> | undefined = Array.isArray(v)
    ? { id: v[0], metric: v[1], start: v[2], end: v[3], by: v[4], target: v[5], group: v[6], exerciseId: v[7], exerciseName: v[8] }
    : isObj(v) ? v : undefined
  if (!o) return undefined
  const id = text(o.id, 16), start = date(o.start), end = date(o.end)
  const metric = METRICS.find((m) => m === o.metric)
  if (!/^[a-z0-9]{4,16}$/.test(id) || !metric || start === undefined || end === undefined || end <= start || end - start > 366 * DAY) return undefined
  const exerciseId = text(o.exerciseId, 200)
  if (metric === 'reps' && !exerciseId) return undefined
  const target = int(o.target, metric === 'volume' ? 1e8 : 100000)
  const group = typeof o.group === 'number' && Number.isInteger(o.group) && o.group >= 0 && o.group < MAIN_GROUPS.length ? o.group : undefined
  return {
    id, metric, start, end, by: text(o.by, 40) || '?',
    ...(target > 0 ? { target } : {}),
    ...(metric === 'sets' && group !== undefined ? { group } : {}),
    ...(metric === 'reps' ? { exerciseId, exerciseName: text(o.exerciseName, 80) || exerciseId } : {}),
    ...(Array.isArray(o.final) ? {
      final: o.final.slice(0, 100).filter(isObj).map((r) => ({ name: text(r.name, 40) || '?', value: int(r.value, 1e8), ...(r.me === true ? { me: true } : {}) })),
    } : {}),
  }
}

/** Resumen válido a partir de un objeto (copias) o del formato empaquetado de los enlaces. */
export function cleanSnapshot(v: unknown): FriendSnapshot | undefined {
  let o: Record<string, unknown>
  if (Array.isArray(v)) {
    if ((v[0] !== 1 && v[0] !== 2) || typeof v[1] !== 'string') return undefined
    const lifts = Array.isArray(v[7]) ? v[7] : []
    o = {
      name: v[1], at: v[2], week: v[3], month: v[4], streak: v[5], total: v[6],
      lifts: { bench: lifts[0], squat: lifts[1], deadlift: lifts[2] },
      weeks: v[8], muscles: v[9],
      prs: Array.isArray(v[10]) ? v[10].map((r) => (Array.isArray(r) ? { exerciseId: r[0], name: r[1], weight: r[2], reps: r[3], at: r[4] } : r)) : undefined,
      bodyWeight: v[11],
      challenges: Array.isArray(v[12]) ? v[12].map((e) => (Array.isArray(e) ? { challenge: e[0], value: e[1] } : e)) : undefined,
      trophies: v[13],
    }
  } else if (isObj(v) && typeof v.name === 'string') o = v
  else return undefined
  const lifts = isObj(o.lifts) ? o.lifts : {}
  const snapshot: FriendSnapshot = {
    name: text(o.name, 40) || '?',
    at: int(o.at, Date.now() + DAY),
    week: stats(o.week), month: stats(o.month),
    streak: int(o.streak, 1000), total: int(o.total, 100000),
    lifts: { bench: kg(lifts.bench), squat: kg(lifts.squat), deadlift: kg(lifts.deadlift) },
  }
  if (Array.isArray(o.weeks) && o.weeks.length) {
    snapshot.weeks = o.weeks.slice(-WEEKS).map((w) => (Array.isArray(w) ? [int(w[0], 100), int(w[1], 1e7)] : [0, 0]))
  }
  if (Array.isArray(o.muscles) && o.muscles.length) snapshot.muscles = MAIN_GROUPS.map((_, i) => int((o.muscles as unknown[])[i], 10000))
  if (Array.isArray(o.prs)) {
    snapshot.prs = o.prs.slice(0, 3).filter(isObj).flatMap((r) => {
      const weight = kg(r.weight), at = date(r.at), exerciseId = text(r.exerciseId, 200)
      return weight && at && exerciseId ? [{ exerciseId, name: text(r.name, 80) || exerciseId, weight, reps: int(r.reps, 1000), at }] : []
    })
  }
  const bodyWeight = kg(o.bodyWeight)
  if (bodyWeight && bodyWeight >= 25 && bodyWeight <= 400) snapshot.bodyWeight = bodyWeight
  if (Array.isArray(o.challenges)) {
    snapshot.challenges = o.challenges.slice(0, MAX_CHALLENGES).filter(isObj).flatMap((e) => {
      const challenge = cleanChallenge(e.challenge)
      return challenge ? [{ challenge, value: int(e.value, 1e8) }] : []
    })
  }
  if (Array.isArray(o.trophies)) {
    const trophies: Trophies = [int(o.trophies[0], 10000), int(o.trophies[1], 10000), int(o.trophies[2], 10000), int(o.trophies[3], 10000)]
    if (trophies.some((n) => n > 0)) snapshot.trophies = trophies
  }
  return snapshot
}

/** Lee un resumen recibido, con todos los valores acotados (o `undefined` si el enlace no vale). */
export async function decodeSnapshot(code: string): Promise<FriendSnapshot | undefined> {
  try {
    let bytes = fromBase64Url(code.slice(1))
    if (code[0] === 'z') bytes = await transform(bytes, new DecompressionStream('deflate-raw'))
    else if (code[0] !== 'j') return undefined
    return cleanSnapshot(JSON.parse(new TextDecoder().decode(bytes)))
  } catch {
    return undefined
  }
}

export const friendLink = (code: string) => `${location.origin}${location.pathname}#/friend/${code}`

/** Un amigo se identifica por su nombre: un resumen nuevo sustituye al anterior. */
export const friendKey = (name: string) => normalize(name.trim())

/** ¿El resumen es de la semana actual? Si no, sus cifras de «esta semana» ya no sirven para comparar. */
export const sameWeek = (at: number, now = Date.now()) => startOfWeek(at).getTime() === startOfWeek(now).getTime()
export const sameMonth = (at: number, now = Date.now()) => {
  const a = new Date(at), b = new Date(now)
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

/** Días desde el resumen de un amigo; a partir de 7 se le pide uno nuevo. */
export const STALE_DAYS = 7
export const isStale = (f: FriendSnapshot, now = Date.now()) => now - f.at > STALE_DAYS * DAY

/** Recordatorio de compartir el resumen: domingo o lunes, si hay amigos y hace 6 días o más. */
export function shareReminderDue(data: AppData, now = Date.now()): boolean {
  const { friendShareAt, friendReminderOff, friendReminderSnooze } = data.settings
  if (friendReminderOff || !data.friends.length) return false
  if (friendReminderSnooze && now < friendReminderSnooze) return false
  const weekday = new Date(now).getDay()
  return (weekday === 0 || weekday === 1) && (!friendShareAt || now - friendShareAt >= 6 * DAY)
}

/**
 * Semanas de un amigo alineadas con las tuyas (las 8 últimas hasta hoy): su resumen termina en la
 * semana en que lo hizo, así que si es antiguo las más recientes quedan sin dato.
 */
export function alignWeeks(f: FriendSnapshot, now = Date.now()): ([number, number] | undefined)[] {
  const mine = startOfWeek(now).getTime()
  const theirs = startOfWeek(f.at).getTime()
  const shift = Math.round((mine - theirs) / (7 * DAY))
  const weeks = f.weeks ?? []
  return Array.from({ length: WEEKS }, (_, i) => {
    const j = weeks.length - 1 - (WEEKS - 1 - i - shift)
    return i > WEEKS - 1 - shift || j < 0 ? undefined : weeks[j]
  })
}

// MARK: Compartir

/**
 * Comparte tu resumen (con los retos en los que estás) por el menú del sistema, o lo copia.
 * Se calcula en el momento, para que incluya un reto recién creado.
 */
export async function shareMine(text?: string): Promise<'shared' | 'copied' | 'cancelled'> {
  const data = getData()
  const mine = mySnapshot(data, finishedSessions(data))
  try {
    const url = friendLink(await encodeSnapshot(mine))
    const result = await shareLink(t(`Reto Serix de ${mine.name}`, `${mine.name}'s Serix challenge`), url, text)
    if (result !== 'cancelled') updateSettings({ friendShareAt: Date.now() })
    return result
  } catch {
    // Sin menú de compartir y sin permiso para copiar.
    return 'cancelled'
  }
}

export const copiedToast = () => t('Enlace copiado: pégalo en WhatsApp', 'Link copied: paste it in WhatsApp')

/** Pide a un amigo su resumen nuevo, mandándole el tuyo. */
export async function requestUpdate(name: string) {
  return shareMine(t(`¡Hola ${name}! ¿Me mandas tu resumen de Serix para ver cómo vamos? Aquí va el mío:`,
    `Hi ${name}! Can you send me your Serix summary so we can see how we're doing? Here's mine:`))
}

