import assert from 'node:assert/strict'
import { test } from 'node:test'
import { crc32, readZip, writeZip } from '../src/lib/zip'

test('CRC-32 de referencia', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926)
})

test('zip: ida y vuelta con nombres UTF-8 y binarios', () => {
  const entries = [
    { name: 'fotos/2026-01-05-front.jpg', data: new Uint8Array([0xff, 0xd8, 0xff, 0, 1, 2, 3]) },
    { name: 'índice.json', data: new TextEncoder().encode('{"ok":true}') },
    { name: 'vacío.txt', data: new Uint8Array() },
  ]
  const back = readZip(writeZip(entries))
  assert.deepEqual(back.map((e) => e.name), entries.map((e) => e.name))
  back.forEach((e, i) => assert.deepEqual([...e.data], [...entries[i].data]))
})

test('zip dañado o ajeno', () => {
  const zip = writeZip([{ name: 'a.txt', data: new TextEncoder().encode('hola') }])
  const broken = zip.slice()
  broken[30 + 5] ^= 0xff // un byte del contenido: no cuadra el CRC
  assert.throws(() => readZip(broken))
  assert.throws(() => readZip(new TextEncoder().encode('no es un zip')))
})
