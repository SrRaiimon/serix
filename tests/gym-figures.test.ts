// Las variantes de gimnasio deben conservar su postura y su material, no solo un dibujo parecido.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { FIGURES, FLOOR } from '../src/lib/figures'
import { fitViewBox, place, poseAt, thumbViewBox, trapBarCenter } from '../src/lib/figureEngine'

const extras = (JSON.parse(readFileSync('scripts/catalog/extra_exercises.json', 'utf8')).exercises as
  { id: string; equipment: string; reference?: { catalogue: string } }[]).filter(e => e.reference?.catalogue === 'openGym')

test('Las variantes en suspensión llevan cintas y el face pull se hace inclinado hacia atrás', () => {
  for (const e of extras.filter(e => e.equipment === 'suspension')) {
    const f = FIGURES[e.id]
    assert.ok(f.props.some(p => p.type === 'strap'), e.id)
    assert.ok(!f.props.some(p => ['dumbbell', 'plate', 'barFront'].includes(p.type)), e.id)
  }
  const f = FIGURES.Suspender_Face_Pull
  for (const p of f.frames) assert.ok(p.torso < -5)
  const pull = place(f, f.frames[0])
  assert.ok(pull.shoulder[0] < pull.hip[0])
  const push = FIGURES.Suspension_Triceps_Extension
  assert.ok(push.props[0].point![0] < place(push, push.frames[0]).shoulder[0])
})

test('El multipower tiene guías y la landmine se ancla al suelo, incluso de rodillas', () => {
  for (const e of extras.filter(e => ['smith', 'landmine'].includes(e.equipment))) {
    const type = e.equipment === 'smith' ? 'smith' : 'landmine'
    const prop = FIGURES[e.id].props.find(p => p.type === type)
    assert.ok(prop, e.id)
    if (type === 'landmine') assert.ok(Math.abs(prop.point![1] - FLOOR) <= 5, e.id)
    else assert.ok(prop.span![1] > prop.span![0], e.id)
  }
  for (const id of ['Landmine_Kneeling_Squeeze_Press', 'Landmine_Half_Kneeling_Shoulders_Press']) {
    const f = FIGURES[id]
    for (const p of f.frames) assert.ok(Math.abs(place(f, p).knee2[1] - FLOOR) < 10, id)
  }
})

test('La barra hexagonal mantiene el asa junto a la mano y cabe en el encuadre', () => {
  for (const e of extras.filter(e => e.equipment === 'trap-bar')) {
    const f = FIGURES[e.id]
    assert.equal(f.props[0].type, 'trapBar', e.id)
    const [x, y, w, h] = fitViewBox(f).split(' ').map(Number)
    for (const t of [0, 0.5, 1]) {
      const j = place(f, poseAt(f, t)), cx = trapBarCenter(j)
      if (f.view === 'side') assert.equal(cx + 25, j.wrist[0])
      assert.ok(cx - 53 >= x && cx + 53 <= x + w, e.id)
      assert.ok(j.wrist[1] - 16 >= y && j.wrist[1] + 16 <= y + h, e.id)
    }
  }
})

test('Las poleas de piernas salen del suelo y el pullover se hace sentado', () => {
  for (const id of ['Cable_Seated_Leg_Extension', 'Cable_Standing_Leg_Curl', 'Cable_Standing_Hip_Flexion']) {
    const prop = FIGURES[id].props.find(p => p.type === 'cable')!
    assert.equal(prop.at, 'ankle')
    assert.ok(prop.point![1] >= FLOOR - 12)
  }
  const f = FIGURES.Cable_Seated_Pullover
  assert.ok(f.props.some(p => p.type === 'seat'))
  for (const p of f.frames) {
    const j = place(f, p)
    assert.ok(Math.abs(j.hip[1] - j.knee[1]) < 2)
    assert.ok(j.ankle[1] > j.knee[1] + 40)
  }
})

test('Las bandas tienen un extremo sujeto y no conservan mancuernas o discos prestados', () => {
  for (const e of extras.filter(e => e.equipment === 'band')) {
    const f = FIGURES[e.id], bands = f.props.filter(p => p.type === 'band')
    assert.ok(bands.length, e.id)
    assert.ok(bands.every(p => p.at && (p.to || p.point)), e.id)
    assert.ok(!f.props.some(p => ['dumbbell', 'plate', 'kettlebell'].includes(p.type)), e.id)
  }
})

test('Las máquinas sentadas y los transportes elevados mantienen los apoyos correctos', () => {
  for (const id of ['Lever_Back_Extension', 'Lever_Pullover', 'Lever_Seated_Good_Morning']) {
    const f = FIGURES[id]
    assert.equal(f.anchor?.joint, 'hip', id)
    assert.ok(f.props.some(p => p.type === 'seat'), id)
  }
  for (const [id, joint] of [['Band_Kneeling_Rear_Kick', 'knee2'], ['Lever_Standing_Hip_Extension', 'ankle2'], ['Lever_Standing_Leg_Raise', 'ankle2']] as const) {
    const f = FIGURES[id], start = place(f, poseAt(f, 0))[joint]
    for (const t of [0.5, 1]) {
      const point = place(f, poseAt(f, t))[joint]
      assert.ok(Math.hypot(point[0] - start[0], point[1] - start[1]) < 1e-8, id)
    }
  }
  for (const id of ['Dumbbell_Overhead_Carry', 'Dumbbell_Overhead_Walking_Lunge']) {
    const f = FIGURES[id]
    for (const t of [0, 0.5, 1]) {
      const j = place(f, poseAt(f, t))
      assert.ok(j.wrist[1] < j.head[1], id)
      assert.ok(j.wrist2[1] < j.head[1], id)
    }
  }
})

test('El giro en suspensión y el paseo con una mancuerna se ven de frente', () => {
  const twist = FIGURES.Suspension_Twist
  assert.equal(twist.view, 'front')
  assert.deepEqual(twist.props.map(p => [p.type, p.at]), [['strap', 'wrist'], ['strap', 'wrist2']])
  // Las manos van de un lado al otro del cuerpo.
  const side = (t: number) => { const j = place(twist, poseAt(twist, t)); return Math.sign(j.wrist[0] - (j.hip[0] + j.hip2[0]) / 2) }
  assert.equal(side(0), -side(1))
  const carry = FIGURES.Dumbbell_Suitcase_Carry
  assert.equal(carry.view, 'front')
  assert.equal(carry.props.filter(p => p.type === 'dumbbell').length, 1)
  for (const t of [0, 0.5, 1]) {
    const j = place(carry, poseAt(carry, t))
    // La mancuerna cuelga junto a la pierna y el otro brazo se abre para equilibrar.
    assert.ok(j.wrist[1] > j.hip[1] - 10)
    assert.ok(j.wrist2[0] < j.shoulder2[0] - 15)
  }
})

test('La tarjeta de la figura va de vertical a 4:3 y la miniatura es cuadrada y no corta el cuerpo', () => {
  for (const [id, f] of Object.entries(FIGURES)) {
    const [, , w, h] = fitViewBox(f).split(' ').map(Number)
    assert.ok(w / h >= 260 / 280 - 1e-3 && w / h <= 4 / 3 + 1e-3, id)
    const j = place(f, poseAt(f, 0.5))
    const [x, y, side, side2] = thumbViewBox(j).split(' ').map(Number)
    assert.equal(side, side2, id)
    for (const p of Object.values(j)) assert.ok(p[0] >= x && p[0] <= x + side && p[1] >= y && p[1] <= y + side, id)
  }
  const bench = fitViewBox(FIGURES['Barbell_Bench_Press_-_Medium_Grip']).split(' ').map(Number)
  assert.ok(bench[2] / bench[3] > 1, 'el press de banca usa una tarjeta apaisada')
})
