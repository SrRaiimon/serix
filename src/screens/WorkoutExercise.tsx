// Un ejercicio del entreno: sus series, sus avisos (estancado, molestia, primera vez) y sus menús.
import { EffortSuggestion, PainSheet, PainWarning } from '../components/Coaching'
import { navigate } from '../lib/router'
import { ArrowUpRight, BatteryLow, Check, Ellipsis, Info, Plus, StickyNote, TrendingDown, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { ActionSheet, Thumb } from '../components/ui'
import { linkWithNext, normalizeGroups, unlink, type GroupSlot } from '../lib/groups'
import { clock, fromKg, increment, int, num, rest, restOptions, toKg, weight, type Unit } from '../lib/format'
import { t } from '../lib/i18n'
import { muscleLabel } from '../lib/labels'
import { progressionHint, STALL_SESSIONS, type Stall } from '../lib/stats'
import { finishedSessions, update, useData, withUndo, type AutoProgress, type Session, type SessionExercise, type SetEntry } from '../lib/store'
import { startRest, stopRest } from '../lib/timer'
import { defaultTargetSeconds, trackingOf, trackingOptions } from '../lib/tracking'
import { applyDeload, deloadWeek, editSession, undoDeload, fromSides, minimizeWorkout, replaceSessionExercise, toSides } from '../lib/workout'
import { AlternativesSheet } from './Alternatives'
import { PlatesSheet } from './Plates'
import { ExerciseNoteSheet } from '../components/ExerciseNote'
import { BARBELL_EQUIPMENT, fromFloor, warmupSets } from '../lib/warmup'
import { addsLoad, BODYWEIGHT_LIFTS } from '../lib/bodyweight'
import { SetRow, type SetContext } from './WorkoutSet'

/** Material con el que una serie se hace con peso (para avisar si se marca a 0). */
const LOADED = new Set(['barbell', 'ez-bar', 'dumbbell', 'kettlebell', 'machine', 'cable'])

/** Lo que el material cambia en el registro de un ejercicio. */
interface Kit {
  /** Con barra: discos por lado y calentamiento desde la barra sola. */
  barbell: boolean
  /** De peso corporal: el peso apuntado es lastre. */
  bodyweight: boolean
  /** Con mancuernas o pesas rusas (se puede apuntar el peso de cada una). */
  pairs: boolean
  /** Con barra, mancuernas o máquina: avisar si se marca una serie sin peso. */
  needsWeight: boolean
}

export const kitOf = (exerciseId: string, equipment = ''): Kit => ({
  barbell: BARBELL_EQUIPMENT.has(equipment),
  bodyweight: equipment === 'bodyweight' || addsLoad({ exerciseId }),
  pairs: ['dumbbell', 'kettlebell'].includes(equipment),
  needsWeight: LOADED.has(equipment) && !BODYWEIGHT_LIFTS.has(exerciseId),
})

/** Lo que un ejercicio le cuenta al entrenamiento. */
interface ExerciseEvents {
  info: () => void
  /** Serie hecha dentro de un grupo: al siguiente ejercicio de la ronda. */
  groupNext: () => void
  roundEnd: () => void
  askRpe: (setId?: string) => void
  /** Serie recién marcada (para avisar si es récord). */
  setDone: (set: SetEntry) => void
  /** Esfuerzo de una serie: ajusta el descanso que empezó (ver adjustRestForEffort). */
  effort: (setId: string, rpe: number | undefined, base: number) => void
}

export function ExerciseBlock({ sessionId, exercise, index, total, slot, nextName, unit, kit, barKg, previous, upcoming, currentSet, stalled, rpeFor, on, lastPain: painBefore, startedAt }: {
  sessionId: string
  exercise: SessionExercise
  index: number
  total: number
  slot: GroupSlot
  /** Siguiente ejercicio del grupo (si no es el último de la ronda). */
  nextName?: string
  unit: Unit
  kit: Kit
  barKg: number
  previous: SetEntry[]
  /** Siguiente ejercicio con series pendientes (para el aviso por voz al acabar el descanso). */
  upcoming?: SessionExercise
  /** Primera serie pendiente del entrenamiento (lleva la cinta de «aquí vas»). */
  currentSet?: string
  /** Estancado en las últimas sesiones (se propone descarga o variante). */
  stalled?: Stall
  rpeFor?: string
  on: ExerciseEvents
  /** Molestia apuntada la última vez que se hizo este ejercicio. */
  lastPain?: { pain: number; date: number; note?: string }
  startedAt: number
}) {
  const { barbell, needsWeight } = kit
  // En la máquina asistida el peso es la ayuda: ni «+», ni «deja el peso en 0», ni lastre.
  const bodyweight = kit.bodyweight && !exercise.assisted
  const [menu, setMenu] = useState<false | 'main' | 'order' | 'settings'>(false)
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
  // La ayuda del primer entreno sale una vez: al marcar la primera serie ya no vuelve (aunque se desmarque).
  if (exercise.sets.some((x) => x.done)) firstSetDone = true
  const firstEver = index === 0 && exercise.sets[0]?.id === currentSet && !finishedSessions(data).length && !firstSetDone
  // Ejercicio nuevo sin peso puesto: una pista para elegirlo (la próxima vez ya se propone solo).
  // Se queda hasta marcar la primera serie (no al escribir el peso): al quitarse, la fila subía y el toque
  // que iba al ○ caía en otro sitio.
  const weightHint = trackingOf(exercise) === 'weight_reps' && !previous.length && !exercise.assisted
    && exercise.sets.some((x) => x.id === currentSet) && !exercise.sets.some((x) => x.done)
  // «Uno con el que llegues a 12 repeticiones…»; sin objetivo de repeticiones (entreno libre), sin número.
  const repsTarget = exercise.repsMax > 0 ? exercise.repsMax : undefined
  const edit = (fn: (e: SessionExercise, s: Session) => void) => editSession(sessionId, (s) => {
    const e = s.exercises.find((x) => x.id === exercise.id)
    if (e) fn(e, s)
  })
  /** Asistido o por lados: en este entrenamiento y, para la próxima vez, en este ejercicio. */
  const setMode = (change: { assisted?: boolean; unilateral?: boolean; perHand?: boolean }) => {
    edit((e) => {
      if (change.assisted !== undefined) e.assisted = change.assisted || undefined
      if (change.perHand !== undefined) e.perHand = change.perHand || undefined
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
      if (!mode.perHand) delete mode.perHand
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
  const inGroupWithNext = nextName !== undefined
  const tracking = trackingOf(exercise)
  const hasTarget = exercise.repsMax > 0
  const target = exercise.repsMin === exercise.repsMax ? `${exercise.repsMin}` : `${exercise.repsMin}-${exercise.repsMax}`
  const targetSeconds = exercise.targetSeconds ?? defaultTargetSeconds
  // Con progresión automática el peso ya viene calculado: no hace falta sugerirlo.
  const hint = tracking === 'weight_reps' && !exercise.auto && !exercise.assisted ? progressionHint(previous, exercise.repsMax) : null
  const stallShown = !exercise.deload && !hint && !!stalled && exercise.auto?.kind !== 'wave' && !exercise.sets.some((x) => x.done)
  // En el 5/3/1 las repeticiones cambian cada semana: lo explica la nota de la progresión.
  const objective = tracking === 'weight_reps' ? (hasTarget && exercise.auto?.kind !== 'wave' ? `${target.replace('-', '\u2011')}\u00a0reps` : '')
    : tracking === 'time' ? `${t('Objetivo', 'Target')} ${clock(targetSeconds)}` : ''
  let working = 0
  // Calentamiento: rampa hasta el peso de la primera serie efectiva (sustituye al pendiente que hubiera).
  const workKg = exercise.sets.find((s) => !s.warmup && s.weight > 0)?.weight ?? 0
  const addWarmup = () => edit((e) => {
    const sets = warmupSets(workKg, unit, barbell ? barKg : undefined, fromFloor(exercise.exerciseId), exercise.exerciseId, previous.map((p) => p.weight))
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
  const setContext: SetContext = {
    fresh: !previous.length, bodyweight, barbell, needsWeight: needsWeight && !exercise.assisted, tracking, unit, lastMax,
    repsPlaceholder: hasTarget ? target : '0', defaultReps: exercise.auto?.kind === 'wave' ? 0 : exercise.repsMin,
    timePlaceholder: clock(targetSeconds), targetSeconds, tempo: exercise.tempo,
  }

  return (
    <section className="card" id={`ex-${exercise.id}`}>
      <div className="row">
        <button className="row grow" style={{ textAlign: 'left' }} onClick={on.info}>
          <Thumb exerciseId={exercise.exerciseId} size={44} />
          <span className="grow">
            <span className="clamp-2 exercise-name">
              {slot.letter && <span className="group-badge">{slot.letter}{slot.position}</span>}
              {exercise.name}
            </span>
            <span className="small muted" style={{ display: 'block' }}>{muscleLabel(exercise.muscle)}</span>
            <span className="small exercise-meta">
              {[objective, exercise.tempo ? `tempo\u00a0${exercise.tempo}` : '', inGroupWithNext ? t(`Sin descanso, sigue con ${nextName}`, `No rest, go on to ${nextName}`) : `${t('descanso', 'rest')}\u00a0${rest(exercise.rest).replace(' ', '\u00a0')}`].filter(Boolean).join(' · ')}
            </span>
          </span>
        </button>
        <button className="icon-btn" onClick={() => setMenu('main')} aria-label={t('Opciones del ejercicio', 'Exercise options')}><Ellipsis size={20} /></button>
      </div>

      {note && (
        <button className="exercise-note" onClick={() => setNoteOpen(true)} aria-label={t('Editar la nota del ejercicio', 'Edit the exercise note')}>
          <StickyNote size={15} style={{ flexShrink: 0 }} /> <span>{note}</span>
        </button>
      )}

      {/* En descarga, ni «para subir de peso» ni el aviso repetido: va una sola vez arriba del entreno. Estancado, un
          solo mensaje: «para subir de peso» y «3 sesiones sin superar tu marca» decían lo mismo apilados. */}
      {exercise.auto && !(exercise.deload && exercise.auto.kind !== 'wave') && !(stallShown && exercise.auto.kind === 'hold') && <AutoNote auto={exercise.auto} unit={unit} repsMax={exercise.repsMax} />}

      {exercise.deload && exercise.auto?.kind !== 'wave' && !deloadWeek(data, startedAt) ? (
        <span className="small row" style={{ color: 'var(--text-2)', gap: 6, alignItems: 'flex-start' }}>
          <BatteryLow size={16} style={{ flexShrink: 0 }} aria-hidden="true" />
          {t('Descarga de este ejercicio: menos series y un 10 % menos de peso. La próxima vez vuelves a tu peso.', 'Deload for this exercise: fewer sets and 10% less weight. Next time you go back to your weight.')}
        </span>
      ) : stallShown && stalled && (
        <StallBox best={stalled.best} unit={unit} onDeload={() => edit((e) => applyDeload(e, unit))} onVariants={() => setReplacing(true)} />
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

      {/* Una sola ayuda, en gris: el primer día explica cómo se apunta (y qué peso elegir). */}
      {firstEver && (
        <div className="howto small">
          <Info size={16} aria-hidden="true" />
          <span>
            {bodyweight
              ? t('Apunta las repeticiones y toca ○ al acabar la serie: el descanso empieza solo.', 'Enter your reps and tap ○ when the set is done: rest starts by itself.')
              : t('Apunta peso y repeticiones y toca ○ al acabar la serie: el descanso empieza solo.', 'Enter weight and reps and tap ○ when the set is done: rest starts by itself.')}
            {weightHint && !bodyweight ? ` ${repsTarget
              ? t(`Peso: uno con el que hagas ${repsTarget} repeticiones y aún te queden 2 más.`, `Weight: one you can lift ${repsTarget} times with 2 more left in you.`)
              : t('Peso: uno que muevas bien y con el que aún te queden 2 repeticiones más al acabar.', 'Weight: one you move well, with 2 more reps left in you at the end.')}` : ''}
          </span>
        </div>
      )}
      {BODYWEIGHT_LIFTS.has(exercise.exerciseId) && exercise.bodyweight === undefined && tracking === 'weight_reps' && (
        <button className="small muted" style={{ textAlign: 'left', textDecoration: 'underline' }} onClick={() => { minimizeWorkout(); navigate('profile', 'measurements') }}>
          {t('Apunta tu peso en Medidas para que cuente en tus marcas de este ejercicio.', 'Log your weight in Measurements so it counts in your records for this exercise.')}
        </button>
      )}
      {weightHint && !(firstEver && !bodyweight) && (
        <span className="small muted">
          {bodyweight ? t('Sin lastre, deja el peso en 0.', 'With no added weight, leave the weight at 0.')
            : repsTarget
              ? t(`¿Qué peso? Uno con el que hagas ${repsTarget} repeticiones bien hechas y aún te queden 2 más. La próxima vez te lo proponemos.`, `Which weight? One you can lift ${repsTarget} times with good form and 2 more left in you. Next time we suggest it.`)
              : t('¿Qué peso? Uno que muevas bien y con el que aún te queden 2 repeticiones más. La próxima vez te lo proponemos.', 'Which weight? One you move well, with 2 more reps left in you. Next time we suggest it.')}
        </span>
      )}
      {/* Sin historial, la columna «Última vez» solo tendría rayas: se quita y los campos ganan sitio. */}
      <div className={`set-grid set-head ${tracking} ${previous.length ? '' : 'fresh'}`}>
        <span>{t('SERIE', 'SET')}</span>{previous.length > 0 && <span>{t('ÚLTIMA VEZ', 'LAST TIME')}</span>}
        {tracking === 'weight_reps' && <>
          {exercise.assisted
            ? <span title={t('Ayuda de la máquina', 'Machine assistance')}>{t('AYUDA', 'ASSIST')}</span>
            : <span title={bodyweight ? t('Lastre añadido (0 = sin peso)', 'Added weight (0 = none)') : exercise.perHand ? t('Peso de cada mancuerna', 'Weight of each dumbbell') : undefined}>{bodyweight ? t('LASTRE', `+${unit.toUpperCase()}`) : exercise.perHand ? `${unit.toUpperCase()} ${t('C/U', 'EACH')}` : unit.toUpperCase()}</span>}
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
          <SetRow key={set.id} set={set} label={label} previous={prev} current={set.id === currentSet} context={setContext}
            onChange={(patch) => edit((e) => { Object.assign(e.sets.find((s) => s.id === set.id)!, patch) })}
            onDelete={() => {
              // La de al lado: la siguiente o, si era la última, la anterior.
              const neighbour = exercise.sets[exercise.sets.indexOf(set) + 1] ?? exercise.sets[exercise.sets.indexOf(set) - 1]
              withUndo(t('Serie eliminada', 'Set deleted'), () => edit((e) => { e.sets = e.sets.filter((s) => s.id !== set.id) }))
              // El botón que tenía el foco (el de la serie) ya no existe: a la serie de al lado o a «Añadir serie»,
              // no al principio de la página (con teclado o lector no se llegaba al «Deshacer»).
              requestAnimationFrame(() => {
                const card = document.getElementById(`ex-${exercise.id}`)
                const target = (neighbour && document.getElementById(`set-${neighbour.id}`)?.querySelector<HTMLElement>('.set-label')) || card?.querySelector<HTMLElement>('.add-set')
                target?.focus()
              })
            }}
            rpe={{
              open: rpeFor === set.id,
              ask: () => on.askRpe(set.id),
              done: () => on.askRpe(undefined),
              picked: (rpe) => on.effort(set.id, rpe, exercise.rest),
            }}
            carryWeight={() => edit((e) => {
              // El peso de esta serie pasa a las siguientes que aún no tienen: así basta un toque en cada una.
              const i = e.sets.findIndex((x) => x.id === set.id)
              const w = e.sets[i]?.weight ?? 0
              if (w > 0 && !e.sets[i].warmup) for (const x of e.sets.slice(i + 1)) if (!x.done && !x.warmup && x.kind !== 'drop' && x.weight <= 0) x.weight = w
            })}
            onCompleted={() => {
              on.setDone(set)
              if (!set.warmup && set.kind !== 'failure') on.askRpe(set.id)
              // Antes de un drop set no se descansa: se quita peso y se sigue. Igual al cambiar de lado y
              // dentro de una superserie. Si quedaba un descanso de antes en marcha, se para: ya se ha acabado.
              if (dropNext || sideNext) return stopRest()
              if (inGroupWithNext) { stopRest(); return on.groupNext() }
              // Lo que toca después: la siguiente serie pendiente de este ejercicio o del siguiente.
              const later = exercise.sets.slice(i + 1).find((s) => !s.done)
              const nextUp = later ? spokenSet(exercise, later, unit) : upcoming ? spokenSet(upcoming, upcoming.sets.find((s) => !s.done)!, unit) : undefined
              // Tras la última serie del entreno no hay nada que descansar.
              const pending = data.sessions.find((s) => s.id === sessionId)?.exercises.some((e) => e.sets.some((s) => !s.done && s.id !== set.id))
              if (!pending) return stopRest()
              startRest(set.warmup ? Math.min(exercise.rest, 60) : exercise.rest, nextUp, set.id)
              // Al fallo es RPE 10: el descanso se alarga ya.
              if (set.kind === 'failure' && !set.warmup && !simple) on.effort(set.id, 10, exercise.rest)
              if (slot.letter) on.roundEnd()
            }} />
        )
      })}

      <button className="nav-btn add-set" style={{ justifyContent: 'center', fontWeight: 600 }} onClick={() => edit((e) => {
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

      {/* El menú, en tres: lo de cada día arriba; ordenar y los ajustes del ejercicio, en sus submenús (con
          todo junto eran hasta 14 opciones y «Quitar ejercicio» quedaba fuera de la pantalla). */}
      {menu === 'main' && (
        <ActionSheet title={exercise.name} onClose={() => setMenu(false)} options={[
          { label: t('Sustituir ejercicio', 'Replace exercise'), onSelect: () => setReplacing(true) },
          ...(tracking === 'weight_reps' && workKg > 0 ? [{ label: t('Añadir series de calentamiento', 'Add warm-up sets'), onSelect: addWarmup }] : []),
          ...(barbell && tracking === 'weight_reps' && workKg > 0 ? [{ label: t(`Discos para ${weight(workKg, unit)}`, `Plates for ${weight(workKg, unit)}`), onSelect: () => setPlates(true) }] : []),
          ...(tracking === 'weight_reps' && lastWorking && !simple ? [{ label: t('Añadir drop set', 'Add drop set'), onSelect: addDropSet }] : []),
          { label: note ? t('Editar nota del ejercicio', 'Edit exercise note') : t('Añadir nota del ejercicio', 'Add exercise note'), onSelect: () => setNoteOpen(true) },
          { label: exercise.pain !== undefined ? t('Editar molestia', 'Edit discomfort') : t('Anotar molestia', 'Log discomfort'), onSelect: () => setPainOpen(true) },
          ...(total > 1 ? [{ label: t('Ordenar y superseries…', 'Order and supersets…'), onSelect: () => setMenu('order') }] : []),
          { label: t('Ajustes del ejercicio…', 'Exercise settings…'), onSelect: () => setMenu('settings') },
          { label: t('Quitar ejercicio', 'Remove exercise'), destructive: true, onSelect: () => withUndo(t(`Quitado: ${exercise.name}`, `Removed: ${exercise.name}`), () => editList((list, i) => { list.splice(i, 1) })) },
        ]} />
      )}
      {menu === 'order' && (
        <OrderMenu title={exercise.name} index={index} total={total} slot={slot} inGroupWithNext={inGroupWithNext} simple={simple} editList={editList} onClose={() => setMenu(false)} />
      )}
      {menu === 'settings' && (
        <SettingsMenu exercise={exercise} kit={kit} simple={simple} unit={unit} edit={edit} setMode={setMode}
          onRest={() => setRestMenu(true)} onTracking={() => setTrackingMenu(true)} onClose={() => setMenu(false)} />
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

/** Si ya se marcó alguna serie mientras la app está abierta (para no repetir la ayuda del primer día). */
let firstSetDone = false

/** «Press de banca, serie 3 de 4, 80 kilos»: la siguiente serie, para decirla en voz alta. */
function spokenSet(e: SessionExercise, set: SetEntry, unit: Unit): string {
  if (set.warmup) return `${e.name}, ${t('calentamiento', 'warm-up')}`
  const working = e.sets.filter((s) => !s.warmup)
  const k = working.findIndex((s) => s.id === set.id) + 1
  let text = `${e.name}, ${t(`serie ${k} de ${working.length}`, `set ${k} of ${working.length}`)}`
  if (trackingOf(e) === 'weight_reps' && set.weight > 0) text += `, ${num(fromKg(set.weight, unit))} ${unit === 'kg' ? t('kilos', 'kilos') : t('libras', 'pounds')}`
  return text
}

/** Ordenar el ejercicio en la lista y juntarlo en superseries o circuitos. */
function OrderMenu({ title, index, total, slot, inGroupWithNext, simple, editList, onClose }: {
  title: string
  index: number
  total: number
  slot: GroupSlot
  inGroupWithNext: boolean
  simple: boolean
  editList: (fn: (list: SessionExercise[], i: number) => void) => void
  onClose: () => void
}) {
  const isSuperset = slot.size < 3
  return (
    <ActionSheet title={title} onClose={onClose} options={[
      ...(index > 0 ? [{ label: t('Subir', 'Move up'), onSelect: () => editList((list, i) => { [list[i - 1], list[i]] = [list[i], list[i - 1]] }) }] : []),
      ...(index < total - 1 ? [{ label: t('Bajar', 'Move down'), onSelect: () => editList((list, i) => { [list[i + 1], list[i]] = [list[i], list[i + 1]] }) }] : []),
      ...(index < total - 1 && !inGroupWithNext && !simple ? [{
        label: slot.letter ? (isSuperset ? t('Añadir el siguiente a la superserie', 'Add the next one to the superset') : t('Añadir el siguiente al circuito', 'Add the next one to the circuit')) : t('Hacer superserie con el siguiente', 'Superset with the next one'),
        onSelect: () => editList((list, i) => linkWithNext(list, i)),
      }] : []),
      ...(slot.letter ? [{ label: isSuperset ? t('Sacar de la superserie', 'Remove from superset') : t('Sacar del circuito', 'Remove from circuit'), onSelect: () => editList((list, i) => unlink(list, i)) }] : []),
    ]} />
  )
}

/** Cómo se registra el ejercicio: descanso, tipo de registro, por lados, asistida, por mancuerna y descarga. */
function SettingsMenu({ exercise, kit: { barbell, pairs }, simple, unit, edit, setMode, onRest, onTracking, onClose }: {
  exercise: SessionExercise
  kit: Kit
  simple: boolean
  unit: Unit
  edit: (fn: (e: SessionExercise) => void) => void
  setMode: (change: { assisted?: boolean; unilateral?: boolean; perHand?: boolean }) => void
  onRest: () => void
  onTracking: () => void
  onClose: () => void
}) {
  const tracking = trackingOf(exercise)
  return (
    <ActionSheet title={exercise.name} onClose={onClose} options={[
      { label: `${t('Descanso', 'Rest')}: ${rest(exercise.rest)}`, onSelect: onRest },
      ...(!simple ? [{ label: `${t('Registrar por', 'Log by')}: ${trackingOptions().find((o) => o.id === tracking)!.label.toLowerCase()}`, onSelect: onTracking }] : []),
      // Solo lo que aplica a este ejercicio: «por lados» no con barra ni en dominadas y fondos (se hacen con
      // los dos brazos), y «asistida» solo en máquinas y ejercicios con el cuerpo; siempre si ya está
      // activado, para poder quitarlo.
      ...(tracking === 'weight_reps' && ((!barbell && !BODYWEIGHT_LIFTS.has(exercise.exerciseId)) || exercise.unilateral) ? [{
        label: exercise.unilateral ? t('Quitar «por lados»', 'Stop logging per side') : t('Por lados (a una mano o pierna)', 'Per side (one arm or leg)'),
        onSelect: () => setMode({ unilateral: !exercise.unilateral }),
      }] : []),
      ...(tracking === 'weight_reps' && ((!barbell && !pairs) || exercise.assisted) ? [{
        label: exercise.assisted ? t('Quitar «máquina asistida»', 'Not an assisted machine') : t('Máquina asistida (el peso ayuda)', 'Assisted machine (weight = assistance)'),
        onSelect: () => setMode({ assisted: !exercise.assisted }),
      }] : []),
      ...(tracking === 'weight_reps' && pairs ? [{
        label: exercise.perHand ? t('Apuntar el peso total (las dos juntas)', 'Log the total weight (both together)') : t('Apuntar el peso de cada mancuerna', 'Log the weight of each dumbbell'),
        onSelect: () => setMode({ perHand: !exercise.perHand }),
      }] : []),
      ...(tracking === 'weight_reps' && !simple ? [exercise.deload
        ? { label: t('Quitar la descarga de hoy', 'Undo today\'s deload'), onSelect: () => edit((e) => undoDeload(e)) }
        : { label: t('Hacer sesión de descarga', 'Make it a deload session'), onSelect: () => edit((e) => applyDeload(e, unit)) }] : []),
    ]} />
  )
}

/** Estancado: una línea plegada (no empuja las series hacia abajo); las opciones, al tocarla. */
function StallBox({ best, unit, onDeload, onVariants }: { best: number; unit: Unit; onDeload: () => void; onVariants: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`stall-box ${open ? 'open' : ''}`}>
      <button className="stall-line small" onClick={() => setOpen(!open)} aria-expanded={open}>
        <TrendingDown size={15} style={{ flexShrink: 0 }} aria-hidden="true" />
        <span className="grow">{t(`${STALL_SESSIONS} sesiones sin superar tu mejor marca`, `${STALL_SESSIONS} sessions without beating your best`)}</span>
        <span className="stall-more">{open ? t('Cerrar', 'Close') : t('Opciones', 'Options')}</span>
      </button>
      {open && (
        <>
          <span className="small">
            {t(`Tu mejor marca: máx. estimado de ~${int(fromKg(best, unit))} ${unit}. Una sesión de descarga (menos series y −10 % de peso) o cambiar a una variante suele ayudar a volver a progresar.`,
              `Your best: est. max of ~${int(fromKg(best, unit))} ${unit}. A deload session (fewer sets and −10% weight) or switching to a variation usually helps you progress again.`)}
          </span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn small secondary" onClick={onDeload}>{t('Hacer descarga', 'Deload')}</button>
            <button className="btn small plain" onClick={onVariants}>{t('Ver variantes', 'Variations')}</button>
          </div>
        </>
      )}
    </div>
  )
}

/** Explica lo que ha hecho la progresión automática con este ejercicio. */
function AutoNote({ auto, unit, repsMax }: { auto: AutoProgress; unit: Unit; repsMax?: number }) {
  const text = auto.kind === 'up'
    ? t(`Progresión automática: sube a ${weight(auto.to, unit)} (la última vez completaste todas las repeticiones con ${weight(auto.from, unit)}).`,
      `Automatic progression: up to ${weight(auto.to, unit)} (last time you completed every rep with ${weight(auto.from, unit)}).`)
    : auto.kind === 'down'
      ? t(`Tres veces sin completar con ${weight(auto.from, unit)}: hoy ${weight(auto.to, unit)} para coger impulso y volver a subir.`, `Three times without completing ${weight(auto.from, unit)}: today ${weight(auto.to, unit)} to build momentum and climb again.`)
    : auto.kind === 'reps'
      ? (auto.harder
        ? t(`Ya haces ${auto.from} repeticiones en todas las series: prueba una variante más difícil o añade lastre.`, `You already do ${auto.from} reps on every set: try a harder variation or add weight.`)
        : t(`Llegaste al máximo en todas las series: hoy ${auto.to} repeticiones en cada una.`, `You hit the top of the range on every set: today ${auto.to} reps on each.`))
    : auto.kind === 'hold'
      ? (auto.reason === 'rpe'
        ? t('Lo completaste, pero al límite (RPE 9,5-10): mismo peso hasta que salga con algo de margen.', 'You completed it, but at your limit (RPE 9.5-10): same weight until it feels easier.')
        // Con la cifra de este ejercicio: la frase genérica salía igual debajo de cada ejercicio.
        : repsMax ? t(`Para subir de peso: ${repsMax} repeticiones en todas las series.`, `To move up in weight: ${repsMax} reps on every set.`)
          : t('Mismo peso hasta completar todas las reps.', 'Same weight until you complete every rep.'))
      : auto.kind === 'percent'
        ? t(`${Math.round(auto.pct * 100)} % de tu máximo estimado (${weight(auto.max, unit)}).`, `${Math.round(auto.pct * 100)}% of your estimated max (${weight(auto.max, unit)}).`)
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
