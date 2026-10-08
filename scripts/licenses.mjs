// Genera public/licenses.txt con las licencias de lo que se distribuye dentro de la app.
// Se ejecuta en cada build para que siempre coincida con las versiones instaladas.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const packages = ['react', 'react-dom', 'scheduler', 'lucide-react', 'qrcode-generator', 'jsqr', 'immer', '@fontsource-variable/archivo', 'barcode-detector', 'zxing-wasm', 'tesseract.js', 'tesseract.js-core']

// Paquetes que npm instala dentro de otro (versión que pide ese paquete).
const DIRS = { 'tesseract.js-core': 'node_modules/tesseract.js/node_modules/tesseract.js-core' }

// Autoría que el paquete no recoge en su archivo de licencia.
const NOTES = {
  '@fontsource-variable/archivo': 'Tipografía Archivo (Omnibus-Type, https://github.com/Omnibus-Type/Archivo), empaquetada por\n' +
    'Fontsource. Se incluye el archivo latin-wdth-normal.woff2 sin modificar (src/assets/fonts).',
  jsqr: 'jsQR, de Cosmo Wolfe y colaboradores (https://github.com/cozmo/jsQR). Parte del código\n' +
    '(corrección de errores Reed-Solomon) está traducido de ZXing (https://github.com/zxing/zxing),\n' +
    'también con licencia Apache 2.0. Se distribuye sin cambios.',
  'barcode-detector': 'barcode-detector, de Ze-Zheng Wu (https://github.com/Sec-ant/barcode-detector): lector de códigos\n' +
    'de barras para los navegadores que no traen uno. Se distribuye sin cambios.',
  'tesseract.js': 'Tesseract.js, del proyecto naptha y sus colaboradores (https://github.com/naptha/tesseract.js):\n' +
    'lee la tabla nutricional de una foto en el propio móvil. Se distribuye sin cambios (worker.min.js).',
  'tesseract.js-core': 'Tesseract.js-core (https://github.com/naptha/tesseract.js-core): el motor de reconocimiento de texto\n' +
    'Tesseract OCR (https://github.com/tesseract-ocr/tesseract, Google y colaboradores, Apache 2.0) compilado a\n' +
    'WebAssembly. Se incluyen sin cambios las versiones «lstm» del motor.',
  'zxing-wasm': 'zxing-wasm, de Ze-Zheng Wu (https://github.com/Sec-ant/zxing-wasm). Incluye compilado a WebAssembly\n' +
    '(zxing_reader.wasm) ZXing-C++ (https://github.com/zxing-cpp/zxing-cpp), de Axel Waggershauser y\n' +
    'colaboradores, con licencia Apache 2.0 (texto completo en la sección de jsqr). Se distribuye sin cambios.',
}

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
  'Serix — licencias',
  '=================',
  '',
  'Serix (su código y su contenido propios) se distribuye con la licencia PolyForm Noncommercial 1.0.0:',
  'https://polyformproject.org/licenses/noncommercial/1.0.0',
  'Required Notice: Copyright 2026 SrRaiimon (https://github.com/SrRaiimon/serix)',
  'Required Notice: Commercial use of Serix is not permitted. To request a commercial license, open an issue at https://github.com/SrRaiimon/serix/issues',
  'Prohibido cualquier uso comercial sin permiso escrito del autor. Detalles en',
  'https://github.com/SrRaiimon/serix/blob/main/AVISO-LEGAL.md',
  '',
  'A continuación, las licencias del software y los datos de terceros que se distribuyen con la app,',
  'que conservan sus propios términos:',
  '',
]

for (const name of packages) {
  const dir = DIRS[name] ?? join('node_modules', name)
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  parts.push(`--- ${name} ${pkg.version} (${pkg.license}) ---`, '', ...(NOTES[name] ? [NOTES[name], ''] : []), licenseText(dir, pkg), '')
}

parts.push(
  '--- Datos de ejercicios ---',
  'Nombres y clasificación (músculos, material, nivel) tomados de la lista de Free Exercise DB',
  '(https://github.com/yuhonas/free-exercise-db) y traducidos a mano. Son datos de hecho: la app no',
  'incluye fotos ni textos de terceros. Las instrucciones, los mapas musculares y las figuras de',
  'movimiento son contenido propio de Serix.',
  '',
)

parts.push(
  '--- Datos de alimentos (Comidas) ---',
  'Lista básica (public/foods.json): valores de la tabla de composición ANSES-CIQUAL 2020 (Agence nationale',
  'de sécurité sanitaire de l\'alimentation, de l\'environnement et du travail, Francia), https://ciqual.anses.fr,',
  'con la Licence Ouverte / Open Licence 2.0 (https://www.etalab.gouv.fr/licence-ouverte-open-licence/).',
  'Se incluyen 2.713 alimentos (sin comida infantil, aguas, especias ni platos muy locales); los nombres en',
  'español y las raciones orientativas son propios. Los valores no se han',
  'modificado; cuando falta la energía, se calcula con los factores del Reglamento (UE) 1169/2011.',
  '',
  'Productos de supermercado (public/aesan.json): Agencia Española de Seguridad Alimentaria y Nutrición (AESAN),',
  '«Datos de composición de alimentos y bebidas comercializados en España en 2022», datos abiertos en',
  'https://www.aesan.gob.es/datos-abiertos/alimentos-y-bebidas, actualizados el 29/09/2026. Reutilizados según el',
  'aviso legal de la AESAN (usos comerciales y no comerciales, citando la fuente y la fecha de actualización y sin',
  'desnaturalizar su contenido). Los datos los recogió Kantar Worldpanel de las etiquetas en 2022 y pueden haber',
  'cambiado. Los valores nutricionales no se han modificado; los nombres se pasan a minúsculas, sin la marca al',
  'principio y sin restos de la codificación interna («(SC)», palabras repetidas); en los 500 más vendidos, el',
  'nombre se ha revisado a mano y se añade una ración orientativa propia. Su mención no implica',
  'recomendación ni respaldo de la AESAN.',
  '',
  'Productos con código de barras: se consultan en Open Food Facts (https://world.openfoodfacts.org) al',
  'escanearlos. Contiene datos de Open Food Facts, disponibles con la Open Database License (ODbL 1.0,',
  'https://opendatacommons.org/licenses/odbl/1-0/); el contenido de cada producto, con la Database Contents',
  'License (https://opendatacommons.org/licenses/dbcl/1-0/).',
  '',
)

parts.push(
  '--- Datos de reconocimiento de texto (lector de etiquetas) ---',
  'spa.traineddata (modelo LSTM de español, versión «best» en enteros) del paquete @tesseract.js-data/spa 1.0.0',
  '(https://github.com/naptha/tessdata, licencia MIT según su package.json, de Balearica y jeromewu). El modelo',
  'procede de tessdata_best de Tesseract OCR (https://github.com/tesseract-ocr/tessdata_best), de Google y',
  'colaboradores, con licencia Apache 2.0 (texto completo en la sección de jsqr). Se distribuye sin cambios.',
  '',
)

writeFileSync('public/licenses.txt', parts.join('\n'))
console.log(`licenses.txt: ${packages.length} paquetes + catálogo de ejercicios + datos de alimentos`)
