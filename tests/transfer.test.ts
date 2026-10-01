import assert from 'node:assert/strict'
import { test } from 'node:test'
import jsQR from 'jsqr'
import qrcode from 'qrcode-generator'
import { parseBackup } from '../src/lib/backup'
import { defaultSettings, type AppData } from '../src/lib/store'
import { addFrame, assemble, CHUNK, emptyReceived, encodeTransfer, isComplete, parseFrame } from '../src/lib/transfer'
import { exercise, session, set } from './helpers'

const EXERCISES = ['Barbell_Squat', 'Barbell_Bench_Press_-_Medium_Grip', 'Barbell_Deadlift', 'Pullups', 'Dumbbell_Shoulder_Press', 'Plank']

/** Un año entrenando 3 días por semana: 156 sesiones de 6 ejercicios con 4 series. */
function yearOfData(): AppData {
  const sessions = Array.from({ length: 156 }, (_, i) => session(i * 2.3, EXERCISES.map((id, k) =>
    exercise(id, Array.from({ length: 4 }, (_, j) => set(40 + k * 10 + (i % 10) * 2.5, 12 - j, { doneAt: Date.UTC(2026, 0, 1) + i * 86400000 + j * 120000, ...(j === 3 ? { rpe: 9 } : {}) })),
      { name: `Ejercicio ${id}` }))))
  return {
    version: 1,
    routines: [{ id: 'r', name: 'Full body', notes: '', order: 0, createdAt: Date.UTC(2026, 0, 1), exercises: [] }],
    sessions,
    measurements: [{ id: 'm', date: Date.UTC(2026, 0, 1), weight: 80 }],
    exerciseNotes: { Barbell_Squat: 'Barra baja' }, friends: [],
    settings: { ...defaultSettings, onboarded: true, name: 'Ana' },
  }
}

/** Lo que importaría el otro móvil, sin los identificadores que se regeneran. */
const comparable = (d: AppData) => JSON.parse(JSON.stringify({
  ...d,
  sessions: d.sessions.map((s) => ({ ...s, exercises: s.exercises.map((e) => ({ ...e, id: '', sets: e.sets.map((x) => ({ ...x, id: '' })) })) })),
  measurements: d.measurements.map((m) => ({ ...m, id: '' })),
}))

test('un año de datos cabe en pocos códigos y llega igual en cualquier orden', async () => {
  const data = yearOfData()
  const frames = await encodeTransfer(data)
  const backupSize = JSON.stringify(data).length
  console.log(`  ${data.sessions.length} sesiones: copia ${Math.round(backupSize / 1024)} KB → ${frames.length} códigos QR de ${CHUNK} caracteres`)
  assert.ok(frames.length <= 40, `${frames.length} códigos`)
  assert.ok(frames.every((f) => f.length <= CHUNK + 30))

  // Orden al revés, con repetidos y con un código de otra cosa en medio.
  let state = emptyReceived()
  for (const text of [...frames].reverse().flatMap((f) => [f, f, 'https://example.com'])) {
    const frame = parseFrame(text)
    if (frame) state = addFrame(state, frame)
  }
  assert.ok(isComplete(state))
  const received = await assemble(state)
  assert.deepEqual(comparable(received), comparable(parseBackup(JSON.stringify(data))))
  // Los identificadores se regeneran y no se repiten.
  const ids = received.sessions.flatMap((s) => s.exercises.flatMap((e) => [e.id, ...e.sets.map((x) => x.id)]))
  assert.equal(new Set(ids).size, ids.length)
})

test('un envío nuevo descarta los trozos del anterior', async () => {
  const a = (await encodeTransfer(yearOfData())).map((f) => parseFrame(f)!)
  const b = (await encodeTransfer({ ...yearOfData(), sessions: [] })).map((f) => parseFrame(f)!)
  let state = addFrame(emptyReceived(), a[0])
  state = addFrame(state, a[1])
  for (const f of b) state = addFrame(state, f)
  assert.ok(isComplete(state))
  assert.equal((await assemble(state)).sessions.length, 0)
})

test('códigos que no son de Serix o están mal', () => {
  assert.equal(parseFrame('SX1:z:abcd:3:3:AAAA'), undefined)
  assert.equal(parseFrame('SX1:q:abcd:0:3:AAAA'), undefined)
  assert.equal(parseFrame('hola'), undefined)
  assert.deepEqual(parseFrame('SX1:j:ab12:0:2:Ab-_'), { format: 'j', id: 'ab12', index: 0, total: 2, data: 'Ab-_' })
})

test('sin compresión (navegadores antiguos) también funciona', async () => {
  const g = globalThis as { CompressionStream?: unknown }
  const saved = g.CompressionStream
  g.CompressionStream = undefined
  try {
    const frames = await encodeTransfer({ ...yearOfData(), sessions: yearOfData().sessions.slice(0, 3) })
    assert.ok(frames[0].startsWith('SX1:j:'))
    let state = emptyReceived()
    for (const f of frames) state = addFrame(state, parseFrame(f)!)
    assert.equal((await assemble(state)).sessions.length, 3)
  } finally {
    g.CompressionStream = saved
  }
})

test('los códigos se leen con jsQR aunque sean pequeños (3 px por módulo)', async () => {
  const frames = await encodeTransfer(yearOfData())
  for (const text of [frames[0], frames[frames.length - 1]]) {
    const qr = qrcode(0, 'L')
    qr.addData(text)
    qr.make()
    const n = qr.getModuleCount(), scale = 3, quiet = 4, size = (n + quiet * 2) * scale
    const pixels = new Uint8ClampedArray(size * size * 4).fill(255)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const r = Math.floor(y / scale) - quiet, c = Math.floor(x / scale) - quiet
        if (r >= 0 && c >= 0 && r < n && c < n && qr.isDark(r, c)) pixels.fill(0, (y * size + x) * 4, (y * size + x) * 4 + 3)
      }
    }
    assert.equal(jsQR(pixels, size, size)?.data, text)
  }
})
