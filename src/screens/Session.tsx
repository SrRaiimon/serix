import { BadgeCheck, Clock, Dumbbell, ImageIcon, Layers, Repeat, Share2, StickyNote, Trash2, Trophy, Weight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ActionSheet, Card, Empty, NavBar, Sheet, Thumb, Tile, useCatalog, useToast } from '../components/ui'
import { day, duration, time, volume, weight, type Unit } from '../lib/format'
import { back } from '../lib/router'
import { shareCardSVG, shareImage, svgToPng } from '../lib/shareCard'
import { newRecords, sessionDuration, sessionReps, sessionSets, sessionVolume, workingSets, type PersonalRecord } from '../lib/stats'
import { finishedSessions, update, useData, type Session } from '../lib/store'
import { groupSlots } from '../lib/groups'
import { setShortText, setText, trackingOf } from '../lib/tracking'
import { saveAsRoutine } from '../lib/workout'

function setNotes(id: string, notes: string) {
  update((d) => {
    const s = d.sessions.find((x) => x.id === id)
    if (s) s.notes = notes
  })
}

export function shareText(s: Session, unit: Unit): string {
  const lines = [
    `${s.name} — ${day(s.start)}`,
    `${duration(sessionDuration(s))} · ${volume(sessionVolume(s), unit)} · ${sessionSets(s)} series`,
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
  if (!file) return showToast('La imagen aún se está preparando')
  const result = await shareImage(file, title)
  if (result === 'downloaded') showToast('Imagen descargada')
}

export function SessionStats({ session, unit }: { session: Session; unit: Unit }) {
  return (
    <div className="grid-2">
      <Tile icon={Clock} value={duration(sessionDuration(session))} label="Duración" />
      <Tile icon={Weight} value={volume(sessionVolume(session), unit)} label="Volumen total" />
      <Tile icon={Layers} value={sessionSets(session)} label="Series efectivas" />
      <Tile icon={Repeat} value={sessionReps(session)} label="Repeticiones" />
    </div>
  )
}

export function SessionExercises({ session, unit }: { session: Session; unit: Unit }) {
  const slots = groupSlots(session.exercises)
  return (
    <Card title="Ejercicios" icon={Dumbbell}>
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
              </span>
            </div>
            {e.sets.filter((s) => s.done).map((s) => (
              <div key={s.id} className="row between small" style={{ paddingLeft: 48 }}>
                <span className={s.warmup ? '' : 'muted'} style={s.warmup ? { color: '#f08c00' } : undefined}>
                  {s.warmup ? 'Calentamiento' : `Serie ${++n}`}
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
  const records = useMemo(() => newRecords(session, finishedSessions(data)), [session, data])
  const [saved, setSaved] = useState(Boolean(session.routineId))
  const [toast, showToast] = useToast()
  const image = useShareImage(session, unit, records)

  return (
    <Sheet title="" onClose={onClose}
      left={<button className="icon-btn" onClick={() => share(session, unit, () => showToast('Copiado al portapapeles'))} aria-label="Compartir"><Share2 size={18} /></button>}
      right={<button className="nav-btn bold" onClick={onClose}>Listo</button>}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        {records.length ? <Trophy size={56} color="var(--gold)" /> : <BadgeCheck size={56} color="var(--accent)" />}
        <h2 style={{ margin: 0 }}>¡Entrenamiento completado!</h2>
        <span className="muted small">{session.name} · {day(session.start)}</span>
      </div>
      <SessionStats session={session} unit={unit} />
      <Card title="Compártelo" icon={ImageIcon}>
        {image ? <img className="share-preview" src={image.url} alt="Imagen del entrenamiento para compartir" /> : <div className="share-preview" />}
        <button className="btn primary" disabled={!image} onClick={() => void shareSessionImage(image?.file, session.name, showToast)}>
          <ImageIcon size={18} /> Compartir imagen
        </button>
      </Card>
      {records.length > 0 && (
        <Card title={records.length === 1 ? 'Nuevo récord personal' : `${records.length} récords personales`} icon={Trophy}>
          {records.map((r) => (
            <div key={r.exerciseId} className="row between">
              <span className="clamp-1 small">{r.name}</span>
              <strong className="small">{weight(r.weight, unit)} × {r.reps}</strong>
            </div>
          ))}
        </Card>
      )}
      <SessionExercises session={session} unit={unit} />
      <Card title="Notas" icon={StickyNote}>
        <textarea rows={3} placeholder="¿Cómo te has sentido?" value={session.notes} onChange={(e) => setNotes(session.id, e.target.value)} />
      </Card>
      {!saved && (
        <button className="btn secondary" onClick={() => { saveAsRoutine(session); setSaved(true); showToast('Guardada como rutina') }}>
          Guardar como rutina
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
  if (!session) return <><NavBar showBack /><div className="screen with-nav"><Empty icon={Dumbbell} title="Entrenamiento eliminado" message="" /></div></>
  const unit = data.settings.unit

  return (
    <>
      <NavBar showBack title={session.name} right={<button className="icon-btn" onClick={() => setMenu(true)} aria-label="Opciones"><Share2 size={18} /></button>} />
      <div className="screen with-nav">
        <div>
          <div className="bold">{day(session.start)}</div>
          {session.end && <div className="small muted">{time(session.start)} – {time(session.end)}</div>}
        </div>
        <SessionStats session={session} unit={unit} />
        <SessionExercises session={session} unit={unit} />
        <Card title="Notas" icon={StickyNote}>
          <textarea rows={2} placeholder="Añade una nota" value={session.notes} onChange={(e) => setNotes(session.id, e.target.value)} />
        </Card>
        <button className="btn danger" onClick={() => setConfirmDelete(true)}><Trash2 size={18} /> Eliminar entrenamiento</button>
      </div>
      {menu && (
        <ActionSheet onClose={() => setMenu(false)} options={[
          { label: 'Compartir imagen', onSelect: () => void shareSessionImage(image?.file, session.name, showToast) },
          { label: 'Compartir como texto', onSelect: () => void share(session, unit, () => showToast('Copiado al portapapeles')) },
          ...(!session.routineId ? [{ label: 'Guardar como rutina', onSelect: () => { saveAsRoutine(session); showToast('Guardada como rutina') } }] : []),
        ]} />
      )}
      {confirmDelete && (
        <ActionSheet title="¿Eliminar este entrenamiento?" message="Se borrará del historial y de tus estadísticas." onClose={() => setConfirmDelete(false)}
          options={[{ label: 'Eliminar', destructive: true, onSelect: () => { update((d) => { d.sessions = d.sessions.filter((s) => s.id !== id) }); back() } }]} />
      )}
      {toast}
    </>
  )
}

