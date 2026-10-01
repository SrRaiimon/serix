// Temporizadores de intervalos (sin depender de ningún entrenamiento):
// - Tabata / intervalos: N rondas de trabajo y descanso (por defecto 20 s / 10 s × 8).
// - EMOM: al empezar cada intervalo (por defecto cada minuto) se hace el trabajo y se descansa lo
//   que sobre, durante N intervalos.
// - AMRAP: tantas rondas como se pueda en un tiempo fijo.
// Todo se calcula con el tiempo transcurrido, así que no se desajusta aunque la pantalla vaya lenta.

export type IntervalMode = 'tabata' | 'emom' | 'amrap'

export interface IntervalConfig {
  mode: IntervalMode
  /** Segundos de trabajo (Tabata), de cada intervalo (EMOM) o totales (AMRAP). */
  work: number
  /** Segundos de descanso entre rondas (solo Tabata). */
  rest: number
  rounds: number
  /** Cuenta atrás para prepararse antes de empezar. */
  prep: number
}

export const DEFAULTS: Record<IntervalMode, IntervalConfig> = {
  tabata: { mode: 'tabata', work: 20, rest: 10, rounds: 8, prep: 10 },
  emom: { mode: 'emom', work: 60, rest: 0, rounds: 10, prep: 10 },
  amrap: { mode: 'amrap', work: 600, rest: 0, rounds: 1, prep: 10 },
}

export interface Segment {
  kind: 'prep' | 'work' | 'rest'
  seconds: number
  /** Ronda (1…) a la que pertenece; la preparación es la 0. */
  round: number
}

export function buildSegments(c: IntervalConfig): Segment[] {
  const segments: Segment[] = c.prep > 0 ? [{ kind: 'prep', seconds: c.prep, round: 0 }] : []
  if (c.mode === 'amrap') return [...segments, { kind: 'work', seconds: c.work, round: 1 }]
  for (let r = 1; r <= c.rounds; r++) {
    segments.push({ kind: 'work', seconds: c.work, round: r })
    if (c.mode === 'tabata' && c.rest > 0 && r < c.rounds) segments.push({ kind: 'rest', seconds: c.rest, round: r })
  }
  return segments
}

export const totalSeconds = (segments: Segment[]) => segments.reduce((t, s) => t + s.seconds, 0)

export interface Position {
  /** Tramo actual (o el último si ya terminó). */
  index: number
  segment: Segment
  /** Segundos que quedan del tramo actual (con decimales). */
  remaining: number
  /** Segundos que quedan en total. */
  totalRemaining: number
  done: boolean
}

export function positionAt(segments: Segment[], elapsedMs: number): Position {
  let t = Math.max(0, elapsedMs) / 1000
  const total = totalSeconds(segments)
  for (let i = 0; i < segments.length; i++) {
    if (t < segments[i].seconds) return { index: i, segment: segments[i], remaining: segments[i].seconds - t, totalRemaining: total - (elapsedMs / 1000), done: false }
    t -= segments[i].seconds
  }
  const last = segments.length - 1
  return { index: last, segment: segments[last], remaining: 0, totalRemaining: 0, done: true }
}
