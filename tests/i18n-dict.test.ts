import assert from 'node:assert/strict'
import { test } from 'node:test'
import fr from '../src/i18n/fr.json'
import pt from '../src/i18n/pt.json'
import { installDict, locale, plural, setLang, systemLang, t } from '../src/lib/i18n'
import { muscleLabel } from '../src/lib/labels'
// @ts-expect-error: script de Node sin tipos
import { missing } from '../scripts/i18n/missing.mjs'
// @ts-expect-error: script de Node sin tipos
import { apply, plan, similarity } from '../scripts/i18n/rekey.mjs'
// @ts-expect-error: script de Node sin tipos
import { extract } from '../scripts/i18n/extract.mjs'

installDict('fr', fr)
installDict('pt', pt)

function inLang(l: 'fr' | 'pt', fn: () => void) {
  setLang(l)
  try { fn() } finally { setLang('es') }
}

test('idiomas: todos los textos de la app están en francés y portugués, con los mismos huecos', () => {
  const list = (missing as () => { lang: string; es: string; problem: string }[])()
  assert.deepEqual(list.slice(0, 10), [], `${list.length} por traducir (node scripts/i18n/missing.mjs)`)
})

test('idiomas: sin traducciones huérfanas (de textos que ya no existen; node scripts/i18n/rekey.mjs --write)', () => {
  const used = new Set((extract as () => { es: string }[])().map((x) => x.es))
  for (const [lang, dict] of [['fr', fr], ['pt', pt]] as const) {
    const orphans = Object.keys(dict).filter((k) => !used.has(k))
    assert.deepEqual(orphans.slice(0, 5), [], `${lang}: ${orphans.length} huérfanas`)
  }
})

test('idiomas: al retocar un texto, su traducción pasa a la clave nueva; lo que ya no se parece, se quita', () => {
  type Plan = { moves: { from: string; to: string }[]; orphans: string[] }
  const dict = { 'Día de descanso: −{0} kcal': 'Jour de repos : −{0} kcal', 'Revísalo y toca cualquier fila para cambiarla': 'Vérifie-le et touche une ligne pour la modifier.', 'Texto viejo sin nada que ver': 'Vieux texte' }
  const used = new Set(['Día de descanso, −{0} kcal', 'Revísalo y toca cualquier fila para cambiarla.', 'Algo completamente distinto', 'Sin entreno: {0} kcal'])
  const p = (plan as (d: object, u: Set<string>) => Plan)(dict, used)
  assert.deepEqual(p.moves.map((m) => [m.from, m.to]), [['Revísalo y toca cualquier fila para cambiarla', 'Revísalo y toca cualquier fila para cambiarla.'], ['Día de descanso: −{0} kcal', 'Día de descanso, −{0} kcal']])
  assert.deepEqual(p.orphans, ['Texto viejo sin nada que ver'])
  // Con --write se aplica lo muy parecido (≥ 95 %: un punto, una coma).
  assert.deepEqual((apply as (d: object, p: Plan) => object)(dict, p), { 'Día de descanso, −{0} kcal': 'Jour de repos : −{0} kcal', 'Revísalo y toca cualquier fila para cambiarla.': 'Vérifie-le et touche une ligne pour la modifier.' })
  // «Activar» → «Desactivar» se parece (82 %) pero dice lo contrario: se propone, no se escribe.
  const flip = (plan as (d: object, u: Set<string>) => Plan & { moves: { score: number }[] })({ 'Activar avisos de comida': 'x' }, new Set(['Desactivar avisos de comida']))
  assert.equal(Object.keys((apply as (d: object, p: Plan) => object)({ 'Activar avisos de comida': 'x' }, flip))[0], 'Activar avisos de comida')
  // Huecos distintos: otro texto, aunque se parezca.
  assert.equal((plan as (d: object, u: Set<string>) => Plan)({ 'Hace {0} días': 'x' }, new Set(['Hace días'])).moves.length, 0)
  assert.ok((similarity as (a: string, b: string) => number)('abc', 'abc') === 1)
})

test('idiomas: textos fijos, plantillas, plurales y tablas', () => {
  inLang('fr', () => {
    assert.equal(t('Hoy', 'Today'), "Aujourd'hui")
    assert.equal(t(`Día ${3}`, `Day ${3}`), 'Jour 3')
    assert.equal(t(`${4} de ${5} entrenos.`, `${4} of ${5} workouts.`), '4 entraînements sur 5.')
    assert.equal(plural(2, ['serie', 'series'], ['set', 'sets']), '2 séries')
    assert.equal(muscleLabel('pectorals'), 'Pectoraux')
    assert.equal(locale(), 'fr-FR')
    // Lo que no está traducido sale en inglés, no en español.
    assert.equal(t('Texto que no existe', 'Missing text'), 'Missing text')
  })
  inLang('pt', () => {
    assert.equal(t('Entrenamiento', 'Workout'), 'Treino')
    assert.equal(t(`Hace ${5} días`, `${5} days ago`), 'Há 5 dias')
  })
})

test('idiomas: el del sistema', () => {
  const g = globalThis as { navigator: unknown }
  const saved = g.navigator
  try {
    g.navigator = { language: 'fr-FR', languages: ['fr-FR'] }
    assert.equal(systemLang(), 'fr')
    g.navigator = { language: 'pt-BR', languages: ['pt-BR'] }
    assert.equal(systemLang(), 'pt')
    g.navigator = { language: 'de-DE', languages: ['de-DE'] }
    assert.equal(systemLang(), 'en')
  } finally {
    g.navigator = saved
  }
})
