import { BlockStatus } from '../components/Block'
import { EffortSuggestion, PainSheet, PainWarning } from '../components/Coaching'
import { lastPain } from '../lib/autoreg'
import { navigate } from '../lib/router'
import { focusFor } from '../lib/warmupRoutine'
import { ArrowUpRight, BatteryLow, Flame, Check, ChevronDown, Ellipsis, Info, Link2, Minimize2, Plus, StickyNote, Timer, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ActionSheet, Overlay, Progress, Thumb, useCatalog, useScrollLock, useTick, useToast } from '../components/ui'
import { groupKind, groupSlots, linkWithNext, normalizeGroups, unlink, type GroupSlot } from '../lib/groups'
import { clock, editable, fromKg, increment, int, num, parseDecimal, rest, restOptions, toKg, weight, type Unit } from '../lib/format'
import { t } from '../lib/i18n'
import { muscleLabel } from '../lib/labels'
import { e1rm, lastSets, loadSets, progressionHint, records, repRecordBeaten, repRecords, setLoad, stall, STALL_SESSIONS, workingSets, type Stall } from '../lib/stats'
import { finishedSessions, rpeOn, update, useData, withUndo, type AutoProgress, type Session, type SessionExercise, type SetEntry, type SetKind } from '../lib/store'
import { addRest, adjustRestForEffort, dismissRestDone, prepareAudio, setRestBig, startRest, stopRest, unlockAudio, useRestTimer } from '../lib/timer'
import { defaultTargetSeconds, digitsToSeconds, formatDigits, isSetFilled, rpeMeaning, rpeValues, secondsToDigits, setShortText, trackingOf, trackingOptions, type Tracking } from '../lib/tracking'
import { suspicious } from '../lib/tracking'
import { addExercises, applyDeload, discardSession, finishSession, fromSides, keepScreenOn, minimizeWorkout, replaceSessionExercise, toSides } from '../lib/workout'
import { AlternativesSheet } from './Alternatives'
import { ExercisePicker, ExerciseSheet } from './Exercises'
import { PlatesSheet } from './Plates'
import { ExerciseNoteSheet } from '../components/ExerciseNote'
import { BARS } from '../lib/plates'
import { fromFloor, warmupSets } from '../lib/warmup'
import { BODYWEIGHT_LIFTS, bodyweightText } from '../lib/bodyweight'

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
  const askRpe = (setId?: string) => setRpeFor(rpeOn(data.settings) ? setId : undefined)
  const slots = groupSlots(session.exercises)
  const catalog = useCatalog()
  // Mejor 1RM estimado de cada ejercicio antes de este entrenamiento (para avisar de récords al momento).
  const bestBefore = useMemo(() => new Map(records(history).map((r) => [r.exerciseId, r.e1rm])), [history])
  const bestSoFar = (exerciseId: string) => {
    const before = bestBefore.get(exerciseId)
    if (before === undefined) return undefined
    const today = session.exercises.filter((x) => x.exerciseId === exerciseId).flatMap(loadSets).map((x) => e1rm(x.weight, x.reps))
    return Math.max(before, ...today)
  }
  const onSetDone = (e: SessionExercise, set: SetEntry) => {
    const best = bestSoFar(e.exerciseId)
    if (set.warmup || (e.assisted && e.bodyweight === undefined) || best === undefined || trackingOf(e) !== 'weight_reps') return
    // En dominadas y fondos cuenta el peso corporal; en el aviso se dice lo apuntado («tu peso + 10 kg»).
    const load = setLoad(e, set)
    const value = e1rm(load, set.reps)
    const shown = e.bodyweight === undefined ? weight(set.weight, unit) : bodyweightText(e.assisted ? -set.weight : set.weight, unit)
    // Récord real de repeticiones (p. ej. el mayor peso a 5): frente al historial y a lo ya hecho hoy.
    const today = session.exercises.filter((x) => x.exerciseId === e.exerciseId).flatMap(workingSets).filter((x) => x.id !== set.id)
    const before = repRecords(e.exerciseId, [...history, { ...session, exercises: [{ ...e, sets: today }] }])
    const repRecord = repRecordBeaten(load, set.reps, before)
    if (value <= best + 0.01 && repRecord !== undefined) {
      showToast(t(`Récord de ${repRecord} repeticiones en ${e.name}: ${shown}`, `${repRecord}-rep record on ${e.name}: ${shown}`))
      navigator.vibrate?.([60, 60, 120])
      return
    }
    if (value > best + 0.01) {
      showToast(t(`Nuevo récord en ${e.name}: ${shown} × ${set.reps} (1RM est. ~${int(fromKg(value, unit))} ${unit})`, `New record on ${e.name}: ${shown} × ${set.reps} (est. 1RM ~${int(fromKg(value, unit))} ${unit})`))
      navigator.vibrate?.([60, 60, 120])
    }
  }
  const barKg = data.settings.barKg ?? toKg(BARS[unit][0], unit)
  const onEffort = (setId: string, rpe: number | undefined, base: number) => {
    const total = adjustRestForEffort(setId, rpe, base)
    if (total === undefined) return
    showToast(total > 0 ? t(`Descanso +${total} s: ha costado`, `Rest +${total} s: that was hard`)
      : total < 0 ? t(`Descanso −${-total} s: te sobraba fuerza`, `Rest −${-total} s: you had reps to spare`)
        : t('Descanso normal', 'Normal rest'))
  }

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
  const currentSet = session.exercises.flatMap((x) => x.sets).find((x) => !x.done)?.id
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
        bodyweight={catalog.get(e.exerciseId)?.equipment === 'bodyweight' || BODYWEIGHT_LIFTS.has(e.exerciseId)}
        barKg={barKg}
        previous={lastSets(e.exerciseId, history)}
        upcoming={session.exercises.slice(i + 1).find((x) => x.sets.some((s) => !s.done))}
        currentSet={currentSet}
        stalled={trackingOf(e) === 'weight_reps' ? stall(e.exerciseId, history) : undefined}
        lastPain={lastPain(e.exerciseId, history)}
        startedAt={session.start}
        onInfo={() => setDetail(e.exerciseId)}
        onGroupNext={() => goToNext(i)}
        onRoundEnd={() => roundEnd(i)}
        rpeFor={rpeFor}
        onAskRpe={askRpe}
        onSetDone={(set) => onSetDone(e, set)}
        onEffort={onEffort}
      />
    )
  }

  const allSets = session.exercises.flatMap((e) => e.sets)
  const done = allSets.filter((s) => s.done).length
  const pending = allSets.length - done

  useScrollLock()
  // El audio se prepara cuando el móvil está libre, no al marcar la primera serie.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 300))
    idle(prepareAudio)
  }, [])
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
          <div className="title workout-clock">{clock((now - session.start) / 1000)}</div>
          <div className="right">
            <button className="btn small secondary" onClick={() => setConfirm('finish')}>{t('Terminar', 'Finish')}</button>
          </div>
        </div>

        <div className="screen with-nav" style={{ paddingBottom: 140 }}>
          <div className="card">
            <input className="workout-name" aria-label={t('Nombre del entrenamiento', 'Workout name')} value={session.name} onChange={(e) => editSession(session.id, (s) => { s.name = e.target.value })} />
            {allSets.length > 0 && (
              <>
                <span className="small muted">{t(`${done} de ${allSets.length} series`, `${done} of ${allSets.length} sets`)}</span>
                <Progress value={done} total={allSets.length} />
              </>
            )}
            <BlockStatus at={session.start} />
            {done === 0 && session.exercises.length > 0 && (
              <button className="btn small secondary" style={{ alignSelf: 'flex-start' }} onClick={() => {
                minimizeWorkout()
                navigate('timer', 'warmup', focusFor(session.exercises.map((e) => e.muscle)))
              }}><Flame size={15} /> {t('Calentar antes (5 min)', 'Warm up first (5 min)')}</button>
            )}
          </div>

          {runs.map((run) => {
            if (run.length === 1) return block(run[0])
            const first = slots[run[0]]
            const lastEx = session.exercises[run[run.length - 1]]
            // Rondas: tantas como series tenga el ejercicio que más tiene; hechas, las que han completado todos.
            const rounds = Math.max(...run.map((i) => session.exercises[i].sets.length))
            const done = Math.min(...run.map((i) => session.exercises[i].sets.filter((x) => x.done).length))
            const round = done >= rounds ? t('rondas hechas', 'rounds done') : t(`ronda ${done + 1} de ${rounds}`, `round ${done + 1} of ${rounds}`)
            return (
              <div key={session.exercises[run[0]].id} className="group-box">
                <div className="group-head">
                  <Link2 size={15} /> {groupKind(first.size)} {first.letter} · <strong>{round}</strong> · {t(`descanso ${rest(lastEx.rest)} tras cada ronda`, `${rest(lastEx.rest)} rest after each round`)}
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

function ExerciseBlock({ sessionId, exercise, index, total, slot, nextName, unit, barbell, bodyweight, barKg, previous, upcoming, currentSet, stalled, onInfo, onGroupNext, onRoundEnd, rpeFor, onAskRpe, onSetDone, onEffort, lastPain: painBefore, startedAt }: {
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
  /** De peso corporal: el peso apuntado es lastre. */
  bodyweight: boolean
  barKg: number
  previous: SetEntry[]
  /** Siguiente ejercicio con series pendientes (para el aviso por voz al acabar el descanso). */
  upcoming?: SessionExercise
  /** Primera serie pendiente del entrenamiento (lleva la cinta de «aquí vas»). */
  currentSet?: string
  /** Estancado en las últimas sesiones (se propone descarga o variante). */
  stalled?: Stall
  onInfo: () => void
  onGroupNext: () => void
  onRoundEnd: () => void
  rpeFor?: string
  onAskRpe: (setId?: string) => void
  /** Serie recién marcada (para avisar si es récord). */
  onSetDone: (set: SetEntry) => void
  /** Esfuerzo de una serie: ajusta el descanso que empezó (ver adjustRestForEffort). */
  onEffort: (setId: string, rpe: number | undefined, base: number) => void
  /** Molestia apuntada la última vez que se hizo este ejercicio. */
  lastPain?: { pain: number; date: number; note?: string }
  startedAt: number
}) {
  const [stallOpen, setStallOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const [restMenu, setRestMenu] = useState(false)
  const [trackingMenu, setTrackingMenu] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [plates, setPlates] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [painOpen, setPainOpen] = useState(false)
  const data = useData()
  const { exerciseNotes, settings } = data
  const simple = settings.simpleMode === true
  const note = exerciseNotes[exercise.exerciseId]
  // Primer entrenamiento: se explica cómo se apunta una serie justo donde hay que hacerlo.
  const firstEver = index === 0 && exercise.sets[0]?.id === currentSet && !finishedSessions(data).length
  // Ejercicio nuevo sin peso puesto: una pista para elegirlo (la próxima vez ya se propone solo).
  const weightHint = trackingOf(exercise) === 'weight_reps' && !previous.length && !exercise.assisted
    && exercise.sets.some((x) => x.id === currentSet && !x.weight)
  const edit = (fn: (e: SessionExercise, s: Session) => void) => editSession(sessionId, (s) => {
    const e = s.exercises.find((x) => x.id === exercise.id)
    if (e) fn(e, s)
  })
  /** Asistido o por lados: en este entrenamiento y, para la próxima vez, en este ejercicio. */
  const setMode = (change: { assisted?: boolean; unilateral?: boolean }) => {
    edit((e) => {
      if (change.assisted !== undefined) e.assisted = change.assisted || undefined
      if (change.unilateral !== undefined) {
        e.unilateral = change.unilateral || undefined
        // Se conservan el orden y las series ya hechas; solo cambian las pendientes.
        e.sets = change.unilateral ? toSides(e.sets) : fromSides(e.sets)
      }
    })
    update((d) => {
      const modes = { ...d.settings.exerciseModes }
      const mode = { ...modes[exercise.exerciseId], ...change }
      if (!mode.assisted) delete mode.assisted
      if (!mode.unilateral) delete mode.unilateral
      if (Object.keys(mode).length) modes[exercise.exerciseId] = mode
      else delete modes[exercise.exerciseId]
      d.settings.exerciseModes = Object.keys(modes).length ? modes : undefined
    })
  }
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
  const hint = tracking === 'weight_reps' && !exercise.auto && !exercise.assisted ? progressionHint(previous, exercise.repsMax) : null
  // En el 5/3/1 las repeticiones cambian cada semana: lo explica la nota de la progresión.
  const objective = tracking === 'weight_reps' ? (hasTarget && exercise.auto?.kind !== 'wave' ? `${target.replace('-', '\u2011')}\u00a0reps` : '')
    : tracking === 'time' ? `${t('Objetivo', 'Target')} ${clock(targetSeconds)}` : ''
  let working = 0
  // Calentamiento: rampa hasta el peso de la primera serie efectiva (sustituye al pendiente que hubiera).
  const workKg = exercise.sets.find((s) => !s.warmup && s.weight > 0)?.weight ?? 0
  const addWarmup = () => edit((e) => {
    const sets = warmupSets(workKg, unit, barbell ? barKg : undefined, fromFloor(exercise.exerciseId))
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
  const lastMax = Math.max(0, ...previous.filter((p) => !p.warmup).map((p) => p.weight))
  const prevDrops = previous.filter((p) => p.kind === 'drop')
  let drops = 0

  return (
    <section className="card" id={`ex-${exercise.id}`}>
      <div className="row">
        <button className="row grow" style={{ textAlign: 'left' }} onClick={onInfo}>
          <Thumb exerciseId={exercise.exerciseId} size={44} />
          <span className="grow">
            <span className="clamp-2 exercise-name">
              {slot.letter && <span className="group-badge">{slot.letter}{slot.position}</span>}
              {exercise.name}
            </span>
            <span className="small muted" style={{ display: 'block' }}>{muscleLabel(exercise.muscle)}</span>
            <span className="small exercise-meta">
              {[objective, inGroupWithNext ? t(`Sin descanso, sigue con ${nextName}`, `No rest, go on to ${nextName}`) : `${t('descanso', 'rest')}\u00a0${rest(exercise.rest).replace(' ', '\u00a0')}`].filter(Boolean).join(' · ')}
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
        <span className="small row" style={{ color: 'var(--text-2)', gap: 6, alignItems: 'flex-start' }}>
          <BatteryLow size={16} style={{ flexShrink: 0 }} />
          {t('Sesión de descarga: menos series y algo menos de peso para recuperar. La próxima vez vuelves a tus pesos.', 'Deload session: fewer sets and a bit less weight to recover. Next time you go back to your usual weights.')}
        </span>
      ) : !hint && stalled && exercise.auto?.kind !== 'wave' && !exercise.sets.some((x) => x.done) && (
        // Una línea plegada: no empuja las series hacia abajo; las opciones, al tocarla.
        <div className={`stall-box ${stallOpen ? 'open' : ''}`}>
          <button className="stall-line small" onClick={() => setStallOpen(!stallOpen)} aria-expanded={stallOpen}>
            <TrendingDown size={15} style={{ flexShrink: 0 }} aria-hidden="true" />
            <span className="grow">{t(`${STALL_SESSIONS} sesiones sin superar tu mejor marca`, `${STALL_SESSIONS} sessions without beating your best`)}</span>
            <span className="stall-more">{stallOpen ? t('Cerrar', 'Close') : t('Opciones', 'Options')}</span>
          </button>
          {stallOpen && (
            <>
              <span className="small">
                {t(`Tu mejor marca: 1RM estimado de ~${int(fromKg(stalled.best, unit))} ${unit}. Una sesión más ligera (descarga: menos series y −10 % de peso) o cambiar a una variante suele ayudar a volver a progresar.`,
                  `Your best: estimated 1RM of ~${int(fromKg(stalled.best, unit))} ${unit}. A lighter session (deload: fewer sets and −10% weight) or switching to a variation usually helps you progress again.`)}
              </span>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn small secondary" onClick={() => edit((e) => applyDeload(e, unit))}>{t('Hacer descarga', 'Deload')}</button>
                <button className="btn small plain" onClick={() => setReplacing(true)}>{t('Ver variantes', 'Variations')}</button>
              </div>
            </>
          )}
        </div>
      )}

      {painBefore && exercise.pain === undefined && !exercise.sets.some((x) => x.done) && (
        <PainWarning last={painBefore} onAlternatives={() => setReplacing(true)}
          onLighter={() => edit((e) => {
            const step = increment(unit)
            for (const x of e.sets) if (!x.done && x.weight > 0) x.weight = toKg(Math.round(fromKg(x.weight * 0.9, unit) / step) * step, unit)
          })} />
      )}
      {exercise.pain !== undefined && (
        <button className="pain-pill" onClick={() => setPainOpen(true)}>{t('Molestia', 'Discomfort')} {exercise.pain}/10{exercise.painNote ? ` · ${exercise.painNote}` : ''}</button>
      )}
      {tracking === 'weight_reps' && (
        <EffortSuggestion exercise={exercise} settings={settings} at={startedAt}
          onApply={(ids, kg) => edit((e) => { for (const x of e.sets) if (ids.includes(x.id)) x.weight = kg })} />
      )}
      {hint && !exercise.deload && (
        <span className="small row" style={{ color: 'var(--green-text)', gap: 6, alignItems: 'flex-start' }}>
          <ArrowUpRight size={16} style={{ flexShrink: 0 }} />
          {hint === 'reps' ? t('La última vez llegaste al máximo de repeticiones.', 'Last time you reached the top of the rep range.') : t('La última vez te sobró margen (RPE 7 o menos).', 'Last time you had reps to spare (RPE 7 or less).')}
          {' '}{t('Prueba con', 'Try')} {weight(Math.max(...previous.map((p) => p.weight)) + toKg(increment(unit), unit), unit)}.
        </span>
      )}

      {firstEver && (
        <div className="howto small">
          <Info size={16} aria-hidden="true" />
          <span>{t('Escribe el peso y las repeticiones que hagas y, al acabar la serie, toca el círculo ○. El descanso empieza solo.', 'Type the weight and the reps you do and, when the set is over, tap the circle ○. The rest timer starts by itself.')}</span>
        </div>
      )}
      {BODYWEIGHT_LIFTS.has(exercise.exerciseId) && exercise.bodyweight === undefined && tracking === 'weight_reps' && (
        <button className="small muted" style={{ textAlign: 'left', textDecoration: 'underline' }} onClick={() => { minimizeWorkout(); navigate('profile', 'measurements') }}>
          {t('Apunta tu peso en Medidas para que cuente en tus marcas de este ejercicio.', 'Log your weight in Measurements so it counts in your records for this exercise.')}
        </button>
      )}
      {weightHint && (
        <span className="small muted">
          {bodyweight ? t('Sin lastre, deja el peso en 0.', 'With no added weight, leave the weight at 0.')
            : t('¿Qué peso? Uno con el que podrías hacer unas 12 repeticiones bien hechas. La próxima vez te lo proponemos.', 'Which weight? One you could lift about 12 times with good form. Next time we suggest it.')}
        </span>
      )}
      <div className={`set-grid set-head ${tracking}`}>
        <span>{t('SERIE', 'SET')}</span><span>{t('ÚLTIMA VEZ', 'LAST TIME')}</span>
        {tracking === 'weight_reps' && <>
          {exercise.assisted
            ? <span title={t('Ayuda de la máquina', 'Machine assistance')}>{t('AYUDA', 'ASSIST')}</span>
            : <span title={bodyweight ? t('Lastre añadido (0 = sin peso)', 'Added weight (0 = none)') : undefined}>{bodyweight ? `+${unit.toUpperCase()}` : unit.toUpperCase()}</span>}
          <span>REPS</span>
        </>}
        {tracking === 'time' && <span>{t('TIEMPO', 'TIME')}</span>}
        {tracking === 'distance_time' && <><span>KM</span><span>{t('TIEMPO', 'TIME')}</span></>}
        <span><Check size={14} /></span>
      </div>

      {exercise.sets.map((set, i) => {
        // Los drop sets no suman al número de serie: van pegados a la anterior.
        const drop = !set.warmup && set.kind === 'drop'
        // Por lados: el izquierdo y el derecho comparten número (1·I, 1·D).
        const number = set.warmup || drop ? 0 : set.side === 'R' ? working : ++working
        const sideMark = set.side === 'L' ? t('·I', '·L') : set.side === 'R' ? t('·D', '·R') : ''
        const label = set.warmup ? t('C', 'W') : drop ? 'D' : `${number}${sideMark}`
        const sameSide = set.side ? prevMain.filter((p) => p.side === set.side) : prevMain
        const prev = set.warmup ? undefined
          : drop ? prevDrops[drops++]
          : sameSide.length ? sameSide[Math.min(number - 1, sameSide.length - 1)] : undefined
        const next = exercise.sets[i + 1]
        const dropNext = next && !next.done && !next.warmup && next.kind === 'drop'
        // Tras el lado izquierdo se pasa al derecho sin descanso.
        const sideNext = set.side === 'L' && next?.side === 'R' && !next.done
        return (
          <SetRow key={set.id} set={set} label={label} previous={prev} tracking={tracking} current={set.id === currentSet}
            repsPlaceholder={hasTarget ? target : '0'} timePlaceholder={clock(targetSeconds)} unit={unit} barbell={barbell} lastMax={lastMax}
            onChange={(patch) => edit((e) => { Object.assign(e.sets.find((s) => s.id === set.id)!, patch) })}
            onDelete={() => withUndo(t('Serie eliminada', 'Set deleted'), () => edit((e) => { e.sets = e.sets.filter((s) => s.id !== set.id) }))}
            askRpe={rpeFor === set.id}
            onAskRpe={() => onAskRpe(set.id)}
            onRpeDone={() => onAskRpe(undefined)}
            onRpePicked={(rpe) => onEffort(set.id, rpe, exercise.rest)}
            onCompleted={() => {
              onSetDone(set)
              if (!set.warmup && set.kind !== 'failure') onAskRpe(set.id)
              // Antes de un drop set no se descansa: se quita peso y se sigue. Igual al cambiar de lado y
              // dentro de una superserie. Si quedaba un descanso de antes en marcha, se para: ya se ha acabado.
              if (dropNext || sideNext) return stopRest()
              if (inGroupWithNext) { stopRest(); return onGroupNext() }
              // Lo que toca después: la siguiente serie pendiente de este ejercicio o del siguiente.
              const later = exercise.sets.slice(i + 1).find((s) => !s.done)
              const nextUp = later ? spokenSet(exercise, later, unit) : upcoming ? spokenSet(upcoming, upcoming.sets.find((s) => !s.done)!, unit) : undefined
              startRest(set.warmup ? Math.min(exercise.rest, 60) : exercise.rest, nextUp, set.id)
              // Al fallo es RPE 10: el descanso se alarga ya.
              if (set.kind === 'failure' && !set.warmup && !simple) onEffort(set.id, 10, exercise.rest)
              if (slot.letter) onRoundEnd()
            }} />
        )
      })}

      <button className="nav-btn" style={{ justifyContent: 'center', fontWeight: 600 }} onClick={() => edit((e) => {
        const last = [...e.sets].reverse().find((s) => s.kind !== 'drop') ?? e.sets[e.sets.length - 1]
        const fresh = (side?: 'L' | 'R'): SetEntry => ({
          id: crypto.randomUUID(), weight: last?.weight ?? 0, reps: last?.reps ?? 0, done: false, warmup: false,
          ...(last?.duration ? { duration: last.duration } : {}),
          ...(last?.distance ? { distance: last.distance } : {}),
          ...(side ? { side } : {}),
        })
        // Por lados se añade la pareja.
        if (e.unilateral) e.sets.push(fresh('L'), fresh('R'))
        else e.sets.push(fresh())
      })}>
        <Plus size={18} /> {t('Añadir serie', 'Add set')}
      </button>

      {menu && (
        <ActionSheet title={exercise.name} onClose={() => setMenu(false)} options={[
          ...(tracking === 'weight_reps' && workKg > 0 ? [{ label: t('Añadir series de calentamiento', 'Add warm-up sets'), onSelect: addWarmup }] : []),
          ...(barbell && tracking === 'weight_reps' && workKg > 0 ? [{ label: t(`Discos para ${weight(workKg, unit)}`, `Plates for ${weight(workKg, unit)}`), onSelect: () => setPlates(true) }] : []),
          ...(tracking === 'weight_reps' && lastWorking && !simple ? [{ label: t('Añadir drop set', 'Add drop set'), onSelect: addDropSet }] : []),
          ...(tracking === 'weight_reps' && !simple ? [exercise.deload
            ? { label: t('Quitar marca de descarga', 'Remove deload mark'), onSelect: () => edit((e) => { delete e.deload }) }
            : { label: t('Hacer sesión de descarga', 'Make it a deload session'), onSelect: () => edit((e) => applyDeload(e, unit)) }] : []),
          { label: note ? t('Editar nota del ejercicio', 'Edit exercise note') : t('Añadir nota del ejercicio', 'Add exercise note'), onSelect: () => setNoteOpen(true) },
          { label: exercise.pain !== undefined ? t('Editar molestia', 'Edit discomfort') : t('Anotar molestia', 'Log discomfort'), onSelect: () => setPainOpen(true) },
          ...(tracking === 'weight_reps' ? [{
            label: exercise.unilateral ? t('Quitar «por lados»', 'Stop logging per side') : t('Por lados (a una mano o pierna)', 'Per side (one arm or leg)'),
            onSelect: () => setMode({ unilateral: !exercise.unilateral }),
          }, {
            label: exercise.assisted ? t('Quitar «máquina asistida»', 'Not an assisted machine') : t('Máquina asistida (el peso ayuda)', 'Assisted machine (weight = assistance)'),
            onSelect: () => setMode({ assisted: !exercise.assisted }),
          }] : []),
          { label: t('Sustituir ejercicio', 'Replace exercise'), onSelect: () => setReplacing(true) },
          ...(index < total - 1 && !inGroupWithNext && !simple ? [{
            label: slot.letter ? (isSuperset ? t('Añadir el siguiente a la superserie', 'Add the next one to the superset') : t('Añadir el siguiente al circuito', 'Add the next one to the circuit')) : t('Hacer superserie con el siguiente', 'Superset with the next one'),
            onSelect: () => editList((list, i) => linkWithNext(list, i)),
          }] : []),
          ...(slot.letter ? [{ label: isSuperset ? t('Sacar de la superserie', 'Remove from superset') : t('Sacar del circuito', 'Remove from circuit'), onSelect: () => editList((list, i) => unlink(list, i)) }] : []),
          { label: `${t('Descanso', 'Rest')}: ${rest(exercise.rest)}`, onSelect: () => setRestMenu(true) },
          ...(!simple ? [{ label: `${t('Registrar por', 'Log by')}: ${trackingOptions().find((o) => o.id === tracking)!.label.toLowerCase()}`, onSelect: () => setTrackingMenu(true) }] : []),
          ...(index > 0 ? [{ label: t('Subir', 'Move up'), onSelect: () => editList((list, i) => { [list[i - 1], list[i]] = [list[i], list[i - 1]] }) }] : []),
          ...(index < total - 1 ? [{ label: t('Bajar', 'Move down'), onSelect: () => editList((list, i) => { [list[i + 1], list[i]] = [list[i], list[i + 1]] }) }] : []),
          { label: t('Quitar ejercicio', 'Remove exercise'), destructive: true, onSelect: () => withUndo(t(`Quitado: ${exercise.name}`, `Removed: ${exercise.name}`), () => editList((list, i) => { list.splice(i, 1) })) },
        ]} />
      )}
      {painOpen && (
        <PainSheet exercise={exercise} onClose={() => setPainOpen(false)} onSave={(pain, painNote) => edit((e) => {
          e.pain = pain
          e.painNote = pain !== undefined && painNote ? painNote : undefined
        })} />
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

function SetRow({ set, label, previous, tracking, current, repsPlaceholder, timePlaceholder, unit, barbell, askRpe, onAskRpe, onRpeDone, onRpePicked, onChange, onDelete, onCompleted, lastMax }: {
  set: SetEntry
  current: boolean
  askRpe: boolean
  onAskRpe: () => void
  onRpeDone: () => void
  /** RPE elegido (para ajustar el descanso). */
  onRpePicked: (rpe: number | undefined) => void
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
  /** Mayor peso apuntado en este ejercicio la última vez (kg), para avisar de un peso imposible. */
  lastMax: number
}) {
  const simple = useData().settings.simpleMode === true
  const [check, setCheck] = useState<string>()
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
    // Un cero de más (800 en vez de 80) estropearía marcas y estadísticas: se pregunta antes.
    const warning = tracking === 'weight_reps' ? suspicious(set, lastMax, unit) : undefined
    if (warning) return setCheck(warning)
    complete()
  }
  const complete = () => {
    ;(document.activeElement as HTMLElement | null)?.blur()
    onChange({ done: true, doneAt: Date.now(), ...(set.kind === 'failure' && !set.warmup ? { rpe: 10 } : {}) })
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
    <div id={`set-${set.id}`} className={`set-grid set-row ${tracking} ${set.done ? 'done' : ''} ${current ? 'current' : ''}`}>
      <button className={`set-label ${set.warmup ? 'warmup' : set.kind ?? ''}`} onClick={() => setMenu(true)}
        aria-label={`${t('Opciones de la serie', 'Set options')} (${setKindLabel(set).toLowerCase()})`}>
        {label}{!set.warmup && (set.kind === 'amrap' || set.kind === 'failure') && <sup>{set.kind === 'amrap' ? 'A' : 'F'}</sup>}
      </button>
      <span className="set-prev">{previous ? setShortText(simple ? { ...previous, rpe: undefined } : previous, tracking, unit).replace(' × ', '×') : '—'}</span>
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
          { label: t('Sí, es correcto', 'Yes, it is right'), onSelect: complete },
          { label: t('Corregirlo', 'Fix it'), onSelect: () => setInvalid(true) },
        ]} />
      )}
    </div>
    {current && !set.done && tracking === 'weight_reps' && !set.warmup && (
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
      ? t('Mismo peso hasta completar todas las reps.', 'Same weight until you complete every rep.')
      : auto.week === 4
        ? t(`5/3/1 · semana 4 de 4 (descarga) · TM ${weight(auto.tm, unit)}`, `5/3/1 · week 4 of 4 (deload) · TM ${weight(auto.tm, unit)}`)
        : t(`5/3/1 · semana ${auto.week} de 4 · TM ${weight(auto.tm, unit)} · en la última serie, todas las repeticiones que puedas con buena técnica.`,
          `5/3/1 · week ${auto.week} of 4 · TM ${weight(auto.tm, unit)} · on the last set, as many good reps as you can.`)
  return (
    <span className="small row" style={{ color: 'var(--text-2)', gap: 6, alignItems: 'flex-start' }}>
      <TrendingUp size={16} style={{ flexShrink: 0 }} />
      {text}
    </span>
  )
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
  return (
    <Overlay>
    <div className="rest-bar" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 45 }}>
      <span className="rest-line" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
      <div style={{ maxWidth: 528, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="rest-expand" onClick={() => setRestBig(true)} aria-label={t('Ver la cuenta atrás en grande', 'Show the countdown full screen')}>
          <span className="rest-label">{t('Descanso', 'Rest')}</span>
          <span className="rest-time">{clock(Math.ceil(remaining))}</span>
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
