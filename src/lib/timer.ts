import { useSyncExternalStore } from 'react'
import { getData } from './store'

// Temporizador de descanso. Se calcula con la hora de fin, así que sigue siendo correcto aunque el
// navegador congele la página en segundo plano. Al terminar: pitido, vibración (si hay soporte) y un
// aviso en pantalla.
//
// El pitido se programa en el reloj de audio al empezar el descanso: así suena a su hora aunque los
// temporizadores de JavaScript vayan con retraso (en Android, incluso con otra app delante). Si al
// terminar no ha sonado (audio suspendido), se toca en ese momento.

interface TimerState {
  endAt?: number
  total: number
  /** Cuándo terminó el último descanso (para el aviso en pantalla). */
  finishedAt?: number
  /** Mostrar la cuenta atrás a pantalla completa. */
  big?: boolean
}

let state: TimerState = { total: 0 }
const listeners = new Set<() => void>()
let finishTimeout: ReturnType<typeof setTimeout> | undefined
let audio: AudioContext | undefined
let scheduled: { nodes: OscillatorNode[]; at: number } | undefined
/** Si se amplió el descanso, los siguientes del entrenamiento se abren ya en grande. */
let preferBig = false

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

const soundOn = () => getData().settings.restSound

/**
 * Debe llamarse desde un gesto del usuario: iOS solo deja sonar audio web tras una interacción.
 * Reactiva el audio si está suspendido o «interrumpido» (iOS, tras una llamada o al volver de otra
 * app) y reproduce un instante de silencio, que en algunas versiones de iOS es lo que lo desbloquea.
 */
export function unlockAudio() {
  try {
    audio ??= new AudioContext()
    if (audio.state !== 'running') void audio.resume()
    const silence = audio.createBufferSource()
    silence.buffer = audio.createBuffer(1, 1, 22050)
    silence.connect(audio.destination)
    silence.start(0)
  } catch {
    /* sin audio */
  }
}

/** Tres tonos cortos (el último más agudo) a partir del instante indicado del reloj de audio. */
function tones(at: number): OscillatorNode[] {
  const ctx = audio!
  return [0, 0.25, 0.5].map((offset, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = i === 2 ? 1320 : 880
    gain.gain.setValueAtTime(0.0001, at + offset)
    gain.gain.exponentialRampToValueAtTime(0.6, at + offset + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + offset + 0.18)
    osc.connect(gain).connect(ctx.destination)
    osc.start(at + offset)
    osc.stop(at + offset + 0.2)
    return osc
  })
}

function cancelBeep() {
  for (const node of scheduled?.nodes ?? []) {
    try {
      node.stop()
    } catch {
      /* ya parado */
    }
  }
  scheduled = undefined
}

function scheduleBeep(seconds: number) {
  cancelBeep()
  if (!audio || !soundOn()) return
  try {
    const at = audio.currentTime + seconds
    scheduled = { nodes: tones(at), at }
  } catch {
    scheduled = undefined
  }
}

/** Toca el pitido ya (prueba desde Perfil o si el programado no llegó a sonar). */
export function playBeep() {
  if (!audio) return
  if (audio.state !== 'running') void audio.resume()
  try {
    tones(audio.currentTime + 0.05)
  } catch {
    /* sin audio */
  }
}

/** Botón «Probar pitido»: se llama desde un toque, así que también desbloquea el audio. */
export function testBeep() {
  unlockAudio()
  playBeep()
}

function finish() {
  // ¿Sonó ya el pitido programado? Si el audio estuvo suspendido, su reloj se paró y no sonó.
  const played = scheduled && audio?.state === 'running' && audio.currentTime >= scheduled.at - 0.05
  if (!played) {
    cancelBeep()
    if (soundOn()) playBeep()
  }
  scheduled = undefined
  set({ total: 0, finishedAt: Date.now(), big: state.big })
  navigator.vibrate?.([200, 100, 200])
}

function schedule() {
  clearTimeout(finishTimeout)
  if (!state.endAt) return
  const ms = Math.max(0, state.endAt - Date.now())
  finishTimeout = setTimeout(finish, ms)
  scheduleBeep(ms / 1000)
}

export function startRest(seconds: number) {
  if (seconds <= 0) return
  unlockAudio()
  set({ endAt: Date.now() + seconds * 1000, total: seconds * 1000, big: preferBig })
  schedule()
}

export function addRest(seconds: number) {
  if (!state.endAt) return
  const endAt = state.endAt + seconds * 1000
  if (endAt <= Date.now()) return stopRest()
  set({ ...state, endAt, total: Math.max(state.total + seconds * 1000, endAt - Date.now()) })
  schedule()
}

export function stopRest() {
  clearTimeout(finishTimeout)
  cancelBeep()
  set({ total: 0 })
}

/** Amplía o reduce la cuenta atrás (y lo recuerda para los siguientes descansos). */
export function setRestBig(on: boolean) {
  preferBig = on
  set({ ...state, big: on })
}

/** Al terminar el entrenamiento se vuelve a la barra normal. */
export function resetRestView() {
  preferBig = false
  stopRest()
}

/** Oculta el aviso de «descanso terminado». */
export function dismissRestDone() {
  if (state.finishedAt) set({ ...state, finishedAt: undefined })
}

// Al volver a la app, si el descanso ya terminó mientras estaba en segundo plano, se cierra.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.endAt && state.endAt <= Date.now()) finish()
})
