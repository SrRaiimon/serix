import { Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Sheet } from '../components/ui'
import { fillBodyweights } from '../lib/bodyweight'
import type { Exercise } from '../lib/catalog'
import { editable, fromKg, parseDecimal, toKg, uid } from '../lib/format'
import { t } from '../lib/i18n'
import { navigate } from '../lib/router'
import { update, useData, withUndo, type Session, type SetEntry } from '../lib/store'
import { defaultTracking, isSetFilled, trackingOf } from '../lib/tracking'
import { ExercisePicker } from './Exercises'

// Corregir un entrenamiento ya terminado (pesos, repeticiones, series, ejercicios, fecha y hora) o apuntar
// uno que no se registró en su momento. Se trabaja sobre una copia y se guarda todo junto (con «deshacer»).

const pad = (n: number) => String(n).padStart(2, '0')
const dateText = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const timeText = (ms: number) => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }

/** Entrenamiento nuevo para apuntar a posteriori: ayer a las 18:00, una hora. */
export function blankPastSession(): Session {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  d.setHours(18, 0, 0, 0)
  return { id: uid(), name: t('Entrenamiento', 'Workout'), start: d.getTime(), end: d.getTime() + 3600000, notes: '', exercises: [] }
}

export function SessionEditSheet({ session, isNew = false, onClose }: { session: Session; isNew?: boolean; onClose: () => void }) {
  const { settings } = useData()
  const unit = settings.unit
  const [draft, setDraft] = useState<Session>(() => structuredClone(session))
  const [date, setDate] = useState(dateText(session.start))
  const [clock, setClock] = useState(timeText(session.start))
  const [minutes, setMinutes] = useState(String(Math.max(1, Math.round(((session.end ?? session.start) - session.start) / 60000))))
  const [picking, setPicking] = useState(false)
  const edit = (fn: (s: Session) => void) => setDraft((d) => { const next = structuredClone(d); fn(next); return next })
  const editSet = (ei: number, si: number, patch: Partial<SetEntry>) => edit((s) => { Object.assign(s.exercises[ei].sets[si], patch) })

  const start = new Date(`${date}T${clock || '00:00'}:00`).getTime()
  const mins = parseDecimal(minutes)
  // Solo cuentan las series con datos; un ejercicio sin series se quita.
  const cleaned = draft.exercises
    .map((e) => ({ ...e, sets: e.sets.filter((x) => isSetFilled(x, trackingOf(e))) }))
    .filter((e) => e.sets.length > 0)
  const problem = !Number.isFinite(start) ? t('Revisa la fecha y la hora.', 'Check the date and time.')
    : start > Date.now() ? t('La fecha no puede ser futura.', 'The date cannot be in the future.')
      : mins === null || mins < 1 || mins > 600 ? t('La duración tiene que estar entre 1 y 600 minutos.', 'Duration must be between 1 and 600 minutes.')
        : !cleaned.length ? t('Añade al menos un ejercicio con una serie.', 'Add at least one exercise with a set.') : undefined

  const save = () => {
    if (problem) return
    const shift = start - session.start
    const next: Session = {
      ...draft, name: draft.name.trim() || t('Entrenamiento', 'Workout'), start, end: start + mins! * 60000,
      // Las horas de cada serie se mueven con el entrenamiento (para que sigan dentro de él).
      exercises: cleaned.map((e) => ({ ...e, sets: e.sets.map((x) => ({ ...x, done: true, doneAt: x.doneAt !== undefined && !isNew ? x.doneAt + shift : start })) })),
    }
    withUndo(isNew ? t('Entrenamiento apuntado', 'Workout logged') : t('Cambios guardados', 'Changes saved'), () => update((d) => {
      const i = d.sessions.findIndex((s) => s.id === next.id)
      if (i >= 0) d.sessions[i] = next
      else d.sessions.push(next)
      d.sessions.sort((a, b) => a.start - b.start)
    }))
    fillBodyweights()
    onClose()
    if (isNew) navigate('progress', 'session', next.id)
  }

  const addExercises = (list: Exercise[]) => edit((s) => {
    for (const x of list) {
      const tracking = defaultTracking(x)
      s.exercises.push({
        id: uid(), exerciseId: x.id, name: x.name, muscle: x.muscle, rest: settings.defaultRest, repsMin: 0, repsMax: 0,
        ...(tracking !== 'weight_reps' ? { tracking } : {}),
        sets: [{ id: uid(), weight: 0, reps: 0, done: true, warmup: false }],
      })
    }
  })

  if (picking) return <ExercisePicker title={t('Añadir ejercicios', 'Add exercises')} onClose={() => setPicking(false)} onDone={(list) => { addExercises(list); setPicking(false) }} />

  return (
    <Sheet title={isNew ? t('Apuntar entrenamiento', 'Log a workout') : t('Editar entrenamiento', 'Edit workout')} onClose={onClose}
      left={<button className="nav-btn" onClick={onClose}>{t('Cancelar', 'Cancel')}</button>}
      footer={<>
        {problem && <span className="small muted" style={{ textAlign: 'center' }}>{problem}</span>}
        <button className="btn primary block" disabled={!!problem} onClick={save}>{t('Guardar', 'Save')}</button>
      </>}>
      <div className="list">
        <label className="list-row">
          <span className="grow">{t('Nombre', 'Name')}</span>
          <input className="sess-field" value={draft.name} maxLength={80} onChange={(e) => { const v = e.target.value; edit((s) => { s.name = v }) }} aria-label={t('Nombre', 'Name')} />
        </label>
        <label className="list-row">
          <span className="grow">{t('Día', 'Day')}</span>
          <input className="sess-field" type="date" value={date} max={dateText(Date.now())} onChange={(e) => setDate(e.target.value)} aria-label={t('Día', 'Day')} />
        </label>
        <label className="list-row">
          <span className="grow">{t('Hora de empezar', 'Start time')}</span>
          <input className="sess-field" type="time" value={clock} onChange={(e) => setClock(e.target.value)} aria-label={t('Hora de empezar', 'Start time')} />
        </label>
        <label className="list-row">
          <span className="grow">{t('Duración', 'Duration')}</span>
          <input className="sess-field" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} aria-label={t('Duración en minutos', 'Duration in minutes')} />
          <span className="muted">min</span>
        </label>
      </div>

      {draft.exercises.map((e, ei) => {
        const tracking = trackingOf(e)
        return (
          <section key={e.id} className="card edit-exercise">
            <div className="row">
              <span className="bold grow">{e.name}</span>
              <button className="icon-btn" onClick={() => edit((s) => { s.exercises.splice(ei, 1) })} aria-label={t(`Quitar ${e.name}`, `Remove ${e.name}`)}><Trash2 size={17} /></button>
            </div>
            <div className={`edit-set-grid edit-set-head`}>
              <span>{t('SERIE', 'SET')}</span>
              {tracking === 'weight_reps' && <><span>{unit.toUpperCase()}</span><span>REPS</span></>}
              {tracking === 'time' && <><span>{t('SEG', 'SEC')}</span><span /></>}
              {tracking === 'distance_time' && <><span>KM</span><span>MIN</span></>}
              <span />
            </div>
            {e.sets.map((x, si) => (
              <div key={x.id} className="edit-set-grid">
                <span className="muted">{x.warmup ? t('C', 'W') : e.sets.slice(0, si + 1).filter((y) => !y.warmup).length}</span>
                {tracking === 'weight_reps' && <>
                  <NumField label={t('Peso', 'Weight')} value={x.weight ? fromKg(x.weight, unit) : 0} onChange={(v) => editSet(ei, si, { weight: toKg(v, unit) })} />
                  <NumField label={t('Repeticiones', 'Reps')} integer value={x.reps} onChange={(v) => editSet(ei, si, { reps: Math.round(v) })} />
                </>}
                {tracking === 'time' && <>
                  <NumField label={t('Segundos', 'Seconds')} integer value={x.duration ?? 0} onChange={(v) => editSet(ei, si, { duration: Math.round(v) })} />
                  <span />
                </>}
                {tracking === 'distance_time' && <>
                  <NumField label={t('Kilómetros', 'Kilometres')} value={x.distance ?? 0} onChange={(v) => editSet(ei, si, { distance: v })} />
                  <NumField label={t('Minutos', 'Minutes')} value={(x.duration ?? 0) / 60} onChange={(v) => editSet(ei, si, { duration: Math.round(v * 60) })} />
                </>}
                <button className="icon-btn" onClick={() => edit((s) => { s.exercises[ei].sets.splice(si, 1) })} aria-label={t('Quitar serie', 'Remove set')}><X size={16} /></button>
              </div>
            ))}
            <button className="nav-btn" style={{ alignSelf: 'flex-start' }} onClick={() => edit((s) => {
              const last = s.exercises[ei].sets.at(-1)
              s.exercises[ei].sets.push({ ...(last ?? { weight: 0, reps: 0, warmup: false }), id: uid(), done: true, warmup: false, kind: undefined, rpe: undefined, note: undefined } as SetEntry)
            })}><Plus size={17} /> {t('Añadir serie', 'Add set')}</button>
          </section>
        )
      })}
      <button className="btn secondary" onClick={() => setPicking(true)}><Plus size={18} /> {t('Añadir ejercicio', 'Add exercise')}</button>
    </Sheet>
  )
}

/** Número editable que respeta lo que se escribe (comas, campo vacío) y avisa solo con valores válidos. */
function NumField({ label, value, integer, onChange }: { label: string; value: number; integer?: boolean; onChange: (v: number) => void }) {
  const [text, setText] = useState(value ? editable(Math.round(value * 100) / 100) : '')
  return (
    <input className="set-input" inputMode={integer ? 'numeric' : 'decimal'} placeholder="0" aria-label={label} value={text}
      onChange={(e) => {
        const v = integer ? e.target.value.replace(/\D/g, '') : e.target.value
        setText(v)
        const n = v === '' ? 0 : parseDecimal(v)
        if (n !== null && n >= 0) onChange(n)
      }} />
  )
}

