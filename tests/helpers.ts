import type { Session, SessionExercise, SetEntry } from '../src/lib/store'

// Constructores de datos de prueba: solo hay que indicar lo que importa en cada test.

export const DAY = 86400000
/** Fecha fija para que los tests no dependan del día en que se ejecutan. */
export const T0 = Date.UTC(2026, 0, 5, 10)

let n = 0
const id = () => `t${++n}`

export function set(weight: number, reps: number, extra: Partial<SetEntry> = {}): SetEntry {
  return { id: id(), weight, reps, done: true, warmup: false, ...extra }
}

export function exercise(exerciseId: string, sets: SetEntry[], extra: Partial<SessionExercise> = {}): SessionExercise {
  return { id: id(), exerciseId, name: exerciseId, muscle: 'chest', rest: 90, repsMin: 8, repsMax: 12, sets, ...extra }
}

export function session(day: number, exercises: SessionExercise[], extra: Partial<Session> = {}): Session {
  const start = T0 + day * DAY
  return { id: id(), name: 'Prueba', start, end: start + 3600000, notes: '', exercises, ...extra }
}

/** IndexedDB mínimo en memoria: el store guarda en segundo plano y en Node no existe. */
export function fakeIndexedDB() {
  const data = new Map<string, unknown>()
  const request = <T>(result: T) => {
    const req: { result: T; onsuccess?: () => void; onerror?: () => void } = { result }
    queueMicrotask(() => req.onsuccess?.())
    return req
  }
  const db = {
    createObjectStore: () => {},
    transaction: () => {
      const tx: { objectStore: () => unknown; oncomplete?: () => void } = {
        objectStore: () => ({
          get: (key: string) => request(data.get(key)),
          put: (value: unknown, key: string) => {
            data.set(key, structuredClone(value))
            queueMicrotask(() => tx.oncomplete?.())
          },
        }),
      }
      return tx
    },
  }
  ;(globalThis as { indexedDB?: unknown }).indexedDB = { open: () => request(db) }
  return data
}
