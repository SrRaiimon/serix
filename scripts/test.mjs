// Tests de la lógica de la app (se ejecutan en `npm run build` y con `npm test`).
//
// Sin dependencias nuevas: los tests usan el ejecutor que trae Node (node:test) y Vite carga los
// archivos .ts tal cual, igual que en la app. Cada archivo tests/*.test.ts se ejecuta al cargarlo.
//
// Uso: node scripts/test.mjs [filtro]
import { readdirSync } from 'node:fs'
import { createServer } from 'vite'

const filter = process.argv[2] ?? ''
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
for (const f of files) await server.ssrLoadModule(`/tests/${f}`)
await server.close()
