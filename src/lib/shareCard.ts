import { DECOR, HEAD, REGIONS, SILHOUETTE } from '../components/muscleShapes'
import { day, tons, weight, type Unit } from './format'
import { sessionDuration, sessionReps, sessionSets, sessionVolume, workingSets, type PersonalRecord } from './stats'
import type { Session } from './store'
import { setShortText, trackingOf } from './tracking'
import { plural, t } from './i18n'
import { C, SANS, cardChrome, cardFooter, cardTitle, esc, rule, statBand } from './cardStyle'
import archivoUrl from '../assets/fonts/archivo-latin-wdth.woff2?url'

// Tarjeta del entrenamiento para compartir como imagen (1080 × 1350, formato 4:5). Se dibuja como SVG
// con colores fijos y se convierte a PNG en el propio dispositivo: no se envía nada a ningún servidor.

const W = 1080
/** Alto de la publicación (4:5) y de la historia (9:16). */
const POST_H = 1350
const STORY_H = 1920

/** Escala del mapa muscular (420 × 450) dentro de la tarjeta. */
const MAP_SCALE = 1.0
const record0 = (records: PersonalRecord[]) => records.length > 0

const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)

type Paint = 'p' | 's' | 'm'

/** Mapa muscular (frente y espalda) como texto SVG, sin variables CSS ni filtros. */
function muscleMap(paint: (name: string) => Paint): string {
  const half = (view: 'front' | 'back') => {
    const regions = Object.entries(REGIONS[view]).map(([name, d]) => [d, DECOR.has(name) ? 'm' : paint(name === 'obliques' ? 'abs' : name)] as const)
    return [
      `<path d="${SILHOUETTE}" fill="#16181c"/>`,
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
  /** Formato historia (9:16) en vez de publicación (4:5). */
  story?: boolean
}

export function shareCardSVG({ session, unit, records, secondaryOf, story = false }: CardInput): string {
  const H = story ? STORY_H : POST_H
  // La historia reparte lo mismo con más aire: cifras en 2 × 2 y el mapa más grande.
  const L = story
    ? { title: 300, band: 360, cellH: 170, cols: 2, record: 760, map: 820, mapScale: 1.5, rule: 1540, rows: 1610, step: 52 }
    : { title: 250, band: 290, cellH: 150, cols: 4, record: 470, map: record0(records) ? 578 : 510, mapScale: MAP_SCALE, rule: 1030, rows: 1080, step: 46 }
  const primary = new Set<string>()
  const secondary = new Set<string>()
  for (const e of session.exercises) {
    if (!workingSets(e).length) continue
    primary.add(e.muscle)
    for (const m of secondaryOf(e.exerciseId)) secondary.add(m)
  }
  const paint = (name: string): Paint => (primary.has(name) ? 'p' : secondary.has(name) ? 's' : 'm')

  const stats: [string, string][] = [
    [`${Math.round(sessionDuration(session) / 60000)} min`, t('Duración', 'Duration')],
    [tons(sessionVolume(session), unit), t('Volumen', 'Volume')],
    [String(sessionSets(session)), t('Series', 'Sets')],
    records.length ? [String(records.length), records.length === 1 ? t('Récord', 'Record') : t('Récords', 'Records')] : [String(sessionReps(session)), t('Repeticiones', 'Reps')],
  ]
  const done = session.exercises.filter((e) => workingSets(e).length)
  const shown = done.slice(0, 5)
  const lines = shown.map((e) => {
    const sets = workingSets(e)
    const best = sets.reduce((a, b) => (b.weight * b.reps > a.weight * a.reps ? b : a), sets[0])
    const tracking = trackingOf(e)
    const bestText = tracking !== 'weight_reps' ? setShortText(best, tracking, unit)
      : best.weight > 0 ? `${weight(best.weight, unit)} × ${best.reps}` : `${best.reps} rep.`
    return [cut(e.name, 34), `${plural(sets.length, ['serie', 'series'], ['set', 'sets'])} · ${bestText}`]
  })
  const record = records[0]

  const exerciseRows = lines.map(([name, detail], i) => {
    const y = L.rows + i * L.step
    return `<text x="80" y="${y}" font-size="28" fill="${C.text}">${esc(name)}</text>
      <text x="1000" y="${y}" font-size="28" fill="${C.text2}" text-anchor="end">${esc(detail)}</text>`
  }).join('')
  const extra = done.length - shown.length
  const more = extra > 0
    ? `<text x="80" y="${L.rows + shown.length * L.step}" font-size="24" fill="${C.text3}">${extra === 1 ? t('y 1 ejercicio más', 'and 1 more exercise') : t(`y ${extra} ejercicios más`, `and ${extra} more exercises`)}</text>`
    : ''
  // Récord: una fila con la cinta pequeña (la única marca naranja además de la de la esquina).
  const recordRow = record
    ? `<path d="M60 ${L.record + 4}h20v32l-10-8-10 8z" fill="${C.accent}"/>
      <text x="96" y="${L.record + 30}" font-size="30" font-weight="600" fill="${C.text}">${t('Nuevo récord', 'New record')} · ${esc(cut(record.name, 28))} · ${esc(weight(record.weight, unit))} × ${record.reps}</text>
      ${rule(L.record + 66, W)}`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${SANS}">
  <defs>
    <linearGradient id="cm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#474c57"/><stop offset="1" stop-color="#32363e"/></linearGradient>
    <linearGradient id="cp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffa06b"/><stop offset="0.55" stop-color="#ff6a3d"/><stop offset="1" stop-color="#e8481f"/></linearGradient>
    <linearGradient id="cs" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb48f" stop-opacity="0.8"/><stop offset="1" stop-color="#ff7a4d" stop-opacity="0.6"/></linearGradient>
  </defs>
  ${cardChrome(W, H, day(session.start))}
  ${cardTitle(cut(session.name, 30), L.title, session.name.length > 22 ? 52 : session.name.length > 16 ? 62 : 72)}
  ${statBand(60, L.band, 960, L.cellH, stats, L.cols)}
  ${recordRow}
  <g transform="translate(${(W - 420 * L.mapScale) / 2}, ${L.map}) scale(${L.mapScale})">${muscleMap(paint)}</g>
  ${rule(L.rule, W)}
  ${exerciseRows}${more}
  ${cardFooter(W, H)}
</svg>`
}

let fontCss: Promise<string> | undefined
/** Archivo como data URL dentro del SVG: una imagen SVG no puede cargar fuentes de fuera. Sin red, la del sistema. */
function embeddedFont(): Promise<string> {
  fontCss ??= fetch(archivoUrl)
    .then((r) => r.blob())
    .then((b) => new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(`@font-face{font-family:'Archivo';src:url(${reader.result}) format('woff2');font-weight:100 900;font-stretch:62% 125%}`)
      reader.onerror = () => resolve('')
      reader.readAsDataURL(b)
    }))
    .catch(() => '')
  return fontCss
}

/** Convierte el SVG en PNG dibujándolo en un canvas. */
export async function svgToPng(svg: string): Promise<Blob> {
  const css = await embeddedFont()
  if (css) svg = svg.replace(/<svg([^>]*)>/, `<svg$1><style>${css}</style>`)
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const canvas = document.createElement('canvas')
    // Medidas del propio SVG (publicación, historia o resumen del periodo).
    const width = Number(svg.match(/width="(\d+)"/)?.[1] ?? 1080)
    const height = Number(svg.match(/height="(\d+)"/)?.[1] ?? 1350)
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
    return await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(t('No se pudo crear la imagen', 'Could not create the image')))), 'image/png'))
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
