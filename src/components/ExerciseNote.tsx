import { MAX_EXERCISE_NOTE, setExerciseNote, useData } from '../lib/store'
import { Sheet } from './ui'

// Nota fija de un ejercicio («asiento en el 4», «agarre ancho»): se escribe una vez y aparece cada
// vez que se hace ese ejercicio y en su ficha.

export function ExerciseNoteField({ exerciseId, autoFocus }: { exerciseId: string; autoFocus?: boolean }) {
  const note = useData().exerciseNotes[exerciseId] ?? ''
  return (
    <textarea rows={2} maxLength={MAX_EXERCISE_NOTE} value={note} autoFocus={autoFocus} aria-label="Nota del ejercicio"
      placeholder="Ej.: asiento en el 4, agarre ancho, codos pegados…"
      onChange={(e) => setExerciseNote(exerciseId, e.target.value)} />
  )
}

export function ExerciseNoteSheet({ exerciseId, name, onClose }: { exerciseId: string; name: string; onClose: () => void }) {
  return (
    <Sheet title="Nota del ejercicio" onClose={onClose} right={<button className="nav-btn bold" onClick={onClose}>Listo</button>}>
      <span className="small muted">{name} · se guarda para las próximas veces</span>
      <div className="card"><ExerciseNoteField exerciseId={exerciseId} autoFocus /></div>
    </Sheet>
  )
}
