import { cleanMyFood } from './backup'
import type { MyFood } from './nutrition'
import { canCompress, fromBase64Url, toBase64Url, transform } from './share'

// Compartir un alimento propio o una receta con un enlace (como las rutinas): todo va dentro del
// enlace, comprimido; no pasa por ningún servidor. Quien lo abre lo guarda en «Mis alimentos».

/** Código: «f» + JSON comprimido (deflate), o «g» + JSON sin comprimir en navegadores antiguos. */
export async function encodeFood(food: MyFood): Promise<string> {
  const { id: _id, ...rest } = food
  const bytes = new TextEncoder().encode(JSON.stringify({ v: 1, f: rest }))
  return canCompress() ? `f${toBase64Url(await transform(bytes, new CompressionStream('deflate-raw')))}` : `g${toBase64Url(bytes)}`
}

/** El alimento del enlace, ya revisado (como al importar una copia); error si el código no vale. */
export async function decodeFood(code: string): Promise<MyFood> {
  const raw = fromBase64Url(code.slice(1))
  const bytes = code[0] === 'f' ? await transform(raw, new DecompressionStream('deflate-raw')) : code[0] === 'g' ? raw : undefined
  if (!bytes) throw new Error('code')
  const json = JSON.parse(new TextDecoder().decode(bytes)) as { f?: unknown }
  const food = cleanMyFood({ ...(json.f as object), id: 'x' })
  if (!food) throw new Error('food')
  return food
}

export const foodLink = (code: string) => `${location.origin}${location.pathname}#/food-import/${code}`
