import { Gauge, HeartPulse } from 'lucide-react'
import { useState } from 'react'
import { loadSuggestion, PAIN_WARN, targetRpe } from '../lib/autoreg'
import { day, weight } from '../lib/format'
import { t } from '../lib/i18n'
import { rpeOn, type SessionExercise, type Settings } from '../lib/store'
import { Chip, Sheet } from './ui'

// Consejos durante el entrenamiento (ver lib/autoreg.ts): ajustar el peso según el RPE y avisar si un
// ejercicio molestó la última vez. Siempre son propuestas: nada cambia sin tocar «Aplicar».

/** Propuesta de peso para las series que faltan según el RPE de la última. */
export function EffortSuggestion({ exercise, settings, at, onApply }: {
  exercise: SessionExercise
  settings: Settings
  at: number
  onApply: (setIds: string[], kg: number) => void
}) {
  const [dismissed, setDismissed] = useState<string>()
  if (!rpeOn(settings)) return null
  const s = loadSuggestion(exercise, targetRpe(settings.block, at), settings.unit)
  if (!s || dismissed === s.setId) return null
  const down = s.to < s.from
  const n = s.apply.length
  return (
    <div className={`coach-box ${down ? 'down' : 'up'}`} role="status">
      <span className="small row" style={{ gap: 6, alignItems: 'flex-start' }}>
        <Gauge size={16} style={{ flexShrink: 0 }} />
        <span>
          {down
            ? t(`Esa serie fue RPE ${s.rpe} y tocaba ~${s.target}: baja a ${weight(s.to, settings.unit)} ${n === 1 ? 'la que queda' : `las ${n} que quedan`} para mantener la técnica.`,
              `That set was RPE ${s.rpe} and ~${s.target} was planned: drop to ${weight(s.to, settings.unit)} for the ${n === 1 ? 'remaining set' : `${n} remaining sets`} to keep good form.`)
            : t(`Esa serie fue RPE ${s.rpe} y tocaba ~${s.target}: te sobra fuerza, puedes subir a ${weight(s.to, settings.unit)}.`,
              `That set was RPE ${s.rpe} and ~${s.target} was planned: you have some left, you can go up to ${weight(s.to, settings.unit)}.`)}
        </span>
      </span>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn small secondary" onClick={() => { onApply(s.apply, s.to); setDismissed(s.setId) }}>{t('Aplicar', 'Apply')}</button>
        <button className="btn small plain" onClick={() => setDismissed(s.setId)}>{t('Seguir igual', 'Keep it')}</button>
      </div>
    </div>
  )
}

/** Aviso: este ejercicio molestó la última vez. */
export function PainWarning({ last, onLighter, onAlternatives }: {
  last: { pain: number; date: number; note?: string }
  onLighter: () => void
  onAlternatives: () => void
}) {
  const [hidden, setHidden] = useState(false)
  if (hidden || last.pain < PAIN_WARN) return null
  return (
    <div className="coach-box pain" role="status">
      <span className="small row" style={{ gap: 6, alignItems: 'flex-start' }}>
        <HeartPulse size={16} style={{ flexShrink: 0 }} />
        <span>
          {t(`La última vez (${day(last.date).toLowerCase()}) te molestó: ${last.pain}/10${last.note ? `, ${last.note}` : ''}. Prueba con menos peso o una alternativa, y si el dolor sigue, consúltalo con un profesional.`,
            `Last time (${day(last.date)}) it hurt: ${last.pain}/10${last.note ? `, ${last.note}` : ''}. Try less weight or an alternative, and if the pain persists, see a professional.`)}
        </span>
      </span>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn small secondary" onClick={() => { onLighter(); setHidden(true) }}>{t('Bajar un 10 %', 'Go 10% lighter')}</button>
        <button className="btn small plain" onClick={onAlternatives}>{t('Ver alternativas', 'Alternatives')}</button>
        <button className="btn small plain" onClick={() => setHidden(true)}>{t('Hoy va bien', 'Feels fine today')}</button>
      </div>
    </div>
  )
}

/** Apuntar una molestia del ejercicio (1-10 y dónde). */
export function PainSheet({ exercise, onSave, onClose }: {
  exercise: SessionExercise
  onSave: (pain: number | undefined, note: string) => void
  onClose: () => void
}) {
  const [pain, setPain] = useState<number | undefined>(exercise.pain)
  const [note, setNote] = useState(exercise.painNote ?? '')
  return (
    <Sheet title={t('Molestia', 'Discomfort')} onClose={onClose}
      left={<button className="nav-btn" onClick={onClose}>{t('Cancelar', 'Cancel')}</button>}
      right={<button className="nav-btn bold" onClick={() => { onSave(pain, note.trim()); onClose() }}>{t('Guardar', 'Save')}</button>}>
      <p className="muted" style={{ margin: 0 }}>
        {t(`¿Te ha molestado ${exercise.name}? La próxima vez te lo recordaremos para que bajes el peso o lo cambies.`, `Did ${exercise.name} hurt? Next time we will remind you to go lighter or swap it.`)}
      </p>
      <div className="list-header" style={{ margin: 0 }}>{t('Cuánto (1 = apenas, 10 = mucho)', 'How much (1 = barely, 10 = a lot)')}</div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
          <Chip key={v} label={String(v)} active={pain === v} onClick={() => setPain(pain === v ? undefined : v)} />
        ))}
      </div>
      <label className="list-row card-row">
        <span>{t('Dónde', 'Where')}</span>
        <input className="field grow" style={{ textAlign: 'right' }} maxLength={100} placeholder={t('p. ej. hombro derecho', 'e.g. right shoulder')} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      {exercise.pain !== undefined && <button className="btn plain" onClick={() => { onSave(undefined, ''); onClose() }}>{t('Quitar la molestia', 'Remove the entry')}</button>}
      <p className="small muted" style={{ margin: 0 }}>{t('Serix no da consejo médico: un dolor fuerte, que no se pasa o que va a más necesita que lo vea un profesional.', 'Serix does not give medical advice: sharp, lasting or worsening pain should be checked by a professional.')}</p>
    </Sheet>
  )
}
