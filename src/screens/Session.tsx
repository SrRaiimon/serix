import { ArrowUpDown, BadgeCheck, Flame, Wind, ChevronRight, Dumbbell, ImageIcon, Pencil, RotateCcw, Share2, StickyNote, Trash2, Trophy, Utensils } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ActionSheet, Card, Empty, NavBar, Segmented, Sheet, StatBand, Thumb, useCatalog, useToast } from '../components/ui'
import { day, duration, int, shortDay, time, tons, volume, weight, type Unit } from '../lib/format'
import { bodyweightAt, bodyweightText } from '../lib/bodyweight'
import { sessionKcal } from '../lib/burn'
import { focusFor } from '../lib/warmupRoutine'
import { back, navigate } from '../lib/router'
import { dayGoalOptions, dayKey, dayTotals, goalsForDay } from '../lib/nutrition'
import { recordCardSVG, shareCardSVG, shareImage, svgToPng } from '../lib/shareCard'
import { compareWithLast, newRecords, records, sessionDuration, type ExerciseChange, sessionReps, sessionSets, sessionVolume, workingSets, type PersonalRecord } from '../lib/stats'
import { finishedSessions, update, useData, withUndo, type Session } from '../lib/store'
import { groupSlots } from '../lib/groups'
import { setShortText, setText, trackingOf } from '../lib/tracking'
import { repeatSession, saveAsRoutine } from '../lib/workout'
import { SessionEditSheet } from './SessionEdit'
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
type ShareImage = { file: File; url: string }

function useShareImage(session: Session | undefined, unit: Unit, records: PersonalRecord[]) {
  const catalog = useCatalog()
  // Publicación (4:5) e historia de Instagram (9:16). Las dos se preparan antes de tocar «Compartir».
  const [images, setImages] = useState<{ post?: ShareImage; story?: ShareImage }>({})
  const key = session ? [session.id, session.end, sessionSets(session), session.name, unit, records.length].join('|') : ''
  useEffect(() => {
    if (!session) return
    let cancelled = false
    const urls: string[] = []
    const date = new Date(session.start).toISOString().slice(0, 10)
    const make = (story: boolean) => svgToPng(shareCardSVG({ session, unit, records, story, secondaryOf: (id) => catalog.get(id)?.secondaryMuscles ?? [] }))
      .then((blob) => {
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        urls.push(url)
        const image = { file: new File([blob], `serix-${date}${story ? '-historia' : ''}.png`, { type: 'image/png' }), url }
        setImages((x) => ({ ...x, [story ? 'story' : 'post']: image }))
      })
      .catch(() => undefined)
    void make(false).then(() => make(true))
    return () => {
      cancelled = true
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
    // Se regenera solo cuando cambia algo que aparece en la imagen.
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return images
}

/** Imagen de un récord para compartir (se prepara al tocar). */
async function shareRecord(r: PersonalRecord, history: Session[], unit: Unit, showToast: (text: string) => void) {
  const before = records(history.filter((s) => s.start < r.date - 1)).find((x) => x.exerciseId === r.exerciseId)?.e1rm
  const set = `${r.added === undefined ? weight(r.weight, unit) : bodyweightText(r.added, unit)} × ${r.reps}`
  try {
    const blob = await svgToPng(recordCardSVG({ record: r, unit, previous: before, setText: set }))
    const result = await shareImage(new File([blob], `serix-record-${r.exerciseId}.png`, { type: 'image/png' }), r.name)
    if (result === 'downloaded') showToast(t('Imagen descargada', 'Image downloaded'))
  } catch {
    showToast(t('No se pudo preparar la imagen', 'The image could not be prepared'))
  }
}

async function shareSessionImage(file: File | undefined, title: string, showToast: (text: string) => void) {
  if (!file) return showToast(t('La imagen aún se está preparando', 'The image is still being prepared'))
  const result = await shareImage(file, title)
  if (result === 'downloaded') showToast(t('Imagen descargada', 'Image downloaded'))
}

export function SessionStats({ session, unit }: { session: Session; unit: Unit }) {
  return (
    <StatBand items={[
      { value: duration(sessionDuration(session)), label: t('Duración', 'Duration') },
      { value: tons(sessionVolume(session), unit), label: t('Peso movido', 'Weight moved') },
      { value: sessionSets(session), label: t('Series hechas', 'Sets done') },
      { value: sessionReps(session), label: t('Repeticiones', 'Reps') },
    ]} />
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
                {e.pain !== undefined && <span className="tiny warn-text" style={{ fontWeight: 400 }}> · {t('molestia', 'discomfort')} {e.pain}/10{e.painNote ? ` (${e.painNote})` : ''}</span>}
              </span>
            </div>
            {e.sets.filter((s) => s.done).map((s) => (
              <div key={s.id} style={{ display: 'contents' }}>
              <div className="row between small" style={{ paddingLeft: 48 }}>
                <span className={s.warmup ? '' : 'muted'} style={s.warmup ? { color: 'var(--amber-text)' } : undefined}>
                  {s.warmup ? t('Calentamiento', 'Warm-up') : s.kind === 'drop' ? '↳ Drop set' : `${t('Serie', 'Set')} ${s.side === 'R' ? n : ++n}${s.side === 'L' ? t(' · izquierda', ' · left') : s.side === 'R' ? t(' · derecha', ' · right') : ''}${s.kind === 'amrap' ? ' · AMRAP' : s.kind === 'failure' ? ` · ${t('al fallo', 'to failure')}` : ''}`}
                </span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{e.assisted && s.weight > 0 ? `${t('ayuda', 'assist')} ${setText(s, trackingOf(e), unit)}` : setText(s, trackingOf(e), unit)}{e.perHand && s.weight > 0 ? t(' c/u', ' each') : ''}</span>
              </div>
              {s.note && <span className="tiny muted" style={{ paddingLeft: 48 }}>“{s.note}”</span>}
              </div>
            ))}
          </div>
        )
      })}
    </Card>
  )
}

/** Lo que comiste el día del entreno frente a tu objetivo de ese día (si usas Comidas). */
function SessionFood({ session, today }: { session: Session; today?: boolean }) {
  const data = useData()
  const dayOf = dayKey(session.start)
  const entries = data.nutrition.entries.filter((e) => e.day === dayOf)
  const base = data.settings.nutrition
  if (!base && !entries.length) return null
  const goals = base && goalsForDay(base, data.nutrition.entries, dayOf, dayGoalOptions(data))
  const v = dayTotals(entries)
  const missing = goals ? Math.max(0, goals.protein - v.p) : 0
  return (
    <button className="card session-food" onClick={() => navigate('food')}>
      <span className="row" style={{ gap: 8 }}>
        <Utensils size={17} aria-hidden="true" />
        <strong className="grow">{today ? t('Comida de hoy', 'Food today') : t('Comida de ese día', 'Food that day')}</strong>
        <ChevronRight size={18} className="chevron" aria-hidden="true" />
      </span>
      {entries.length ? (
        <span className="small">
          {goals?.proteinOnly ? '' : t(`${int(v.kcal)} kcal${goals ? ` de ${int(goals.kcal)}` : ''} · `, `${int(v.kcal)} kcal${goals ? ` of ${int(goals.kcal)}` : ''} · `)}
          {t(`${int(v.p)} g de proteína${goals ? ` de ${int(goals.protein)}` : ''}`, `${int(v.p)} g protein${goals ? ` of ${int(goals.protein)}` : ''}`)}
        </span>
      ) : <span className="small muted">{today ? t('Aún no has apuntado nada hoy.', 'Nothing logged today yet.') : t('No apuntaste nada ese día.', 'Nothing was logged that day.')}</span>}
      {today && goals && missing > 0 && <span className="small muted">{t(`Te faltan ${int(missing)} g de proteína para tu objetivo: una comida con proteína en las próximas horas te ayuda a recuperar.`, `${int(missing)} g of protein left for your goal: a protein-rich meal in the next few hours helps recovery.`)}</span>}
    </button>
  )
}

/** Calorías gastadas estimadas (lib/burn.ts), si se sabe el peso. */
function BurnLine({ session }: { session: Session }) {
  const data = useData()
  const kcal = sessionKcal(session, bodyweightAt(data, session.start))
  if (!kcal) return null
  return (
    <span className="small muted row" style={{ gap: 6 }}>
      <Flame size={15} aria-hidden="true" />
      {t(`Unas ${int(kcal)} kcal gastadas (estimación con tu peso y la duración).`, `About ${int(kcal)} kcal burned (estimated from your weight and duration).`)}
    </span>
  )
}

/** Frente a la última vez que se hizo la misma rutina: duración, peso movido y la mejor serie de cada ejercicio. */
function ComparisonCard({ session, history, unit }: { session: Session; history: Session[]; unit: Unit }) {
  const c = useMemo(() => compareWithLast(session, history), [session, history])
  if (!c) return null
  const minutes = Math.round(c.duration / 60000)
  const text = (x: ExerciseChange) => {
    const sign = x.delta > 0 ? '+' : '−'
    if (x.kind === 'weight') return `${sign}${weight(Math.abs(x.delta), unit)}`
    if (x.kind === 'reps') return t(`${sign}${Math.abs(x.delta)} rep.`, `${sign}${Math.abs(x.delta)} reps`)
    if (x.kind === 'time') return `${sign}${Math.abs(x.delta)} s`
    return t('igual', 'same')
  }
  return (
    <Card title={t(`Frente a la última vez (${shortDay(c.previous.start)})`, `Compared with last time (${shortDay(c.previous.start)})`)} icon={ArrowUpDown}>
      <span className="small muted">
        {[
          minutes ? (minutes > 0 ? t(`${minutes} min más`, `${minutes} min longer`) : t(`${-minutes} min menos`, `${-minutes} min shorter`)) : t('Misma duración', 'Same duration'),
          Math.abs(c.volume) >= 1 ? (c.volume > 0 ? t(`${tons(c.volume, unit)} más movidos`, `${tons(c.volume, unit)} more moved`) : t(`${tons(-c.volume, unit)} menos movidos`, `${tons(-c.volume, unit)} less moved`)) : undefined,
        ].filter(Boolean).join(' · ')}
      </span>
      {c.exercises.map((x) => (
        <div key={x.exerciseId} className="row between small">
          <span className="clamp-1">{x.name}</span>
          <strong className={x.delta > 0 ? 'up-text' : x.delta < 0 ? 'down-text' : 'muted'} style={{ whiteSpace: 'nowrap' }}>
            {x.delta > 0 ? '↑ ' : x.delta < 0 ? '↓ ' : ''}{text(x)}
          </strong>
        </div>
      ))}
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
  const images = useShareImage(session, unit, records)
  const [format, setFormat] = useState<'post' | 'story'>('post')
  const image = images[format]

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
      <BurnLine session={session} />
      <button className="btn secondary" onClick={() => { onClose(); navigate('timer', 'cooldown', focusFor(session.exercises.map((e) => e.muscle))) }}>
        <Wind size={18} /> {t('Estirar 4 minutos (vuelta a la calma)', 'Stretch for 4 minutes (cool-down)')}
      </button>
      <ComparisonCard session={session} history={history} unit={unit} />
      <Card title={t('Compártelo', 'Share it')} icon={ImageIcon}>
        <Segmented value={format} onChange={setFormat} options={[
          { value: 'post', label: t('Publicación', 'Post') },
          { value: 'story', label: t('Historia', 'Story') },
        ]} />
        {image ? <img className={`share-preview ${format}`} src={image.url} alt={t('Imagen del entrenamiento para compartir', 'Workout image to share')} /> : <div className={`share-preview ${format}`} />}
        <button className="btn primary" disabled={!image} onClick={() => void shareSessionImage(image?.file, session.name, showToast)}>
          <ImageIcon size={18} /> {t('Compartir imagen', 'Share image')}
        </button>
      </Card>
      {records.length > 0 && (
        <Card title={records.length === 1 ? t('Nuevo récord personal', 'New personal record') : t(`${records.length} récords personales`, `${records.length} personal records`)} icon={Trophy}>
          {records.map((r) => (
            <div key={r.exerciseId} className="row between" style={{ gap: 8 }}>
              <span className="clamp-1 small grow">{r.name}</span>
              <strong className="small">{r.added === undefined ? weight(r.weight, unit) : bodyweightText(r.added, unit)} × {r.reps}</strong>
              <button className="icon-btn" onClick={() => void shareRecord(r, history, unit, showToast)} aria-label={t(`Compartir el récord de ${r.name}`, `Share the ${r.name} record`)}><Share2 size={16} /></button>
            </div>
          ))}
        </Card>
      )}
      <NewAchievements session={session} sessions={history} measurements={data.measurements} unit={unit} />
      <SessionFood session={session} today />
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
  const [editing, setEditing] = useState(false)
  const [toast, showToast] = useToast()
  const records = useMemo(() => (session ? newRecords(session, finishedSessions(data)) : []), [session, data])
  const images = useShareImage(session, data.settings.unit, records)
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
        <BurnLine session={session} />
        <SessionFood session={session} today={dayKey(session.start) === dayKey()} />
        <SessionExercises session={session} unit={unit} />
        <Card title={t('Notas', 'Notes')} icon={StickyNote}>
          <textarea rows={2} placeholder={t('Añade una nota', 'Add a note')} value={session.notes} onChange={(e) => setNotes(session.id, e.target.value)} />
        </Card>
        <button className="btn secondary" onClick={() => setEditing(true)}><Pencil size={18} /> {t('Editar entrenamiento', 'Edit workout')}</button>
        <button className="btn secondary" onClick={() => repeatSession(session)}><RotateCcw size={18} /> {t('Repetir este entrenamiento', 'Repeat this workout')}</button>
        <button className="btn danger" onClick={() => setConfirmDelete(true)}><Trash2 size={18} /> {t('Eliminar entrenamiento', 'Delete workout')}</button>
      </div>
      {editing && <SessionEditSheet session={session} onClose={() => setEditing(false)} />}
      {menu && (
        <ActionSheet onClose={() => setMenu(false)} options={[
          { label: t('Compartir imagen', 'Share image'), onSelect: () => void shareSessionImage(images.post?.file, session.name, showToast) },
          { label: t('Compartir como historia (9:16)', 'Share as story (9:16)'), onSelect: () => void shareSessionImage(images.story?.file, session.name, showToast) },
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

