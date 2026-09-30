// Genera public/licenses.txt con las licencias de lo que se distribuye dentro de la app.
// Se ejecuta en cada build para que siempre coincida con las versiones instaladas.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const packages = ['react', 'react-dom', 'scheduler', 'lucide-react', 'qrcode-generator']

// Texto estándar de la licencia MIT, para paquetes que la declaran solo en la cabecera del código.
const MIT = `Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`

function licenseText(dir, pkg) {
  const file = readdirSync(dir).find((f) => /^licen[cs]e/i.test(f))
  if (file) return readFileSync(join(dir, file), 'utf8').trim()
  // Sin archivo de licencia: aviso de copyright de la cabecera del código + texto MIT.
  const code = readFileSync(join(dir, pkg.module ?? pkg.main), 'utf8')
  const copyright = code.match(/Copyright \(c\)[^\n]*/)?.[0]
  const trademark = code.match(/The word 'QR Code'[^\n]*\n\/\/\s*([^\n]*)/)
  const note = trademark ? `\n\n${trademark[0].replace(/\n\/\/\s*/, ' ')}.` : ''
  if (pkg.license === 'MIT' && copyright) return `${copyright.trim()}\n\n${MIT}${note}`
  throw new Error(`${pkg.name}: no se encuentra el texto de la licencia`)
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
  parts.push(`--- ${name} ${pkg.version} (${pkg.license}) ---`, '', licenseText(dir, pkg), '')
}

parts.push(
  '--- Datos de ejercicios ---',
  'Nombres y clasificación (músculos, material, nivel) tomados de la lista de Free Exercise DB',
  '(https://github.com/yuhonas/free-exercise-db) y traducidos a mano. Son datos de hecho: la app no',
  'incluye fotos ni textos de terceros. Las instrucciones, los mapas musculares y las figuras de',
  'movimiento son contenido propio de Serix.',
  '',
)

writeFileSync('public/licenses.txt', parts.join('\n'))
console.log(`licenses.txt: ${packages.length} paquetes + catálogo de ejercicios`)
