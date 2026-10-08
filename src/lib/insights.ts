import { e1rm, loadSets } from './stats'
import type { Session } from './store'

// «Lo que te hace rendir mejor»: con tus propios entrenos, cómo rindes según cómo dormiste, la hora y los
// días de descanso. El rendimiento de un entreno es la media, en sus ejercicios, de la mejor serie (1RM
// estimado) frente a tu mejor marca anterior en ese ejercicio. Solo se dice algo con datos suficientes y
// diferencias de al menos un 3 %: es lo que pasa en tus datos, no una regla.

const DAY = 86400000
const MIN = 4

export type Insight =
  | { kind: 'sleep'; diff: number; good: number; bad: number }
  | { kind: 'time'; diff: number; best: 'morning' | 'afternoon' | 'evening'; worst: 'morning' | 'afternoon' | 'evening' }
  | { kind: 'rest'; diff: number; better: 'short' | 'long' }

/** Rendimiento de cada entreno (1 = igual que tu mejor marca anterior), en orden de fecha. */
export function sessionScores(sessions: Session[]): { s: Session; score: number }[] {
  const best = new Map<string, number>()
  const out: { s: Session; score: number }[] = []
  for (const s of [...sessions].filter((x) => x.end).sort((a, b) => a.start - b.start)) {
    const ratios: number[] = []
    for (const e of s.exercises) {
      const top = Math.max(0, ...loadSets(e).filter((x) => x.kind !== 'drop').map((x) => e1rm(x.weight, x.reps)))
      if (!top) continue
      const prev = best.get(e.exerciseId)
      if (prev) ratios.push(top / prev)
      if (!prev || top > prev) best.set(e.exerciseId, top)
    }
    if (ratios.length) out.push({ s, score: ratios.reduce((a, b) => a + b, 0) / ratios.length })
  }
  return out
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

export function insights(sessions: Session[]): Insight[] {
  const scored = sessionScores(sessions)
  const out: Insight[] = []
  // Sueño (de «¿Cómo estás hoy?»).
  const good = scored.filter((x) => (x.s.readiness?.sleep ?? 0) >= 4).map((x) => x.score)
  const bad = scored.filter((x) => x.s.readiness && x.s.readiness.sleep <= 2).map((x) => x.score)
  if (good.length >= MIN && bad.length >= MIN) {
    const diff = mean(good) / mean(bad) - 1
    if (diff >= 0.03) out.push({ kind: 'sleep', diff, good: good.length, bad: bad.length })
  }
  // Hora del día.
  const slot = (s: Session) => { const h = new Date(s.start).getHours(); return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening' }
  const bySlot = (['morning', 'afternoon', 'evening'] as const).map((k) => ({ k, xs: scored.filter((x) => slot(x.s) === k).map((x) => x.score) })).filter((x) => x.xs.length >= MIN)
  if (bySlot.length >= 2) {
    const sorted = [...bySlot].sort((a, b) => mean(b.xs) - mean(a.xs))
    const diff = mean(sorted[0].xs) / mean(sorted[sorted.length - 1].xs) - 1
    if (diff >= 0.03) out.push({ kind: 'time', diff, best: sorted[0].k, worst: sorted[sorted.length - 1].k })
  }
  // Días de descanso antes del entreno: 1 o 2 frente a 3 o más.
  const gaps = scored.slice(1).map((x, i) => ({ gap: (x.s.start - scored[i].s.start) / DAY, score: x.score }))
  const short = gaps.filter((g) => g.gap < 2.5).map((g) => g.score)
  const long = gaps.filter((g) => g.gap >= 2.5 && g.gap < 10).map((g) => g.score)
  if (short.length >= MIN && long.length >= MIN) {
    const diff = mean(long) / mean(short) - 1
    if (Math.abs(diff) >= 0.03) out.push({ kind: 'rest', diff: Math.abs(diff), better: diff > 0 ? 'long' : 'short' })
  }
  return out
}
