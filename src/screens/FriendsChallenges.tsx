import { Flag, Medal, Plus, Share2, UserPlus } from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { ActionSheet, Card, Chip, Progress, Sheet, useCatalog, useToast } from '../components/ui'
import { int, relative, shortDay, toKg, tons, type Unit } from '../lib/format'
import {
  challengeProgress,
  challengeFood,
  challengeResult,
  copiedToast,
  MEDAL_EMOJI,
  trophyText,
  shareMine,
  challengeStatus,
  friendKey,
  invitations,
  liveChallenges,
  newChallenge,
  trophyCounts,
  standings,
  type Challenge,
  type ChallengeMetric,
} from '../lib/friends'
import { plural, t } from '../lib/i18n'
import { MAIN_GROUPS } from '../lib/labels'
import { finishedSessions, getData, update, updateSettings, useData, withUndo, type AppData } from '../lib/store'
import { ExercisePicker } from './Exercises'

// Retos con amigos: textos, tarjeta, lista, hoja de nuevo reto y vitrina de trofeos. Salieron de Friends.tsx para partirlo.

// MARK: Textos de los retos

export const groupName = (g: number) => t(...MAIN_GROUPS[g][0]).toLowerCase()

export function useExerciseName() {
  const catalog = useCatalog()
  return (c: Challenge) => (c.exerciseId && catalog.get(c.exerciseId)?.name) || c.exerciseName || '?'
}

export function challengeTitle(c: Challenge, unit: Unit, exercise: (c: Challenge) => string): string {
  const goal = c.target
  switch (c.metric) {
    case 'sessions':
      return goal ? plural(goal, ['entrenamiento', 'entrenamientos'], ['workout', 'workouts']) : t('Más entrenamientos', 'Most workouts')
    case 'volume':
      return goal ? t(`${tons(goal, unit)} movidos`, `${tons(goal, unit)} moved`) : t('Más peso movido', 'Most weight moved')
    case 'sets': {
      const of = c.group !== undefined ? t(` de ${groupName(c.group)}`, ` of ${groupName(c.group)}`) : ''
      return goal ? `${plural(goal, ['serie', 'series'], ['set', 'sets'])}${of}` : t(`Más series${of}`, `Most sets${of}`)
    }
    case 'reps':
      return goal
        ? t(`${goal} repeticiones seguidas en ${exercise(c)}`, `${goal} reps in one set of ${exercise(c)}`)
        : t(`Más repeticiones seguidas en ${exercise(c)}`, `Most reps in one set of ${exercise(c)}`)
    case 'logDays':
      return goal ? t(`${goal} días apuntando la comida`, `${goal} days logging food`) : t('Más días apuntando la comida', 'Most days logging food')
    case 'proteinDays':
      return goal ? t(`${goal} días cumpliendo la proteína`, `${goal} days hitting protein`) : t('Más días cumpliendo la proteína', 'Most days hitting protein')
  }
}

export const challengeValue = (c: Challenge, v: number, unit: Unit) =>
  c.metric === 'volume' ? tons(v, unit) : c.metric === 'reps' ? plural(v, ['rep.', 'rep.'], ['rep', 'reps'])
    : c.metric === 'logDays' || c.metric === 'proteinDays' ? plural(v, ['día', 'días'], ['day', 'days']) : int(v)

export function challengeWhen(c: Challenge, now = Date.now()): string {
  const status = challengeStatus(c, now)
  const range = `${shortDay(c.start)} – ${shortDay(c.end - 1)}`
  if (status === 'upcoming') return t(`Empieza el ${shortDay(c.start)}`, `Starts ${shortDay(c.start)}`)
  if (status === 'finished') return `${t('Terminado', 'Finished')} · ${range}`
  const days = Math.ceil((c.end - now) / 86400000)
  return `${range} · ${days <= 1 ? t('último día', 'last day') : t(`quedan ${days} días`, `${days} days left`)}`
}

/**
 * Tu nombre, si aún no lo tienes, antes de compartir. Sin él todos salían como «Sin nombre»: dos amigos sin nombre
 * se pisaban (el segundo enlace sustituía al primero) y a quien tampoco lo tenía le salía «es tu propio enlace».
 * Devuelve el nombre que se usará (el escrito, aún sin guardar) para habilitar el botón de compartir.
 */
export function useNameRow(): [string, ReactNode] {
  const data = useData()
  const [name, setName] = useState(data.settings.name)
  const saved = data.settings.name.trim()
  const row = saved ? null : (
    <>
      <label className="list-row" style={{ padding: 0 }}>
        <span className="grow small">{t('¿Cómo te verán tus amigos?', 'How will your friends see you?')}</span>
        <input className="field name-field" style={{ width: 140 }} placeholder={t('Tu nombre', 'Your name')} value={name}
          maxLength={40} onChange={(e) => setName(e.target.value)} onBlur={() => updateSettings({ name: name.trim() })} />
      </label>
      {/* Sin esta línea, los botones de abajo se quedaban grises sin decir por qué. */}
      {!name.trim() && <p className="muted small" style={{ margin: 0 }}>{t('Escribe tu nombre para poder compartir y crear retos.', 'Enter your name to share and create challenges.')}</p>}
    </>
  )
  return [saved || name.trim(), row]
}

/** Guarda el nombre escrito antes de compartir (el clic puede llegar sin que el campo pierda el foco). */
export const keepName = (name: string) => { if (name && getData().settings.name.trim() !== name) updateSettings({ name }) }

/** Un reto: fechas y clasificación con barras de progreso. */
export function ChallengeCard({ c, data, myValue, onMenu }: { c: Challenge; data: AppData; myValue: number; onMenu: () => void }) {
  const unit = data.settings.unit
  const exercise = useExerciseName()
  const now = Date.now()
  const status = challengeStatus(c, now)
  // Terminado: la clasificación guardada (los resúmenes de los amigos dejan de traerlo).
  const rows = status === 'finished' && c.final
    ? c.final.map((r) => ({ ...r, name: r.me ? t('Tú', 'You') : r.name, at: now }))
    : standings(c, t('Tú', 'You'), myValue, data.friends, now)
  const top = Math.max(c.target ?? 0, ...rows.map((r) => r.value), 1)
  const winners = c.target ? rows.filter((r) => r.value >= c.target!) : rows[0].value > 0 ? rows.filter((r) => r.value === rows[0].value) : []
  return (
    <div className="challenge">
      <button className="challenge-head" onClick={onMenu} aria-label={t('Opciones del reto', 'Challenge options')}>
        <span className="grow">
          <strong className="clamp-2">{challengeTitle(c, unit, exercise)}</strong>
          <span className="tiny muted" style={{ display: 'block' }}>{challengeWhen(c, now)} · {t(`de ${c.by}`, `by ${c.by}`)}</span>
        </span>
      </button>
      {status === 'finished' && winners.length > 0 && (
        <span className="small bold" style={{ color: 'var(--accent-text)' }}>
          🏆 {c.target ? t('Lo consiguieron: ', 'Made it: ') : winners.length === 1 ? t('Ganador: ', 'Winner: ') : t('Ganadores: ', 'Winners: ')}{winners.map((w) => w.name).join(', ')}
        </span>
      )}
      {rows.map((r) => (
        <div key={r.me ? '__me' : friendKey(r.name)} className="challenge-row">
          <span className={`small clamp-1 ${r.me ? 'bold me' : ''}`}>{r.name}</span>
          <Progress value={r.value} total={top} green={!!c.target && r.value >= c.target} />
          <span className="small" style={{ textAlign: 'right' }}>
            {challengeValue(c, r.value, unit)}
            {!r.me && status !== 'upcoming' && now - r.at > 2 * 86400000 && <span className="tiny muted" style={{ display: 'block' }}>{relative(r.at).toLowerCase()}</span>}
          </span>
        </div>
      ))}
      {c.target && <span className="tiny muted">{t(`Objetivo: ${challengeValue(c, c.target, unit)}`, `Goal: ${challengeValue(c, c.target, unit)}`)}</span>}
      {rows.length === 1 && status !== 'finished' && <span className="tiny muted">{t('Invita a tus amigos: les llega con tu resumen.', 'Invite your friends: the challenge is sent along with your summary.')}</span>}
    </div>
  )
}

export function Challenges({ data, onNew }: { data: AppData; onNew: () => void }) {
  const sessions = useMemo(() => finishedSessions(data), [data])
  const unit = data.settings.unit
  const exercise = useExerciseName()
  const [toast, showToast] = useToast()
  const [menu, setMenu] = useState<Challenge>()
  const live = liveChallenges(data.challenges)
  const invites = invitations(data.friends, data.challenges, Date.now(), data.settings.leftChallenges)
  const invite = async (c: Challenge) => {
    // Sin nombre se compartiría como «Sin nombre» y se pisaría con otros (useNameRow): primero el nombre.
    if (!data.settings.name.trim()) return showToast(t('Pon tu nombre en «Tu resumen» para invitar.', 'Add your name in "Your summary" to invite.'))
    const result = await shareMine(t(`Te reto en Serix: ${challengeTitle(c, unit, exercise)} (${challengeWhen(c)}). Abre el enlace y únete:`,
      `I challenge you on Serix: ${challengeTitle(c, unit, exercise)} (${challengeWhen(c)}). Open the link and join:`))
    if (result === 'copied') showToast(copiedToast())
  }
  return (
    <Card title={t('Retos', 'Challenges')} icon={Flag}>
      {live.length === 0 && invites.length === 0 && (
        <span className="small muted">{t('Crea un reto con objetivo y fecha —quién entrena más este mes, 12 entrenamientos en 4 semanas…— e invita a tus amigos.',
          'Create a challenge with a goal and a deadline —who trains the most this month, 12 workouts in 4 weeks…— and invite your friends.')}</span>
      )}
      {invites.map((c) => (
        <div key={c.id} className="challenge invite">
          <span className="small"><strong>{c.by}</strong> {t('te reta:', 'challenges you:')} {challengeTitle(c, unit, exercise)}</span>
          <span className="tiny muted">{challengeWhen(c)}</span>
          <button className="btn primary" onClick={() => update((d) => { if (!d.challenges.some((x) => x.id === c.id)) d.challenges.push(c) })}><UserPlus size={18} /> {t('Unirme', 'Join')}</button>
        </div>
      ))}
      {live.map((c) => <ChallengeCard key={c.id} c={c} data={data} myValue={challengeProgress(c, sessions, challengeFood(data))} onMenu={() => setMenu(c)} />)}
      <button className="btn secondary" onClick={onNew}><Plus size={18} /> {t('Nuevo reto', 'New challenge')}</button>
      {menu && (
        <ActionSheet title={challengeTitle(menu, unit, exercise)} onClose={() => setMenu(undefined)} options={[
          ...(challengeStatus(menu) !== 'finished' ? [{ label: t('Invitar a amigos', 'Invite friends'), onSelect: () => void invite(menu) }] : []),
          {
            label: t('Salir del reto', 'Leave challenge'), destructive: true,
            onSelect: () => withUndo(t('Has salido del reto', 'You left the challenge'), () => update((d) => { d.challenges = d.challenges.filter((x) => x.id !== menu.id); d.settings.leftChallenges = [...(d.settings.leftChallenges ?? []).filter((x) => x !== menu.id), menu.id].slice(-50) })),
          },
        ]} />
      )}
      {toast}
    </Card>
  )
}

export const METRIC_OPTIONS: { value: ChallengeMetric; label: () => string }[] = [
  { value: 'sessions', label: () => t('Entrenos', 'Workouts') },
  { value: 'volume', label: () => t('Peso', 'Weight') },
  { value: 'sets', label: () => t('Series', 'Sets') },
  { value: 'reps', label: () => t('Reps', 'Reps') },
  { value: 'logDays', label: () => t('Apuntar', 'Logging') },
  { value: 'proteinDays', label: () => t('Proteína', 'Protein') },
]

/** Crear un reto: qué se mide, cuánto dura y un objetivo opcional. */
export function NewChallengeSheet({ onClose }: { onClose: () => void }) {
  const data = useData()
  const unit = data.settings.unit
  const exercise = useExerciseName()
  const [toast, showToast] = useToast()
  const [metric, setMetric] = useState<ChallengeMetric>('sessions')
  const [group, setGroup] = useState(-1)
  const [ex, setEx] = useState<{ id: string; name: string }>()
  const [picking, setPicking] = useState(false)
  const [days, setDays] = useState(30)
  const [target, setTarget] = useState('')
  // Todos los objetivos son enteros: «50.000» kg son cincuenta mil (antes se leía 50).
  const goal = Number(target)
  const [name, nameRow] = useNameRow()
  const valid = (metric !== 'reps' || !!ex) && !!name
  const draft = (): Challenge => newChallenge({
    metric, by: name,
    ...(goal > 0 ? { target: Math.round(metric === 'volume' ? toKg(goal, unit) : goal) } : {}),
    ...(metric === 'sets' && group >= 0 ? { group } : {}),
    ...(metric === 'reps' && ex ? { exerciseId: ex.id, exerciseName: ex.name } : {}),
  }, days)

  const creating = useRef(false)
  const create = async () => {
    // Dos toques antes de que se abra el menú de compartir creaban dos retos.
    if (creating.current) return
    creating.current = true
    keepName(name)
    const c = draft()
    update((d) => { d.challenges.push(c) })
    const result = await shareMine(t(`Te reto en Serix: ${challengeTitle(c, unit, exercise)} (${challengeWhen(c)}). Abre el enlace y únete:`,
      `I challenge you on Serix: ${challengeTitle(c, unit, exercise)} (${challengeWhen(c)}). Open the link and join:`))
    if (result === 'copied') showToast(copiedToast())
    setTimeout(onClose, result === 'copied' ? 1500 : 0)
  }

  const placeholder = metric === 'logDays' || metric === 'proteinDays' ? '20' : metric === 'sessions' ? '12' : metric === 'volume' ? (unit === 'kg' ? '50000' : '100000') : metric === 'sets' ? '60' : '20'
  return (
    <Sheet title={t('Nuevo reto', 'New challenge')} onClose={onClose}
      left={<button className="nav-btn" onClick={onClose}>{t('Cancelar', 'Cancel')}</button>}
      footer={<button className="btn primary block" disabled={!valid} onClick={() => void create()}><Share2 size={18} /> {t('Crear e invitar', 'Create and invite')}</button>}>
      {nameRow}
      <div className="chip-row">
        {METRIC_OPTIONS.map((o) => <Chip key={o.value} label={o.label()} active={metric === o.value} onClick={() => setMetric(o.value)} />)}
      </div>
      {metric === 'proteinDays' && !data.settings.nutrition && <span className="small muted">{t('Para este reto necesitas un objetivo de proteína (Comidas → Objetivo); cada uno cuenta con el suyo.', 'For this challenge you need a protein goal (Food → Goal); each person counts with their own.')}</span>}
      {(metric === 'logDays' || metric === 'proteinDays') && <span className="small muted">{t('Cuenta los días que apuntas algo de comida' + (metric === 'proteinDays' ? ' y llegas al 90 % de tu proteína' : '') + '. Todos necesitáis tener Serix actualizada.', 'Counts the days you log food' + (metric === 'proteinDays' ? ' and reach 90% of your protein' : '') + '. Everyone needs an updated Serix.')}</span>}
      <div className="list">
        {metric === 'sets' && (
          <label className="list-row">
            <span className="grow">{t('Grupo muscular', 'Muscle group')}</span>
            <select className="select" value={group} onChange={(e) => setGroup(Number(e.target.value))}>
              <option value={-1}>{t('Todos', 'All')}</option>
              {MAIN_GROUPS.map(([name], i) => <option key={i} value={i}>{t(...name)}</option>)}
            </select>
          </label>
        )}
        {metric === 'reps' && (
          <button className="list-row" onClick={() => setPicking(true)}>
            <span className="grow" style={{ textAlign: 'left' }}>{t('Ejercicio', 'Exercise')}</span>
            <span className={ex ? '' : 'muted'}>{ex?.name ?? t('Elegir…', 'Choose…')}</span>
          </button>
        )}
        <label className="list-row">
          <span className="grow">{t('Duración', 'Duration')}</span>
          <select className="select" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {[7, 14, 21, 30, 60, 90].map((d) => <option key={d} value={d}>{d % 7 === 0 && d < 60 ? plural(d / 7, ['semana', 'semanas'], ['week', 'weeks']) : plural(d, ['día', 'días'], ['day', 'days'])}</option>)}
          </select>
        </label>
        <label className="list-row">
          <span className="grow">
            {t('Objetivo (opcional)', 'Goal (optional)')}
            <span className="small muted" style={{ display: 'block' }}>{t('Sin objetivo, gana quien más sume', 'Without a goal, the highest total wins')}</span>
          </span>
          <input className="field" style={{ width: 110, textAlign: 'right' }} inputMode="numeric" placeholder={placeholder} value={target}
            maxLength={9} onChange={(e) => setTarget(e.target.value.replace(/\D/g, ''))} aria-label={t('Objetivo', 'Goal')} />
          {metric === 'volume' && <span className="muted">{unit}</span>}
        </label>
      </div>
      {valid && (
        <p className="small muted" style={{ margin: 0 }}>
          «{challengeTitle(draft(), unit, () => ex?.name ?? '?')}» · {challengeWhen(draft())}.{' '}
          {t('Cuenta desde hoy. Tus amigos se unen al abrir tu enlace y su progreso llega con cada resumen que te manden.',
            'It counts from today. Your friends join by opening your link and their progress arrives with each summary they send you.')}
        </p>
      )}
      {picking && <ExercisePicker single title={t('Ejercicio del reto', 'Challenge exercise')} onClose={() => setPicking(false)} onDone={([e]) => e && setEx({ id: e.id, name: e.name })} />}
      {toast}
    </Sheet>
  )
}

/** Retos terminados: medallas y puesto en cada uno. */
export function TrophyCase({ data }: { data: AppData }) {
  const unit = data.settings.unit
  const exercise = useExerciseName()
  const done = data.challenges.filter((c) => challengeResult(c)).sort((a, b) => b.end - a.end)
  if (!done.length) return null
  const mine = trophyText(trophyCounts(data.challenges))
  return (
    <Card title={t('Tus trofeos', 'Your trophies')} icon={Medal}>
      {mine && <span className="trophy-total" aria-label={t('Total de trofeos', 'Trophy total')}>{mine}</span>}
      {done.map((c) => {
        const r = challengeResult(c)!
        return (
          <div key={c.id} className="row" style={{ gap: 10 }}>
            <span className="trophy-icon" aria-hidden="true">{r.medal ? MEDAL_EMOJI[r.medal] : r.completed ? '🎯' : '🏁'}</span>
            <span className="grow">
              <span className="clamp-1 bold">{challengeTitle(c, unit, exercise)}</span>
              <span className="tiny muted" style={{ display: 'block' }}>
                {shortDay(c.start)} – {shortDay(c.end - 1)} · {r.of > 1 ? t(`${r.place}.º de ${r.of}`, `#${r.place} of ${r.of}`) : t('en solitario', 'solo')}
                {r.completed ? t(' · objetivo cumplido', ' · goal reached') : ''}
              </span>
            </span>
            <span className="small bold">{challengeValue(c, r.value, unit)}</span>
          </div>
        )
      })}
      <span className="tiny muted">{t('🥇🥈🥉 puesto con al menos un rival · 🎯 objetivo cumplido', '🥇🥈🥉 top-3 finish against at least one rival · 🎯 goal reached')}</span>
    </Card>
  )
}

