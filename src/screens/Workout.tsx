import { BlockStatus } from '../components/Block'
import { lastPain } from '../lib/autoreg'
import { navigate } from '../lib/router'
import { focusFor } from '../lib/warmupRoutine'
import { BatteryLow, ChevronDown, Link2, Maximize2, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ActionSheet, Progress, useCatalog, useScrollLock, useTick, useToast } from '../components/ui'
import { groupKind, groupSlots } from '../lib/groups'
import { clock, fromKg, int, rest, toKg } from '../lib/format'
import { t } from '../lib/i18n'
import { e1rm, lastSets, loadSets, records, repRecordBeaten, repRecords, setLoad, stall, workingSets } from '../lib/stats'
import { finishedSessions, rpeOn, useData, type Session, type SessionExercise, type SetEntry } from '../lib/store'
import { adjustRestForEffort, prepareAudio } from '../lib/timer'
import { trackingOf } from '../lib/tracking'
import { addExercises, discardSession, editSession, finishSession, keepScreenOn, minimizeWorkout } from '../lib/workout'
import { ExercisePicker, ExerciseSheet } from './Exercises'
import { BARS } from '../lib/plates'
import { addsLoad, bodyweightText, liftText } from '../lib/bodyweight'
import { FocusMode, ReadinessCheck, RestBar } from './WorkoutFocus'
import { ExerciseBlock, kitOf } from './WorkoutExercise'

export function WorkoutScreen({ session }: { session: Session }) {
  const data = useData()
  const now = useTick()
  const unit = data.settings.unit
  const history = useMemo(() => finishedSessions(data), [data])
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [])
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
    const shown = e.bodyweight === undefined ? liftText(set, unit, addsLoad(e)) : bodyweightText(e.assisted ? -set.weight : set.weight, unit)
    // Récord real de repeticiones (p. ej. el mayor peso a 5): frente al historial y a lo ya hecho hoy.
    const today = session.exercises.filter((x) => x.exerciseId === e.exerciseId).flatMap(workingSets).filter((x) => x.id !== set.id)
    const before = repRecords(e.exerciseId, [...history, { ...session, exercises: [{ ...e, sets: today }] }])
    const repRecord = repRecordBeaten(load, set.reps, before)
    if (value <= best + 0.01 && repRecord !== undefined) {
      showToast(t(`Récord de ${repRecord} repeticiones en ${e.name}: ${shown}`, `${repRecord}-rep record on ${e.name}: ${shown}`), 'record')
      navigator.vibrate?.([60, 60, 120])
      return
    }
    if (value > best + 0.01) {
      showToast(t(`Nuevo récord en ${e.name}: ${shown} × ${set.reps} (máx. estimado ~${int(fromKg(value, unit))} ${unit})`, `New record on ${e.name}: ${shown} × ${set.reps} (est. max ~${int(fromKg(value, unit))} ${unit})`), 'record')
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
  // El aviso de «estancado», solo en el primer ejercicio que lo esté: en todos a la vez desanimaba
  // (y la lista entera ya está en Progreso).
  const stalledAt = session.exercises.findIndex((e) => trackingOf(e) === 'weight_reps' && stall(e.exerciseId, history))
  const [focus, setFocus] = useState(false)
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
        kit={kitOf(e.exerciseId, catalog.get(e.exerciseId)?.equipment)}
        barKg={barKg}
        previous={lastSets(e.exerciseId, history)}
        upcoming={session.exercises.slice(i + 1).find((x) => x.sets.some((s) => !s.done))}
        currentSet={currentSet}
        stalled={i === stalledAt ? stall(e.exerciseId, history) : undefined}
        lastPain={lastPain(e.exerciseId, history)}
        startedAt={session.start}
        rpeFor={rpeFor}
        on={{
          info: () => setDetail(e.exerciseId),
          groupNext: () => goToNext(i),
          roundEnd: () => roundEnd(i),
          askRpe,
          setDone: (set) => onSetDone(e, set),
          effort: onEffort,
        }}
      />
    )
  }

  const allSets = session.exercises.flatMap((e) => e.sets)
  // La cuenta de arriba, sin el calentamiento: la misma que Inicio y Rutinas («19 series», no «0 de 22»). El aviso
  // de terminar cuenta igual: el calentamiento sin marcar no es «3 series que no se guardarán».
  const working = allSets.filter((s) => !s.warmup)
  const done = working.filter((s) => s.done).length
  const pending = working.length - done
  const started = allSets.some((s) => s.done)

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
      {/* Su título para el lector (el nombre se edita en un campo), y el foco al abrir: el entreno es lo que hay. */}
      <h1 className="sr-only" tabIndex={-1} ref={heading}>{t(`Entrenamiento: ${session.name}`, `Workout: ${session.name}`)}</h1>
      {focus && <FocusMode session={session} unit={unit} onClose={() => setFocus(false)} />}
      <div className="fullscreen-inner">
        <div className="nav-bar">
          <div className="left" style={{ gap: 6 }}>
            <button className="icon-btn" onClick={minimizeWorkout} aria-label={t('Minimizar', 'Minimize')}><ChevronDown size={22} /></button>
            {currentSet && <button className="btn small secondary" onClick={() => setFocus(true)} aria-label={t('Modo foco: solo la serie que toca, en grande', 'Focus mode: just the current set, big')}><Maximize2 size={15} /> {t('Foco', 'Focus')}</button>}
          </div>
          <div className="title workout-clock">{clock((now - session.start) / 1000)}</div>
          <div className="right">
            <button className="btn small secondary" onClick={() => setConfirm('finish')}>{t('Terminar', 'Finish')}</button>
          </div>
        </div>

        <div className="screen with-nav" style={{ paddingBottom: 140 }}>
          {/* Una franja y no una tarjeta: nombre y cuenta en una línea, la barra debajo. Antes de la primera serie había
              tres bloques (tarjeta, «¿Cómo estás?», «Calentar») y la serie 1 quedaba a media pantalla. */}
          <div className="workout-head">
            <div className="workout-head-row">
              <input className="workout-name" aria-label={t('Nombre del entrenamiento', 'Workout name')} value={session.name} onChange={(e) => editSession(session.id, (s) => { s.name = e.target.value })} />
              {working.length > 0 && <span className="workout-count">{t(`${done} de ${working.length} series`, `${done} of ${working.length} sets`)}</span>}
            </div>
            {working.length > 0 && <Progress value={done} total={working.length} />}
            <BlockStatus at={session.start} />
            {session.exercises.some((e) => e.deload && e.auto?.kind !== 'wave') && (
              <span className="small row workout-deload"><BatteryLow size={16} aria-hidden="true" />
                {t('Sesión de descarga: menos series y algo menos de peso para recuperar. La próxima vez vuelves a tus pesos.', 'Deload session: fewer sets and a bit less weight to recover. Next time you go back to your usual weights.')}</span>
            )}
            {/* Antes de la primera serie, solo dos accesos pequeños: la lista de series queda a la vista. */}
            {!started && session.exercises.length > 0 && <ReadinessCheck session={session} unit={unit} warmup={() => {
              minimizeWorkout()
              navigate('timer', 'warmup', focusFor(session.exercises.map((e) => e.muscle)))
            }} />}
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
