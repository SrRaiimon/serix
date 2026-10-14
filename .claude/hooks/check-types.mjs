// PostToolUse (Edit, Write): tras tocar código de src/ o tests/, comprobar tipos (unos 2 s con TypeScript 7).
// Solo habla si hay errores: con código 2, Claude los ve en el momento en vez de al final.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()
const input = JSON.parse(readFileSync(0, 'utf8'))
const file = (input.tool_input?.file_path ?? '').replace(`${ROOT}/`, '')
if (!/^(src|tests)\/.*\.tsx?$/.test(file)) process.exit(0)

const project = file.startsWith('tests/') ? ['-p', 'tests'] : []
try {
  execFileSync('npx', ['tsc', '--noEmit', ...project], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe', timeout: 60_000 })
} catch (e) {
  const out = `${e.stdout ?? ''}${e.stderr ?? ''}`.split('\n').filter((l) => /error/.test(l)).slice(0, 15).join('\n')
  if (!out) process.exit(0) // fallo de la herramienta, no del código: no molestar
  process.stderr.write(`Serix: errores de tipos tras editar ${file}:\n${out}\n`)
  process.exit(2)
}
