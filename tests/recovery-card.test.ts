import './dom-stub'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { RecoveryCard } from '../src/components/Recovery'
import { CatalogContext } from '../src/components/ui'
import { Catalog } from '../src/lib/catalog'
import { exercise, session, set } from './helpers'

const render = (sessions: ReturnType<typeof session>[]) =>
  renderToStaticMarkup(createElement(CatalogContext.Provider, { value: new Catalog([]) }, createElement(RecoveryCard, { sessions })))

const hours = (h: number) => ({ start: Date.now() + h * 3600000, end: Date.now() + h * 3600000 + 1800000 })

test('RecoveryCard: tres o más grupos recuperándose van en una fila con el tramo de horas, su barra y los nombres debajo', () => {
  const s = { ...session(0, [
    exercise('Barbell_Bench_Press_-_Medium_Grip', [set(60, 8), set(60, 8), set(60, 8), set(60, 8)], { muscle: 'pectorals' }),
    exercise('Bent_Over_Barbell_Row', [set(60, 8), set(60, 8), set(60, 8), set(60, 8)], { muscle: 'lats' }),
    exercise('Barbell_Shoulder_Press', [set(40, 8), set(40, 8), set(40, 8), set(40, 8)], { muscle: 'delts' }),
  ]), ...hours(-1) }
  const html = render([s])
  assert.match(html, /3 grupos/)
  assert.match(html, /~\d+(–\d+)? h/)
  assert.match(html, /role="meter"/)
  assert.match(html, /Recuperándose: /)
  // No salen tres filas «Recuperándose · ~N h» sueltas.
  assert.equal((html.match(/recovery-row recovering/g) ?? []).length, 1)
})

test('RecoveryCard: los gemelos salen en la lista solo si se han trabajado', () => {
  const none = render([])
  assert.ok(!/Gemelos/.test(none))
  const calves = { ...session(0, [exercise('Standing_Calf_Raises', [set(40, 12), set(40, 12), set(40, 12)], { muscle: 'calves' })]), ...hours(-1) }
  assert.match(render([calves]), /Gemelos/)
})
