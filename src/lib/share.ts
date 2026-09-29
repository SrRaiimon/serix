import type { Catalog } from './catalog'
import { uid } from './format'
import { normalizeGroups } from './groups'
import type { Routine, RoutineExercise } from './store'
import { defaultTracking, type Tracking } from './tracking'

// Rutinas compartidas por enlace, sin servidor: la rutina va comprimida dentro del propio enlace
// (#/import/<código>). Solo viajan los identificadores del catálogo y las cifras; los nombres se
// toman del catálogo al importar.

// group: número de superserie/circuito dentro de la rutina (los enlaces antiguos no lo llevan).
type SharedExercise = [id: string, sets: number, repsMin: number, repsMax: number, rest: number, tracking?: Tracking, targetSeconds?: number, group?: number]

interface Payload {
  v: 1
  /** Nombre del programa, si se comparte uno entero. */
  p?: string
  r: { n: string; x: SharedExercise[] }[]
}

export interface ImportedPlan {
  programName?: string
  routines: { name: string; exercises: RoutineExercise[] }[]
  /** Ejercicios que no existen en este catálogo (no debería pasar con la misma versión). */
  skipped: number
}

const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replaceAll('-', '+').replaceAll('_', '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

async function transform(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

const canCompress = () => typeof CompressionStream !== 'undefined'

/** Código: "z" + deflate comprimido, o "j" + JSON sin comprimir en navegadores antiguos. */
export async function encodePlan(routines: Routine[], programName?: string): Promise<string> {
  const payload: Payload = {
    v: 1,
    ...(programName ? { p: programName } : {}),
    r: routines.map((r) => ({
      n: r.name,
      x: (() => {
        const groupNumbers = new Map<string, number>()
        return r.exercises.map((e) => {
          const item: SharedExercise = [e.exerciseId, e.sets, e.repsMin, e.repsMax, e.rest]
          if (e.groupId) {
            if (!groupNumbers.has(e.groupId)) groupNumbers.set(e.groupId, groupNumbers.size + 1)
            item.push(e.tracking ?? 'weight_reps', e.targetSeconds ?? 0, groupNumbers.get(e.groupId)!)
          } else if (e.tracking && e.tracking !== 'weight_reps') {
            item.push(e.tracking, e.targetSeconds ?? 0)
          }
          return item
        })
      })(),
    })),
  }
  const json = new TextEncoder().encode(JSON.stringify(payload))
  if (canCompress()) return 'z' + toBase64Url(await transform(json, new CompressionStream('deflate-raw')))
  return 'j' + toBase64Url(json)
}

/** Error con un mensaje apto para mostrar tal cual. */
class ShareError extends Error {}

export async function decodePlan(code: string, catalog: Catalog): Promise<ImportedPlan> {
  try {
    return await decode(code, catalog)
  } catch (e) {
    if (e instanceof ShareError) throw e
    // Base64 o compresión rotos: casi siempre un enlace cortado al copiarlo.
    throw new ShareError('El enlace está incompleto o dañado. Pide que te lo vuelvan a enviar.')
  }
}

async function decode(code: string, catalog: Catalog): Promise<ImportedPlan> {
  const kind = code[0]
  const bytes = fromBase64Url(code.slice(1))
  let json: Uint8Array
  if (kind === 'z') {
    if (typeof DecompressionStream === 'undefined') throw new ShareError('Este navegador no puede abrir enlaces comprimidos. Actualízalo o prueba con otro.')
    json = await transform(bytes, new DecompressionStream('deflate-raw'))
  } else if (kind === 'j') {
    json = bytes
  } else {
    throw new ShareError('El enlace no es de una rutina.')
  }
  const payload = JSON.parse(new TextDecoder().decode(json)) as Payload
  if (payload.v !== 1 || !Array.isArray(payload.r)) throw new ShareError('Este enlace es de una versión más nueva de la app. Recarga la app e inténtalo de nuevo.')

  let skipped = 0
  const routines = payload.r.map((r) => {
    const groupIds = new Map<number, string>()
    const exercises = r.x.flatMap(([id, sets, repsMin, repsMax, rest, tracking, targetSeconds, group]): RoutineExercise[] => {
      const exercise = catalog.get(id)
      if (!exercise) {
        skipped++
        return []
      }
      return [{
        exerciseId: id, name: exercise.name, muscle: exercise.muscle,
        sets: clampInt(sets, 1, 20, 3), repsMin: clampInt(repsMin, 1, 100, 8), repsMax: clampInt(repsMax, 1, 100, 12),
        rest: clampInt(rest, 0, 900, 90),
        tracking: tracking ?? defaultTracking(exercise),
        ...(targetSeconds ? { targetSeconds: clampInt(targetSeconds, 5, 7200, 45) } : {}),
        ...(group ? { groupId: groupIds.get(group) ?? groupIds.set(group, uid()).get(group)! } : {}),
      }]
    })
    normalizeGroups(exercises)
    return { name: String(r.n || 'Rutina'), exercises }
  })
  return { programName: payload.p, routines, skipped }
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}

export function planLink(code: string): string {
  return `${location.origin}${location.pathname}#/import/${code}`
}

/** Acepta el enlace completo o solo el código. */
export function extractCode(text: string): string | undefined {
  const trimmed = text.trim()
  const match = trimmed.match(/#\/import\/([A-Za-z0-9_-]+)/)
  if (match) return match[1]
  return /^[zj][A-Za-z0-9_-]+$/.test(trimmed) ? trimmed : undefined
}

export function newRoutineFromImport(r: ImportedPlan['routines'][number], order: number, programName?: string): Routine {
  return { id: uid(), name: r.name, notes: '', programName, order, createdAt: Date.now(), exercises: r.exercises }
}

export async function shareLink(title: string, url: string): Promise<'shared' | 'copied' | 'cancelled'> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text: `${title} — ábrela en Serix`, url })
      return 'shared'
    } catch {
      return 'cancelled'
    }
  }
  await navigator.clipboard.writeText(url)
  return 'copied'
}
