import { lang, locale, t } from './i18n'

export type Unit = 'kg' | 'lb'

const LB_PER_KG = 2.2046226218

export const fromKg = (kg: number, unit: Unit) => (unit === 'kg' ? kg : kg * LB_PER_KG)
export const toKg = (value: number, unit: Unit) => (unit === 'kg' ? value : value / LB_PER_KG)
export const increment = (unit: Unit) => (unit === 'kg' ? 2.5 : 5)

// Un formateador por idioma (crearlos cuesta; se reutilizan).
const formatters = new Map<string, { number: Intl.NumberFormat; int: Intl.NumberFormat }>()
function fmt() {
  let f = formatters.get(locale())
  if (!f) {
    f = { number: new Intl.NumberFormat(locale(), { maximumFractionDigits: 2 }), int: new Intl.NumberFormat(locale(), { maximumFractionDigits: 0 }) }
    formatters.set(locale(), f)
  }
  return f
}

export const num = (v: number) => fmt().number.format(Math.round(v * 100) / 100)
export const int = (v: number) => fmt().int.format(Math.round(v))
export const weightValue = (kg: number, unit: Unit) => num(fromKg(kg, unit))
export const weight = (kg: number, unit: Unit) => `${weightValue(kg, unit)} ${unit}`
export const volume = (kg: number, unit: Unit) => `${int(fromKg(kg, unit))} ${unit}`

/** Número editable sin separador de miles y con el separador decimal del idioma. */
export function editable(value: number): string {
  const r = Math.round(value * 100) / 100
  return Number.isInteger(r) || lang() === 'en' ? String(r) : String(r).replace('.', ',')
}

export function parseDecimal(text: string): number | null {
  const clean = text.trim().replace(',', '.')
  if (!clean) return null
  const v = Number(clean)
  return Number.isFinite(v) ? v : null
}

export function duration(ms: number): string {
  const total = Math.floor(ms / 60000)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`
  return `${Math.max(m, 0)} min`
}

export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}

export function rest(seconds: number): string {
  if (seconds < 60) return `${seconds} s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s === 0 ? `${m} min` : `${m}:${String(s).padStart(2, '0')} min`
}

export const count = (n: number, singular: string, plural: string) => `${n} ${n === 1 ? singular : plural}`

const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const day = (d: Date | number) =>
  capFirst(new Date(d).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' }))
export const shortDay = (d: Date | number) =>
  new Date(d).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })
export const time = (d: Date | number) =>
  new Date(d).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })
export const monthYear = (d: Date | number) =>
  capFirst(new Date(d).toLocaleDateString(locale(), { month: 'long', year: 'numeric' }))

export function startOfDay(d: Date | number): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Lunes de la semana de `d`. */
export function startOfWeek(d: Date | number): Date {
  const x = startOfDay(d)
  const dow = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - dow)
  return x
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function relative(d: Date | number): string {
  const days = Math.round((startOfDay(Date.now()).getTime() - startOfDay(d).getTime()) / 86400000)
  if (days === 0) return t('Hoy', 'Today')
  if (days === 1) return t('Ayer', 'Yesterday')
  if (days < 7) return t(`Hace ${days} días`, `${days} days ago`)
  return shortDay(d)
}

export const restOptions = [30, 45, 60, 75, 90, 120, 150, 180, 240, 300]

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
