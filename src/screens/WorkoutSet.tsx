import { Play, StickyNote } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ActionSheet, useTick } from '../components/ui'
import { clock, editable, fromKg, increment, num, parseDecimal, toKg, weight, type Unit } from '../lib/format'
import { t } from '../lib/i18n'
import { getData, useData, withUndo, type SetEntry, type SetKind } from '../lib/store'
import { playTone, unlockAudio } from '../lib/timer'
import { digitsToSeconds, formatDigits, isSetFilled, rpeMeaning, rpeValues, secondsToDigits, setShortText, type Tracking } from '../lib/tracking'
import { suspicious } from '../lib/tracking'
import { PlatesSheet } from './Plates'
import { parseTempo, tempoAt } from '../lib/tempo'

// Entreno · una serie: su fila (peso, repeticiones o tiempo), el esfuerzo (RPE), el tempo y la cuenta atrás.

/**
 * Cierra el teclado del móvil quitando el foco del campo. Solo si el foco está en un campo: con teclado físico
 * o lector, el foco está en el botón de marcar y quitárselo lo mandaba a la página (y el siguiente Tab, a Inicio).
 */
function closeKeyboard() {
  const el = document.activeElement
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.blur()
}

/** Lo que comparten todas las series de un ejercicio (el material, el objetivo, la unidad). */
export interface SetContext {
  /** Ejercicio sin historial: sin columna «Última vez». */
  fresh: boolean
  /** Peso corporal: el peso es el lastre (0 = sin). */
  bodyweight: boolean
  barbell: boolean
  /** Con barra, mancuernas o máquina: una serie sin peso es casi siempre un olvido. */
  needsWeight: boolean
  tracking: Tracking
  unit: Unit
  repsPlaceholder: string
  /** Repeticiones que se apuntan al marcar la serie sin escribirlas (el mínimo del objetivo; 0 = ninguna). */
  defaultReps: number
  timePlaceholder: string
  /** Objetivo de las series por tiempo (s), para la cuenta atrás. */
  targetSeconds: number
  /** Tempo de las repeticiones («3-1-1»), para marcar el ritmo. */
  tempo?: string
  /** Mayor peso apuntado en este ejercicio la última vez (kg), para avisar de un peso imposible. */
  lastMax: number
}

/** La pregunta del esfuerzo (RPE) de una serie. */
export interface SetRpe {
  /** Está abierta en esta serie. */
  open: boolean
  ask: () => void
  done: () => void
  /** RPE elegido (para ajustar el descanso). */
  picked: (rpe: number | undefined) => void
}

export function SetRow({ set, label, previous, current, context, rpe, onChange, onDelete, onCompleted, carryWeight }: {
  set: SetEntry
  label: string
  previous?: SetEntry
  current: boolean
  context: SetContext
  rpe: SetRpe
  onChange: (patch: Partial<SetEntry>) => void
  onDelete: () => void
  onCompleted: () => void
  /** Copia el peso de esta serie a las siguientes que no tienen. */
  carryWeight: () => void
}) {
  const { fresh, bodyweight, barbell, needsWeight, tracking, unit, repsPlaceholder, defaultReps, timePlaceholder, targetSeconds, tempo, lastMax } = context
  const { open: askRpe, ask: onAskRpe, done: onRpeDone, picked: onRpePicked } = rpe
  const simple = useData().settings.simpleMode === true
  const [check, setCheck] = useState<string>()
  const [weightText, setWeightText] = useState(set.weight > 0 ? editable(fromKg(set.weight, unit)) : '')
  const [repsText, setRepsText] = useState(set.reps > 0 ? String(set.reps) : '')
  const [distanceText, setDistanceText] = useState(set.distance ? editable(set.distance) : '')
  const [invalid, setInvalid] = useState(false)
  // «Sí, es correcto» a una serie sin peso: no se vuelve a preguntar en esta serie.
  const zeroOk = useRef(false)
  const [menu, setMenu] = useState(false)
  const [kindMenu, setKindMenu] = useState(false)
  const [plates, setPlates] = useState(false)

  useEffect(() => {
    setWeightText(set.weight > 0 ? editable(fromKg(set.weight, unit)) : '')
    // Solo al cambiar de unidad; mientras se escribe manda el texto.
  }, [unit])

  // Cambios que no vienen del teclado (p. ej. una descarga): si el texto ya no corresponde al peso
  // guardado, se reescribe. Mientras se escribe coinciden y no se toca.
  useEffect(() => {
    setWeightText((text) => Math.abs(toKg(parseDecimal(text) ?? 0, unit) - set.weight) > 1e-6
      ? (set.weight > 0 ? editable(fromKg(set.weight, unit)) : '') : text)
    setRepsText((text) => (Number(text) || 0) === set.reps ? text : (set.reps > 0 ? String(set.reps) : ''))
  }, [set.weight, set.reps])

  const toggle = () => {
    unlockAudio()
    if (set.done) {
      onRpeDone()
      return onChange({ done: false, doneAt: undefined, rpe: undefined })
    }
    if (needsWeight && tracking === 'weight_reps' && set.weight <= 0 && !set.warmup && !zeroOk.current) {
      return setCheck(t('¿Sin peso? Este ejercicio se hace con barra, mancuernas o máquina.', 'No weight? This exercise uses a barbell, dumbbells or a machine.'))
    }
    if (!isSetFilled(set, tracking)) {
      // Un toque basta, como en otras apps: sin escribir nada se apuntan las repeticiones del objetivo
      // (el mínimo, para no subir el peso por error) o el tiempo previsto. Se ven y se pueden corregir.
      const fill: Partial<SetEntry> | undefined = tracking === 'weight_reps' && defaultReps > 0 ? { reps: defaultReps }
        : tracking === 'time' ? { duration: targetSeconds } : undefined
      if (!fill) {
        setInvalid(true)
        navigator.vibrate?.(60)
        return
      }
      if (fill.reps) setRepsText(String(fill.reps))
      const warning = tracking === 'weight_reps' ? suspicious({ ...set, ...fill }, lastMax, unit) : undefined
      if (warning) {
        onChange(fill)
        return setCheck(warning)
      }
      // Se dice qué se ha apuntado, con «Deshacer», para que nada se guarde sin darse cuenta.
      const what = fill.reps ? `${fill.reps} reps${set.weight > 0 ? ` · ${weight(set.weight, unit)}` : ''}` : clock(fill.duration ?? 0)
      closeKeyboard()
      withUndo(t(`Apuntado: ${what}`, `Logged: ${what}`), () => {
        onChange(fill)
        onChange({ done: true, doneAt: Date.now(), ...(set.kind === 'failure' && !set.warmup ? { rpe: 10 } : {}) })
        carryWeight()
      })
      navigator.vibrate?.(30)
      return onCompleted()
    }
    // Un cero de más (800 en vez de 80) estropearía marcas y estadísticas: se pregunta antes.
    const warning = tracking === 'weight_reps' ? suspicious(set, lastMax, unit) : undefined
    if (warning) return setCheck(warning)
    complete()
  }
  const complete = () => {
    closeKeyboard()
    onChange({ done: true, doneAt: Date.now(), ...(set.kind === 'failure' && !set.warmup ? { rpe: 10 } : {}) })
    carryWeight()
    navigator.vibrate?.(30)
    onCompleted()
  }

  const editNote = () => {
    const text = prompt(t('Nota de esta serie (p. ej. «molestia en el hombro», «agarre ancho»):', 'Note for this set (e.g. "shoulder discomfort", "wide grip"):'), set.note ?? '')
    if (text === null) return
    onChange({ note: text.trim().slice(0, 120) || undefined })
  }

  const change = (patch: Partial<SetEntry>) => {
    const next = { ...set, ...patch }
    if (isSetFilled(next, tracking)) setInvalid(false)
    onChange(patch)
  }

  return (
    <>
    <div id={`set-${set.id}`} className={`set-grid set-row ${tracking} ${set.done ? 'done' : ''} ${current ? 'current' : ''} ${fresh ? 'fresh' : ''}`}>
      <button className={`set-label ${set.warmup ? 'warmup' : set.kind ?? ''}`} onClick={() => setMenu(true)}
        // El nombre accesible empieza por lo que se ve («1», «C»): con control por voz se dice «1» (WCAG 2.5.3).
        aria-label={`${label}: ${t('opciones de la serie', 'set options')} (${setKindLabel(set).toLowerCase()})`}>
        {label}{!set.warmup && (set.kind === 'amrap' || set.kind === 'failure') && <sup>{set.kind === 'amrap' ? 'A' : 'F'}</sup>}
      </button>
      {/* Con lastre (dominadas, fondos), «+12,5×10»: es lo añadido a tu peso, como en el resto de la app. */}
      {!fresh && <span className="set-prev">{previous ? `${setShortText(simple ? { ...previous, rpe: undefined } : previous, tracking, unit, bodyweight).replace(' × ', '×')}` : '—'}</span>}
      {tracking === 'weight_reps' && (
        <>
          <input className={`set-input ${weightText.length > 3 ? 'long' : ''}`} inputMode="decimal" placeholder="0" aria-label={t('Peso', 'Weight')} value={weightText}
            onChange={(e) => {
              setWeightText(e.target.value)
              change({ weight: toKg(parseDecimal(e.target.value) ?? 0, unit) })
            }} />
          <input className={`set-input ${invalid ? 'invalid' : ''}`} inputMode="numeric" placeholder={repsPlaceholder} aria-label={t('Repeticiones', 'Reps')} value={repsText}
            onChange={(e) => {
              const clean = e.target.value.replace(/\D/g, '')
              setRepsText(clean)
              change({ reps: Number(clean) || 0 })
            }} />
        </>
      )}
      {tracking === 'distance_time' && (
        <input className={`set-input ${invalid ? 'invalid' : ''}`} inputMode="decimal" placeholder="0" aria-label={t('Kilómetros', 'Kilometres')} value={distanceText}
          onChange={(e) => {
            setDistanceText(e.target.value)
            change({ distance: parseDecimal(e.target.value) ?? 0 })
          }} />
      )}
      {tracking !== 'weight_reps' && (
        <DurationInput key={set.duration ?? 0} seconds={set.duration ?? 0} placeholder={tracking === 'time' ? timePlaceholder : '0:00'} invalid={invalid}
          onChange={(duration) => change({ duration })} />
      )}
      <button className={`set-check ${set.done ? 'done' : ''}`} onClick={toggle} aria-label={set.done ? t('Desmarcar serie', 'Untick set') : t('Marcar serie', 'Tick set')}>
        {set.done
          ? <svg width="28" height="28" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="currentColor" /><path d="M7 12.5l3.2 3.2L17 9" style={{ stroke: 'var(--on-ink)' }} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          : <svg width="28" height="28" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.8" fill="none" /></svg>}
      </button>
      {menu && (
        <ActionSheet onClose={() => setMenu(false)} options={[
          ...(barbell && tracking === 'weight_reps' && set.weight > 0 ? [{ label: t(`Discos para ${weight(set.weight, unit)}`, `Plates for ${weight(set.weight, unit)}`), onSelect: () => setPlates(true) }] : []),
          ...(tracking === 'weight_reps'
            ? (simple ? [] : [{ label: `${t('Tipo', 'Type')}: ${setKindLabel(set).toLowerCase()}`, onSelect: () => setKindMenu(true) }])
            : [{ label: set.warmup ? t('Marcar como serie efectiva', 'Mark as working set') : t('Marcar como calentamiento', 'Mark as warm-up'), onSelect: () => onChange({ warmup: !set.warmup }) }]),
          { label: set.note ? t('Editar la nota', 'Edit the note') : t('Añadir una nota', 'Add a note'), onSelect: editNote },
          { label: t('Eliminar serie', 'Delete set'), destructive: true, onSelect: onDelete },
        ]} />
      )}
      {kindMenu && (
        <ActionSheet title={t('Tipo de serie', 'Set type')} onClose={() => setKindMenu(false)}
          options={setKinds().map((o) => ({
            label: o.label === setKindLabel(set) ? `${o.label} ✓` : o.label,
            onSelect: () => onChange({
              warmup: o.warmup, kind: o.kind,
              // Al fallo es RPE 10; si se quita, el RPE vuelve a ser cosa del usuario.
              ...(o.kind === 'failure' && set.done ? { rpe: 10 } : set.kind === 'failure' ? { rpe: undefined } : {}),
            }),
          }))} />
      )}
      {plates && <PlatesSheet weightKg={set.weight} onClose={() => setPlates(false)} />}
      {check && (
        <ActionSheet title={check} onClose={() => setCheck(undefined)} options={[
          { label: t('Sí, es correcto', 'Yes, it is right'), onSelect: () => {
            // Confirmado «sin peso»: se sigue como si nada (rellenar repeticiones, avisos de peso…).
            if (set.weight <= 0) { zeroOk.current = true; return toggle() }
            complete()
          } },
          { label: t('Corregirlo', 'Fix it'), onSelect: () => setInvalid(true) },
        ]} />
      )}
    </div>
    {invalid && !set.done && (
      <p className="set-invalid-hint" role="alert">
        {tracking === 'weight_reps' && needsWeight && set.weight <= 0 ? t('Escribe el peso que has usado y vuelve a tocar ○.', 'Type the weight you used and tap ○ again.')
          : tracking === 'weight_reps' ? t('Escribe cuántas repeticiones hiciste y vuelve a tocar ○.', 'Type how many reps you did and tap ○ again.')
          : tracking === 'distance_time' ? t('Escribe la distancia o el tiempo y vuelve a tocar ○.', 'Type the distance or the time and tap ○ again.')
            : t('Escribe el tiempo y vuelve a tocar ○.', 'Type the time and tap ○ again.')}
      </p>
    )}
    {current && !set.done && tracking === 'weight_reps' && tempo && <TempoPlayer tempo={tempo} />}
    {current && !set.done && tracking === 'time' && (
      <SetCountdown seconds={set.duration || targetSeconds}
        onStop={(done) => change({ duration: done })}
        onFinish={(total) => { change({ duration: total }); complete() }} />
    )}
    {/* Sin lastre (peso corporal a 0), los botones de ±2,5 kg sobran. */}
    {current && !set.done && tracking === 'weight_reps' && !set.warmup && !(bodyweight && set.weight <= 0) && (
      <div className="weight-steps">
        {[-1, 1].map((sign) => {
          const step = increment(unit)
          const next = Math.max(0, fromKg(set.weight, unit) + sign * step)
          return (
            <button key={sign} className="btn secondary btn-sm" disabled={sign < 0 && set.weight <= 0}
              onClick={() => change({ weight: toKg(Math.round(next / step) * step, unit) })}
              aria-label={sign > 0 ? t(`Subir ${editable(step)} ${unit}`, `Add ${editable(step)} ${unit}`) : t(`Bajar ${editable(step)} ${unit}`, `Remove ${editable(step)} ${unit}`)}>
              {sign > 0 ? '+' : '−'}{editable(step)} {unit}
            </button>
          )
        })}
      </div>
    )}
    {set.note ? <button className="set-note small muted" onClick={() => editNote()}><StickyNote size={13} aria-hidden="true" /> {set.note}</button>
      : previous?.note && !set.done && <span className="set-note small muted"><StickyNote size={13} aria-hidden="true" /> {t(`La última vez: ${previous.note}`, `Last time: ${previous.note}`)}</span>}
    {set.done && !set.warmup && (askRpe || set.rpe !== undefined) && (
      <RpeRow value={set.rpe} open={askRpe} onOpen={onAskRpe}
        onPick={(rpe) => { onChange({ rpe }); onRpeDone(); onRpePicked(rpe) }} />
    )}
    </>
  )
}

const setKinds = (): { label: string; warmup: boolean; kind?: SetKind }[] => [
  { label: t('Normal', 'Normal'), warmup: false },
  { label: t('Calentamiento', 'Warm-up'), warmup: true },
  { label: t('Drop set (bajar peso y seguir)', 'Drop set (lower the weight and keep going)'), warmup: false, kind: 'drop' },
  { label: t('AMRAP (máximas repeticiones)', 'AMRAP (as many reps as possible)'), warmup: false, kind: 'amrap' },
  { label: t('Al fallo', 'To failure'), warmup: false, kind: 'failure' },
]

const setKindLabel = (set: SetEntry) => {
  const kinds = setKinds()
  return (set.warmup ? kinds[1] : kinds.find((o) => o.kind === set.kind) ?? kinds[0]).label
}

/** Lo que significa cada RPE en repeticiones que quedaban («2 más»), para quien no conoce la escala. */
function rirLabel(rpe: number): string {
  const left = 10 - rpe
  if (left === 0) return t('fallo', 'failure')
  if (!Number.isInteger(left)) return `${Math.floor(left)}–${Math.ceil(left)}`
  return String(left)
}

/** Esfuerzo percibido de la serie: selector compacto o, si ya está puesto, una etiqueta para cambiarlo. */
function RpeRow({ value, open, onOpen, onPick }: {
  value?: number
  open: boolean
  onOpen: () => void
  onPick: (rpe: number | undefined) => void
}) {
  // La primera vez (sin ningún RPE apuntado nunca), la explicación ya abierta: el «?» no lo tocaba casi nadie.
  const [help, setHelp] = useState(() => !getData().sessions.some((x) => x.exercises.some((e) => e.sets.some((y) => y.rpe !== undefined))))
  const row = useRef<HTMLDivElement>(null)
  // Al abrirse, a la vista: con los botones en dos filas, quedaban debajo de la barra de descanso (scroll-margin en CSS).
  useEffect(() => {
    if (!open) return
    const el = row.current
    if (!el) return
    // Solo si no se ve entero sobre la barra de descanso (los 110 px de su scroll-margin): si ya se ve, mover la
    // lista bajo el dedo solo estorba.
    const box = el.getBoundingClientRect()
    if (box.top >= 0 && box.bottom <= window.innerHeight - 110) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
  }, [open])
  if (!open) {
    return value === undefined ? null : (
      <button className="rpe-pill" onClick={onOpen}>RPE {num(value)} · {rpeMeaning(value)}</button>
    )
  }
  return (
    <div className="rpe-row" ref={row}>
      <div className="row between">
        <span className="small bold">{t('¿Cuánto te costó?', 'How hard was it?')} <span className="muted">(RPE)</span></span>
        <button className="rpe-help" onClick={() => setHelp(!help)} aria-label={t('Qué es el RPE', 'What is RPE')}>?</button>
      </div>
      <div className="rpe-chips">
        {rpeValues.map((v) => (
          <button key={v} className={`rpe-chip ${value === v ? 'active' : ''}`} aria-label={`RPE ${num(v)}: ${v === 10 ? t('al fallo', 'to failure') : t(`te quedaban ${rirLabel(v)}`, `${rirLabel(v)} left`)}`}
            onClick={() => onPick(value === v ? undefined : v)}><span>{num(v)}</span><small aria-hidden="true">{rirLabel(v)}</small></button>
        ))}
      </div>
      <span className="rpe-scale">{t('Debajo de cada número: cuántas repeticiones más podías hacer.', 'Below each number: how many more reps you could have done.')}</span>
      {help && (
        <span className="small muted">
          {t('Esfuerzo percibido: 10 = no podías hacer ni una más, 9 = te quedaba 1, 8 = te quedaban 2, 7 = te quedaban 3. Es opcional; sirve para saber cuándo subir peso.',
            'Rate of perceived exertion: 10 = you could not do one more, 9 = 1 rep left, 8 = 2 left, 7 = 3 left. It is optional; it helps decide when to add weight.')}
        </span>
      )}
    </div>
  )
}

/** Marca el ritmo de cada repetición con pitidos: uno largo al cambiar de fase y uno corto cada segundo. */
function TempoPlayer({ tempo }: { tempo: string }) {
  const phases = parseTempo(tempo)
  const [start, setStart] = useState<number>()
  const now = useTick(start ? 100 : 60000)
  const at = phases && start ? tempoAt(phases, (now - start) / 1000) : undefined
  const key = at ? `${at.rep}-${at.phase}-${at.second}` : ''
  useEffect(() => {
    if (!at) return
    if (at.second === 0) { playTone('go'); navigator.vibrate?.(40) } else playTone('tick')
  }, [key])
  if (!phases) return null
  const label = { down: t('Baja', 'Lower'), hold: t('Pausa', 'Pause'), up: t('Sube', 'Lift'), top: t('Arriba', 'Top') }
  return (
    <div className="set-countdown">
      {at ? (
        <>
          <strong className="set-countdown-time" aria-live="polite">{label[at.phase]} · {at.left}</strong>
          <span className="small muted">{t(`rep. ${at.rep}`, `rep ${at.rep}`)}</span>
          <button className="btn secondary btn-sm" onClick={() => setStart(undefined)}>{t('Parar', 'Stop')}</button>
        </>
      ) : (
        <button className="btn secondary btn-sm" onClick={() => { unlockAudio(); setStart(Date.now()) }}>
          <Play size={16} fill="currentColor" aria-hidden="true" /> {t(`Marcar tempo ${tempo}`, `Pace tempo ${tempo}`)}
        </button>
      )}
    </div>
  )
}

/**
 * Cuenta atrás de una serie por tiempo (plancha, isométricos…): al acabar suena, vibra y la serie se
 * marca sola. Si se para antes, se apunta el tiempo hecho.
 */
function SetCountdown({ seconds, onStop, onFinish }: { seconds: number; onStop: (done: number) => void; onFinish: (total: number) => void }) {
  const [endAt, setEndAt] = useState<number>()
  const now = useTick(endAt ? 200 : 60000)
  const left = endAt ? Math.max(0, Math.ceil((endAt - now) / 1000)) : seconds
  useEffect(() => {
    if (!endAt || now < endAt) return
    setEndAt(undefined)
    playTone('end')
    navigator.vibrate?.([200, 100, 200])
    onFinish(seconds)
  }, [now, endAt])
  // Últimos 3 segundos: un pitido corto cada segundo.
  useEffect(() => { if (endAt && left > 0 && left <= 3) playTone('tick') }, [left])
  if (seconds <= 0) return null
  return (
    <div className="set-countdown">
      {endAt ? (
        <>
          <strong className="set-countdown-time" aria-live="polite">{clock(left)}</strong>
          <button className="btn secondary btn-sm" onClick={() => { setEndAt(undefined); onStop(seconds - left) }}>{t('Parar', 'Stop')}</button>
        </>
      ) : (
        <button className="btn primary btn-sm" onClick={() => { unlockAudio(); setEndAt(Date.now() + seconds * 1000) }}>
          <Play size={16} fill="currentColor" aria-hidden="true" /> {t(`Empezar ${clock(seconds)}`, `Start ${clock(seconds)}`)}
        </button>
      )}
    </div>
  )
}

function DurationInput({ seconds, placeholder, invalid, onChange }: {
  seconds: number
  placeholder: string
  invalid: boolean
  onChange: (seconds: number) => void
}) {
  const [digits, setDigits] = useState(secondsToDigits(seconds))
  return (
    <input className={`set-input ${invalid ? 'invalid' : ''}`} inputMode="numeric" placeholder={placeholder} aria-label={t('Tiempo', 'Time')}
      value={formatDigits(digits)}
      // Al salir del campo, "0:90" pasa a verse como "1:30".
      onBlur={() => setDigits(secondsToDigits(digitsToSeconds(digits)))}
      onChange={(e) => {
        const next = e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 5)
        setDigits(next)
        onChange(digitsToSeconds(next))
      }} />
  )
}
