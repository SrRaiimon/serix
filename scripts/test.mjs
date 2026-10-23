// Tests de la lógica de la app (se ejecutan en `npm run build` y con `npm test`).
//
// Sin dependencias nuevas: los tests usan el ejecutor que trae Node (node:test) y Vite carga los
// archivos .ts tal cual, igual que en la app. Cada archivo tests/*.test.ts se ejecuta al cargarlo.
//
// Uso: node scripts/test.mjs [filtro]
//
// Se ejecutan dos veces a la vez, con la hora de Madrid y con la de Auckland (+13 h, y el cambio de hora en otras
// fechas): los fallos de fechas (semanas de 23 o 25 horas, la fecha en UTC en vez de la local…) solo salen en
// algunas zonas. Con TZ ya fijada (TZ=… node scripts/test.mjs), una sola vez en esa zona.
import { spawn } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const filter = process.argv[2] ?? ''
const ZONES = ['Europe/Madrid', 'Pacific/Auckland']

if (!process.env.TZ) {
  const run = (tz) => new Promise((resolve) => {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), ...process.argv.slice(2)], { env: { ...process.env, TZ: tz } })
    let out = ''
    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { out += d })
    child.on('close', (code) => resolve({ tz, code, out }))
  })
  const [main, ...others] = await Promise.all(ZONES.map(run))
  process.stdout.write(main.out)
  // De las otras zonas, todo solo si algo falla (si no, lo mismo dos veces).
  for (const r of others) {
    if (r.code) process.stdout.write(`\n✖ Con la hora de ${r.tz}:\n${r.out}`)
    else console.log(`✔ También con la hora de ${r.tz}.`)
  }
  process.exit(main.code || others.find((r) => r.code)?.code || 0)
}
const files = readdirSync('tests').filter((f) => f.endsWith('.test.ts') && f.includes(filter)).sort()
if (!files.length) {
  console.error(`No hay tests${filter ? ` que coincidan con «${filter}»` : ''}.`)
  process.exit(1)
}

// Node trae un navigator con el idioma del sistema; los tests se escriben en español, así que se fija
// (los de inglés cambian el idioma explícitamente).
Object.defineProperty(globalThis, 'navigator', { value: { language: 'es-ES', languages: ['es-ES'] }, configurable: true, writable: true })

const server = await createServer({ configFile: false, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } })
// Al cargar cada archivo se registran sus tests; node:test los ejecuta y fija el código de salida.
// Vite se cierra al terminar de cargarlos: los tests no pueden hacer import() dinámicos.
// Si un archivo falla al cargarse, se cierra igual (si no, el proceso se queda colgado).
try {
  for (const f of files) await server.ssrLoadModule(`/tests/${f}`)
} finally {
  await server.close()
}
