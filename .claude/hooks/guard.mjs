// PreToolUse (Bash, Edit, Write): las reglas del proyecto que se olvidan fácil, comprobadas antes de que pasen.
// Salir con código 2 bloquea la herramienta y el texto de stderr le llega a Claude.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const EMAIL = '49187817+SrRaiimon@users.noreply.github.com'
const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()
/** Lo que es la app: si un push lo cambia, toca versión nueva y novedades. */
const APP = /^(src|public)\/|^(index\.html|vite\.config\.ts|package\.json)$/

const input = JSON.parse(readFileSync(0, 'utf8'))
const deny = (why) => { process.stderr.write(`Serix: ${why}\n`); process.exit(2) }
const git = (...args) => execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' }).trim()
const versionAt = (ref) => { try { return JSON.parse(git('show', `${ref}:package.json`)).version } catch { return undefined } }

function forbidden(command) {
  if (/\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r|-r\s+-f|-f\s+-r)\b/.test(command)) return 'nada de rm -rf: borra solo el archivo temporal que hayas creado, nunca una carpeta entera'
  if (/git\s+config\s+(--global|--system)\s+user\.email/.test(command) && !/--get\b|user\.email\s*$/.test(command)) return 'el email global de git no se cambia sin preguntar'
  return undefined
}

function pushProblems() {
  let pending
  try { pending = git('log', '--format=%ae', 'origin/main..HEAD') } catch { return [] }
  if (!pending) return []
  const problems = []
  const wrong = [...new Set(pending.split('\n').filter((x) => x !== EMAIL))]
  if (wrong.length) problems.push(`hay commits con otro email (${wrong.join(', ')}); el del repo es ${EMAIL}`)
  // Los cambios que no tocan la app (CLAUDE.md, .claude/, scripts, tests) no necesitan versión nueva.
  const changed = git('diff', '--name-only', 'origin/main..HEAD').split('\n').filter(Boolean)
  if (changed.some((f) => APP.test(f))) {
    const local = versionAt('HEAD')
    if (local === versionAt('origin/main')) problems.push(`la app cambia pero package.json sigue en ${local}: sube la versión`)
    let changelog = ''
    try { changelog = git('show', 'HEAD:src/lib/changelog.ts') } catch { /* sin changelog */ }
    if (!changelog.includes(`version: '${local}'`)) problems.push(`falta la entrada de ${local} en src/lib/changelog.ts`)
  }
  return problems
}

if (input.tool_name === 'Bash') {
  const command = input.tool_input?.command ?? ''
  const why = forbidden(command)
  if (why) deny(why)
  if (/\bgit\b[^|;&]*\bpush\b/.test(command)) {
    const problems = pushProblems()
    if (problems.length) deny(`no se publica todavía: ${problems.join('; ')}`)
  }
} else {
  const file = (input.tool_input?.file_path ?? '').replace(`${ROOT}/`, '')
  if (/^dist\//.test(file)) deny('dist/ lo genera `npm run build`: no se edita a mano')
  if (file === 'package-lock.json') deny('package-lock.json lo escribe npm: no se edita a mano')
}
