// Lista los textos de la app que faltan por traducir en src/i18n/<idioma>.json (o cuyos huecos {0}…
// no coinciden), para añadirlos a mano. Sin nada que listar, termina sin errores.
//
// Uso: node scripts/i18n/missing.mjs
import { readFileSync } from 'node:fs'
import { extract } from './extract.mjs'

const holes = (s) => (s.match(/\{\d+\}/g) ?? []).sort().join()
export function missing(langs = ['fr', 'pt']) {
  const strings = extract()
  const out = []
  for (const lang of langs) {
    const dict = JSON.parse(readFileSync(`src/i18n/${lang}.json`, 'utf8'))
    for (const { es, en } of strings) {
      if (dict[es] === undefined) out.push({ lang, es, en, problem: 'sin traducir' })
      else if (holes(dict[es]) !== holes(es)) out.push({ lang, es, en, problem: 'huecos distintos' })
    }
  }
  return out
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const list = missing()
  for (const x of list) console.log(`${x.lang} · ${x.problem}: ${JSON.stringify(x.es)}  (en: ${JSON.stringify(x.en)})`)
  console.log(list.length ? `${list.length} por revisar` : 'Todo traducido')
  process.exit(list.length ? 1 : 0)
}
