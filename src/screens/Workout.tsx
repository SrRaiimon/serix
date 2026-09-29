import { ArrowUpRight, Check, ChevronDown, Ellipsis, Link2, Plus, Timer, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ActionSheet, Overlay, Progress, Thumb, useScrollLock, useTick, useToast } from '../components/ui'
import { groupKind, groupSlots, linkWithNext, normalizeGroups, unlink, type GroupSlot } from '../lib/groups'
import { clock, editable, fromKg, increment, num, parseDecimal, rest, restOptions, toKg, weight, type Unit } from '../lib/format'
import { muscleLabel } from '../lib/labels'
import { lastSets, progressionHint } from '../lib/stats'
import { finishedSessions, update, useData, type Session, type SessionExercise, type SetEntry } from '../lib/store'
import { addRest, dismissRestDone, startRest, stopRest, unlockAudio, useRestTimer } from '../lib/timer'
import { defaultTargetSeconds, digitsToSeconds, formatDigits, isSetFilled, rpeMeaning, rpeValues, secondsToDigits, setShortText, trackingOf, trackingOptions, type Tracking } from '../lib/tracking'
import { addExercises, discardSession, finishSession, keepScreenOn, minimizeWorkout, replaceSessionExercise } from '../lib/workout'
import { AlternativesSheet } from './Alternatives'
import { ExercisePicker, ExerciseSheet } from './Exercises'

function editSession(id: string, fn: (s: Session) => void) {
  update((d) => {
    const s = d.sessions.find((x) => x.id === id)
    if (s) fn(s)
  })
}

export function WorkoutScreen({ session }: { session: Session }) {
  const data = useData()
  const now = useTick()
  const unit = data.settings.unit
  const history = useMemo(() => finishedSessions(data), [data])
  const [picker, setPicker] = useState(false)
  const [confirm, setConfirm] = useState<'finish' | 'discard'>()
  const [detail, setDetail] = useState<string>()
  const [toast, showToast] = useToast()
  // Serie cuyo RPE se está preguntando (la última marcada).
  const [rpeFor, setRpeFor] = useState<string>()
  const askRpe = (setId?: string) => setRpeFor(data.settings.rpe ? setId : undefined)
  const slots = groupSlots(session.exercises)

  // Dentro de una superserie o circuito no se descansa: se pasa directamente al siguiente ejercicio.
  const goToNext = (from: number) => {
    const next = session.exercises[from + 1]
    const slot = slots[from + 1]
    showToast(`Ahora: ${slot.letter}${slot.position} ${next.name}`)
    navigator.vibrate?.(30)
    const pending = next.sets.find((s) => !s.done)
    requestAnimationFrame(() => {
      document.getElementById(pending ? `set-${pending.id}` : `ex-${next.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  // Al cerrar una ronda, si quedan series, se indica por dónde sigue la siguiente.
  const roundEnd = (last: number) => {
    const firstIndex = last - (slots[last].position - 1)
    const first = session.exercises[firstIndex]
    if (first.sets.some((s) => !s.done)) showToast(`Ronda completada · después: ${slots[firstIndex].letter}1 ${first.name}`)
  }

  // Tramos para dibujar: ejercicios sueltos o grupos seguidos.
  const runs: number[][] = []
  session.exercises.forEach((e, i) => {
    const last = runs[runs.length - 1]
    if (e.groupId && last && session.exercises[last[0]].groupId === e.groupId) last.push(i)
    else runs.push([i])
  })
  const block = (i: number) => {
    const e = session.exercises[i]
    return (
      <ExerciseBlock
        key={e.id}
        sessionId={session.id}
        exercise={e}
        index={i}
        total={session.exercises.length}
        slot={slots[i]}
        nextName={slots[i].letter && !slots[i].last ? session.exercises[i + 1].name : undefined}
        unit={unit}
        previous={lastSets(e.exerciseId, history)}
        onInfo={() => setDetail(e.exerciseId)}
        onGroupNext={() => goToNext(i)}
        onRoundEnd={() => roundEnd(i)}
        rpeFor={rpeFor}
        onAskRpe={askRpe}
      />
    )
  }

  const allSets = session.exercises.flatMap((e) => e.sets)
  const done = allSets.filter((s) => s.done).length
  const pending = allSets.length - done

  useScrollLock()
  useEffect(() => {
    void keepScreenOn(true)
    const onVisible = () => document.visibilityState === 'visible' && void keepScreenOn(true)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void keepScreenOn(false)
    }
  }, [])

  return (
    <div className="fullscreen">
      <div className="fullscreen-inner">
        <div className="nav-bar">
          <div className="left">
            <button className="icon-btn" onClick={minimizeWorkout} aria-label="Minimizar"><ChevronDown size={22} /></button>
          </div>
          <div className="title" style={{ fontVariantNumeric: 'tabular-nums' }}>{clock((now - session.start) / 1000)}</div>
          <div className="right">
            <button className="btn small" style={{ background: 'var(--green)', color: '#fff' }} onClick={() => setConfirm('finish')}>Terminar</button>
          </div>
        </div>

        <div className="screen with-nav" style={{ paddingBottom: 140 }}>
          <div className="card">
            <input className="bold" style={{ fontSize: 24 }} value={session.name} onChange={(e) => editSession(session.id, (s) => { s.name = e.target.value })} />
            {allSets.length > 0 && (
              <>
                <span className="small muted">{done} de {allSets.length} series</span>
                <Progress value={done} total={allSets.length} green />
              </>
            )}
          </div>

          {runs.map((run) => {
            if (run.length === 1) return block(run[0])
            const first = slots[run[0]]
            const lastEx = session.exercises[run[run.length - 1]]
            return (
              <div key={session.exercises[run[0]].id} className="group-box">
                <div className="group-head">
                  <Link2 size={15} /> {groupKind(first.size)} {first.letter} · descanso {rest(lastEx.rest)} tras cada ronda
                </div>
                {run.map(block)}
              </div>
            )
          })}

          <button className="btn secondary block" onClick={() => setPicker(true)}><Plus size={20} /> Añadir ejercicio</button>
          <button className="btn danger block" onClick={() => setConfirm('discard')}><Trash2 size={18} /> Descartar entrenamiento</button>
        </div>
      </div>

      <RestBar />

      {confirm === 'finish' && (
        <ActionSheet
          title={done > 0 ? '¿Terminar el entrenamiento?' : 'No has completado ninguna serie'}
          message={done === 0 ? 'Marca las series con ✓ a medida que las hagas.'
            : pending === 1 ? 'La serie sin marcar no se guardará.'
            : pending > 1 ? `Las ${pending} series sin marcar no se guardarán.` : '¡Buen trabajo!'}
          onClose={() => setConfirm(undefined)}
          options={done > 0
            ? [{ label: 'Terminar y guardar', onSelect: () => finishSession(session.id) }]
            : [{ label: 'Descartar entrenamiento', destructive: true, onSelect: () => discardSession(session.id) }]}
        />
      )}
      {confirm === 'discard' && (
        <ActionSheet title="¿Descartar este entrenamiento?" message="Se perderán todas las series registradas." onClose={() => setConfirm(undefined)}
          options={[{ label: 'Descartar', destructive: true, onSelect: () => discardSession(session.id) }]} />
      )}
      {picker && <ExercisePicker onDone={(list) => addExercises(session.id, list)} onClose={() => setPicker(false)} />}
      {detail && <ExerciseSheet exerciseId={detail} onClose={() => setDetail(undefined)} />}
      {toast}
    </div>
  )
}

function ExerciseBlock({ sessionId, exercise, index, total, slot, nextName, unit, previous, onInfo, onGroupNext, onRoundEnd, rpeFor, onAskRpe }: {
  sessionId: string
  exercise: SessionExercise
  index: number
  total: number
  slot: GroupSlot
  /** Siguiente ejercicio del grupo (si no es el último de la ronda). */
  nextName?: string
  unit: Unit
  previous: SetEntry[]
  onInfo: () => void
  onGroupNext: () => void
  onRoundEnd: () => void
  rpeFor?: string
  onAskRpe: (setId?: string) => void
}) {
  const [menu, setMenu] = useState(false)
  const [restMenu, setRestMenu] = useState(false)
  const [trackingMenu, setTrackingMenu] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const edit = (fn: (e: SessionExercise, s: Session) => void) => editSession(sessionId, (s) => {
    const e = s.exercises.find((x) => x.id === exercise.id)
    if (e) fn(e, s)
  })
  // Cambios en la lista (orden, grupos): después se revisa que los grupos sigan siendo válidos.
  const editList = (fn: (list: SessionExercise[], i: number, s: Session) => void) => editSession(sessionId, (s) => {
    const i = s.exercises.findIndex((x) => x.id === exercise.id)
    if (i < 0) return
    fn(s.exercises, i, s)
    normalizeGroups(s.exercises)
  })
  const kind = groupKind(slot.size).toLowerCase()
  const inGroupWithNext = nextName !== undefined
  const tracking = trackingOf(exercise)
  const hasTarget = exercise.repsMax > 0
  const target = exercise.repsMin === exercise.repsMax ? `${exercise.repsMin}` : `${exercise.repsMin}-${exercise.repsMax}`
  const targetSeconds = exercise.targetSeconds ?? defaultTargetSeconds
  const hint = tracking === 'weight_reps' ? progressionHint(previous, exercise.repsMax) : null
  const objective = tracking === 'weight_reps' ? (hasTarget ? ` · Objetivo ${target} reps` : '')
    : tracking === 'time' ? ` · Objetivo ${clock(targetSeconds)}` : ''
  let working = 0

  return (
    <section className="card" id={`ex-${exercise.id}`}>
      <div className="row">
        <button className="row grow" style={{ textAlign: 'left' }} onClick={onInfo}>
          <Thumb exerciseId={exercise.exerciseId} size={44} />
          <span className="grow">
            <span className="bold clamp-2" style={{ color: 'var(--accent)' }}>
              {slot.letter && <span className="group-badge">{slot.letter}{slot.position}</span>}
              {exercise.name}
            </span>
            <span className="small muted">
              {muscleLabel(exercise.muscle)}{objective} · {inGroupWithNext ? `Sin descanso, sigue con ${nextName}` : `Descanso ${rest(exercise.rest)}`}
            </span>
          </span>
        </button>
        <button className="icon-btn" onClick={() => setMenu(true)} aria-label="Opciones del ejercicio"><Ellipsis size={20} /></button>
      </div>

      {hint && (
        <span className="small row" style={{ color: 'var(--green)', gap: 6, alignItems: 'flex-start' }}>
          <ArrowUpRight size={16} style={{ flexShrink: 0 }} />
          {hint === 'reps' ? 'La última vez llegaste al máximo de repeticiones.' : 'La última vez te sobró margen (RPE 7 o menos).'}
          {' '}Prueba con {weight(Math.max(...previous.map((p) => p.weight)) + toKg(increment(unit), unit), unit)}.
        </span>
      )}

      <div className={`set-grid set-head ${tracking}`}>
        <span>SERIE</span><span>ANTERIOR</span>
        {tracking === 'weight_reps' && <><span>{unit.toUpperCase()}</span><span>REPS</span></>}
        {tracking === 'time' && <span>TIEMPO</span>}
        {tracking === 'distance_time' && <><span>KM</span><span>TIEMPO</span></>}
        <span><Check size={14} /></span>
      </div>

      {exercise.sets.map((set) => {
        const label = set.warmup ? 'C' : String(++working)
        const prev = previous.length && !set.warmup ? previous[Math.min(working - 1, previous.length - 1)] : undefined
        return (
          <SetRow key={set.id} set={set} label={label} previous={prev} tracking={tracking}
            repsPlaceholder={hasTarget ? target : '0'} timePlaceholder={clock(targetSeconds)} unit={unit}
            onChange={(patch) => edit((e) => { Object.assign(e.sets.find((s) => s.id === set.id)!, patch) })}
            onDelete={() => edit((e) => { e.sets = e.sets.filter((s) => s.id !== set.id) })}
            askRpe={rpeFor === set.id}
            onAskRpe={() => onAskRpe(set.id)}
            onRpeDone={() => onAskRpe(undefined)}
            onCompleted={() => {
              if (!set.warmup) onAskRpe(set.id)
              if (inGroupWithNext) return onGroupNext()
              startRest(set.warmup ? Math.min(exercise.rest, 60) : exercise.rest)
              if (slot.letter) onRoundEnd()
            }} />
        )
      })}

      <button className="nav-btn" style={{ justifyContent: 'center', fontWeight: 600 }} onClick={() => edit((e) => {
        const last = e.sets[e.sets.length - 1]
        e.sets.push({
          id: crypto.randomUUID(), weight: last?.weight ?? 0, reps: last?.reps ?? 0, done: false, warmup: false,
          ...(last?.duration ? { duration: last.duration } : {}),
          ...(last?.distance ? { distance: last.distance } : {}),
        })
      })}>
        <Plus size={18} /> Añadir serie
      </button>

      {menu && (
        <ActionSheet title={exercise.name} onClose={() => setMenu(false)} options={[
          { label: 'Sustituir ejercicio', onSelect: () => setReplacing(true) },
          ...(index < total - 1 && !inGroupWithNext ? [{
            label: slot.letter ? `Añadir el siguiente ${kind === 'superserie' ? 'a la superserie' : 'al circuito'}` : 'Hacer superserie con el siguiente',
            onSelect: () => editList((list, i) => linkWithNext(list, i)),
          }] : []),
          ...(slot.letter ? [{ label: kind === 'superserie' ? 'Sacar de la superserie' : 'Sacar del circuito', onSelect: () => editList((list, i) => unlink(list, i)) }] : []),
          { label: `Descanso: ${rest(exercise.rest)}`, onSelect: () => setRestMenu(true) },
          { label: `Registrar por: ${trackingOptions.find((o) => o.id === tracking)!.label.toLowerCase()}`, onSelect: () => setTrackingMenu(true) },
          ...(index > 0 ? [{ label: 'Subir', onSelect: () => editList((list, i) => { [list[i - 1], list[i]] = [list[i], list[i - 1]] }) }] : []),
          ...(index < total - 1 ? [{ label: 'Bajar', onSelect: () => editList((list, i) => { [list[i + 1], list[i]] = [list[i], list[i + 1]] }) }] : []),
          { label: 'Quitar ejercicio', destructive: true, onSelect: () => editList((list, i) => { list.splice(i, 1) }) },
        ]} />
      )}
      {restMenu && (
        <ActionSheet title="Descanso entre series" onClose={() => setRestMenu(false)}
          options={restOptions.map((o) => ({ label: rest(o), onSelect: () => edit((e) => { e.rest = o }) }))} />
      )}
      {trackingMenu && (
        <ActionSheet title="¿Cómo registras este ejercicio?" onClose={() => setTrackingMenu(false)}
          options={trackingOptions.map((o) => ({
            label: o.id === tracking ? `${o.label} ✓` : o.label,
            onSelect: () => edit((e) => {
              e.tracking = o.id
              if (o.id === 'time') e.targetSeconds ??= defaultTargetSeconds
            }),
          }))} />
      )}
      {replacing && (
        <AlternativesSheet current={exercise} onClose={() => setReplacing(false)}
          onPick={(picked) => replaceSessionExercise(sessionId, exercise.id, picked)} />
      )}
    </section>
  )
}

function SetRow({ set, label, previous, tracking, repsPlaceholder, timePlaceholder, unit, askRpe, onAskRpe, onRpeDone, onChange, onDelete, onCompleted }: {
  set: SetEntry
  askRpe: boolean
  onAskRpe: () => void
  onRpeDone: () => void
  label: string
  previous?: SetEntry
  tracking: Tracking
  repsPlaceholder: string
  timePlaceholder: string
  unit: Unit
  onChange: (patch: Partial<SetEntry>) => void
  onDelete: () => void
  onCompleted: () => void
}) {
  const [weightText, setWeightText] = useState(set.weight > 0 ? editable(fromKg(set.weight, unit)) : '')
  const [repsText, setRepsText] = useState(set.reps > 0 ? String(set.reps) : '')
  const [distanceText, setDistanceText] = useState(set.distance ? editable(set.distance) : '')
  const [invalid, setInvalid] = useState(false)
  const [menu, setMenu] = useState(false)

  useEffect(() => {
    setWeightText(set.weight > 0 ? editable(fromKg(set.weight, unit)) : '')
    // Solo al cambiar de unidad; mientras se escribe manda el texto.
  }, [unit])

  const toggle = () => {
    unlockAudio()
    if (set.done) {
      onRpeDone()
      return onChange({ done: false, doneAt: undefined, rpe: undefined })
    }
    if (!isSetFilled(set, tracking)) {
      setInvalid(true)
      navigator.vibrate?.(60)
      return
    }
    ;(document.activeElement as HTMLElement | null)?.blur()
    onChange({ done: true, doneAt: Date.now() })
    navigator.vibrate?.(30)
    onCompleted()
  }

  const change = (patch: Partial<SetEntry>) => {
    const next = { ...set, ...patch }
    if (isSetFilled(next, tracking)) setInvalid(false)
    onChange(patch)
  }

  return (
    <>
    <div id={`set-${set.id}`} className={`set-grid set-row ${tracking} ${set.done ? 'done' : ''}`}>
      <button className={`set-label ${set.warmup ? 'warmup' : ''}`} onClick={() => setMenu(true)} aria-label="Opciones de la serie">{label}</button>
      <span className="set-prev">{previous ? setShortText(previous, tracking, unit) : '—'}</span>
      {tracking === 'weight_reps' && (
        <>
          <input className="set-input" inputMode="decimal" placeholder="0" aria-label="Peso" value={weightText}
            onChange={(e) => {
              setWeightText(e.target.value)
              change({ weight: toKg(parseDecimal(e.target.value) ?? 0, unit) })
            }} />
          <input className={`set-input ${invalid ? 'invalid' : ''}`} inputMode="numeric" placeholder={repsPlaceholder} aria-label="Repeticiones" value={repsText}
            onChange={(e) => {
              const clean = e.target.value.replace(/\D/g, '')
              setRepsText(clean)
              change({ reps: Number(clean) || 0 })
            }} />
        </>
      )}
      {tracking === 'distance_time' && (
        <input className={`set-input ${invalid ? 'invalid' : ''}`} inputMode="decimal" placeholder="0" aria-label="Kilómetros" value={distanceText}
          onChange={(e) => {
            setDistanceText(e.target.value)
            change({ distance: parseDecimal(e.target.value) ?? 0 })
          }} />
      )}
      {tracking !== 'weight_reps' && (
        <DurationInput seconds={set.duration ?? 0} placeholder={tracking === 'time' ? timePlaceholder : '0:00'} invalid={invalid}
          onChange={(duration) => change({ duration })} />
      )}
      <button className={`set-check ${set.done ? 'done' : ''}`} onClick={toggle} aria-label={set.done ? 'Desmarcar serie' : 'Marcar serie'}>
        {set.done
          ? <svg width="28" height="28" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="currentColor" /><path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          : <svg width="28" height="28" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.8" fill="none" /></svg>}
      </button>
      {menu && (
        <ActionSheet onClose={() => setMenu(false)} options={[
          { label: set.warmup ? 'Marcar como serie efectiva' : 'Marcar como calentamiento', onSelect: () => onChange({ warmup: !set.warmup }) },
          { label: 'Eliminar serie', destructive: true, onSelect: onDelete },
        ]} />
      )}
    </div>
    {set.done && !set.warmup && (askRpe || set.rpe !== undefined) && (
      <RpeRow value={set.rpe} open={askRpe} onOpen={onAskRpe}
        onPick={(rpe) => { onChange({ rpe }); onRpeDone() }} />
    )}
    </>
  )
}

/** Esfuerzo percibido de la serie: selector compacto o, si ya está puesto, una etiqueta para cambiarlo. */
function RpeRow({ value, open, onOpen, onPick }: {
  value?: number
  open: boolean
  onOpen: () => void
  onPick: (rpe: number | undefined) => void
}) {
  const [help, setHelp] = useState(false)
  if (!open) {
    return value === undefined ? null : (
      <button className="rpe-pill" onClick={onOpen}>RPE {num(value)} · {rpeMeaning(value)}</button>
    )
  }
  return (
    <div className="rpe-row">
      <div className="row between">
        <span className="small bold">¿Cuánto te costó? <span className="muted">(RPE)</span></span>
        <button className="rpe-help" onClick={() => setHelp(!help)} aria-label="Qué es el RPE">?</button>
      </div>
      <div className="rpe-chips">
        {rpeValues.map((v) => (
          <button key={v} className={`rpe-chip ${value === v ? 'active' : ''}`}
            onClick={() => onPick(value === v ? undefined : v)}>{num(v)}</button>
        ))}
      </div>
      {help && (
        <span className="small muted">
          Esfuerzo percibido: 10 = no podías hacer ni una más, 9 = te quedaba 1, 8 = te quedaban 2, 7 = te quedaban 3.
          Es opcional; sirve para saber cuándo subir peso.
        </span>
      )}
    </div>
  )
}

/** Tiempo tipo microondas: se teclean dígitos y se rellenan por la derecha (1, 3, 0 → 1:30). */
function DurationInput({ seconds, placeholder, invalid, onChange }: {
  seconds: number
  placeholder: string
  invalid: boolean
  onChange: (seconds: number) => void
}) {
  const [digits, setDigits] = useState(secondsToDigits(seconds))
  return (
    <input className={`set-input ${invalid ? 'invalid' : ''}`} inputMode="numeric" placeholder={placeholder} aria-label="Tiempo"
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

function RestBar() {
  const timer = useRestTimer()
  const now = useTick(250)
  // Aviso visible unos segundos al terminar: útil si el móvil está en silencio (el iPhone, además,
  // no vibra desde una web).
  if (!timer.endAt && timer.finishedAt && now - timer.finishedAt < 5000) {
    return (
      <Overlay>
        <button className="rest-bar rest-done" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 45 }} onClick={dismissRestDone}>
          <div style={{ maxWidth: 528, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Timer size={22} />
            <strong>¡Descanso terminado! A por la siguiente serie</strong>
          </div>
        </button>
      </Overlay>
    )
  }
  if (!timer.endAt) return null
  const remaining = Math.max(0, (timer.endAt - now) / 1000)
  const progress = timer.total > 0 ? remaining / (timer.total / 1000) : 0
  const r = 17
  const c = 2 * Math.PI * r
  return (
    <Overlay>
    <div className="rest-bar" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 45 }}>
      <div style={{ maxWidth: 528, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
        <svg width="42" height="42" viewBox="0 0 42 42" style={{ flexShrink: 0 }}>
          <circle cx="21" cy="21" r={r} stroke="var(--fill)" strokeWidth="5" fill="none" />
          <circle cx="21" cy="21" r={r} stroke="var(--accent)" strokeWidth="5" fill="none" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - progress)} transform="rotate(-90 21 21)" />
        </svg>
        <div className="grow">
          <div className="tiny muted row" style={{ gap: 4 }}><Timer size={12} /> Descanso</div>
          <div className="rest-time">{clock(Math.ceil(remaining))}</div>
        </div>
        <button className="btn small plain" onClick={() => addRest(-15)}>−15</button>
        <button className="btn small plain" onClick={() => addRest(15)}>+15</button>
        <button className="btn small primary" onClick={stopRest}>Saltar</button>
      </div>
    </div>
    </Overlay>
  )
}
