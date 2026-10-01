import { MAX_EXERCISE_NOTE, setExerciseNote, useData } from '../lib/store'
import { Sheet } from './ui'
import { t } from '../lib/i18n'

// Nota fija de un ejercicio («asiento en el 4», «agarre ancho»): se escribe una vez y aparece cada
// vez que se hace ese ejercicio y en su ficha.

export function ExerciseNoteField({ exerciseId, autoFocus }: { exerciseId: string; autoFocus?: boolean }) {
  const note = useData().exerciseNotes[exerciseId] ?? ''
  return (
    <textarea rows={2} maxLength={MAX_EXERCISE_NOTE} value={note} autoFocus={autoFocus} aria-label={t('Nota del ejercicio', 'Exercise note')}
      placeholder={t('Ej.: asiento en el 4, agarre ancho, codos pegados…', 'E.g. seat on 4, wide grip, elbows tucked…')}
      onChange={(e) => setExerciseNote(exerciseId, e.target.value)} />
  )
}

export function ExerciseNoteSheet({ exerciseId, name, onClose }: { exerciseId: string; name: string; onClose: () => void }) {
  return (
    <Sheet title={t('Nota del ejercicio', 'Exercise note')} onClose={onClose} right={<button className="nav-btn bold" onClick={onClose}>{t('Listo', 'Done')}</button>}>
      <span className="small muted">{name} · {t('se guarda para las próximas veces', 'saved for next time')}</span>
      <div className="card"><ExerciseNoteField exerciseId={exerciseId} autoFocus /></div>
    </Sheet>
  )
}
