import { uid } from './format'
import { t } from './i18n'

// Superseries y circuitos: ejercicios consecutivos con el mismo groupId. Dos forman una superserie y
// tres o más un circuito. Dentro del grupo no se descansa; el descanso va tras el último de la ronda.

export interface Groupable {
  groupId?: string
}

export interface GroupSlot {
  /** Letra del grupo (A, B…) o undefined si el ejercicio va suelto. */
  letter?: string
  /** Posición dentro del grupo, empezando en 1. */
  position: number
  size: number
  first: boolean
  last: boolean
}

export const groupKind = (size: number) => (size >= 3 ? t('Circuito', 'Circuit') : t('Superserie', 'Superset'))

/** Deja solo grupos válidos: un único tramo seguido y de al menos dos ejercicios. */
export function normalizeGroups(list: Groupable[]): void {
  const seen = new Set<string>()
  let i = 0
  while (i < list.length) {
    const g = list[i].groupId
    if (!g) {
      i++
      continue
    }
    let j = i
    while (j + 1 < list.length && list[j + 1].groupId === g) j++
    if (j === i || seen.has(g)) {
      for (let k = i; k <= j; k++) delete list[k].groupId
    } else {
      seen.add(g)
    }
    i = j + 1
  }
}

export function groupSlots(list: Groupable[]): GroupSlot[] {
  const slots: GroupSlot[] = list.map(() => ({ position: 1, size: 1, first: true, last: true }))
  let letter = 0
  let i = 0
  while (i < list.length) {
    const g = list[i].groupId
    let j = i
    while (g && j + 1 < list.length && list[j + 1].groupId === g) j++
    if (j > i) {
      const l = String.fromCharCode(65 + (letter++ % 26))
      for (let k = i; k <= j; k++) {
        slots[k] = { letter: l, position: k - i + 1, size: j - i + 1, first: k === i, last: k === j }
      }
    }
    i = j + 1
  }
  return slots
}

/** Une el ejercicio i con el siguiente (si el siguiente ya estaba en un grupo, se fusionan). */
export function linkWithNext(list: Groupable[], i: number): void {
  if (i < 0 || i >= list.length - 1) return
  const g = list[i].groupId ?? list[i + 1].groupId ?? uid()
  const other = list[i + 1].groupId
  for (const item of list) if (other && item.groupId === other) item.groupId = g
  list[i].groupId = g
  list[i + 1].groupId = g
  normalizeGroups(list)
}

/** Saca el ejercicio i de su grupo; si estaba en medio, el grupo se parte en dos. */
export function unlink(list: Groupable[], i: number): void {
  const g = list[i]?.groupId
  if (!g) return
  delete list[i].groupId
  const rest = uid()
  for (let k = i + 1; k < list.length && list[k].groupId === g; k++) list[k].groupId = rest
  normalizeGroups(list)
}
