// Tempo de las repeticiones: «3-1-1» = 3 s bajando, 1 s de pausa abajo y 1 s subiendo; con un cuarto
// número, la pausa arriba. Durante la serie, unos pitidos marcan cada fase.

export type TempoPhase = 'down' | 'hold' | 'up' | 'top'

export function parseTempo(text: string | undefined): { phase: TempoPhase; seconds: number }[] | undefined {
  if (!text || !/^\d-\d-\d(-\d)?$/.test(text)) return undefined
  const [down, hold, up, top = 0] = text.split('-').map(Number)
  const phases = ([['down', down], ['hold', hold], ['up', up], ['top', top]] as const).filter(([, s]) => s > 0).map(([phase, seconds]) => ({ phase, seconds }))
  return phases.length ? phases : undefined
}

/** En qué repetición, fase y segundo vas a los `elapsed` segundos de empezar. */
export function tempoAt(phases: { phase: TempoPhase; seconds: number }[], elapsed: number): { rep: number; phase: TempoPhase; left: number; second: number } {
  const per = phases.reduce((n, p) => n + p.seconds, 0)
  const rep = Math.floor(elapsed / per) + 1
  let t = elapsed % per
  for (const p of phases) {
    if (t < p.seconds) return { rep, phase: p.phase, left: Math.ceil(p.seconds - t), second: Math.floor(t) }
    t -= p.seconds
  }
  return { rep, phase: phases[0].phase, left: phases[0].seconds, second: 0 }
}
