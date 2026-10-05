import { t } from './i18n'

// Estilo común de las imágenes para compartir (entrenamiento, mes y año): el mismo sistema que la app
// en oscuro. Fondo liso, líneas de 1 px, cifras en Archivo y un solo naranja: la cinta de la esquina.

export const C = {
  bg: '#08090b',
  text: '#f3f4f6',
  text2: '#a3a7af',
  text3: '#6b7078',
  line: 'rgba(255,255,255,0.13)',
  accent: '#ff6a33',
}

export const SANS = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
/** Archivo va incrustada en la imagen al convertirla a PNG (ver svgToPng); si no carga, la del sistema. */
export const DISPLAY = `'Archivo', ${SANS}`

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Fondo, cinta naranja colgando del borde superior, marca «SERIX» y un texto a la derecha (fecha o periodo). */
export function cardChrome(w: number, h: number, right: string): string {
  return `<rect width="${w}" height="${h}" fill="${C.bg}"/>
  <path d="M${w - 150} 0h64v132l-32-26-32 26z" fill="${C.accent}"/>
  <text x="60" y="104" font-family="${DISPLAY}" font-size="30" font-weight="800" letter-spacing="4" fill="${C.text}" style="font-stretch:112%">SERIX</text>
  <text x="60" y="148" font-size="28" fill="${C.text2}">${esc(right)}</text>`
}

/** Título grande en Archivo. */
export function cardTitle(text: string, y: number, size = 72): string {
  return `<text x="60" y="${y}" font-family="${DISPLAY}" font-size="${size}" font-weight="800" fill="${C.text}" style="font-stretch:106%">${esc(text)}</text>`
}

/** Cifras en banda: un recuadro con línea fina dividido en celdas, cifra grande y etiqueta debajo. */
export function statBand(x: number, y: number, width: number, cellH: number, items: [string, string][], cols: number): string {
  const rows = Math.ceil(items.length / cols)
  const cw = width / cols
  const lines: string[] = [`<rect x="${x}" y="${y}" width="${width}" height="${cellH * rows}" rx="28" fill="none" stroke="${C.line}" stroke-width="2"/>`]
  for (let c = 1; c < cols; c++) lines.push(`<line x1="${x + c * cw}" y1="${y}" x2="${x + c * cw}" y2="${y + cellH * rows}" stroke="${C.line}" stroke-width="2"/>`)
  for (let r = 1; r < rows; r++) lines.push(`<line x1="${x}" y1="${y + r * cellH}" x2="${x + width}" y2="${y + r * cellH}" stroke="${C.line}" stroke-width="2"/>`)
  const cells = items.map(([value, label], i) => {
    const cx = x + (i % cols) * cw + 28
    const cy = y + Math.floor(i / cols) * cellH
    const size = value.length > 9 ? 40 : value.length > 6 ? 48 : 58
    return `<text x="${cx}" y="${cy + cellH * 0.55}" font-family="${DISPLAY}" font-size="${size}" font-weight="800" fill="${C.text}">${esc(value)}</text>
      <text x="${cx}" y="${cy + cellH * 0.55 + 42}" font-size="24" fill="${C.text2}">${esc(label)}</text>`
  })
  return lines.join('') + cells.join('')
}

/** Línea fina de separación a lo ancho. */
export const rule = (y: number, w: number) => `<line x1="60" y1="${y}" x2="${w - 60}" y2="${y}" stroke="${C.line}" stroke-width="2"/>`

export function cardFooter(w: number, h: number): string {
  return `<text x="${w / 2}" y="${h - 28}" font-size="24" fill="${C.text3}" text-anchor="middle">${t('Entrenado con Serix', 'Trained with Serix')} · srraiimon.github.io/serix</text>`
}
