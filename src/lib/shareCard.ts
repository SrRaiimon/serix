import { DECOR, HEAD, REGIONS, SILHOUETTE } from '../components/muscleShapes'
import { day, duration, volume, weight, type Unit } from './format'
import { sessionDuration, sessionReps, sessionSets, sessionVolume, workingSets, type PersonalRecord } from './stats'
import type { Session } from './store'
import { setShortText, trackingOf } from './tracking'

// Tarjeta del entrenamiento para compartir como imagen (1080 × 1350, formato 4:5). Se dibuja como SVG
// con colores fijos y se convierte a PNG en el propio dispositivo: no se envía nada a ningún servidor.

const W = 1080
const H = 1350
const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`

/** Escala del mapa muscular (420 × 450) dentro de la tarjeta. */
const MAP_SCALE = 1.0

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)

type Paint = 'p' | 's' | 'm'

/** Mapa muscular (frente y espalda) como texto SVG, sin variables CSS ni filtros. */
function muscleMap(paint: (name: string) => Paint): string {
  const half = (view: 'front' | 'back') => {
    const regions = Object.entries(REGIONS[view]).map(([name, d]) => [d, DECOR.has(name) ? 'm' : paint(name === 'obliques' ? 'abs' : name)] as const)
    return [
      `<path d="${SILHOUETTE}" fill="#0c0d10"/>`,
      // Halo suave bajo los músculos principales (sustituye al filtro de brillo).
      ...regions.filter(([, p]) => p === 'p').map(([d]) => `<path d="${d}" fill="none" stroke="#ff6a3d" stroke-opacity="0.28" stroke-width="7" stroke-linejoin="round"/>`),
      ...regions.map(([d, p]) => `<path d="${d}" fill="url(#c${p})"/>`),
    ].join('')
  }
  const figure = (view: 'front' | 'back') => {
    const h = half(view)
    return `<path d="${HEAD}" fill="url(#cm)"/><path d="${HEAD}" fill="url(#cm)" transform="translate(200,0) scale(-1,1)"/>${h}<g transform="translate(200,0) scale(-1,1)">${h}</g>`
  }
  return `<g>${figure('front')}</g><g transform="translate(220,0)">${figure('back')}</g>`
}

export interface CardInput {
  session: Session
  unit: Unit
  records: PersonalRecord[]
  /** Músculos secundarios de un ejercicio del catálogo. */
  secondaryOf: (exerciseId: string) => string[]
}

export function shareCardSVG({ session, unit, records, secondaryOf }: CardInput): string {
  const primary = new Set<string>()
  const secondary = new Set<string>()
  for (const e of session.exercises) {
    if (!workingSets(e).length) continue
    primary.add(e.muscle)
    for (const m of secondaryOf(e.exerciseId)) secondary.add(m)
  }
  const paint = (name: string): Paint => (primary.has(name) ? 'p' : secondary.has(name) ? 's' : 'm')

  const stats: [string, string][] = [
    [duration(sessionDuration(session)), 'Duración'],
    [volume(sessionVolume(session), unit), 'Volumen'],
    [String(sessionSets(session)), 'Series'],
    records.length ? [String(records.length), records.length === 1 ? 'Récord' : 'Récords'] : [String(sessionReps(session)), 'Repeticiones'],
  ]
  const done = session.exercises.filter((e) => workingSets(e).length)
  const shown = done.slice(0, 5)
  const lines = shown.map((e) => {
    const sets = workingSets(e)
    const best = sets.reduce((a, b) => (b.weight * b.reps > a.weight * a.reps ? b : a), sets[0])
    const tracking = trackingOf(e)
    const bestText = tracking !== 'weight_reps' ? setShortText(best, tracking, unit)
      : best.weight > 0 ? `${weight(best.weight, unit)} × ${best.reps}` : `${best.reps} rep.`
    return [cut(e.name, 34), `${sets.length} ${sets.length === 1 ? 'serie' : 'series'} · ${bestText}`]
  })
  const record = records[0]

  const statTiles = stats.map(([value, label], i) => {
    const x = 60 + i * 245
    return `<rect x="${x}" y="300" width="225" height="150" rx="28" fill="#ffffff" fill-opacity="0.05"/>
      <text x="${x + 24}" y="378" font-size="50" font-weight="700" fill="#f5f5f7">${esc(value)}</text>
      <text x="${x + 24}" y="422" font-size="26" fill="#9aa0ab">${label}</text>`
  }).join('')

  const exerciseRows = lines.map(([name, detail], i) => {
    const y = 1080 + i * 46
    return `<text x="80" y="${y}" font-size="28" fill="#e8e9ec">${esc(name)}</text>
      <text x="1000" y="${y}" font-size="28" fill="#9aa0ab" text-anchor="end">${esc(detail)}</text>`
  }).join('')
  const more = done.length > shown.length
    ? `<text x="80" y="${1080 + shown.length * 46}" font-size="24" fill="#6b7280">y ${done.length - shown.length} ejercicio${done.length - shown.length === 1 ? '' : 's'} más</text>`
    : ''
  const recordBadge = record
    ? `<rect x="60" y="480" width="960" height="70" rx="35" fill="#ff6a3d" fill-opacity="0.14"/>
      <text x="540" y="526" font-size="30" font-weight="600" fill="#ff8a5c" text-anchor="middle">Nuevo récord · ${esc(cut(record.name, 28))} · ${esc(weight(record.weight, unit))} × ${record.reps}</text>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e2129"/><stop offset="1" stop-color="#0d0f12"/></linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.05" r="0.6"><stop offset="0" stop-color="#ff6a3d" stop-opacity="0.22"/><stop offset="1" stop-color="#ff6a3d" stop-opacity="0"/></radialGradient>
    <linearGradient id="cm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#474c57"/><stop offset="1" stop-color="#32363e"/></linearGradient>
    <linearGradient id="cp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffa06b"/><stop offset="0.55" stop-color="#ff6a3d"/><stop offset="1" stop-color="#e8481f"/></linearGradient>
    <linearGradient id="cs" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb48f" stop-opacity="0.8"/><stop offset="1" stop-color="#ff7a4d" stop-opacity="0.6"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <text x="60" y="110" font-size="34" font-weight="800" letter-spacing="6" fill="#ff6a3d">SERIX</text>
  <text x="1020" y="110" font-size="28" fill="#9aa0ab" text-anchor="end">${esc(day(session.start))}</text>
  <text x="60" y="220" font-size="68" font-weight="800" fill="#f5f5f7">${esc(cut(session.name, 24))}</text>
  ${statTiles}
  ${recordBadge}
  <g transform="translate(${(W - 420 * MAP_SCALE) / 2}, ${record ? 578 : 510}) scale(${MAP_SCALE})">${muscleMap(paint)}</g>
  ${exerciseRows}${more}
  <text x="540" y="1322" font-size="24" fill="#5b616d" text-anchor="middle">Entrenado con Serix · srraiimon.github.io/serix</text>
</svg>`
}

/** Convierte el SVG en PNG dibujándolo en un canvas. */
export async function svgToPng(svg: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    canvas.getContext('2d')!.drawImage(img, 0, 0, W, H)
    return await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo crear la imagen'))), 'image/png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Comparte la imagen con el menú del sistema o, si no se puede, la descarga. */
export async function shareImage(file: File, title: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return 'shared'
    } catch {
      return 'cancelled'
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
