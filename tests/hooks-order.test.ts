import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

// Sin linter de hooks en el proyecto: en un componente, un hook después de un `if (…) return` rompe React cuando la
// condición cambia entre dos renders («Rendered fewer hooks than expected»). Pasó con el resumen al guardar como
// rutina (0.1.9) y con Progreso › Calorías y peso. Revisa cada función de primer nivel con nombre en mayúscula.
const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith('.tsx') ? [join(dir, e.name)] : [])

test('componentes: ningún hook después de una salida anticipada', () => {
  const bad: string[] = []
  for (const file of files('src')) {
    let component = ''
    let returned = 0
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      const start = line.match(/^(export )?function ([A-Z]\w*)\(/)
      if (start) { component = start[2]; returned = 0; return }
      if (/^}/.test(line)) { component = ''; return }
      if (!component) return
      if (/^ {2}if \(.*\) return\b/.test(line)) returned = i + 1
      if (returned && /^ {2}(const|let) [^=]+= use[A-Z]\w*\(|^ {2}use[A-Z]\w*\(/.test(line)) bad.push(`${file}:${i + 1} (${component}, return en la línea ${returned})`)
    })
  }
  assert.deepEqual(bad, [])
})
