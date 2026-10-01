import { parseBackup } from './backup'
import { canCompress, fromBase64Url, toBase64Url, transform } from './share'
import type { AppData } from './store'

// Pasar todos los datos a otro móvil sin servidor: se comprimen y se trocean en varios códigos QR que
// el móvil viejo muestra en bucle; el nuevo los lee con la cámara en cualquier orden hasta tenerlos
// todos. Cada trozo lleva: versión, formato, identificador del envío, número y total.
//
//   SX1:<z|j>:<envío>:<n>:<total>:<datos en base64url>

const PREFIX = 'SX1'
/** Caracteres de datos por código: QR de versión ~22 (nivel L), legible en una pantalla de móvil. */
export const CHUNK = 900

export interface Frame {
  format: 'z' | 'j'
  id: string
  index: number
  total: number
  data: string
}

/** Lo que viaja: igual que la copia de seguridad pero sin los identificadores internos que se pueden
 * regenerar al importar (series, ejercicios de cada sesión y medidas), que ocupan mucho. */
function slim(data: AppData): unknown {
  return {
    ...data,
    sessions: data.sessions.map((s) => ({
      ...s,
      exercises: s.exercises.map(({ id: _, ...e }) => ({ ...e, sets: e.sets.map(({ id: __, ...set }) => set) })),
    })),
    measurements: data.measurements.map(({ id: _, ...m }) => m),
  }
}

export async function encodeTransfer(data: AppData): Promise<string[]> {
  const json = new TextEncoder().encode(JSON.stringify(slim(data)))
  const format = canCompress() ? 'z' : 'j'
  const text = toBase64Url(format === 'z' ? await transform(json, new CompressionStream('deflate-raw')) : json)
  const id = Math.random().toString(36).slice(2, 6).padEnd(4, '0')
  const total = Math.max(1, Math.ceil(text.length / CHUNK))
  return Array.from({ length: total }, (_, i) => `${PREFIX}:${format}:${id}:${i}:${total}:${text.slice(i * CHUNK, (i + 1) * CHUNK)}`)
}

export function parseFrame(text: string): Frame | undefined {
  const m = text.match(/^SX1:([zj]):([a-z0-9]{4}):(\d{1,4}):(\d{1,4}):([A-Za-z0-9_-]*)$/)
  if (!m) return undefined
  const index = Number(m[3])
  const total = Number(m[4])
  if (total < 1 || index >= total) return undefined
  return { format: m[1] as 'z' | 'j', id: m[2], index, total, data: m[5] }
}

/** Trozos recibidos de un envío. Si empieza a llegar otro envío (otro id), se empieza de cero. */
export interface Received {
  id?: string
  format?: 'z' | 'j'
  total: number
  parts: Map<number, string>
}

export const emptyReceived = (): Received => ({ total: 0, parts: new Map() })

/** Añade un trozo; devuelve el estado nuevo (o el mismo si no aporta nada). */
export function addFrame(state: Received, frame: Frame): Received {
  const fresh = state.id !== frame.id || state.total !== frame.total || state.format !== frame.format
  if (!fresh && state.parts.has(frame.index)) return state
  const parts = fresh ? new Map<number, string>() : new Map(state.parts)
  parts.set(frame.index, frame.data)
  return { id: frame.id, format: frame.format, total: frame.total, parts }
}

export const isComplete = (s: Received) => s.total > 0 && s.parts.size === s.total

/** Une los trozos y los valida como una copia de seguridad (mismas comprobaciones). */
export async function assemble(s: Received): Promise<AppData> {
  if (!isComplete(s)) throw new Error('Faltan códigos por leer.')
  const text = Array.from({ length: s.total }, (_, i) => s.parts.get(i)!).join('')
  let bytes = fromBase64Url(text)
  if (s.format === 'z') {
    if (typeof DecompressionStream === 'undefined') throw new Error('Este navegador no puede descomprimir los datos. Actualízalo.')
    bytes = await transform(bytes, new DecompressionStream('deflate-raw'))
  }
  return parseBackup(new TextDecoder().decode(bytes))
}
