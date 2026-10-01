import { useEffect, useSyncExternalStore } from 'react'
import { readZip, writeZip } from './zip'

// Fotos de progreso. Solo se guardan en este móvil, en una base de datos aparte de la del resto de
// datos: así no engordan la copia de seguridad (que se exporta y se pasa por QR) y se pueden
// exportar por separado en un .zip. Nunca salen del móvil salvo que las exportes tú.

export type Pose = 'front' | 'side' | 'back'
export const POSES: Pose[] = ['front', 'side', 'back']

export interface Photo {
  id: string
  /** Fecha de la foto (la que eliges al guardarla). */
  date: number
  pose: Pose
  /** JPEG reducido a 1600 px como mucho. */
  image: Blob
  /** Miniatura de 360 px para la galería. */
  thumb: Blob
}

const DB_NAME = 'serix-photos'
const STORE = 'photos'
const MAX_SIDE = 1600
const THUMB_SIDE = 360

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = action(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(req ? req.result : undefined)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

// MARK: Estado en memoria (para la interfaz)

let photos: Photo[] | undefined
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

async function reload() {
  const all = (await run<Photo[]>('readonly', (s) => s.getAll())) ?? []
  photos = all.sort((a, b) => b.date - a.date)
  emit()
}

/** Fotos de la más reciente a la más antigua (`undefined` mientras cargan). */
export function usePhotos(): Photo[] | undefined {
  useEffect(() => {
    if (!photos) void reload().catch(() => { photos = []; emit() })
  }, [])
  return useSyncExternalStore((l) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }, () => photos)
}

// MARK: Guardar, borrar

/** Reduce una imagen a JPEG con el lado mayor como mucho de `side` px (respeta la orientación EXIF). */
async function shrink(source: Blob, side: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' })
  const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('jpeg'))), 'image/jpeg', quality))
}

const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('')

export async function addPhoto(file: Blob, date: number, pose: Pose): Promise<void> {
  const image = await shrink(file, MAX_SIDE, 0.85)
  const thumb = await shrink(image, THUMB_SIDE, 0.75)
  const photo: Photo = { id: newId(), date, pose, image, thumb }
  await run('readwrite', (s) => s.put(photo))
  await reload()
}

export async function updatePhoto(id: string, changes: Partial<Pick<Photo, 'date' | 'pose'>>): Promise<void> {
  const photo = photos?.find((p) => p.id === id)
  if (!photo) return
  await run('readwrite', (s) => s.put({ ...photo, ...changes }))
  await reload()
}

export async function deletePhoto(id: string): Promise<void> {
  await run('readwrite', (s) => s.delete(id))
  await reload()
}

export async function deleteAllPhotos(): Promise<void> {
  await run('readwrite', (s) => s.clear())
  await reload()
}

export const photosSize = (list: Photo[]) => list.reduce((n, p) => n + p.image.size + p.thumb.size, 0)

// MARK: Exportar e importar (.zip con las fotos y un índice)

interface IndexEntry {
  file: string
  date: number
  pose: Pose
}

export async function exportPhotos(list: Photo[]): Promise<Blob> {
  const entries = [] as { name: string; data: Uint8Array }[]
  const index: IndexEntry[] = []
  for (const p of [...list].sort((a, b) => a.date - b.date)) {
    const file = `${new Date(p.date).toISOString().slice(0, 10)}-${p.pose}-${p.id.slice(0, 6)}.jpg`
    entries.push({ name: file, data: new Uint8Array(await p.image.arrayBuffer()) })
    index.push({ file, date: p.date, pose: p.pose })
  }
  entries.push({ name: 'serix-fotos.json', data: new TextEncoder().encode(JSON.stringify({ app: 'serix', photos: index }, null, 1)) })
  return new Blob([writeZip(entries) as Uint8Array<ArrayBuffer>], { type: 'application/zip' })
}

/** Importa un .zip exportado por Serix. Devuelve cuántas fotos se añadieron (las repetidas no). */
export async function importPhotos(file: Blob): Promise<number> {
  const entries = readZip(new Uint8Array(await file.arrayBuffer()))
  const indexEntry = entries.find((e) => e.name === 'serix-fotos.json')
  if (!indexEntry) throw new Error('index')
  const raw = JSON.parse(new TextDecoder().decode(indexEntry.data)) as { app?: string; photos?: unknown[] }
  if (raw.app !== 'serix' || !Array.isArray(raw.photos)) throw new Error('index')
  const existing = new Set((photos ?? []).map((p) => `${p.date}|${p.pose}`))
  let added = 0
  for (const item of raw.photos.slice(0, 2000)) {
    const e = item as Partial<IndexEntry>
    const data = entries.find((x) => x.name === e.file)?.data
    const date = e.date, pose = POSES.find((p) => p === e.pose)
    if (!data || typeof date !== 'number' || !Number.isFinite(date) || !pose) continue
    if (existing.has(`${date}|${pose}`)) continue
    // Se vuelve a reducir: así una imagen manipulada no entra tal cual y se rehace la miniatura.
    const image = await shrink(new Blob([data as Uint8Array<ArrayBuffer>], { type: 'image/jpeg' }), MAX_SIDE, 0.85)
    const thumb = await shrink(image, THUMB_SIDE, 0.75)
    await run('readwrite', (s) => s.put({ id: newId(), date, pose, image, thumb } satisfies Photo))
    existing.add(`${date}|${pose}`)
    added++
  }
  await reload()
  return added
}
