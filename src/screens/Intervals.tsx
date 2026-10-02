import { Pause, Play, Plus, Square, Timer } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, NavBar, Overlay, Segmented, useScrollLock, useTick } from '../components/ui'
import { clock, rest } from '../lib/format'
import { plural, t } from '../lib/i18n'
import { buildSegments, DEFAULTS, positionAt, totalSeconds, type IntervalConfig, type IntervalMode, type Segment } from '../lib/intervals'
import { playTone, unlockAudio } from '../lib/timer'
import { speak } from '../lib/voice'
import { focusLabel, WARMUP_FOCUS, type WarmupFocus } from '../lib/warmupRoutine'
import { keepScreenOn } from '../lib/workout'

// Temporizadores de intervalos: Tabata, EMOM y AMRAP (ver lib/intervals.ts).

/** Última configuración usada (mientras la app esté abierta). */
let lastConfig: IntervalConfig = DEFAULTS.tabata

const range = (from: number, to: number, step: number) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step)

function Select({ label, value, options, format, onChange }: { label: string; value: number; options: number[]; format: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label className="list-row">
      <span className="grow">{label}</span>
      <select className="select" value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {options.map((o) => <option key={o} value={o}>{format(o)}</option>)}
      </select>
    </label>
  )
}

export function IntervalScreen({ warmup }: { warmup?: WarmupFocus }) {
  // Desde un entrenamiento se llega con el calentamiento ya elegido (#/timer/warmup/<zona>).
  const [config, setConfigState] = useState<IntervalConfig>(() => (warmup ? { ...DEFAULTS.warmup, focus: warmup } : lastConfig))
  const [running, setRunning] = useState(false)
  const setConfig = (c: IntervalConfig) => {
    lastConfig = c
    setConfigState(c)
  }
  const segments = useMemo(() => buildSegments(config), [config])
  const seconds = (v: number) => (v < 60 ? `${v} s` : rest(v))
  const mode = config.mode

  return (
    <>
      <NavBar showBack title={t('Temporizador', 'Timer')} />
      <div className="screen with-nav">
        <Segmented value={mode} onChange={(m: IntervalMode) => setConfig(DEFAULTS[m])} options={[
          { value: 'warmup', label: t('Calentar', 'Warm-up') },
          { value: 'tabata', label: 'Tabata' }, { value: 'emom', label: 'EMOM' }, { value: 'amrap', label: 'AMRAP' },
        ]} />
        <p className="muted small" style={{ margin: 0 }}>
          {mode === 'warmup'
            ? t('Movilidad y activación antes de entrenar: cada movimiento con su explicación y 5 s para cambiar al siguiente. Sin material.', 'Mobility and activation before training: each move with its explanation and 5 s to switch to the next one. No equipment.')
            : mode === 'tabata'
            ? t('Rondas de trabajo y descanso. El clásico: 20 s a tope y 10 s de descanso, 8 rondas (4 minutos).', 'Rounds of work and rest. The classic: 20 s all-out and 10 s rest, 8 rounds (4 minutes).')
            : mode === 'emom'
              ? t('«Every minute on the minute»: al empezar cada intervalo haces el trabajo y descansas lo que te sobre.', '"Every minute on the minute": at the start of each interval you do the work and rest for whatever time is left.')
              : t('«As many rounds as possible»: todas las rondas que puedas en el tiempo fijado. Ve sumándolas con el botón.', '"As many rounds as possible": as many rounds as you can in the set time. Count them with the button.')}
        </p>
        <div className="list">
          {mode === 'warmup' && (
            <>
              <label className="list-row">
                <span className="grow">{t('Para', 'For')}</span>
                <select className="select" value={config.focus ?? 'full'} onChange={(e) => setConfig({ ...config, focus: e.target.value as WarmupFocus })}>
                  {WARMUP_FOCUS.map((f) => <option key={f} value={f}>{focusLabel(f)}</option>)}
                </select>
              </label>
              <Select label={t('Cada movimiento', 'Each move')} value={config.work} options={[30, 45, 60]} format={seconds} onChange={(work) => setConfig({ ...config, work })} />
            </>
          )}
          {mode === 'tabata' && (
            <>
              <Select label={t('Trabajo', 'Work')} value={config.work} options={range(5, 300, 5)} format={seconds} onChange={(work) => setConfig({ ...config, work })} />
              <Select label={t('Descanso', 'Rest')} value={config.rest} options={range(0, 300, 5)} format={seconds} onChange={(r) => setConfig({ ...config, rest: r })} />
              <Select label={t('Rondas', 'Rounds')} value={config.rounds} options={range(1, 50, 1)} format={String} onChange={(rounds) => setConfig({ ...config, rounds })} />
            </>
          )}
          {mode === 'emom' && (
            <>
              <Select label={t('Cada', 'Every')} value={config.work} options={range(15, 300, 15)} format={seconds} onChange={(work) => setConfig({ ...config, work })} />
              <Select label={t('Intervalos', 'Intervals')} value={config.rounds} options={range(1, 60, 1)} format={String} onChange={(rounds) => setConfig({ ...config, rounds })} />
            </>
          )}
          {mode === 'amrap' && (
            <Select label={t('Duración', 'Duration')} value={config.work / 60} options={range(1, 60, 1)} format={(v) => `${v} min`} onChange={(m) => setConfig({ ...config, work: m * 60 })} />
          )}
          {mode !== 'warmup' && <Select label={t('Preparación', 'Get ready')} value={config.prep} options={range(0, 30, 5)} format={(v) => (v ? `${v} s` : t('Ninguna', 'None'))} onChange={(prep) => setConfig({ ...config, prep })} />}
        </div>
        <Card>
          <span className="row" style={{ gap: 8 }}><Timer size={18} /> {t('Total', 'Total')}: <strong>{clock(totalSeconds(segments))}</strong></span>
        </Card>
        <button className="btn primary block" onClick={() => {
          unlockAudio()
          setRunning(true)
        }}><Play size={19} fill="currentColor" /> {t('Empezar', 'Start')}</button>
      </div>
      {running && <IntervalRun config={config} segments={segments} onClose={() => setRunning(false)} />}
    </>
  )
}

const phaseName = (s: Segment, mode: IntervalMode) =>
  s.kind === 'prep' ? t('PREPÁRATE', 'GET READY')
    : mode === 'warmup' ? (s.kind === 'rest' ? t('SIGUIENTE', 'NEXT') : s.label ?? '')
      : s.kind === 'rest' ? t('DESCANSO', 'REST') : mode === 'amrap' ? 'AMRAP' : t('TRABAJO', 'WORK')

function IntervalRun({ config, segments, onClose }: { config: IntervalConfig; segments: Segment[]; onClose: () => void }) {
  useScrollLock()
  const now = useTick(200)
  const [startAt] = useState(() => Date.now())
  const [paused, setPaused] = useState<{ at: number } | undefined>()
  const [pausedTotal, setPausedTotal] = useState(0)
  const [amrapRounds, setAmrapRounds] = useState(0)
  const elapsed = (paused?.at ?? now) - startAt - pausedTotal
  const pos = positionAt(segments, elapsed)
  const work = segments.filter((s) => s.kind === 'work').length
  const lastIndex = useRef(-1)
  const lastSecond = useRef(-1)
  const finished = useRef(false)

  // Pantalla encendida mientras dure.
  useEffect(() => {
    void keepScreenOn(true)
    return () => void keepScreenOn(false)
  }, [])

  // Avisos: al cambiar de tramo (tono, vibración y voz), en los 3 últimos segundos y al terminar.
  useEffect(() => {
    if (paused) return
    if (pos.done) {
      if (!finished.current) {
        finished.current = true
        playTone('end')
        navigator.vibrate?.([300, 120, 300])
        speak(config.mode === 'amrap' ? `${t('Terminado', 'Done')}. ${plural(amrapRounds, ['ronda', 'rondas'], ['round', 'rounds'])}` : t('Terminado', 'Done'))
      }
      return
    }
    if (pos.index !== lastIndex.current) {
      if (lastIndex.current >= 0 || pos.segment.kind !== 'prep') {
        playTone('go')
        navigator.vibrate?.(150)
      }
      const s = pos.segment
      speak(config.mode === 'warmup' ? (s.kind === 'work' ? s.label ?? '' : `${t('Siguiente', 'Next')}: ${s.label ?? ''}`)
        : s.kind === 'prep' ? t('Prepárate', 'Get ready')
        : s.kind === 'rest' ? t('Descanso', 'Rest')
          : config.mode === 'emom' ? t(`Minuto ${s.round}`, `Interval ${s.round}`)
            : config.mode === 'amrap' ? t('Adelante', 'Go')
              : t(`Ronda ${s.round}`, `Round ${s.round}`))
      lastIndex.current = pos.index
      lastSecond.current = -1
    }
    const second = Math.ceil(pos.remaining)
    if (second !== lastSecond.current) {
      if (second <= 3 && second >= 1 && pos.segment.seconds > 4) playTone('tick')
      lastSecond.current = second
    }
  })

  const r = 46
  const c = 2 * Math.PI * r
  const progress = pos.segment.seconds ? pos.remaining / pos.segment.seconds : 0
  const color = pos.segment.kind === 'rest' ? 'var(--green)' : pos.segment.kind === 'prep' ? '#f5a300' : 'var(--accent)'
  const toggle = () => {
    if (paused) {
      setPausedTotal(pausedTotal + Date.now() - paused.at)
      setPaused(undefined)
    } else setPaused({ at: Date.now() })
  }

  return (
    <Overlay>
      <div className="rest-full interval-run" role="timer" aria-label={`${phaseName(pos.segment, config.mode)}: ${Math.ceil(pos.remaining)} s`}>
        <span className="interval-phase" style={{ color }}>{pos.done ? t('¡TERMINADO!', 'DONE!') : phaseName(pos.segment, config.mode)}</span>
        <div className="rest-full-ring">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r={r} stroke="#1f2126" strokeWidth="4" fill="none" />
            <circle cx="50" cy="50" r={r} stroke={color} strokeWidth="4" fill="none" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - progress)} transform="rotate(-90 50 50)" />
          </svg>
          <div className="rest-full-center">
            <span className="rest-full-label">
              {config.mode === 'warmup' ? (pos.segment.kind === 'work' ? t(`${pos.segment.round} de ${work}`, `${pos.segment.round} of ${work}`) : pos.segment.label ?? '')
                : config.mode === 'amrap' ? plural(amrapRounds, ['ronda', 'rondas'], ['round', 'rounds'])
                : pos.segment.round > 0 ? (config.mode === 'emom' ? t(`Minuto ${pos.segment.round} de ${work}`, `Interval ${pos.segment.round} of ${work}`) : t(`Ronda ${pos.segment.round} de ${work}`, `Round ${pos.segment.round} of ${work}`))
                  : ''}
            </span>
            <span className={`rest-full-time ${pos.remaining <= 3 && !pos.done ? 'last' : ''}`}>{clock(Math.ceil(pos.remaining))}</span>
            <span className="rest-full-label">{t('Total', 'Total')} {clock(Math.ceil(Math.max(0, pos.totalRemaining)))}</span>
          </div>
        </div>
        {config.mode === 'warmup' && !pos.done && pos.segment.kind === 'work' && pos.segment.cue && <p className="interval-cue">{pos.segment.cue}</p>}
        <div className="rest-full-actions">
          {pos.done ? (
            <button className="btn primary" style={{ gridColumn: '1 / -1' }} onClick={onClose}>{t('Cerrar', 'Close')}</button>
          ) : (
            <>
              <button className="btn plain" onClick={onClose}><Square size={18} /> {t('Parar', 'Stop')}</button>
              {config.mode === 'amrap'
                ? <button className="btn plain" onClick={() => { setAmrapRounds((n) => n + 1); navigator.vibrate?.(30) }}><Plus size={18} /> {t('Ronda', 'Round')}</button>
                : <span />}
              <button className="btn primary" onClick={toggle}>{paused ? <><Play size={18} fill="currentColor" /> {t('Seguir', 'Resume')}</> : <><Pause size={18} /> {t('Pausa', 'Pause')}</>}</button>
            </>
          )}
        </div>
      </div>
    </Overlay>
  )
}
