import { useSyncExternalStore } from 'react'
import { getData } from './store'

// Temporizador de descanso. Se calcula con la hora de fin, así que sigue siendo correcto aunque el
// navegador congele la página en segundo plano. Al terminar: pitido y vibración (si hay soporte).

interface TimerState {
  endAt?: number
  total: number
}

let state: TimerState = { total: 0 }
const listeners = new Set<() => void>()
let finishTimeout: ReturnType<typeof setTimeout> | undefined
let audio: AudioContext | undefined

function set(next: TimerState) {
  state = next
  listeners.forEach((l) => l())
}

export function useRestTimer(): TimerState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

/** Debe llamarse desde un gesto del usuario (iOS solo permite audio tras interacción). */
export function unlockAudio() {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    /* sin audio */
  }
}

function beep() {
  if (!audio || !getData().settings.restSound) return
  const now = audio.currentTime
  ;[0, 0.25, 0.5].forEach((offset, i) => {
    const osc = audio!.createOscillator()
    const gain = audio!.createGain()
    osc.frequency.value = i === 2 ? 1320 : 880
    gain.gain.setValueAtTime(0.0001, now + offset)
    gain.gain.exponentialRampToValueAtTime(0.4, now + offset + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18)
    osc.connect(gain).connect(audio!.destination)
    osc.start(now + offset)
    osc.stop(now + offset + 0.2)
  })
}

function finish() {
  set({ total: 0 })
  beep()
  navigator.vibrate?.([200, 100, 200])
}

function schedule() {
  clearTimeout(finishTimeout)
  if (state.endAt) finishTimeout = setTimeout(finish, Math.max(0, state.endAt - Date.now()))
}

export function startRest(seconds: number) {
  if (seconds <= 0) return
  unlockAudio()
  set({ endAt: Date.now() + seconds * 1000, total: seconds * 1000 })
  schedule()
}

export function addRest(seconds: number) {
  if (!state.endAt) return
  const endAt = state.endAt + seconds * 1000
  if (endAt <= Date.now()) return stopRest()
  set({ endAt, total: Math.max(state.total + seconds * 1000, endAt - Date.now()) })
  schedule()
}

export function stopRest() {
  clearTimeout(finishTimeout)
  set({ total: 0 })
}

// Al volver a la app, si el descanso ya terminó mientras estaba en segundo plano, se cierra.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.endAt && state.endAt <= Date.now()) finish()
})
