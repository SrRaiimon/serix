import { BadgeCheck, Clock, Dumbbell, ImageIcon, Layers, Repeat, Share2, StickyNote, Trash2, Trophy, Weight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ActionSheet, Card, Empty, NavBar, Sheet, Thumb, Tile, useCatalog, useToast } from '../components/ui'
import { day, duration, time, volume, weight, type Unit } from '../lib/format'
import { back } from '../lib/router'
import { shareCardSVG, shareImage, svgToPng } from '../lib/shareCard'
import { newRecords, sessionDuration, sessionReps, sessionSets, sessionVolume, workingSets, type PersonalRecord } from '../lib/stats'
import { finishedSessions, update, useData, withUndo, type Session } from '../lib/store'
import { groupSlots } from '../lib/groups'
import { setShortText, setText, trackingOf } from '../lib/tracking'
import { saveAsRoutine } from '../lib/workout'
import { plural, t } from '../lib/i18n'
import { NewAchievements } from '../components/Achievements'

function setNotes(id: string, notes: string) {
  update((d) => {
    const s = d.sessions.find((x) => x.id === id)
    if (s) s.notes = notes
  })
}

export function shareText(s: Session, unit: Unit): string {
  const lines = [
    `${s.name} — ${day(s.start)}`,
    `${duration(sessionDuration(s))} · ${volume(sessionVolume(s), unit)} · ${plural(sessionSets(s), ['serie', 'series'], ['set', 'sets'])}`,
    '',
  ]
  const slots = groupSlots(s.exercises)
  s.exercises.forEach((e, i) => {
    const sets = workingSets(e).map((x) => setShortText(x, trackingOf(e), unit))
    const tag = slots[i].letter ? `${slots[i].letter}${slots[i].position} ` : ''
    if (sets.length) lines.push(`• ${tag}${e.name}: ${sets.join(', ')}`)
  })
  return lines.join('\n')
}

async function share(s: Session, unit: Unit, fallback: () => void) {
  const text = shareText(s, unit)
  if (navigator.share) {
    try {
      await navigator.share({ title: s.name, text })
      return
    } catch {
      return
    }
  }
  await navigator.clipboard?.writeText(text)
  fallback()
}

/**
 * Imagen del entrenamiento para compartir. Se genera al abrir la pantalla para que, al pulsar el
 * botón, el menú de compartir del sistema se abra al instante (Safari lo exige tras un toque).
 */
function useShareImage(session: Session | undefined, unit: Unit, records: PersonalRecord[]) {
  const catalog = useCatalog()
  const [image, setImage] = useState<{ file: File; url: string }>()
  const key = session ? [session.id, session.end, sessionSets(session), session.name, unit, records.length].join('|') : ''
  useEffect(() => {
    if (!session) return
    let cancelled = false
    let url: string | undefined
    const svg = shareCardSVG({ session, unit, records, secondaryOf: (id) => catalog.get(id)?.secondaryMuscles ?? [] })
    svgToPng(svg)
      .then((blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setImage({ file: new File([blob], `serix-${new Date(session.start).toISOString().slice(0, 10)}.png`, { type: 'image/png' }), url })
      })
      .catch(() => setImage(undefined))
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
    // Se regenera solo cuando cambia algo que aparece en la imagen.
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return image
}

async function shareSessionImage(file: File | undefined, title: string, showToast: (text: string) => void) {
  if (!file) return showToast(t('La imagen aún se está preparando', 'The image is still being prepared'))
  const result = await shareImage(file, title)
  if (result === 'downloaded') showToast(t('Imagen descargada', 'Image downloaded'))
}

export function SessionStats({ session, unit }: { session: Session; unit: Unit }) {
  return (
    <div className="grid-2">
      <Tile icon={Clock} value={duration(sessionDuration(session))} label={t('Duración', 'Duration')} />
      <Tile icon={Weight} value={volume(sessionVolume(session), unit)} label={t('Volumen total', 'Total volume')} />
      <Tile icon={Layers} value={sessionSets(session)} label={t('Series efectivas', 'Working sets')} />
      <Tile icon={Repeat} value={sessionReps(session)} label={t('Repeticiones', 'Reps')} />
    </div>
  )
}

export function SessionExercises({ session, unit }: { session: Session; unit: Unit }) {
  const slots = groupSlots(session.exercises)
  return (
    <Card title={t('Ejercicios', 'Exercises')} icon={Dumbbell}>
      {session.exercises.map((e, i) => {
        const slot = slots[i]
        let n = 0
        return (
          <div key={e.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: i ? 12 : 0, borderTop: i ? '0.5px solid var(--separator)' : undefined }}>
            <div className="row">
              <Thumb exerciseId={e.exerciseId} size={36} />
              <span className="bold clamp-2" style={{ fontSize: 15 }}>
                {slot.letter && <span className="group-badge">{slot.letter}{slot.position}</span>}
                {e.name}
                {e.deload && <span className="tiny muted" style={{ fontWeight: 400 }}> · {t('descarga', 'deload')}</span>}
              </span>
            </div>
            {e.sets.filter((s) => s.done).map((s) => (
              <div key={s.id} className="row between small" style={{ paddingLeft: 48 }}>
                <span className={s.warmup ? '' : 'muted'} style={s.warmup ? { color: 'var(--amber-text)' } : undefined}>
                  {s.warmup ? t('Calentamiento', 'Warm-up') : s.kind === 'drop' ? '↳ Drop set' : `${t('Serie', 'Set')} ${++n}${s.kind === 'amrap' ? ' · AMRAP' : s.kind === 'failure' ? ` · ${t('al fallo', 'to failure')}` : ''}`}
                </span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{setText(s, trackingOf(e), unit)}</span>
              </div>
            ))}
          </div>
        )
      })}
    </Card>
  )
}

export function SummarySheet({ session, onClose }: { session: Session; onClose: () => void }) {
  const data = useData()
  const unit = data.settings.unit
  const history = useMemo(() => finishedSessions(data), [data])
  const records = useMemo(() => newRecords(session, history), [session, history])
  const [saved, setSaved] = useState(Boolean(session.routineId))
  const [toast, showToast] = useToast()
  const image = useShareImage(session, unit, records)

  return (
    <Sheet title="" onClose={onClose}
      left={<button className="icon-btn" onClick={() => share(session, unit, () => showToast(t('Copiado al portapapeles', 'Copied to clipboard')))} aria-label={t('Compartir', 'Share')}><Share2 size={18} /></button>}
      right={<button className="nav-btn bold" onClick={onClose}>{t('Listo', 'Done')}</button>}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        {records.length ? <Trophy size={56} color="var(--gold)" /> : <BadgeCheck size={56} color="var(--accent-text)" />}
        <h2 style={{ margin: 0 }}>{t('¡Entrenamiento completado!', 'Workout complete!')}</h2>
        <span className="muted small">{session.name} · {day(session.start)}</span>
      </div>
      <SessionStats session={session} unit={unit} />
      <Card title={t('Compártelo', 'Share it')} icon={ImageIcon}>
        {image ? <img className="share-preview" src={image.url} alt={t('Imagen del entrenamiento para compartir', 'Workout image to share')} /> : <div className="share-preview" />}
        <button className="btn primary" disabled={!image} onClick={() => void shareSessionImage(image?.file, session.name, showToast)}>
          <ImageIcon size={18} /> {t('Compartir imagen', 'Share image')}
        </button>
      </Card>
      {records.length > 0 && (
        <Card title={records.length === 1 ? t('Nuevo récord personal', 'New personal record') : t(`${records.length} récords personales`, `${records.length} personal records`)} icon={Trophy}>
          {records.map((r) => (
            <div key={r.exerciseId} className="row between">
              <span className="clamp-1 small">{r.name}</span>
              <strong className="small">{weight(r.weight, unit)} × {r.reps}</strong>
            </div>
          ))}
        </Card>
      )}
      <NewAchievements session={session} sessions={history} measurements={data.measurements} unit={unit} />
      <SessionExercises session={session} unit={unit} />
      <Card title={t('Notas', 'Notes')} icon={StickyNote}>
        <textarea rows={3} placeholder={t('¿Cómo te has sentido?', 'How did it feel?')} value={session.notes} onChange={(e) => setNotes(session.id, e.target.value)} />
      </Card>
      {!saved && (
        <button className="btn secondary" onClick={() => { saveAsRoutine(session); setSaved(true); showToast(t('Guardada como rutina', 'Saved as routine')) }}>
          {t('Guardar como rutina', 'Save as routine')}
        </button>
      )}
      {toast}
    </Sheet>
  )
}

export function SessionDetailScreen({ id }: { id: string }) {
  const data = useData()
  const session = data.sessions.find((s) => s.id === id)
  const [menu, setMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [toast, showToast] = useToast()
  const records = useMemo(() => (session ? newRecords(session, finishedSessions(data)) : []), [session, data])
  const image = useShareImage(session, data.settings.unit, records)
  if (!session) return <><NavBar showBack /><div className="screen with-nav"><Empty icon={Dumbbell} title={t('Entrenamiento eliminado', 'Workout deleted')} message="" /></div></>
  const unit = data.settings.unit

  return (
    <>
      <NavBar showBack title={session.name} right={<button className="icon-btn" onClick={() => setMenu(true)} aria-label={t('Opciones', 'Options')}><Share2 size={18} /></button>} />
      <div className="screen with-nav">
        <div>
          <div className="bold">{day(session.start)}</div>
          {session.end && <div className="small muted">{time(session.start)} – {time(session.end)}</div>}
        </div>
        <SessionStats session={session} unit={unit} />
        <SessionExercises session={session} unit={unit} />
        <Card title={t('Notas', 'Notes')} icon={StickyNote}>
          <textarea rows={2} placeholder={t('Añade una nota', 'Add a note')} value={session.notes} onChange={(e) => setNotes(session.id, e.target.value)} />
        </Card>
        <button className="btn danger" onClick={() => setConfirmDelete(true)}><Trash2 size={18} /> {t('Eliminar entrenamiento', 'Delete workout')}</button>
      </div>
      {menu && (
        <ActionSheet onClose={() => setMenu(false)} options={[
          { label: t('Compartir imagen', 'Share image'), onSelect: () => void shareSessionImage(image?.file, session.name, showToast) },
          { label: t('Compartir como texto', 'Share as text'), onSelect: () => void share(session, unit, () => showToast(t('Copiado al portapapeles', 'Copied to clipboard'))) },
          ...(!session.routineId ? [{ label: t('Guardar como rutina', 'Save as routine'), onSelect: () => { saveAsRoutine(session); showToast(t('Guardada como rutina', 'Saved as routine')) } }] : []),
        ]} />
      )}
      {confirmDelete && (
        <ActionSheet title={t('¿Eliminar este entrenamiento?', 'Delete this workout?')} message={t('Se borrará del historial y de tus estadísticas.', 'It will be removed from your history and stats.')} onClose={() => setConfirmDelete(false)}
          options={[{ label: t('Eliminar', 'Delete'), destructive: true, onSelect: () => { withUndo(t('Entrenamiento eliminado', 'Workout deleted'), () => update((d) => { d.sessions = d.sessions.filter((s) => s.id !== id) })); back() } }]} />
      )}
      {toast}
    </>
  )
}

