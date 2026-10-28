import { addDays, fromKg, increment, startOfDay, toKg, type Unit } from './format'
import { t } from './i18n'
import type { Session, SessionExercise } from './store'

// Zonas elegidas por la persona, sin deducir diagnósticos de ejercicios ni de notas antiguas.
export const DISCOMFORT_ZONES = ['shoulder', 'elbow', 'wrist', 'neck', 'upperBack', 'lowerBack', 'hip', 'knee', 'ankle', 'other'] as const
export type DiscomfortZone = typeof DISCOMFORT_ZONES[number]
export type DiscomfortSide = 'left' | 'right' | 'both'
export interface Discomfort { zone: DiscomfortZone; side?: DiscomfortSide; at: number; resolved?: boolean }

export function cleanDiscomfort(value: unknown): Discomfort | undefined {
  if (!value || typeof value !== 'object') return undefined
  const v = value as Record<string, unknown>
  if (!DISCOMFORT_ZONES.includes(v.zone as DiscomfortZone) || typeof v.at !== 'number' || !Number.isFinite(v.at)
    || v.at < Date.UTC(2000, 0, 1) || v.at > Date.UTC(2100, 0, 1)) return undefined
  return { zone: v.zone as DiscomfortZone, at: v.at,
    ...(['left', 'right', 'both'].includes(v.side as string) ? { side: v.side as DiscomfortSide } : {}),
    ...(v.resolved === true ? { resolved: true } : {}),
  }
}

export function discomfortZone(zone: DiscomfortZone, inSentence = false): string {
  // El artículo se reserva para la frase del aviso; las etiquetas se leen solas.
  const labels: Record<DiscomfortZone, string> = {
    shoulder: t('Hombro', 'Shoulder'), elbow: t('Codo', 'Elbow'), wrist: t('Muñeca', 'Wrist'),
    neck: t('Cuello', 'Neck'), upperBack: t('Espalda alta', 'Upper back'), lowerBack: t('Zona lumbar', 'Lower back'),
    hip: t('Cadera', 'Hip'), knee: t('Rodilla', 'Knee'), ankle: t('Tobillo', 'Ankle'), other: t('Otra zona', 'Other area'),
  }
  if (!inSentence) return labels[zone]
  const names: Record<DiscomfortZone, string> = {
    shoulder: t('el hombro', 'your shoulder'), elbow: t('el codo', 'your elbow'), wrist: t('la muñeca', 'your wrist'),
    neck: t('el cuello', 'your neck'), upperBack: t('la espalda alta', 'your upper back'), lowerBack: t('la zona lumbar', 'your lower back'),
    hip: t('la cadera', 'your hip'), knee: t('la rodilla', 'your knee'), ankle: t('el tobillo', 'your ankle'), other: t('otra zona', 'another area'),
  }
  return names[zone]
}
export function discomfortSide(side: DiscomfortSide): string {
  return side === 'left' ? t('Izquierdo', 'Left') : side === 'right' ? t('Derecho', 'Right') : t('Ambos', 'Both')
}
export interface DiscomfortRecord { sessionId: string; exercise: SessionExercise; discomfort: Discomfort }

/** Una edición o un doble toque no suma otro episodio: hay un registro por ejercicio de la sesión. */
export function recentDiscomfort(sessions: Session[], days = 30, now = Date.now()): DiscomfortRecord[] {
  const since = addDays(startOfDay(now), 1 - days).getTime()
  return sessions.flatMap((s) => s.exercises.flatMap((e) => {
    const d = cleanDiscomfort(e.discomfort)
    return d && d.at >= since && d.at <= now ? [{ sessionId: s.id, exercise: e, discomfort: d }] : []
  })).sort((a, b) => b.discomfort.at - a.discomfort.at)
}
export function repeatedDiscomfort(sessions: Session[], zone: DiscomfortZone, now = Date.now()): boolean {
  return recentDiscomfort(sessions, 14, now).filter((r) => r.discomfort.zone === zone).length >= 3
}

/** Resolver el último episodio no hace reaparecer uno anterior; uno nuevo sí vuelve a avisar. */
export function lastDiscomfort(sessions: Session[], exerciseId: string, currentSessionId: string): DiscomfortRecord | undefined {
  const records = sessions.filter((s) => s.end !== undefined && s.id !== currentSessionId)
    .flatMap((s) => s.exercises.flatMap((e) => {
      const d = cleanDiscomfort(e.discomfort)
      return e.exerciseId === exerciseId && d ? [{ sessionId: s.id, exercise: e, discomfort: d }] : []
    })).sort((a, b) => b.discomfort.at - a.discomfort.at)
  return records[0]?.discomfort.resolved ? undefined : records[0]
}
export function resolveDiscomfort(sessions: Session[], record: DiscomfortRecord) {
  const e = sessions.find((s) => s.id === record.sessionId)?.exercises.find((e) => e.id === record.exercise.id)
  if (e?.discomfort?.at === record.discomfort.at) e.discomfort.resolved = true
}

/** Solo las series pendientes; en máquinas asistidas bajar la carga significa dar más ayuda. */
export function lightenDiscomfort(exercise: SessionExercise, unit: Unit) {
  const step = increment(unit)
  for (const set of exercise.sets) if (!set.done && set.weight > 0) {
    const current = fromKg(set.weight, unit)
    // Se redondea en la dirección que alivia y siempre se cambia al menos un escalón.
    const next = exercise.assisted
      ? Math.max(Math.ceil(current * 1.1 / step) * step, (Math.floor(current / step) + 1) * step)
      : Math.min(Math.floor(current * 0.9 / step) * step, (Math.ceil(current / step) - 1) * step)
    set.weight = toKg(Math.max(0, next), unit)
  }
}
