import { useState } from 'react'
import { MAX_CUSTOM_EXERCISES, MAX_CUSTOM_NAME, newCustomId, type CustomExercise } from '../lib/customExercises'
import { EQUIPMENT_KEYS, equipmentLabel, MUSCLE_KEYS, muscleLabel } from '../lib/labels'
import { locale, t } from '../lib/i18n'
import { getData, update, updateSettings, withUndo } from '../lib/store'
import { trackingOptions, type Tracking } from '../lib/tracking'
import { ActionSheet, Chip, Segmented, Sheet } from './ui'

// Crear o editar un ejercicio propio (ver lib/customExercises.ts).

const byLabel = (keys: string[], label: (k: string) => string) => [...keys].sort((a, b) => label(a).localeCompare(label(b), locale()))

export function CustomExerciseSheet({ existing, initialName = '', onClose, onSaved }: {
  existing?: CustomExercise
  initialName?: string
  onClose: () => void
  /** Al guardar uno nuevo, con su identificador. */
  onSaved?: (id: string) => void
}) {
  const [name, setName] = useState(existing?.name ?? initialName)
  const [muscle, setMuscle] = useState(existing?.muscle ?? 'pectorals')
  const [secondary, setSecondary] = useState<string[]>(existing?.secondaryMuscles ?? [])
  const [equipment, setEquipment] = useState(existing?.equipment ?? 'machine')
  const [tracking, setTracking] = useState<Tracking>(existing?.tracking ?? 'weight_reps')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const full = !existing && getData().customExercises.length >= MAX_CUSTOM_EXERCISES
  const valid = name.trim().length > 0 && !full

  const save = () => {
    if (!valid) return
    const fields = { name: name.trim().slice(0, MAX_CUSTOM_NAME), muscle, secondaryMuscles: secondary.filter((m) => m !== muscle), equipment, tracking, notes: notes.trim() }
    const id = existing?.id ?? newCustomId()
    update((d) => {
      if (existing) {
        const i = d.customExercises.findIndex((c) => c.id === existing.id)
        if (i >= 0) d.customExercises[i] = { ...d.customExercises[i], ...fields }
        // El nombre nuevo también en las rutinas (el historial conserva el que tenía).
        for (const r of d.routines) for (const e of r.exercises) if (e.exerciseId === id) { e.name = fields.name; e.muscle = muscle }
      } else {
        d.customExercises.push({ id, ...fields, createdAt: Date.now() })
      }
    })
    if (!existing) onSaved?.(id)
    onClose()
  }

  const remove = () => {
    if (!existing) return
    withUndo(t(`Borrado: ${existing.name}`, `Deleted: ${existing.name}`), () => {
      update((d) => { d.customExercises = d.customExercises.filter((c) => c.id !== existing.id) })
      updateSettings({ favorites: getData().settings.favorites.filter((f) => f !== existing.id) })
    })
    onClose()
  }

  return (
    <Sheet title={existing ? t('Editar ejercicio', 'Edit exercise') : t('Nuevo ejercicio', 'New exercise')} onClose={onClose}
      left={<button className="nav-btn" onClick={onClose}>{t('Cancelar', 'Cancel')}</button>}
      right={<button className="nav-btn bold" disabled={!valid} onClick={save}>{t('Guardar', 'Save')}</button>}>
      {full && <p className="small" style={{ color: 'var(--red-text)', margin: 0 }}>{t(`Has llegado al máximo de ${MAX_CUSTOM_EXERCISES} ejercicios propios.`, `You have reached the maximum of ${MAX_CUSTOM_EXERCISES} custom exercises.`)}</p>}
      <div className="list">
        <label className="list-row">
          <span>{t('Nombre', 'Name')}</span>
          <input className="field grow" style={{ textAlign: 'right' }} maxLength={MAX_CUSTOM_NAME} autoFocus={!existing}
            placeholder={t('p. ej. Press pecho máquina azul', 'e.g. Blue chest press machine')} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="list-row">
          <span className="grow">{t('Músculo principal', 'Main muscle')}</span>
          <select className="select" value={muscle} onChange={(e) => setMuscle(e.target.value)}>
            {byLabel(MUSCLE_KEYS, muscleLabel).map((m) => <option key={m} value={m}>{muscleLabel(m)}</option>)}
          </select>
        </label>
        <label className="list-row">
          <span className="grow">{t('Material', 'Equipment')}</span>
          <select className="select" value={equipment} onChange={(e) => setEquipment(e.target.value)}>
            {byLabel(EQUIPMENT_KEYS, equipmentLabel).map((k) => <option key={k} value={k}>{equipmentLabel(k)}</option>)}
          </select>
        </label>
      </div>

      <div className="list-header" style={{ margin: 0 }}>{t('Se registra con', 'Logged as')}</div>
      <Segmented value={tracking} onChange={setTracking} options={trackingOptions().map((o) => ({ value: o.id, label: o.label }))} />

      <div className="list-header" style={{ margin: 0 }}>{t('Músculos secundarios (opcional)', 'Secondary muscles (optional)')}</div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
        {byLabel(MUSCLE_KEYS.filter((m) => m !== muscle && m !== 'cardio'), muscleLabel).map((m) => (
          <Chip key={m} label={muscleLabel(m)} active={secondary.includes(m)}
            onClick={() => setSecondary((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m].slice(0, 6)))} />
        ))}
      </div>

      <label className="list-header" style={{ margin: 0 }} htmlFor="custom-notes">{t('Cómo se hace (opcional)', 'How to do it (optional)')}</label>
      <textarea id="custom-notes" className="field" rows={4} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)}
        placeholder={t('Un paso por línea: ajustes de la máquina, agarre…', 'One step per line: machine settings, grip…')} />

      {existing && <button className="btn danger block" onClick={() => setConfirmDelete(true)}>{t('Borrar ejercicio', 'Delete exercise')}</button>}
      {confirmDelete && existing && (
        <ActionSheet title={t(`¿Borrar «${existing.name}»?`, `Delete "${existing.name}"?`)}
          message={t('Tu historial lo conserva con su nombre, pero dejará de aparecer en el catálogo y en las rutinas no se podrá ver su ficha.', 'Your history keeps it with its name, but it will no longer appear in the catalogue and its details will not be available in routines.')}
          onClose={() => setConfirmDelete(false)} options={[{ label: t('Borrar', 'Delete'), destructive: true, onSelect: remove }]} />
      )}
    </Sheet>
  )
}
