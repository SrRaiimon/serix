// Stop: si en este turno se han tocado textos de src/ y falta alguna traducción a francés o portugués,
// Claude sigue y la añade antes de terminar (una sola vez por turno, para no entrar en bucle).
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()
const input = JSON.parse(readFileSync(0, 'utf8'))
if (input.stop_hook_active) process.exit(0)

let changed = ''
try { changed = execFileSync('git', ['-C', ROOT, 'status', '--porcelain', '--', 'src'], { encoding: 'utf8' }) } catch { process.exit(0) }
if (!/\.tsx?$/m.test(changed)) process.exit(0)

try {
  execFileSync('node', ['scripts/i18n/missing.mjs'], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe', timeout: 60_000 })
} catch (e) {
  const out = (e.stdout ?? '').trim()
  if (!out) process.exit(0)
  const lines = out.split('\n')
  process.stderr.write(`Serix: faltan traducciones en src/i18n/fr.json y pt.json:\n${lines.slice(0, 20).join('\n')}${lines.length > 21 ? '\n…' : ''}\n`)
  process.exit(2)
}
