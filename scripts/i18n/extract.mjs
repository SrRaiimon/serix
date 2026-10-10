// Saca todos los textos de la app (las llamadas t('es', 'en'), plural(n, [es], [en]) y las parejas
// ['es', 'en'] de las tablas) para traducirlos a otros idiomas (src/i18n/<idioma>.json).
//
// En las plantillas (t(`Día ${n}`, `Day ${n}`)) cada ${…} pasa a ser {0}, {1}…, en el orden del español.
//
// Uso: node scripts/i18n/extract.mjs            → escribe scripts/i18n/strings.json
//      import { extract } from './extract.mjs'  → la lista (para los tests)
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseAst } from 'rolldown/parseAst'

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) && !name.endsWith('.d.ts') ? [path] : []
  })
}

/** Texto de un literal o una plantilla (con {0}, {1}…), o nada si no es texto fijo. */
function text(node) {
  if (!node) return undefined
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value
  if (node.type === 'TemplateLiteral') return node.quasis.map((q, i) => (i ? `{${i - 1}}` : '') + q.value.cooked).join('')
  return undefined
}

// Con alguna letra (también conectores sueltos como « y »).
const hasWords = (s) => /\p{L}/u.test(s.replace(/\{\d+\}/g, ''))

function walk(node, visit) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) return node.forEach((x) => walk(x, visit))
  if (typeof node.type === 'string') visit(node)
  for (const key in node) if (key !== 'type' && key !== 'start' && key !== 'end') walk(node[key], visit)
}

export function extract(root = 'src') {
  const found = new Map()
  const add = (es, en, file) => {
    if (es === undefined || en === undefined || !hasWords(es)) return
    if (!found.has(es)) found.set(es, { es, en, file })
  }
  for (const file of files(root)) {
    const ast = parseAst(readFileSync(file, 'utf8'), { lang: file.endsWith('x') ? 'tsx' : 'ts' }, file)
    walk(ast, (node) => {
      if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
        const name = node.callee.name
        const [a, b, c] = node.arguments
        if ((name === 't' || name === 'tr') && a && b) add(text(a), text(b), file)
        if (name === 'plural' && b?.type === 'ArrayExpression' && c?.type === 'ArrayExpression') {
          b.elements.forEach((x, i) => add(text(x), text(c.elements[i]), file))
        }
      }
      // Parejas [es, en] de las tablas (músculos, materiales, nombres de programas…).
      if (node.type === 'ArrayExpression' && node.elements.length === 2) {
        const [a, b] = node.elements.map(text)
        // Fuera los identificadores ('Barbell_Squat', 'kg'…): con guion bajo o en minúsculas los dos.
        const id = (x) => x.includes('_') || /^[a-z0-9-]+$/.test(x)
        if (a !== undefined && b !== undefined && a !== b && /\p{L}{2}/u.test(a) && /\p{L}{2}/u.test(b) && !(id(a) && id(b)) && !a.includes('_')) add(a, b, file)
      }
    })
  }
  return [...found.values()].sort((x, y) => x.es.localeCompare(y.es, 'es'))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const list = extract()
  writeFileSync('scripts/i18n/strings.json', JSON.stringify(list, null, 1) + '\n')
  console.log(`${list.length} textos (${list.filter((x) => /\{\d+\}/.test(x.es)).length} con huecos)`)
}
