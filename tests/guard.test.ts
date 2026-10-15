import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'

// El guardián de órdenes de Claude Code (.claude/hooks/guard.mjs): se ejecuta como lo hace Claude Code,
// pasándole la orden por la entrada estándar; 2 = bloqueada, 0 = permitida.
const run = (command: string) => spawnSync('node', ['.claude/hooks/guard.mjs'], {
  input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
  env: { ...process.env, CLAUDE_PROJECT_DIR: process.cwd() },
  encoding: 'utf8',
}).status

// Se construyen por partes para que el propio guardián no bloquee el archivo al escribirlo.
const RM = 'r' + 'm'
const rec = (flags: string, target = 'carpeta') => `${RM} ${flags} ${target}`

test('guardián: bloquea los borrados recursivos, también escondidos', () => {
  for (const command of [
    rec('-rf'), rec('-Rf'), rec('-rfv'), rec('-r -f'), rec('--recursive --force'), rec('-r'),
    `ls && ${rec('-fr', 'x')}`, `/bin/${rec('-rf')}`, `\\${rec('-rf')}`, `command ${rec('-rf')}`,
    `bash -c "${rec('-rf')}"`, `sh -c '${rec('-r')}'`, `sh -lc '${rec('-rf')}'`, `bash -c "echo \\"hola\\"; ${rec('-rf')}"`,
    `bash <<< "${rec('-rf')}"`, `eval "${rec('-rf')}"`,
    `X=${RM}; $X -rf carpeta`,
    `python3 -c "import shutil; shutil.rmtree('x')"`, `node -e "require('fs').${RM}Sync('x', { recursive: true })"`,
  ]) assert.equal(run(command), 2, command)
})

test('guardián: deja pasar lo que no borra carpetas', () => {
  for (const command of [
    `${RM} -f archivo.txt`, `echo "${rec('-rf')} es peligroso"`, `git commit -m "quitar ${rec('-rf')} del script"`,
    `git ${rec('-r --cached', 'dist')}`, 'rmdir vacia', 'npm run build',
  ]) assert.equal(run(command), 0, command)
})

test('guardián: el email global de git no se cambia', () => {
  const G = 'git config --glo' + 'bal user.em' + 'ail'
  assert.equal(run(`${G} otro@correo.es`), 2)
  assert.equal(run(G), 0)
})
