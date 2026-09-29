import { useSyncExternalStore } from 'react'

// Navegación por hash: #/pestaña/pantalla/parámetro. El botón atrás del navegador funciona.

export type Tab = 'home' | 'routines' | 'exercises' | 'progress' | 'profile'
export const tabs: Tab[] = ['home', 'routines', 'exercises', 'progress', 'profile']

function current(): string[] {
  const path = location.hash.replace(/^#\/?/, '')
  return path.split('/').filter(Boolean).map(decodeURIComponent)
}

let segments = current()
const listeners = new Set<() => void>()

// Recuerda el desplazamiento de cada pantalla para volver al mismo sitio con "Atrás".
const scrollPositions = new Map<string, number>()
let currentHash = location.hash
window.addEventListener('scroll', () => scrollPositions.set(currentHash, window.scrollY), { passive: true })

window.addEventListener('hashchange', () => {
  currentHash = location.hash
  segments = current()
  listeners.forEach((l) => l())
  const target = scrollPositions.get(currentHash) ?? 0
  requestAnimationFrame(() => window.scrollTo(0, target))
})

export function useRoute(): string[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => segments,
  )
}

export function navigate(...parts: string[]) {
  location.hash = '/' + parts.map(encodeURIComponent).join('/')
}

export function back() {
  if (history.length > 1) history.back()
  else navigate(segments[0] ?? 'home')
}

export function currentTab(route: string[]): Tab {
  return tabs.includes(route[0] as Tab) ? (route[0] as Tab) : 'home'
}
