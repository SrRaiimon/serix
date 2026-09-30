// Comprobación automática de las figuras de movimiento (se ejecuta en `npm run build`).
//
// - Todos los ejercicios del catálogo tienen figura y todas las figuras son de ejercicios que existen.
// - Las posturas extremas de la animación son las definidas.
// - En ningún instante de la animación una articulación atraviesa el suelo.
// - A mitad de movimiento la figura no «crece» (señal de que un brazo o una pierna da la vuelta por
//   el camino largo, como pasaba con los ángulos de signo distinto).
//
// Uso: node scripts/check-figures.mjs [--verbose]
import { readFileSync } from 'node:fs'
import { createServer } from 'vite'

const server = await createServer({ configFile: false, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } })
const { FIGURES, FLOOR } = await server.ssrLoadModule('/src/lib/figures.ts')
const { place, poseAt } = await server.ssrLoadModule('/src/lib/figureEngine.ts')
await server.close()

const verbose = process.argv.includes('--verbose')
const errors = []
const catalog = JSON.parse(readFileSync('public/exercises_es.json', 'utf8')).exercises.map((e) => e.id)
const ids = new Set(catalog)
for (const id of catalog) if (!FIGURES[id]) errors.push(`${id}: sin figura`)
for (const id of Object.keys(FIGURES)) if (!ids.has(id)) errors.push(`${id}: figura de un ejercicio que no está en el catálogo`)

// Articulaciones del cuerpo (sin contar la cabeza, que se dibuja con su propio radio).
const BODY = ['hip', 'hip2', 'shoulder', 'shoulder2', 'knee', 'knee2', 'ankle', 'ankle2', 'toe', 'toe2', 'elbow', 'elbow2', 'wrist', 'wrist2']
const size = (j) => {
  const xs = BODY.map((k) => j[k][0]), ys = [...BODY.map((k) => j[k][1]), j.head[1]]
  return Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
}
const FB = { thigh2: 'thigh', shin2: 'shin', upper2: 'upper', fore2: 'fore', foot2: 'foot', head: 'torso' }
const ANGLES = ['torso', 'head', 'thigh', 'shin', 'thigh2', 'shin2', 'upper', 'fore', 'upper2', 'fore2']
const resolve = (p, k) => p[k] ?? (FB[k] ? p[FB[k]] : undefined)
const sameAngle = (a, b) => Math.abs(((((a - b) % 360) + 540) % 360) - 180) < 0.5

// Centro de la articulación por debajo de la línea del suelo (px) y crecimiento máximo permitido.
const FLOOR_TOLERANCE = 5
const GROWTH_TOLERANCE = 1.2

// Aproximaciones conocidas y aceptadas (con el motivo): se avisan pero no hacen fallar la compilación.
const KNOWN = {
  'Kettlebell_Turkish_Get-Up_Lunge_style': 'el brazo de apoyo roza el suelo a mitad del incorporarse (con dos posturas no se puede dibujar el apoyo paso a paso)',
}

const seen = new Map()
for (const [id, f] of Object.entries(FIGURES)) if (!seen.has(f)) seen.set(f, id)
let worstFloor = -Infinity, worstGrowth = 0
for (const [f, id] of seen) {
  f.frames.forEach((frame, i) => {
    const got = poseAt(f, i)
    for (const k of ANGLES) {
      const a = resolve(frame, k), b = resolve(got, k)
      if (a !== undefined && b !== undefined && !sameAngle(a, b)) errors.push(`${id}: la postura ${i ? 'final' : 'inicial'} no coincide en ${k} (${a} → ${b})`)
    }
  })
  const ends = Math.max(size(place(f, poseAt(f, 0))), size(place(f, poseAt(f, 1))))
  // Peor instante de cada figura (una línea por figura y problema).
  let floor = { by: -Infinity }, grow = { by: 0 }
  for (let s = 0; s <= 24; s++) {
    const t = s / 24
    const j = place(f, poseAt(f, t))
    for (const k of BODY) if (j[k][1] - FLOOR > floor.by) floor = { by: j[k][1] - FLOOR, joint: k, t }
    const growth = size(j) / ends
    if (growth > grow.by) grow = { by: growth, t }
  }
  worstFloor = Math.max(worstFloor, floor.by)
  worstGrowth = Math.max(worstGrowth, grow.by)
  if (floor.by > FLOOR_TOLERANCE) errors.push(`${id}: ${floor.joint} atraviesa el suelo ${floor.by.toFixed(1)} px (t=${floor.t.toFixed(2)})`)
  if (grow.by > GROWTH_TOLERANCE) errors.push(`${id}: la figura crece un ${Math.round((grow.by - 1) * 100)} % a mitad de movimiento (t=${grow.t.toFixed(2)}): ¿un miembro da la vuelta?`)
}
const known = errors.filter((e) => KNOWN[e.split(':')[0]])
for (const e of new Set(known)) console.warn(`aviso (aceptado): ${e} — ${KNOWN[e.split(':')[0]]}`)
errors.splice(0, errors.length, ...errors.filter((e) => !KNOWN[e.split(':')[0]]))
const unique = [...new Set(errors.map((e) => e.split(':')[0]))]
if (verbose || errors.length) console.log(`Figuras: ${seen.size} distintas, ${catalog.length} ejercicios. Peor suelo: ${worstFloor.toFixed(1)} px; mayor crecimiento: ${Math.round((worstGrowth - 1) * 100)} %.`)
if (errors.length) {
  console.error([...new Set(errors)].slice(0, 60).join('\n'))
  console.error(`\n${unique.length} figuras con problemas.`)
  process.exit(1)
}
console.log(`Figuras correctas: ${seen.size} distintas para ${catalog.length} ejercicios.`)
