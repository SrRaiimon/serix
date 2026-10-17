// Las traducciones van por el texto en español (src/i18n/<idioma>.json), así que retocar un texto en el
// código (una coma, una palabra) deja su traducción huérfana con la clave vieja y el texto nuevo sin traducir.
// Esto las vuelve a juntar: a cada texto sin traducir le pasa la traducción huérfana más parecida (con los
// mismos huecos {0}…) y quita las huérfanas que ya no se parecen a nada. Sin --write, solo lo enseña.
//
// Uso: node scripts/i18n/rekey.mjs [--write]
import { readFileSync, writeFileSync } from 'node:fs'
import { extract } from './extract.mjs'

/** Parecido de 0 a 1 (distancia de edición sobre el más largo). */
export function similarity(a, b) {
  if (a === b) return 1
  const m = a.length, n = b.length
  if (!m || !n) return 0
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return 1 - prev[n] / Math.max(m, n)
}

const holes = (s) => (s.match(/\{\d+\}/g) ?? []).sort().join()
/**
 * Por debajo de esto ya no es «el mismo texto retocado» sino otro: mejor traducirlo de nuevo. En textos cortos
 * pocas letras ya lo bajan («Guardar cambios» → «Guardar los cambios», 79 %): ahí un cambio pequeño puede
 * cambiar el sentido, así que se traduce otra vez.
 */
export const MIN_SIMILARITY = 0.8

/**
 * Qué hacer con un diccionario: `moves` (clave vieja → nueva, con su parecido) y `orphans` (claves que no usa
 * ningún texto y que no se parecen a ninguno sin traducir, para quitarlas).
 */
export function plan(dict, used) {
  const missing = [...used].filter((es) => dict[es] === undefined)
  const orphans = Object.keys(dict).filter((k) => !used.has(k))
  // Las parejas más parecidas primero, cada clave una sola vez.
  const pairs = []
  for (const es of missing) {
    for (const old of orphans) {
      if (holes(old) !== holes(es)) continue
      const score = similarity(old, es)
      if (score >= MIN_SIMILARITY) pairs.push({ from: old, to: es, score })
    }
  }
  pairs.sort((a, b) => b.score - a.score)
  const taken = new Set(), filled = new Set(), moves = []
  for (const p of pairs) {
    if (taken.has(p.from) || filled.has(p.to)) continue
    taken.add(p.from)
    filled.add(p.to)
    moves.push(p)
  }
  return { moves, orphans: orphans.filter((k) => !taken.has(k)) }
}

/** El diccionario con las claves movidas y sin huérfanas, en el mismo orden (una entrada por línea). */
export function apply(dict, { moves, orphans }) {
  const to = new Map(moves.map((m) => [m.from, m.to]))
  const drop = new Set(orphans)
  const out = {}
  for (const [k, v] of Object.entries(dict)) {
    if (drop.has(k)) continue
    out[to.get(k) ?? k] = v
  }
  return out
}

const format = (dict) => '{\n' + Object.entries(dict).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n') + '\n}\n'

if (import.meta.url === `file://${process.argv[1]}`) {
  const write = process.argv.includes('--write')
  const used = new Set(extract().map((x) => x.es))
  for (const lang of ['fr', 'pt']) {
    const path = `src/i18n/${lang}.json`
    const dict = JSON.parse(readFileSync(path, 'utf8'))
    const p = plan(dict, used)
    for (const m of p.moves) console.log(`${lang} · ${m.score < 0.95 ? 'REVISA ' : ''}${Math.round(m.score * 100)} %: ${JSON.stringify(m.from)}\n     → ${JSON.stringify(m.to)}`)
    for (const k of p.orphans) console.log(`${lang} · se quita (ya no se usa): ${JSON.stringify(k)}`)
    if (write && (p.moves.length || p.orphans.length)) writeFileSync(path, format(apply(dict, p)))
    console.log(`${lang}: ${p.moves.length} recolocadas, ${p.orphans.length} quitadas${write ? '' : ' (sin --write no se cambia nada)'}`)
  }
}
