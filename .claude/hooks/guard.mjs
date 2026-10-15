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

/** La orden sin lo que va entre comillas: un texto que menciona estas órdenes no es la orden. */
const unquoted = (command) => command.replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, "''")

/** Cadena entre comillas (simples o dobles, con \" escapadas) → su contenido. */
const QUOTED = `('[^']*'|"(?:[^"\\\\]|\\\\.)*")`
const inside = (q) => q.slice(1, -1).replace(/\\(["\\$`])/g, '$1')

/**
 * Lo que se ejecuta de verdad: la orden sin comillas y, además, lo entrecomillado que se pasa a otro
 * intérprete: `bash -c "…"`, `sh -lc '…'`, `bash <<< "…"`, `eval "…"`, `xargs …`.
 */
function executed(command) {
  const passed = new RegExp(String.raw`(?:\b(?:ba|z|da|k)?sh\s+(?:-[a-zA-Z]*\s+)*-[a-zA-Z]*c[a-zA-Z]*|\beval|\bxargs(?:\s+-\S+)*|<<<)\s*` + QUOTED, 'g')
  const inner = [...command.matchAll(passed)].map((m) => inside(m[1]))
  return [unquoted(command), ...inner].join(' ; ')
}

/** Borrado recursivo en cualquier forma: -r, -rf, -Rf, -rfv, -r -f, --recursive… (pero `git rm -r` no borra carpetas). */
function recursiveRm(command) {
  // `rm`, `/bin/rm`, `\rm`, `command rm`…: lo que haya delante de «rm» no importa.
  for (const m of command.matchAll(/(?:^|[;&|(\s/\\])rm((?:\s+-{1,2}[\w-]+)+)/g)) {
    if (/\bgit(?:\s+-C\s+\S+)?\s+$/.test(command.slice(0, m.index + 1))) continue
    const flags = m[1].split(/\s+/).filter(Boolean)
    const short = flags.filter((f) => /^-[^-]/.test(f)).join('')
    const recursive = /[rR]/.test(short) || flags.includes('--recursive')
    // Recursivo ya borra carpetas enteras, con o sin forzar.
    if (recursive) return true
  }
  return false
}

/** Borrados recursivos desde otros lenguajes o escondiendo «rm» en una variable. */
function sneakyRm(command) {
  if (/shutil\.rmtree|rm(?:dir)?Sync\([^)]*recursive|fs(?:\.promises)?\.rm\([^)]*recursive|FileUtils\.rm_r/.test(command)) return true
  return /\b\w+=(['"]?)(?:\S*\/)?rm\1(?:\s|;|$)/.test(command)
}

function forbidden(command) {
  const bare = unquoted(command)
  if (recursiveRm(executed(command)) || sneakyRm(command)) return 'nada de borrados recursivos: borra solo el archivo temporal que hayas creado, nunca una carpeta entera'
  if (/git\s+config\s+(--global|--system)\s+user\.email/.test(bare) && !/--get\b|user\.email\s*$/.test(bare)) return 'el email global de git no se cambia sin preguntar'
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
    if (local !== undefined && local === versionAt('origin/main')) problems.push(`la app cambia pero package.json sigue en ${local}: sube la versión`)
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
  // Solo `git push` como orden (no un mensaje de commit que diga «push»).
  if (/\bgit\s+(?:-C\s+\S+\s+)?push\b/.test(unquoted(command))) {
    const problems = pushProblems()
    if (problems.length) deny(`no se publica todavía: ${problems.join('; ')}`)
  }
} else {
  const file = (input.tool_input?.file_path ?? '').replace(`${ROOT}/`, '')
  if (/^dist\//.test(file)) deny('dist/ lo genera `npm run build`: no se edita a mano')
  if (file === 'package-lock.json') deny('package-lock.json lo escribe npm: no se edita a mano')
}
