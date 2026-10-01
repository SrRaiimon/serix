import { normalize } from './catalog'
import { startOfWeek } from './format'
import { t } from './i18n'
import { canCompress, fromBase64Url, toBase64Url, transform } from './share'
import { periodStats, records, streakWeeks, type PeriodStats } from './stats'
import type { AppData, Session } from './store'

// Retos entre amigos sin servidor: cada uno comparte por enlace (o QR) un resumen de su semana y su
// mes, y la app compara los resúmenes guardados. Solo viaja lo que se ve aquí; nada más del historial.

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
  return {
    name: data.settings.name.trim() || t('Sin nombre', 'No name'),
    at: now,
    week: lite(periodStats(sessions, startOfWeek(now).getTime(), now + 1)),
    month: lite(periodStats(sessions, new Date(d.getFullYear(), d.getMonth(), 1).getTime(), now + 1)),
    streak: streakWeeks(sessions, now),
    total: sessions.length,
    lifts: { bench: top(LIFTS.bench), squat: top(LIFTS.squat), deadlift: top(LIFTS.deadlift) },
  }
}

// MARK: Enlace

type Packed = [v: 1, name: string, at: number, week: number[], month: number[], streak: number, total: number, lifts: (number | null)[]]

export async function encodeSnapshot(s: FriendSnapshot): Promise<string> {
  const packed: Packed = [1, s.name, s.at, [s.week.sessions, s.week.volume, s.week.sets, s.week.minutes], [s.month.sessions, s.month.volume, s.month.sets, s.month.minutes],
    s.streak, s.total, [s.lifts.bench ?? null, s.lifts.squat ?? null, s.lifts.deadlift ?? null]]
  const json = new TextEncoder().encode(JSON.stringify(packed))
  return canCompress() ? 'z' + toBase64Url(await transform(json, new CompressionStream('deflate-raw'))) : 'j' + toBase64Url(json)
}

const int = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.round(v))) : 0)
const kg = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 && v < 2000 ? Math.round(v * 10) / 10 : undefined)
const stats = (v: unknown): FriendStats => {
  const a = Array.isArray(v) ? v : []
  return { sessions: int(a[0], 1000), volume: int(a[1], 1e8), sets: int(a[2], 100000), minutes: int(a[3], 1e6) }
}

/** Lee un resumen recibido, con todos los valores acotados (o `undefined` si el enlace no vale). */
export async function decodeSnapshot(code: string): Promise<FriendSnapshot | undefined> {
  try {
    let bytes = fromBase64Url(code.slice(1))
    if (code[0] === 'z') bytes = await transform(bytes, new DecompressionStream('deflate-raw'))
    else if (code[0] !== 'j') return undefined
    const p = JSON.parse(new TextDecoder().decode(bytes)) as unknown[]
    if (!Array.isArray(p) || p[0] !== 1 || typeof p[1] !== 'string') return undefined
    const lifts = Array.isArray(p[7]) ? p[7] : []
    return {
      name: p[1].trim().slice(0, 40) || '?',
      at: int(p[2], Date.now() + 86400000),
      week: stats(p[3]), month: stats(p[4]),
      streak: int(p[5], 1000), total: int(p[6], 100000),
      lifts: { bench: kg(lifts[0]), squat: kg(lifts[1]), deadlift: kg(lifts[2]) },
    }
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
