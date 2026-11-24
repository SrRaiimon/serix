import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fromKg, toKg, type Unit } from '../src/lib/format'
import { lowerWeight, progressionStep, raiseAssist, rememberEquipment } from '../src/lib/progression'

// Barrido: todo peso que la app propone, al subir o al bajar, existe en el material y es distinto del de partida.
const EQUIPMENT = [
  { id: 'Hammer_Curls', equipment: 'dumbbell' }, { id: 'Goblet_Squat', equipment: 'kettlebell' },
  { id: 'Barbell_Curl', equipment: 'barbell' }, { id: 'Triceps_Pushdown', equipment: 'cable' },
  { id: 'Barbell_Bench_Press_-_Medium_Grip', equipment: 'barbell' },
]
const use = () => rememberEquipment(EQUIPMENT) // el material es global: otros tests lo cambian
const close = (a: number, b: number) => Math.abs(a - b) < 1e-6
const multiple = (v: number, step: number) => close(Math.round(v / step) * step, v)

const KG = [5, 7.5, 10, 12, 12.5, 14, 15, 17.5, 20, 22.5, 24, 25, 27.5, 30, 40, 60, 100]
const LB = [10, 15, 20, 25, 30, 35, 45, 50, 60, 100, 135, 225]

const dumbbellKg = (v: number) => (v <= 10 ? multiple(v, 1) || multiple(v, 2.5) : multiple(v, 2) || multiple(v, 2.5))

test('mancuernas en kg: subir y bajar caen en pesos que existen', () => {
  use()
  for (const w of KG) {
    const up = w + progressionStep('biceps', 'kg', 'Hammer_Curls', w)
    const down = lowerWeight('Hammer_Curls', w, 'kg')
    assert.ok(up > w && dumbbellKg(up), `${w} sube a ${up}`)
    assert.ok(down < w && dumbbellKg(down), `${w} baja a ${down}`)
  }
})

test('mancuernas en lb: de 5 en 5, arriba y abajo', () => {
  use()
  for (const lb of LB) {
    const w = toKg(lb, 'lb')
    const up = fromKg(w + progressionStep('biceps', 'lb', 'Hammer_Curls', w), 'lb')
    const down = fromKg(lowerWeight('Hammer_Curls', w, 'lb'), 'lb')
    assert.ok(up > lb && multiple(up, 5), `${lb} lb sube a ${up}`)
    assert.ok(down < lb && multiple(down, 5), `${lb} lb baja a ${down}`)
  }
})

test('barra: subir y bajar a saltos de 2,5 kg / 5 lb, también en aislamiento (curl)', () => {
  use()
  for (const id of ['Barbell_Curl', 'Barbell_Bench_Press_-_Medium_Grip']) {
    for (const w of KG.filter((x) => x >= 10 && multiple(x, 2.5))) {
      const up = w + progressionStep(id === 'Barbell_Curl' ? 'biceps' : 'pectorals', 'kg', id, w)
      const down = lowerWeight(id, w, 'kg')
      assert.ok(up > w && multiple(up, 2.5), `${id} ${w} sube a ${up}`)
      assert.ok(down < w && multiple(down, 2.5), `${id} ${w} baja a ${down}`)
    }
    for (const lb of LB.filter((x) => x >= 25)) {
      const w = toKg(lb, 'lb')
      const up = fromKg(w + progressionStep(id === 'Barbell_Curl' ? 'biceps' : 'pectorals', 'lb', id, w), 'lb')
      const down = fromKg(lowerWeight(id, w, 'lb'), 'lb')
      assert.ok(up > lb && multiple(up, 5), `${id} ${lb} lb sube a ${up}`)
      assert.ok(down < lb && multiple(down, 5), `${id} ${lb} lb baja a ${down}`)
    }
  }
})

test('polea: baja de 0,5 kg / 1 lb sin pasarse del 10 % por mucho', () => {
  use()
  for (const [unit, list] of [['kg', KG], ['lb', LB]] as [Unit, number[]][]) {
    for (const v of list) {
      const w = toKg(v, unit)
      const down = fromKg(lowerWeight('Triceps_Pushdown', w, unit), unit)
      assert.ok(down < v && down >= v * 0.85 - 1, `${v} ${unit} baja a ${down}`)
    }
  }
})

test('asistidas: más ayuda siempre sube al menos un escalón', () => {
  use()
  for (const [unit, list] of [['kg', [2.5, 5, 10, 20, 40]], ['lb', [5, 10, 20, 40, 80]]] as [Unit, number[]][]) {
    for (const v of list) assert.ok(fromKg(raiseAssist(toKg(v, unit), unit), unit) > v, `${v} ${unit}`)
  }
})

test('kettlebell: solo pesos que hay, en kg y lb (18 → 16, 35 lb → 26)', () => {
  use()
  assert.equal(lowerWeight('Goblet_Squat', 24, 'kg'), 20)
  assert.equal(lowerWeight('Goblet_Squat', 18, 'kg'), 16)
  assert.equal(lowerWeight('Goblet_Squat', 17.5, 'kg'), 16)
  assert.equal(24 + progressionStep('quads', 'kg', 'Goblet_Squat', 24), 28)
  assert.equal(17.5 + progressionStep('quads', 'kg', 'Goblet_Squat', 17.5), 20)
  assert.ok(close(fromKg(lowerWeight('Goblet_Squat', toKg(35, 'lb'), 'lb'), 'lb'), 26))
  assert.ok(close(fromKg(toKg(35, 'lb') + progressionStep('quads', 'lb', 'Goblet_Squat', toKg(35, 'lb')), 'lb'), 44))
})

test('kettlebell en lb con una pesa guardada en kg: 16 kg es la de 35 lb, no «35,27»', () => {
  use()
  const w = 16
  assert.ok(close(fromKg(lowerWeight('Goblet_Squat', w, 'lb'), 'lb'), 26))
  assert.ok(close(fromKg(w + progressionStep('quads', 'lb', 'Goblet_Squat', w), 'lb'), 44))
})
