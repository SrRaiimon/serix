import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

// El área táctil de 44 px es un ::after invisible (styles.css): si alguien la toca o un contenedor con overflow la
// recorta, los chips y los iconos vuelven a quedarse en 36 px sin que se note a la vista.
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')

test('zonas táctiles: la regla ::after mantiene 44 × 44 px en los botones pequeños', () => {
  const rule = css.match(/:where\(([^)]*)\)::after \{([^}]*)\}/)
  assert.ok(rule, 'falta la regla :where(...)::after')
  const [, selectors, body] = rule
  for (const s of ['.icon-btn', '.chip', '.btn.small', '.set-check', '.segmented button', '.rpe-help', '.set-label']) {
    assert.ok(selectors.split(',').map((x) => x.trim()).includes(s), `${s} sin área de 44 px`)
  }
  assert.match(body, /width:\s*max\(100%,\s*44px\)/)
  assert.match(body, /height:\s*max\(100%,\s*44px\)/)
})

test('zonas táctiles: la fila de chips de antes de empezar deja sitio vertical al ::after', () => {
  // Con overflow-x, el ::after se recortaba a la altura del chip (36): hacen falta 4 px arriba y abajo.
  const rule = css.match(/\.workout-pre \{([^}]*)\}/)?.[1] ?? ''
  assert.match(rule, /overflow-x:\s*auto/)
  assert.match(rule, /padding:\s*4px 16px/)
  assert.match(css, /\.workout-pre \.chip \{[^}]*min-height:\s*36px/)
})
