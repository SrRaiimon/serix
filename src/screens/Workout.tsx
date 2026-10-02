import { BlockStatus } from '../components/Block'
import { ArrowUpRight, BatteryLow, Check, ChevronDown, Ellipsis, Link2, Maximize2, Minimize2, Plus, StickyNote, Timer, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ActionSheet, Overlay, Progress, Thumb, useCatalog, useScrollLock, useTick, useToast } from '../components/ui'
import { groupKind, groupSlots, linkWithNext, normalizeGroups, unlink, type GroupSlot } from '../lib/groups'
import { clock, editable, fromKg, increment, int, num, parseDecimal, rest, restOptions, toKg, weight, type Unit } from '../lib/format'
import { t } from '../lib/i18n'
import { muscleLabel } from '../lib/labels'
import { e1rm, lastSets, progressionHint, records, stall, STALL_SESSIONS, workingSets, type Stall } from '../lib/stats'
import { finishedSessions, update, useData, withUndo, type AutoProgress, type Session, type SessionExercise, type SetEntry, type SetKind } from '../lib/store'
import { addRest, dismissRestDone, setRestBig, startRest, stopRest, unlockAudio, useRestTimer } from '../lib/timer'
import { defaultTargetSeconds, digitsToSeconds, formatDigits, isSetFilled, rpeMeaning, rpeValues, secondsToDigits, setShortText, trackingOf, trackingOptions, type Tracking } from '../lib/tracking'
import { addExercises, applyDeload, discardSession, finishSession, keepScreenOn, minimizeWorkout, replaceSessionExercise } from '../lib/workout'
import { AlternativesSheet } from './Alternatives'
import { ExercisePicker, ExerciseSheet } from './Exercises'
import { PlatesSheet } from './Plates'
import { ExerciseNoteSheet } from '../components/ExerciseNote'
import { BARS } from '../lib/plates'
import { warmupSets } from '../lib/warmup'

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
  const catalog = useCatalog()
  // Mejor 1RM estimado de cada ejercicio antes de este entrenamiento (para avisar de récords al momento).
  const bestBefore = useMemo(() => new Map(records(history).map((r) => [r.exerciseId, r.e1rm])), [history])
  const bestSoFar = (exerciseId: string) => {
    const before = bestBefore.get(exerciseId)
    if (before === undefined) return undefined
    const today = session.exercises.filter((x) => x.exerciseId === exerciseId).flatMap(workingSets).map((x) => e1rm(x.weight, x.reps))
    return Math.max(before, ...today)
  }
  const onSetDone = (e: SessionExercise, set: SetEntry) => {
    const best = bestSoFar(e.exerciseId)
    if (set.warmup || best === undefined || trackingOf(e) !== 'weight_reps') return
    const value = e1rm(set.weight, set.reps)
    if (value > best + 0.01) {
      showToast(t(`Nuevo récord en ${e.name}: ${weight(set.weight, unit)} × ${set.reps} (1RM est. ~${int(fromKg(value, unit))} ${unit})`, `New record on ${e.name}: ${weight(set.weight, unit)} × ${set.reps} (est. 1RM ~${int(fromKg(value, unit))} ${unit})`))
      navigator.vibrate?.([60, 60, 120])
    }
  }
  const barKg = data.settings.barKg ?? toKg(BARS[unit][0], unit)

  // Dentro de una superserie o circuito no se descansa: se pasa directamente al siguiente ejercicio.
  const goToNext = (from: number) => {
    const next = session.exercises[from + 1]
    const slot = slots[from + 1]
    showToast(`${t('Ahora', 'Now')}: ${slot.letter}${slot.position} ${next.name}`)
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
    if (first.sets.some((s) => !s.done)) showToast(t(`Ronda completada · después: ${slots[firstIndex].letter}1 ${first.name}`, `Round done · next: ${slots[firstIndex].letter}1 ${first.name}`))
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
        barbell={BARBELL.has(catalog.get(e.exerciseId)?.equipment ?? '')}
        barKg={barKg}
        previous={lastSets(e.exerciseId, history)}
        upcoming={session.exercises.slice(i + 1).find((x) => x.sets.some((s) => !s.done))}
        stalled={trackingOf(e) === 'weight_reps' ? stall(e.exerciseId, history) : undefined}
        onInfo={() => setDetail(e.exerciseId)}
        onGroupNext={() => goToNext(i)}
        onRoundEnd={() => roundEnd(i)}
        rpeFor={rpeFor}
        onAskRpe={askRpe}
        onSetDone={(set) => onSetDone(e, set)}
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
            <button className="icon-btn" onClick={minimizeWorkout} aria-label={t('Minimizar', 'Minimize')}><ChevronDown size={22} /></button>
          </div>
          <div className="title" style={{ fontVariantNumeric: 'tabular-nums' }}>{clock((now - session.start) / 1000)}</div>
          <div className="right">
            <button className="btn small" style={{ background: 'var(--green)', color: 'var(--on-accent)' }} onClick={() => setConfirm('finish')}>{t('Terminar', 'Finish')}</button>
          </div>
        </div>

        <div className="screen with-nav" style={{ paddingBottom: 140 }}>
          <div className="card">
            <input className="bold" style={{ fontSize: 24 }} aria-label={t('Nombre del entrenamiento', 'Workout name')} value={session.name} onChange={(e) => editSession(session.id, (s) => { s.name = e.target.value })} />
            {allSets.length > 0 && (
              <>
                <span className="small muted">{t(`${done} de ${allSets.length} series`, `${done} of ${allSets.length} sets`)}</span>
                <Progress value={done} total={allSets.length} green />
              </>
            )}
            <BlockStatus at={session.start} />
          </div>

          {runs.map((run) => {
            if (run.length === 1) return block(run[0])
            const first = slots[run[0]]
            const lastEx = session.exercises[run[run.length - 1]]
            return (
              <div key={session.exercises[run[0]].id} className="group-box">
                <div className="group-head">
                  <Link2 size={15} /> {groupKind(first.size)} {first.letter} · {t(`descanso ${rest(lastEx.rest)} tras cada ronda`, `${rest(lastEx.rest)} rest after each round`)}
                </div>
                {run.map(block)}
              </div>
            )
          })}

          <button className="btn secondary block" onClick={() => setPicker(true)}><Plus size={20} /> {t('Añadir ejercicio', 'Add exercise')}</button>
          <button className="btn danger block" onClick={() => setConfirm('discard')}><Trash2 size={18} /> {t('Descartar entrenamiento', 'Discard workout')}</button>
        </div>
      </div>

      <RestBar />

      {confirm === 'finish' && (
        <ActionSheet
          title={done > 0 ? t('¿Terminar el entrenamiento?', 'Finish the workout?') : t('No has completado ninguna serie', 'You have not completed any set')}
          message={done === 0 ? t('Marca las series con ✓ a medida que las hagas.', 'Tick each set with ✓ as you do it.')
            : pending === 1 ? t('La serie sin marcar no se guardará.', 'The unticked set will not be saved.')
            : pending > 1 ? t(`Las ${pending} series sin marcar no se guardarán.`, `The ${pending} unticked sets will not be saved.`) : t('¡Buen trabajo!', 'Great job!')}
          onClose={() => setConfirm(undefined)}
          options={done > 0
            ? [{ label: t('Terminar y guardar', 'Finish and save'), onSelect: () => finishSession(session.id) }]
            : [{ label: t('Descartar entrenamiento', 'Discard workout'), destructive: true, onSelect: () => discardSession(session.id) }]}
        />
      )}
      {confirm === 'discard' && (
        <ActionSheet title={t('¿Descartar este entrenamiento?', 'Discard this workout?')} message={t('Se perderán todas las series registradas.', 'All logged sets will be lost.')} onClose={() => setConfirm(undefined)}
          options={[{ label: t('Descartar', 'Discard'), destructive: true, onSelect: () => discardSession(session.id) }]} />
      )}
      {picker && <ExercisePicker onDone={(list) => addExercises(session.id, list)} onClose={() => setPicker(false)} />}
      {detail && <ExerciseSheet exerciseId={detail} onClose={() => setDetail(undefined)} />}
      {toast}
    </div>
  )
}

/** Material con el que tiene sentido calcular discos y empezar el calentamiento con la barra sola. */
const BARBELL = new Set(['barbell', 'ez-bar'])

function ExerciseBlock({ sessionId, exercise, index, total, slot, nextName, unit, barbell, barKg, previous, upcoming, stalled, onInfo, onGroupNext, onRoundEnd, rpeFor, onAskRpe, onSetDone }: {
  sessionId: string
  exercise: SessionExercise
  index: number
  total: number
  slot: GroupSlot
  /** Siguiente ejercicio del grupo (si no es el último de la ronda). */
  nextName?: string
  unit: Unit
  /** Ejercicio con barra: discos por lado y calentamiento desde la barra sola. */
  barbell: boolean
  barKg: number
  previous: SetEntry[]
  /** Siguiente ejercicio con series pendientes (para el aviso por voz al acabar el descanso). */
  upcoming?: SessionExercise
  /** Estancado en las últimas sesiones (se propone descarga o variante). */
  stalled?: Stall
  onInfo: () => void
  onGroupNext: () => void
  onRoundEnd: () => void
  rpeFor?: string
  onAskRpe: (setId?: string) => void
  /** Serie recién marcada (para avisar si es récord). */
  onSetDone: (set: SetEntry) => void
}) {
  const [menu, setMenu] = useState(false)
  const [restMenu, setRestMenu] = useState(false)
  const [trackingMenu, setTrackingMenu] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [plates, setPlates] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const note = useData().exerciseNotes[exercise.exerciseId]
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
  const isSuperset = slot.size < 3
  const inGroupWithNext = nextName !== undefined
  const tracking = trackingOf(exercise)
  const hasTarget = exercise.repsMax > 0
  const target = exercise.repsMin === exercise.repsMax ? `${exercise.repsMin}` : `${exercise.repsMin}-${exercise.repsMax}`
  const targetSeconds = exercise.targetSeconds ?? defaultTargetSeconds
  // Con progresión automática el peso ya viene calculado: no hace falta sugerirlo.
  const hint = tracking === 'weight_reps' && !exercise.auto ? progressionHint(previous, exercise.repsMax) : null
  // En el 5/3/1 las repeticiones cambian cada semana: lo explica la nota de la progresión.
  const objective = tracking === 'weight_reps' ? (hasTarget && exercise.auto?.kind !== 'wave' ? ` · ${t('Objetivo', 'Target')} ${target} reps` : '')
    : tracking === 'time' ? ` · ${t('Objetivo', 'Target')} ${clock(targetSeconds)}` : ''
  let working = 0
  // Calentamiento: rampa hasta el peso de la primera serie efectiva (sustituye al pendiente que hubiera).
  const workKg = exercise.sets.find((s) => !s.warmup && s.weight > 0)?.weight ?? 0
  const addWarmup = () => edit((e) => {
    const sets = warmupSets(workKg, unit, barbell ? barKg : undefined)
    e.sets = [
      ...sets.map((w) => ({ id: crypto.randomUUID(), weight: w.weight, reps: w.reps, done: false, warmup: true })),
      ...e.sets.filter((s) => !s.warmup || s.done),
    ]
  })

  // Drop set: justo después de la última serie, con un 20 % menos de peso y sin descanso entre medias.
  const lastWorking = [...exercise.sets].reverse().find((s) => !s.warmup && s.weight > 0)
  const addDropSet = () => edit((e) => {
    const step = increment(unit)
    const kg = toKg(Math.max(step, Math.round(fromKg(lastWorking!.weight * 0.8, unit) / step) * step), unit)
    e.sets.push({ id: crypto.randomUUID(), weight: kg, reps: lastWorking!.reps, done: false, warmup: false, kind: 'drop' })
  })
  const prevMain = previous.filter((p) => p.kind !== 'drop')
  const prevDrops = previous.filter((p) => p.kind === 'drop')
  let drops = 0

  return (
    <section className="card" id={`ex-${exercise.id}`}>
      <div className="row">
        <button className="row grow" style={{ textAlign: 'left' }} onClick={onInfo}>
          <Thumb exerciseId={exercise.exerciseId} size={44} />
          <span className="grow">
            <span className="bold clamp-2" style={{ color: 'var(--accent-text)' }}>
              {slot.letter && <span className="group-badge">{slot.letter}{slot.position}</span>}
              {exercise.name}
            </span>
            <span className="small muted">
              {muscleLabel(exercise.muscle)}{objective} · {inGroupWithNext ? t(`Sin descanso, sigue con ${nextName}`, `No rest, go on to ${nextName}`) : `${t('Descanso', 'Rest')} ${rest(exercise.rest)}`}
            </span>
          </span>
        </button>
        <button className="icon-btn" onClick={() => setMenu(true)} aria-label={t('Opciones del ejercicio', 'Exercise options')}><Ellipsis size={20} /></button>
      </div>

      {note && (
        <button className="exercise-note" onClick={() => setNoteOpen(true)} aria-label={t('Editar la nota del ejercicio', 'Edit the exercise note')}>
          <StickyNote size={15} style={{ flexShrink: 0 }} /> <span>{note}</span>
        </button>
      )}

      {exercise.auto && <AutoNote auto={exercise.auto} unit={unit} />}

      {exercise.deload && exercise.auto?.kind !== 'wave' ? (
        <span className="small row" style={{ color: 'var(--blue-text)', gap: 6, alignItems: 'flex-start' }}>
          <BatteryLow size={16} style={{ flexShrink: 0 }} />
          {t('Sesión de descarga: menos series y algo menos de peso para recuperar. La próxima vez vuelves a tus pesos.', 'Deload session: fewer sets and a bit less weight to recover. Next time you go back to your usual weights.')}
        </span>
      ) : !hint && stalled && exercise.auto?.kind !== 'wave' && (
        <div className="stall-box">
          <span className="small row" style={{ gap: 6, alignItems: 'flex-start' }}>
            <TrendingDown size={16} style={{ flexShrink: 0 }} />
            <span>
              {t(`Llevas ${STALL_SESSIONS} sesiones sin superar tu mejor marca (1RM est. ~${int(fromKg(stalled.best, unit))} ${unit}). Una sesión de descarga o cambiar a una variante suele ayudar a desatascarse.`,
                `${STALL_SESSIONS} sessions without beating your best (est. 1RM ~${int(fromKg(stalled.best, unit))} ${unit}). A deload session or switching to a variation usually helps you move forward.`)}
            </span>
          </span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn small secondary" onClick={() => edit((e) => applyDeload(e, unit))}>{t('Hacer descarga', 'Deload')}</button>
            <button className="btn small plain" onClick={() => setReplacing(true)}>{t('Ver variantes', 'Variations')}</button>
          </div>
        </div>
      )}

      {hint && !exercise.deload && (
        <span className="small row" style={{ color: 'var(--green-text)', gap: 6, alignItems: 'flex-start' }}>
          <ArrowUpRight size={16} style={{ flexShrink: 0 }} />
          {hint === 'reps' ? t('La última vez llegaste al máximo de repeticiones.', 'Last time you reached the top of the rep range.') : t('La última vez te sobró margen (RPE 7 o menos).', 'Last time you had reps to spare (RPE 7 or less).')}
          {' '}{t('Prueba con', 'Try')} {weight(Math.max(...previous.map((p) => p.weight)) + toKg(increment(unit), unit), unit)}.
        </span>
      )}

      <div className={`set-grid set-head ${tracking}`}>
        <span>{t('SERIE', 'SET')}</span><span>{t('ANTERIOR', 'PREVIOUS')}</span>
        {tracking === 'weight_reps' && <><span>{unit.toUpperCase()}</span><span>REPS</span></>}
        {tracking === 'time' && <span>{t('TIEMPO', 'TIME')}</span>}
        {tracking === 'distance_time' && <><span>KM</span><span>{t('TIEMPO', 'TIME')}</span></>}
        <span><Check size={14} /></span>
      </div>

      {exercise.sets.map((set, i) => {
        // Los drop sets no suman al número de serie: van pegados a la anterior.
        const drop = !set.warmup && set.kind === 'drop'
        const label = set.warmup ? t('C', 'W') : drop ? 'D' : String(++working)
        const prev = set.warmup ? undefined
          : drop ? prevDrops[drops++]
          : prevMain.length ? prevMain[Math.min(working - 1, prevMain.length - 1)] : undefined
        const next = exercise.sets[i + 1]
        const dropNext = next && !next.done && !next.warmup && next.kind === 'drop'
        return (
          <SetRow key={set.id} set={set} label={label} previous={prev} tracking={tracking}
            repsPlaceholder={hasTarget ? target : '0'} timePlaceholder={clock(targetSeconds)} unit={unit} barbell={barbell}
            onChange={(patch) => edit((e) => { Object.assign(e.sets.find((s) => s.id === set.id)!, patch) })}
            onDelete={() => withUndo(t('Serie eliminada', 'Set deleted'), () => edit((e) => { e.sets = e.sets.filter((s) => s.id !== set.id) }))}
            askRpe={rpeFor === set.id}
            onAskRpe={() => onAskRpe(set.id)}
            onRpeDone={() => onAskRpe(undefined)}
            onCompleted={() => {
              onSetDone(set)
              if (!set.warmup && set.kind !== 'failure') onAskRpe(set.id)
              // Antes de un drop set no se descansa: se quita peso y se sigue.
              if (dropNext) return
              if (inGroupWithNext) return onGroupNext()
              // Lo que toca después: la siguiente serie pendiente de este ejercicio o del siguiente.
              const later = exercise.sets.slice(i + 1).find((s) => !s.done)
              const nextUp = later ? spokenSet(exercise, later, unit) : upcoming ? spokenSet(upcoming, upcoming.sets.find((s) => !s.done)!, unit) : undefined
              startRest(set.warmup ? Math.min(exercise.rest, 60) : exercise.rest, nextUp)
              if (slot.letter) onRoundEnd()
            }} />
        )
      })}

      <button className="nav-btn" style={{ justifyContent: 'center', fontWeight: 600 }} onClick={() => edit((e) => {
        const last = [...e.sets].reverse().find((s) => s.kind !== 'drop') ?? e.sets[e.sets.length - 1]
        e.sets.push({
          id: crypto.randomUUID(), weight: last?.weight ?? 0, reps: last?.reps ?? 0, done: false, warmup: false,
          ...(last?.duration ? { duration: last.duration } : {}),
          ...(last?.distance ? { distance: last.distance } : {}),
        })
      })}>
        <Plus size={18} /> {t('Añadir serie', 'Add set')}
      </button>

      {menu && (
        <ActionSheet title={exercise.name} onClose={() => setMenu(false)} options={[
          ...(tracking === 'weight_reps' && workKg > 0 ? [{ label: t('Añadir series de calentamiento', 'Add warm-up sets'), onSelect: addWarmup }] : []),
          ...(barbell && tracking === 'weight_reps' && workKg > 0 ? [{ label: t(`Discos para ${weight(workKg, unit)}`, `Plates for ${weight(workKg, unit)}`), onSelect: () => setPlates(true) }] : []),
          ...(tracking === 'weight_reps' && lastWorking ? [{ label: t('Añadir drop set', 'Add drop set'), onSelect: addDropSet }] : []),
          ...(tracking === 'weight_reps' ? [exercise.deload
            ? { label: t('Quitar marca de descarga', 'Remove deload mark'), onSelect: () => edit((e) => { delete e.deload }) }
            : { label: t('Hacer sesión de descarga', 'Make it a deload session'), onSelect: () => edit((e) => applyDeload(e, unit)) }] : []),
          { label: note ? t('Editar nota del ejercicio', 'Edit exercise note') : t('Añadir nota del ejercicio', 'Add exercise note'), onSelect: () => setNoteOpen(true) },
          { label: t('Sustituir ejercicio', 'Replace exercise'), onSelect: () => setReplacing(true) },
          ...(index < total - 1 && !inGroupWithNext ? [{
            label: slot.letter ? (isSuperset ? t('Añadir el siguiente a la superserie', 'Add the next one to the superset') : t('Añadir el siguiente al circuito', 'Add the next one to the circuit')) : t('Hacer superserie con el siguiente', 'Superset with the next one'),
            onSelect: () => editList((list, i) => linkWithNext(list, i)),
          }] : []),
          ...(slot.letter ? [{ label: isSuperset ? t('Sacar de la superserie', 'Remove from superset') : t('Sacar del circuito', 'Remove from circuit'), onSelect: () => editList((list, i) => unlink(list, i)) }] : []),
          { label: `${t('Descanso', 'Rest')}: ${rest(exercise.rest)}`, onSelect: () => setRestMenu(true) },
          { label: `${t('Registrar por', 'Log by')}: ${trackingOptions().find((o) => o.id === tracking)!.label.toLowerCase()}`, onSelect: () => setTrackingMenu(true) },
          ...(index > 0 ? [{ label: t('Subir', 'Move up'), onSelect: () => editList((list, i) => { [list[i - 1], list[i]] = [list[i], list[i - 1]] }) }] : []),
          ...(index < total - 1 ? [{ label: t('Bajar', 'Move down'), onSelect: () => editList((list, i) => { [list[i + 1], list[i]] = [list[i], list[i + 1]] }) }] : []),
          { label: t('Quitar ejercicio', 'Remove exercise'), destructive: true, onSelect: () => withUndo(t(`Quitado: ${exercise.name}`, `Removed: ${exercise.name}`), () => editList((list, i) => { list.splice(i, 1) })) },
        ]} />
      )}
      {restMenu && (
        <ActionSheet title={t('Descanso entre series', 'Rest between sets')} onClose={() => setRestMenu(false)}
          options={restOptions.map((o) => ({ label: rest(o), onSelect: () => edit((e) => { e.rest = o }) }))} />
      )}
      {trackingMenu && (
        <ActionSheet title={t('¿Cómo registras este ejercicio?', 'How do you log this exercise?')} onClose={() => setTrackingMenu(false)}
          options={trackingOptions().map((o) => ({
            label: o.id === tracking ? `${o.label} ✓` : o.label,
            onSelect: () => edit((e) => {
              e.tracking = o.id
              if (o.id === 'time') e.targetSeconds ??= defaultTargetSeconds
            }),
          }))} />
      )}
      {plates && <PlatesSheet weightKg={workKg} onClose={() => setPlates(false)} />}
      {noteOpen && <ExerciseNoteSheet exerciseId={exercise.exerciseId} name={exercise.name} onClose={() => setNoteOpen(false)} />}
      {replacing && (
        <AlternativesSheet current={exercise} onClose={() => setReplacing(false)}
          onPick={(picked) => replaceSessionExercise(sessionId, exercise.id, picked)} />
      )}
    </section>
  )
}

function SetRow({ set, label, previous, tracking, repsPlaceholder, timePlaceholder, unit, barbell, askRpe, onAskRpe, onRpeDone, onChange, onDelete, onCompleted }: {
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
  barbell: boolean
  onChange: (patch: Partial<SetEntry>) => void
  onDelete: () => void
  onCompleted: () => void
}) {
  const [weightText, setWeightText] = useState(set.weight > 0 ? editable(fromKg(set.weight, unit)) : '')
  const [repsText, setRepsText] = useState(set.reps > 0 ? String(set.reps) : '')
  const [distanceText, setDistanceText] = useState(set.distance ? editable(set.distance) : '')
  const [invalid, setInvalid] = useState(false)
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
    if (!isSetFilled(set, tracking)) {
      setInvalid(true)
      navigator.vibrate?.(60)
      return
    }
    ;(document.activeElement as HTMLElement | null)?.blur()
    onChange({ done: true, doneAt: Date.now(), ...(set.kind === 'failure' && !set.warmup ? { rpe: 10 } : {}) })
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
      <button className={`set-label ${set.warmup ? 'warmup' : set.kind ?? ''}`} onClick={() => setMenu(true)}
        aria-label={`${t('Opciones de la serie', 'Set options')} (${setKindLabel(set).toLowerCase()})`}>
        {label}{!set.warmup && (set.kind === 'amrap' || set.kind === 'failure') && <sup>{set.kind === 'amrap' ? 'A' : 'F'}</sup>}
      </button>
      <span className="set-prev">{previous ? setShortText(previous, tracking, unit) : '—'}</span>
      {tracking === 'weight_reps' && (
        <>
          <input className="set-input" inputMode="decimal" placeholder="0" aria-label={t('Peso', 'Weight')} value={weightText}
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
        <DurationInput seconds={set.duration ?? 0} placeholder={tracking === 'time' ? timePlaceholder : '0:00'} invalid={invalid}
          onChange={(duration) => change({ duration })} />
      )}
      <button className={`set-check ${set.done ? 'done' : ''}`} onClick={toggle} aria-label={set.done ? t('Desmarcar serie', 'Untick set') : t('Marcar serie', 'Tick set')}>
        {set.done
          ? <svg width="28" height="28" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="currentColor" /><path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          : <svg width="28" height="28" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.8" fill="none" /></svg>}
      </button>
      {menu && (
        <ActionSheet onClose={() => setMenu(false)} options={[
          ...(barbell && tracking === 'weight_reps' && set.weight > 0 ? [{ label: t(`Discos para ${weight(set.weight, unit)}`, `Plates for ${weight(set.weight, unit)}`), onSelect: () => setPlates(true) }] : []),
          ...(tracking === 'weight_reps'
            ? [{ label: `${t('Tipo', 'Type')}: ${setKindLabel(set).toLowerCase()}`, onSelect: () => setKindMenu(true) }]
            : [{ label: set.warmup ? t('Marcar como serie efectiva', 'Mark as working set') : t('Marcar como calentamiento', 'Mark as warm-up'), onSelect: () => onChange({ warmup: !set.warmup }) }]),
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
    </div>
    {set.done && !set.warmup && (askRpe || set.rpe !== undefined) && (
      <RpeRow value={set.rpe} open={askRpe} onOpen={onAskRpe}
        onPick={(rpe) => { onChange({ rpe }); onRpeDone() }} />
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

/** «Press de banca, serie 3 de 4, 80 kilos»: la siguiente serie, para decirla en voz alta. */
function spokenSet(e: SessionExercise, set: SetEntry, unit: Unit): string {
  if (set.warmup) return `${e.name}, ${t('calentamiento', 'warm-up')}`
  const working = e.sets.filter((s) => !s.warmup)
  const k = working.findIndex((s) => s.id === set.id) + 1
  let text = `${e.name}, ${t(`serie ${k} de ${working.length}`, `set ${k} of ${working.length}`)}`
  if (trackingOf(e) === 'weight_reps' && set.weight > 0) text += `, ${num(fromKg(set.weight, unit))} ${unit === 'kg' ? t('kilos', 'kilos') : t('libras', 'pounds')}`
  return text
}

/** Explica lo que ha hecho la progresión automática con este ejercicio. */
function AutoNote({ auto, unit }: { auto: AutoProgress; unit: Unit }) {
  const text = auto.kind === 'up'
    ? t(`Progresión automática: sube a ${weight(auto.to, unit)} (la última vez completaste todas las repeticiones con ${weight(auto.from, unit)}).`,
      `Automatic progression: up to ${weight(auto.to, unit)} (last time you completed every rep with ${weight(auto.from, unit)}).`)
    : auto.kind === 'hold'
      ? t('Progresión automática: mismo peso hasta completar todas las repeticiones.', 'Automatic progression: same weight until you complete every rep.')
      : auto.week === 4
        ? t(`5/3/1 · semana 4 de 4 (descarga) · TM ${weight(auto.tm, unit)}`, `5/3/1 · week 4 of 4 (deload) · TM ${weight(auto.tm, unit)}`)
        : t(`5/3/1 · semana ${auto.week} de 4 · TM ${weight(auto.tm, unit)} · en la última serie, todas las repeticiones que puedas con buena técnica.`,
          `5/3/1 · week ${auto.week} of 4 · TM ${weight(auto.tm, unit)} · on the last set, as many good reps as you can.`)
  return (
    <span className="small row" style={{ color: 'var(--blue-text)', gap: 6, alignItems: 'flex-start' }}>
      <TrendingUp size={16} style={{ flexShrink: 0 }} />
      {text}
    </span>
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
        <span className="small bold">{t('¿Cuánto te costó?', 'How hard was it?')} <span className="muted">(RPE)</span></span>
        <button className="rpe-help" onClick={() => setHelp(!help)} aria-label={t('Qué es el RPE', 'What is RPE')}>?</button>
      </div>
      <div className="rpe-chips">
        {rpeValues.map((v) => (
          <button key={v} className={`rpe-chip ${value === v ? 'active' : ''}`}
            onClick={() => onPick(value === v ? undefined : v)}>{num(v)}</button>
        ))}
      </div>
      {help && (
        <span className="small muted">
          {t('Esfuerzo percibido: 10 = no podías hacer ni una más, 9 = te quedaba 1, 8 = te quedaban 2, 7 = te quedaban 3. Es opcional; sirve para saber cuándo subir peso.',
            'Rate of perceived exertion: 10 = you could not do one more, 9 = 1 rep left, 8 = 2 left, 7 = 3 left. It is optional; it helps decide when to add weight.')}
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

function RestBar() {
  const timer = useRestTimer()
  const now = useTick(250)
  // Aviso visible unos segundos al terminar: útil si el móvil está en silencio (el iPhone, además,
  // no vibra desde una web).
  if (!timer.endAt && timer.finishedAt && now - timer.finishedAt < 5000) {
    return (
      <Overlay>
        {timer.big ? (
          <button className="rest-full rest-full-done" onClick={() => { dismissRestDone(); setRestBig(true) }}>
            <Timer size={64} />
            <strong className="rest-full-message">{t('¡Descanso terminado!', 'Rest is over!')}</strong>
            <span>{t('A por la siguiente serie', 'On to the next set')}</span>
          </button>
        ) : (
          <button className="rest-bar rest-done" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 45 }} onClick={dismissRestDone}>
            <div style={{ maxWidth: 528, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <Timer size={22} />
              <strong>{t('¡Descanso terminado! A por la siguiente serie', 'Rest is over! On to the next set')}</strong>
            </div>
          </button>
        )}
      </Overlay>
    )
  }
  if (!timer.endAt) return null
  const remaining = Math.max(0, (timer.endAt - now) / 1000)
  const progress = timer.total > 0 ? remaining / (timer.total / 1000) : 0
  if (timer.big) return <RestFullScreen remaining={remaining} progress={progress} />
  const r = 17
  const c = 2 * Math.PI * r
  return (
    <Overlay>
    <div className="rest-bar" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 45 }}>
      <div style={{ maxWidth: 528, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="rest-expand" onClick={() => setRestBig(true)} aria-label={t('Ver la cuenta atrás en grande', 'Show the countdown full screen')}>
          <svg width="42" height="42" viewBox="0 0 42 42" style={{ flexShrink: 0 }}>
            <circle cx="21" cy="21" r={r} stroke="var(--fill)" strokeWidth="5" fill="none" />
            <circle cx="21" cy="21" r={r} stroke="var(--accent)" strokeWidth="5" fill="none" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - progress)} transform="rotate(-90 21 21)" />
          </svg>
          <div className="grow" style={{ textAlign: 'left' }}>
            <div className="tiny muted row" style={{ gap: 4 }}><Timer size={12} /> {t('Descanso', 'Rest')} <Maximize2 size={11} /></div>
            <div className="rest-time">{clock(Math.ceil(remaining))}</div>
          </div>
        </button>
        <button className="btn small plain" onClick={() => addRest(-15)}>−15</button>
        <button className="btn small plain" onClick={() => addRest(15)}>+15</button>
        <button className="btn small primary" onClick={stopRest}>{t('Saltar', 'Skip')}</button>
      </div>
    </div>
    </Overlay>
  )
}

/** Cuenta atrás a pantalla completa, legible a distancia con el móvil apoyado. Fondo negro: en
 * pantallas OLED apenas gasta batería. */
function RestFullScreen({ remaining, progress }: { remaining: number; progress: number }) {
  useScrollLock()
  const r = 46
  const c = 2 * Math.PI * r
  const last = remaining <= 5
  return (
    <Overlay>
      <div className="rest-full" role="timer" aria-label={t(`Descanso: quedan ${Math.ceil(remaining)} segundos`, `Rest: ${Math.ceil(remaining)} seconds left`)}>
        <button className="rest-full-min" onClick={() => setRestBig(false)} aria-label={t('Reducir', 'Shrink')}><Minimize2 size={22} /></button>
        <div className="rest-full-ring">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r={r} stroke="#1f2126" strokeWidth="4" fill="none" />
            {/* Halo suave (anillo ancho y translúcido) bajo el progreso */}
            <circle cx="50" cy="50" r={r} stroke="var(--accent)" strokeOpacity="0.18" strokeWidth="9" fill="none" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - progress)} transform="rotate(-90 50 50)" />
            <circle cx="50" cy="50" r={r} stroke="var(--accent)" strokeWidth="4" fill="none" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - progress)} transform="rotate(-90 50 50)" />
          </svg>
          <div className="rest-full-center">
            <span className="rest-full-label">{t('Descanso', 'Rest')}</span>
            <span className={`rest-full-time ${last ? 'last' : ''}`}>{clock(Math.ceil(remaining))}</span>
          </div>
        </div>
        <div className="rest-full-actions">
          <button className="btn plain" onClick={() => addRest(-15)}>−15 s</button>
          <button className="btn plain" onClick={() => addRest(15)}>+15 s</button>
          <button className="btn primary" onClick={stopRest}>{t('Saltar', 'Skip')}</button>
        </div>
      </div>
    </Overlay>
  )
}
