// Genera public/licenses.txt con las licencias de lo que se distribuye dentro de la app.
// Se ejecuta en cada build para que siempre coincida con las versiones instaladas.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const packages = ['react', 'react-dom', 'scheduler', 'lucide-react']

function licenseText(dir) {
  const file = readdirSync(dir).find((f) => /^licen[cs]e/i.test(f))
  return file ? readFileSync(join(dir, file), 'utf8').trim() : '(texto de licencia no incluido en el paquete)'
}

const parts = [
  'Serix — licencias de terceros',
  '==============================',
  '',
  'Este archivo recoge las licencias del software y los contenidos que se distribuyen con la app.',
  '',
]

for (const name of packages) {
  const dir = join('node_modules', name)
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  parts.push(`--- ${name} ${pkg.version} (${pkg.license}) ---`, '', licenseText(dir), '')
}

parts.push(
  '--- Datos de ejercicios ---',
  'Nombres y clasificación (músculos, material, nivel) tomados de la lista de Free Exercise DB',
  '(https://github.com/yuhonas/free-exercise-db) y traducidos a mano. Son datos de hecho: la app no',
  'incluye fotos ni textos de terceros. Los mapas musculares son dibujos propios de Serix.',
  '',
)

writeFileSync('public/licenses.txt', parts.join('\n'))
console.log(`licenses.txt: ${packages.length} paquetes + catálogo de ejercicios`)
