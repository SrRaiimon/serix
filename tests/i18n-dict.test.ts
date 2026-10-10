import assert from 'node:assert/strict'
import { test } from 'node:test'
import fr from '../src/i18n/fr.json'
import pt from '../src/i18n/pt.json'
import { installDict, locale, plural, setLang, systemLang, t } from '../src/lib/i18n'
import { muscleLabel } from '../src/lib/labels'
// @ts-expect-error: script de Node sin tipos
import { missing } from '../scripts/i18n/missing.mjs'

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
