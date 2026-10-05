import { addDays, int, startOfDay, startOfWeek, volume, type Unit } from './format'
import { locale, t } from './i18n'
import { MAIN_GROUPS } from './labels'
import { periodStats, setCount } from './stats'
import { C, DISPLAY, SANS, cardChrome, cardFooter, cardTitle, esc, statBand } from './cardStyle'
import type { Session } from './store'

// Resumen del mes o del año como imagen para compartir (1080 × 1350, como la del entrenamiento): se
// dibuja en SVG con colores fijos y se convierte a PNG en el propio móvil (shareCard.svgToPng).

export type Period = 'month' | 'lastMonth' | 'year' | 'lastYear'

export interface PeriodSummary {
  period: Period
  from: number
  /** Fin exclusivo (para el periodo en curso, mañana a las 0:00). */
  to: number
  sessions: number
  minutes: number
  volume: number
  sets: number
  records: number
  /** Racha más larga de semanas seguidas entrenando dentro del periodo. */
  bestStreak: number
  /** Entrenamientos por día (clave: inicio del día). */
  days: Map<number, number>
  /** Los ejercicios con más series. */
  top: { name: string; sets: number }[]
  /** Grupo muscular con más series (índice de MAIN_GROUPS). */
  topGroup?: number
}

export function periodRange(period: Period, now = Date.now()): { from: number; to: number } {
  const d = new Date(now)
  const tomorrow = addDays(startOfDay(now), 1).getTime()
  switch (period) {
    case 'month':
      return { from: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), to: tomorrow }
    case 'lastMonth':
      return { from: new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime(), to: new Date(d.getFullYear(), d.getMonth(), 1).getTime() }
    case 'year':
      return { from: new Date(d.getFullYear(), 0, 1).getTime(), to: tomorrow }
    case 'lastYear':
      return { from: new Date(d.getFullYear() - 1, 0, 1).getTime(), to: new Date(d.getFullYear(), 0, 1).getTime() }
  }
}

export function summarize(sessions: Session[], period: Period, now = Date.now()): PeriodSummary {
  const { from, to } = periodRange(period, now)
  const inside = sessions.filter((s) => s.start >= from && s.start < to)
  const stats = periodStats(sessions, from, to)

  const days = new Map<number, number>()
  for (const s of inside) {
    const key = startOfDay(s.start).getTime()
    days.set(key, (days.get(key) ?? 0) + 1)
  }

  // Racha: semanas (de lunes a domingo) seguidas con algún entrenamiento.
  const weeks = [...new Set(inside.map((s) => startOfWeek(s.start).getTime()))].sort((a, b) => a - b)
  let bestStreak = 0
  let run = 0
  weeks.forEach((w, i) => {
    run = i > 0 && Math.round((w - weeks[i - 1]) / (7 * 86400000)) === 1 ? run + 1 : 1
    bestStreak = Math.max(bestStreak, run)
  })

  const byExercise = new Map<string, { name: string; sets: number }>()
  const groups = MAIN_GROUPS.map(() => 0)
  for (const s of inside) {
    for (const e of s.exercises) {
      const n = setCount(e)
      if (!n) continue
      const item = byExercise.get(e.exerciseId) ?? { name: e.name, sets: 0 }
      item.sets += n
      byExercise.set(e.exerciseId, item)
      const g = MAIN_GROUPS.findIndex(([, muscles]) => muscles.includes(e.muscle))
      if (g >= 0) groups[g] += n
    }
  }
  const top = [...byExercise.values()].sort((a, b) => b.sets - a.sets).slice(0, 3)
  const best = Math.max(...groups)

  return {
    period, from, to,
    sessions: stats.sessions, minutes: Math.round(stats.time / 60000), volume: stats.volume, sets: stats.sets, records: stats.records,
    bestStreak, days, top, topGroup: best > 0 ? groups.indexOf(best) : undefined,
  }
}

/** «octubre de 2026» o «2026». */
export function periodLabel(s: Pick<PeriodSummary, 'period' | 'from'>): string {
  const d = new Date(s.from)
  if (s.period === 'year' || s.period === 'lastYear') return String(d.getFullYear())
  return d.toLocaleDateString(locale(), { month: 'long', year: 'numeric' })
}

// MARK: Imagen

const W = 1080
const H = 1350
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Mes: calendario de lunes a domingo con los días entrenados en blanco (tinta del tema oscuro). */
function monthGrid(s: PeriodSummary, y: number): string {
  const first = new Date(s.from)
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const offset = (first.getDay() + 6) % 7
  const cw = 132, ch = 62, gap = 8, x0 = (W - (7 * cw + 6 * gap)) / 2
  const names = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(s.from), i).toLocaleDateString(locale(), { weekday: 'narrow' }))
  const head = names.map((n, i) => `<text x="${x0 + i * (cw + gap) + cw / 2}" y="${y}" font-size="24" fill="${C.text3}" text-anchor="middle">${esc(n.toUpperCase())}</text>`).join('')
  const cells = Array.from({ length: daysInMonth }, (_, i) => {
    const pos = offset + i
    const cx = x0 + (pos % 7) * (cw + gap)
    const cy = y + 20 + Math.floor(pos / 7) * (ch + gap)
    const n = s.days.get(new Date(first.getFullYear(), first.getMonth(), i + 1).getTime()) ?? 0
    return `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="14" fill="${n ? C.text : '#ffffff'}" fill-opacity="${n ? 1 : 0.05}"/>
      <text x="${cx + cw / 2}" y="${cy + 40}" font-size="24" font-weight="${n ? 800 : 400}" fill="${n ? C.bg : C.text3}" text-anchor="middle">${i + 1}</text>`
  }).join('')
  return head + cells
}

/** Año: una columna por semana y una fila por día, como el calendario de contribuciones. */
function yearGrid(s: PeriodSummary, y: number): string {
  const start = startOfWeek(s.from)
  const yearEnd = new Date(new Date(s.from).getFullYear() + 1, 0, 1).getTime()
  const size = 16, gap = 3
  const weeks = Math.ceil((yearEnd - start.getTime()) / (7 * 86400000))
  const x0 = (W - (weeks * (size + gap) - gap)) / 2
  const cells: string[] = []
  const labels: string[] = []
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const day = addDays(start, w * 7 + d)
      const ms = day.getTime()
      if (ms < s.from || ms >= yearEnd) continue
      const n = s.days.get(ms) ?? 0
      cells.push(`<rect x="${x0 + w * (size + gap)}" y="${y + 30 + d * (size + gap)}" width="${size}" height="${size}" rx="4" fill="${n ? C.text : '#ffffff'}" fill-opacity="${n ? 1 : 0.06}"/>`)
      if (day.getDate() === 1 && day.getMonth() % 2 === 0) {
        labels.push(`<text x="${x0 + w * (size + gap)}" y="${y + 16}" font-size="20" fill="${C.text3}">${esc(day.toLocaleDateString(locale(), { month: 'short' }).replace('.', ''))}</text>`)
      }
    }
  }
  const trained = s.days.size
  labels.push(`<text x="${W / 2}" y="${y + 30 + 7 * (size + gap) + 44}" font-size="26" fill="${C.text2}" text-anchor="middle">${esc(trained === 1 ? t('1 día entrenado', '1 day trained') : t(`${trained} días entrenados`, `${trained} days trained`))}</text>`)
  return labels.join('') + cells.join('')
}

export function periodCardSVG(s: PeriodSummary, unit: Unit): string {
  const label = periodLabel(s)
  const yearly = s.period === 'year' || s.period === 'lastYear'
  const title = yearly ? t(`Mi ${label} entrenando`, `My ${label} at the gym`) : t(`Mi ${label.split(' ')[0]} entrenando`, `My ${label.split(' ')[0]} at the gym`)
  const hours = s.minutes >= 600 ? int(s.minutes / 60) : (s.minutes / 60).toLocaleString(locale(), { maximumFractionDigits: 1 })
  const tiles: [string, string][] = [
    [int(s.sessions), s.sessions === 1 ? t('entrenamiento', 'workout') : t('entrenamientos', 'workouts')],
    [String(hours), t('horas', 'hours')],
    [volume(s.volume, unit), t('levantados', 'lifted')],
    [int(s.records), s.records === 1 ? t('récord batido', 'record broken') : t('récords batidos', 'records broken')],
  ]
  const tileSvg = statBand(60, 270, 960, 175, tiles, 2)

  const grid = yearly ? yearGrid(s, 680) : monthGrid(s, 690)
  // Debajo del calendario del mes (5 o 6 filas según el mes) o del año.
  const first = new Date(s.from)
  const rows = Math.ceil((((first.getDay() + 6) % 7) + new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()) / 7)
  const factsY = yearly ? 930 : 710 + rows * 70 + 44
  const facts: string[] = []
  if (s.bestStreak > 1) facts.push(t(`Racha de ${s.bestStreak} semanas seguidas`, `${s.bestStreak}-week streak`))
  if (s.topGroup !== undefined) facts.push(t(`Lo que más: ${t(...MAIN_GROUPS[s.topGroup][0]).toLowerCase()}`, `Most trained: ${t(...MAIN_GROUPS[s.topGroup][0]).toLowerCase()}`))
  if (!yearly && s.top[0]) facts.push(t(`Estrella: ${cut(s.top[0].name, 24)}`, `Top exercise: ${cut(s.top[0].name, 22)}`))
  const listY = 1000
  const top = s.top.map((e, i) => `<text x="80" y="${listY + 50 + i * 46}" font-size="30" fill="${C.text}">${i + 1}. ${esc(cut(e.name, 38))}</text>
    <text x="1000" y="${listY + 50 + i * 46}" font-size="28" fill="${C.text2}" text-anchor="end">${esc(t(`${e.sets} series`, `${e.sets} sets`))}</text>`).join('')
  const topBlock = yearly && s.top.length
    ? `<text x="80" y="${listY}" font-family="${DISPLAY}" font-size="34" font-weight="800" fill="${C.text}">${esc(t('Mis ejercicios estrella', 'My top exercises'))}</text>${top}`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${SANS}">
  ${cardChrome(W, H, cap(label))}
  ${cardTitle(cut(title, 26), 238, 64)}
  ${tileSvg}
  ${grid}
  ${facts.length ? `<text x="${W / 2}" y="${factsY}" font-size="28" fill="${C.text}" text-anchor="middle">${esc(facts.slice(0, yearly ? 2 : 1).join(' · '))}</text>` : ''}
  ${!yearly && facts.length > 1 ? `<text x="${W / 2}" y="${factsY + 44}" font-size="28" fill="${C.text2}" text-anchor="middle">${esc(facts.slice(1).join(' · '))}</text>` : ''}
  ${topBlock}
  ${cardFooter(W, H)}
</svg>`
}
