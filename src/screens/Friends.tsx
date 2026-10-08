import { BellRing, ChartColumn, Flag, Medal, MessageCircle, Plus, QrCode as QrIcon, Share2, Trophy, UserMinus, UserPlus, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { QrSheet } from '../components/Qr'
import { ActionSheet, Card, Chip, Empty, NavBar, Progress, Segmented, Sheet, useCatalog, useToast } from '../components/ui'
import { addDays, int, relative, shortDay, startOfWeek, toKg, volume, weight, type Unit } from '../lib/format'
import {
  alignWeeks, challengeProgress, challengeFood, challengeResult, copiedToast, MEDAL_EMOJI, settleChallenges, trophyText, requestUpdate, shareMine, challengeStatus, decodeSnapshot, encodeSnapshot, friendKey, friendLink, invitations, isStale, latestBodyWeight, liveChallenges,
  mySnapshot, newChallenge, trophyCounts, sameMonth, sameWeek, standings, WEEKS, type Challenge, type ChallengeMetric, type FriendSnapshot, type FriendStats,
} from '../lib/friends'
import { plural, t } from '../lib/i18n'
import { MAIN_GROUPS } from '../lib/labels'
import { back, navigate } from '../lib/router'
import { finishedSessions, update, updateSettings, useData, withUndo, type AppData } from '../lib/store'
import { ExercisePicker } from './Exercises'

// Retos entre amigos (ver lib/friends.ts): compartir tu resumen, retos con objetivo y fecha, y
// comparar los resúmenes que te mandan.

interface Row extends FriendSnapshot {
  me?: boolean
}

function useMine() {
  const data = useData()
  const sessions = useMemo(() => finishedSessions(data), [data])
  return useMemo(() => mySnapshot(data, sessions), [data, sessions])
}

// MARK: Textos de los retos

const groupName = (g: number) => t(...MAIN_GROUPS[g][0]).toLowerCase()

function useExerciseName() {
  const catalog = useCatalog()
  return (c: Challenge) => (c.exerciseId && catalog.get(c.exerciseId)?.name) || c.exerciseName || '?'
}

function challengeTitle(c: Challenge, unit: Unit, exercise: (c: Challenge) => string): string {
  const goal = c.target
  switch (c.metric) {
    case 'sessions':
      return goal ? plural(goal, ['entrenamiento', 'entrenamientos'], ['workout', 'workouts']) : t('Más entrenamientos', 'Most workouts')
    case 'volume':
      return goal ? t(`${volume(goal, unit)} levantados`, `${volume(goal, unit)} lifted`) : t('Más peso levantado', 'Most weight lifted')
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

const challengeValue = (c: Challenge, v: number, unit: Unit) =>
  c.metric === 'volume' ? volume(v, unit) : c.metric === 'reps' ? plural(v, ['rep.', 'rep.'], ['rep', 'reps'])
    : c.metric === 'logDays' || c.metric === 'proteinDays' ? plural(v, ['día', 'días'], ['day', 'days']) : int(v)

function challengeWhen(c: Challenge, now = Date.now()): string {
  const status = challengeStatus(c, now)
  const range = `${shortDay(c.start)} – ${shortDay(c.end - 1)}`
  if (status === 'upcoming') return t(`Empieza el ${shortDay(c.start)}`, `Starts ${shortDay(c.start)}`)
  if (status === 'finished') return `${t('Terminado', 'Finished')} · ${range}`
  const days = Math.ceil((c.end - now) / 86400000)
  return `${range} · ${days <= 1 ? t('último día', 'last day') : t(`quedan ${days} días`, `${days} days left`)}`
}

// MARK: Pantalla principal

/** Tu resumen: compartir por el menú del sistema o QR, y qué se comparte. */
function ShareMine({ mine }: { mine: FriendSnapshot }) {
  const data = useData()
  const [toast, showToast] = useToast()
  const [qr, setQr] = useState<string>()
  const [name, setName] = useState(data.settings.name)
  const share = async () => {
    if ((await shareMine()) === 'copied') showToast(copiedToast())
  }
  const hasWeight = latestBodyWeight(data) !== undefined
  return (
    <Card title={t('Tu resumen', 'Your summary')} icon={Share2}>
      {!data.settings.name.trim() && (
        <label className="list-row" style={{ padding: 0 }}>
          <span className="grow small">{t('¿Cómo te verán tus amigos?', 'How will your friends see you?')}</span>
          <input className="field" style={{ width: 140 }} placeholder={t('Tu nombre', 'Your name')} value={name}
            onChange={(e) => setName(e.target.value)} onBlur={() => updateSettings({ name: name.trim() })} />
        </label>
      )}
      <span className="small muted">
        {t('Se comparte tu nombre, tus entrenamientos, volumen y series (esta semana, este mes y las 8 últimas semanas), series por grupo muscular, tus récords recientes, tu racha, tu mejor 1RM estimado en los básicos y tu progreso en los retos. Nada más.',
          'Your name, workouts, volume and sets (this week, this month and the last 8 weeks), sets per muscle group, your recent records, your streak, your best estimated 1RM on the main lifts and your challenge progress are shared. Nothing else.')}
      </span>
      {hasWeight && (
        <label className="list-row" style={{ padding: 0 }}>
          <span className="grow small">
            {t('Compartir mi peso corporal', 'Share my body weight')}
            <span className="muted" style={{ display: 'block' }}>{t('Para comparar la fuerza relativa (1RM ÷ peso)', 'To compare relative strength (1RM ÷ weight)')}</span>
          </span>
          <input type="checkbox" className="toggle" checked={data.settings.shareBodyWeight === true} onChange={(e) => updateSettings({ shareBodyWeight: e.target.checked || undefined })} />
        </label>
      )}
      <div className="row" style={{ gap: 8 }}>
        <button className="btn primary grow" onClick={() => void share()}><Share2 size={18} /> {t('Compartir', 'Share')}</button>
        <button className="btn secondary" onClick={() => void encodeSnapshot(mine).then((c) => setQr(friendLink(c)))}><QrIcon size={18} /> QR</button>
      </div>
      {qr && <QrSheet title={t('Tu reto', 'Your challenge')} url={qr} onClose={() => setQr(undefined)} onShare={() => void share()} />}
      {toast}
    </Card>
  )
}

/** Un reto: fechas y clasificación con barras de progreso. */
function ChallengeCard({ c, data, myValue, onMenu }: { c: Challenge; data: AppData; myValue: number; onMenu: () => void }) {
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

function Challenges({ data, onNew }: { data: AppData; onNew: () => void }) {
  const sessions = useMemo(() => finishedSessions(data), [data])
  const unit = data.settings.unit
  const exercise = useExerciseName()
  const [toast, showToast] = useToast()
  const [menu, setMenu] = useState<Challenge>()
  const live = liveChallenges(data.challenges)
  const invites = invitations(data.friends, data.challenges)
  const invite = async (c: Challenge) => {
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
          <button className="btn primary" onClick={() => update((d) => { d.challenges.push(c) })}><UserPlus size={18} /> {t('Unirme', 'Join')}</button>
        </div>
      ))}
      {live.map((c) => <ChallengeCard key={c.id} c={c} data={data} myValue={challengeProgress(c, sessions, challengeFood(data))} onMenu={() => setMenu(c)} />)}
      <button className="btn secondary" onClick={onNew}><Plus size={18} /> {t('Nuevo reto', 'New challenge')}</button>
      {menu && (
        <ActionSheet title={challengeTitle(menu, unit, exercise)} onClose={() => setMenu(undefined)} options={[
          ...(challengeStatus(menu) !== 'finished' ? [{ label: t('Invitar a amigos', 'Invite friends'), onSelect: () => void invite(menu) }] : []),
          {
            label: t('Salir del reto', 'Leave challenge'), destructive: true,
            onSelect: () => withUndo(t('Has salido del reto', 'You left the challenge'), () => update((d) => { d.challenges = d.challenges.filter((x) => x.id !== menu.id) })),
          },
        ]} />
      )}
      {toast}
    </Card>
  )
}

const METRIC_OPTIONS: { value: ChallengeMetric; label: () => string }[] = [
  { value: 'sessions', label: () => t('Entrenos', 'Workouts') },
  { value: 'volume', label: () => t('Peso', 'Weight') },
  { value: 'sets', label: () => t('Series', 'Sets') },
  { value: 'reps', label: () => t('Reps', 'Reps') },
  { value: 'logDays', label: () => t('Apuntar', 'Logging') },
  { value: 'proteinDays', label: () => t('Proteína', 'Protein') },
]

/** Crear un reto: qué se mide, cuánto dura y un objetivo opcional. */
function NewChallengeSheet({ onClose }: { onClose: () => void }) {
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
  const goal = Number(target.replace(',', '.'))
  const valid = metric !== 'reps' || !!ex
  const draft = (): Challenge => newChallenge({
    metric, by: data.settings.name.trim() || t('Sin nombre', 'No name'),
    ...(goal > 0 ? { target: Math.round(metric === 'volume' ? toKg(goal, unit) : goal) } : {}),
    ...(metric === 'sets' && group >= 0 ? { group } : {}),
    ...(metric === 'reps' && ex ? { exerciseId: ex.id, exerciseName: ex.name } : {}),
  }, days)

  const create = async () => {
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
            onChange={(e) => setTarget(e.target.value.replace(/[^\d.,]/g, ''))} aria-label={t('Objetivo', 'Goal')} />
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
function TrophyCase({ data }: { data: AppData }) {
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

/** Amigos con resumen de hace más de una semana: pedirles uno nuevo. */
function StaleFriends({ friends }: { friends: FriendSnapshot[] }) {
  const [toast, showToast] = useToast()
  if (!friends.length) return null
  return (
    <Card title={t('Pide un resumen nuevo', 'Ask for a new summary')} icon={BellRing}>
      <span className="small muted">{t('Estos resúmenes tienen más de una semana: no cuentan para «Esta semana».', 'These summaries are more than a week old: they do not count for "This week".')}</span>
      {friends.map((f) => (
        <div key={friendKey(f.name)} className="row" style={{ gap: 8 }}>
          <span className="grow clamp-1"><strong>{f.name}</strong> <span className="small muted">· {relative(f.at).toLowerCase()}</span></span>
          <button className="btn secondary btn-sm" onClick={() => void requestUpdate(f.name).then((r) => r === 'copied' && showToast(copiedToast()))}>
            <MessageCircle size={16} /> {t('Pedir', 'Ask')}
          </button>
        </div>
      ))}
      {toast}
    </Card>
  )
}

function Ranking({ title, rows, unit, pick }: { title: string; rows: Row[]; unit: Unit; pick: (r: Row) => FriendStats }) {
  const sorted = [...rows].sort((a, b) => pick(b).sessions - pick(a).sessions || pick(b).volume - pick(a).volume)
  return (
    <Card title={title} icon={Trophy}>
      {sorted.map((r, i) => (
        <div key={r.me ? '__me' : friendKey(r.name)} className={`rank-row ${r.me ? 'me' : ''}`}>
          <span className="rank-pos">{i + 1}</span>
          <span className="grow clamp-1">
            <span className="bold">{r.me ? `${r.name} (${t('tú', 'you')})` : r.name}</span>
            {r.trophies && <span className="tiny" style={{ display: 'block' }}>{trophyText(r.trophies)}</span>}
          </span>
          <span className="small" style={{ textAlign: 'right' }}>
            <strong>{plural(pick(r).sessions, ['entreno', 'entrenos'], ['workout', 'workouts'])}</strong>
            <span className="muted" style={{ display: 'block' }}>{volume(pick(r).volume, unit)} · {plural(pick(r).sets, ['serie', 'series'], ['set', 'sets'])}</span>
          </span>
        </div>
      ))}
    </Card>
  )
}

export function FriendsScreen() {
  const data = useData()
  const unit = data.settings.unit
  const mine = useMine()
  const [creating, setCreating] = useState(false)
  const now = Date.now()
  const everyone: Row[] = [{ ...mine, me: true }, ...data.friends]
  const week = everyone.filter((r) => r.me || sameWeek(r.at, now))
  const month = everyone.filter((r) => r.me || sameMonth(r.at, now))
  const stale = data.friends.filter((f) => isStale(f, now))
  const sessions = useMemo(() => finishedSessions(data), [data])

  // Al terminar un reto se guarda su clasificación (y se completa con resúmenes que lleguen tarde).
  useEffect(() => {
    const next = settleChallenges(data, sessions)
    if (next) update((d) => { d.challenges = next })
  }, [data, sessions])

  return (
    <>
      <NavBar showBack title={t('Retos con amigos', 'Friend challenges')} />
      <div className="screen with-nav">
        <ShareMine mine={mine} />
        <Challenges data={data} onNew={() => setCreating(true)} />
        <TrophyCase data={data} />
        {data.friends.length === 0 ? (
          <Empty icon={Users} title={t('Aún no hay amigos', 'No friends yet')}
            message={t('Comparte tu resumen y pide a tus amigos que te manden el suyo: al abrir su enlace se añaden aquí y podréis compararos cada semana.',
              'Share your summary and ask your friends to send you theirs: opening their link adds them here so you can compare every week.')} />
        ) : (
          <>
            <StaleFriends friends={stale} />
            <Ranking title={t('Esta semana', 'This week')} rows={week} unit={unit} pick={(r) => r.week} />
            <Ranking title={t('Este mes', 'This month')} rows={month} unit={unit} pick={(r) => r.month} />
            <Card title={t('Rachas y básicos', 'Streaks and main lifts')} icon={Users}>
              <div className="rank-table">
                <span /><span className="tiny muted">{t('Racha', 'Streak')}</span><span className="tiny muted">{t('Banca', 'Bench')}</span>
                <span className="tiny muted">{t('Sentadilla', 'Squat')}</span><span className="tiny muted">{t('P. muerto', 'Deadlift')}</span>
                {everyone.map((r) => (
                  <FriendCells key={r.me ? '__me' : friendKey(r.name)} r={r} unit={unit} />
                ))}
              </div>
              <span className="small muted">{t('Semanas seguidas entrenando y mejor 1RM estimado. Toca un amigo para ver la comparativa completa.', 'Weeks in a row training and best estimated 1RM. Tap a friend to see the full comparison.')}</span>
            </Card>
            <label className="list-row card-row">
              <span className="grow small">
                {t('Recordarme compartir mi resumen los domingos', 'Remind me to share my summary on Sundays')}
                <span className="muted" style={{ display: 'block' }}>{t('Un aviso en Inicio, dentro de la app', 'A card on Home, inside the app')}</span>
              </span>
              <input type="checkbox" className="toggle" checked={!data.settings.friendReminderOff} onChange={(e) => updateSettings({ friendReminderOff: e.target.checked ? undefined : true })} />
            </label>
          </>
        )}
      </div>
      {creating && <NewChallengeSheet onClose={() => setCreating(false)} />}
    </>
  )
}

function FriendCells({ r, unit }: { r: Row; unit: Unit }) {
  const lift = (kg?: number) => (kg ? weight(kg, unit).replace(` ${unit}`, '') : '—')
  return (
    <>
      {r.me
        ? <span className="clamp-1 bold rank-name me">{t('Tú', 'You')}</span>
        : <button className="clamp-1 bold rank-name rank-link" onClick={() => navigate('profile', 'friends', friendKey(r.name))} style={{ textAlign: 'left' }}>{r.name}</button>}
      <span>{r.streak}</span><span>{lift(r.lifts.bench)}</span><span>{lift(r.lifts.squat)}</span><span>{lift(r.lifts.deadlift)}</span>
    </>
  )
}

// MARK: Comparativa con un amigo

/** Barras dobles (tú y tu amigo) por semana. */
function DuoBars({ labels, a, b, format }: { labels: string[]; a: number[]; b: (number | undefined)[]; format: (v: number) => string }) {
  const max = Math.max(1, ...a, ...b.map((v) => v ?? 0))
  return (
    <div className="duo-bars" role="img" aria-label={labels.map((l, i) => `${l}: ${format(a[i])} / ${b[i] === undefined ? '—' : format(b[i]!)}`).join(', ')}>
      {labels.map((l, i) => (
        <div key={i} className="duo-col">
          <div className="duo-pair">
            <span className="duo-bar me" style={{ height: `${(a[i] / max) * 100}%` }} />
            <span className={`duo-bar friend ${b[i] === undefined ? 'none' : ''}`} style={{ height: `${((b[i] ?? 0) / max) * 100}%` }} />
          </div>
          <span className="tiny muted">{i % 2 === 1 ? l : ''}</span>
        </div>
      ))}
    </div>
  )
}

function Legend({ friend }: { friend: string }) {
  return (
    <div className="row tiny" style={{ gap: 14 }}>
      <span className="row" style={{ gap: 5 }}><span className="legend-dot me" />{t('Tú', 'You')}</span>
      <span className="row" style={{ gap: 5 }}><span className="legend-dot friend" />{friend}</span>
    </div>
  )
}

export function FriendDetailScreen({ id }: { id: string }) {
  const data = useData()
  const catalog = useCatalog()
  const mine = useMine()
  const unit = data.settings.unit
  const [toast, showToast] = useToast()
  const [measure, setMeasure] = useState<'sessions' | 'volume'>('sessions')
  const friend = data.friends.find((f) => friendKey(f.name) === id)
  if (!friend) {
    return (
      <>
        <NavBar showBack title={t('Amigo', 'Friend')} />
        <div className="screen with-nav"><Empty icon={Users} title={t('No está en tu lista', 'Not on your list')} message={t('Puede que lo hayas quitado.', 'You may have removed them.')} /></div>
      </>
    )
  }
  const now = Date.now()
  const theirs = alignWeeks(friend, now)
  const current = startOfWeek(now)
  const labels = Array.from({ length: WEEKS }, (_, i) => shortDay(addDays(current, -7 * (WEEKS - 1 - i))))
  const pick = (w: [number, number] | undefined) => (w === undefined ? undefined : measure === 'sessions' ? w[0] : w[1])
  const myWeeks = (mine.weeks ?? []).map((w) => pick(w) ?? 0)
  const format = (v: number) => (measure === 'sessions' ? int(v) : volume(v, unit))
  const myWeight = latestBodyWeight(data)
  const ratio = (lift?: number, bw?: number) => (lift && bw ? `×${(lift / bw).toLocaleString(t('es-ES', 'en-GB'), { maximumFractionDigits: 2, minimumFractionDigits: 2 })}` : '—')
  const lift = (kg?: number) => (kg ? weight(kg, unit) : '—')
  const ask = () => void requestUpdate(friend.name).then((r) => r === 'copied' && showToast(copiedToast()))
  const remove = () => {
    back()
    withUndo(t(`Quitado: ${friend.name}`, `Removed: ${friend.name}`), () => update((d) => { d.friends = d.friends.filter((f) => friendKey(f.name) !== id) }))
  }

  return (
    <>
      <NavBar showBack title={friend.name} />
      <div className="screen with-nav">
        <Card>
          {(friend.trophies || mine.trophies) && (
            <span className="small">{t('Trofeos', 'Trophies')}: <strong>{trophyText(mine.trophies) || '—'}</strong> {t('tú', 'you')} · <strong>{trophyText(friend.trophies) || '—'}</strong> {friend.name}</span>
          )}
          <span className="small muted">{t(`Resumen de ${relative(friend.at).toLowerCase()}`, `Summary from ${relative(friend.at).toLowerCase()}`)}{isStale(friend, now) ? t(': ya tiene más de una semana.', ': it is more than a week old.') : '.'}</span>
          <button className={`btn ${isStale(friend, now) ? 'primary' : 'secondary'}`} onClick={ask}><MessageCircle size={18} /> {t('Pedir actualización', 'Ask for an update')}</button>
        </Card>

        <Card title={t(`Últimas ${WEEKS} semanas`, `Last ${WEEKS} weeks`)} icon={ChartColumn}>
          <Segmented value={measure} onChange={setMeasure} options={[{ value: 'sessions', label: t('Entrenamientos', 'Workouts') }, { value: 'volume', label: t('Volumen', 'Volume') }]} />
          {friend.weeks ? (
            <>
              <DuoBars labels={labels} a={myWeeks} b={theirs.map(pick)} format={format} />
              <Legend friend={friend.name} />
            </>
          ) : <span className="small muted">{t('Su resumen es de una versión anterior: pídele uno nuevo para ver la gráfica.', 'Their summary is from an older version: ask for a new one to see the chart.')}</span>}
        </Card>

        {friend.muscles && mine.muscles && (
          <Card title={t('Series por grupo (28 días)', 'Sets per group (28 days)')} icon={Users}>
            <div className="duo-hbars">
              {MAIN_GROUPS.map(([name], i) => {
                const max = Math.max(1, ...mine.muscles!, ...friend.muscles!)
                return (
                  <div key={i} className="duo-hrow">
                    <span className="small clamp-1">{t(...name)}</span>
                    <div className="duo-hpair">
                      <span className="duo-hbar me" style={{ width: `${(mine.muscles![i] / max) * 100}%` }} />
                      <span className="duo-hbar friend" style={{ width: `${(friend.muscles![i] / max) * 100}%` }} />
                    </div>
                    <span className="tiny" style={{ textAlign: 'right' }}>{mine.muscles![i]}<br /><span className="muted">{friend.muscles![i]}</span></span>
                  </div>
                )
              })}
            </div>
            <Legend friend={friend.name} />
          </Card>
        )}

        <Card title={t('Básicos (1RM estimado)', 'Main lifts (estimated 1RM)')} icon={Trophy}>
          <div className="compare-table">
            <span /><span className="tiny muted">{t('Tú', 'You')}</span><span className="tiny muted clamp-1">{friend.name}</span>
            {([['bench', t('Banca', 'Bench')], ['squat', t('Sentadilla', 'Squat')], ['deadlift', t('Peso muerto', 'Deadlift')]] as const).map(([k, label]) => (
              <FragmentRow key={k} label={label} a={lift(mine.lifts[k])} b={lift(friend.lifts[k])}
                ra={friend.bodyWeight ? ratio(mine.lifts[k], myWeight) : undefined} rb={friend.bodyWeight ? ratio(friend.lifts[k], friend.bodyWeight) : undefined} />
            ))}
          </div>
          <span className="small muted">
            {friend.bodyWeight
              ? t('Debajo, la fuerza relativa: 1RM entre peso corporal (más justa entre personas de distinto tamaño).', 'Below, relative strength: 1RM divided by body weight (fairer between people of different sizes).')
              : t('Si los dos compartís el peso corporal, verás también la fuerza relativa.', 'If you both share your body weight, you will also see relative strength.')}
          </span>
        </Card>

        {friend.prs && friend.prs.length > 0 && (
          <Card title={t('Sus récords recientes', 'Their recent records')} icon={Trophy}>
            {friend.prs.map((r) => (
              <div key={r.exerciseId} className="row" style={{ gap: 8 }}>
                <span className="grow clamp-1">{catalog.get(r.exerciseId)?.name ?? r.name}</span>
                <span className="small bold">{weight(r.weight, unit)} × {r.reps}</span>
                <span className="tiny muted">{shortDay(r.at)}</span>
              </div>
            ))}
          </Card>
        )}

        <button className="btn danger block" onClick={remove}><UserMinus size={18} /> {t(`Quitar a ${friend.name}`, `Remove ${friend.name}`)}</button>
      </div>
      {toast}
    </>
  )
}

function FragmentRow({ label, a, b, ra, rb }: { label: string; a: string; b: string; ra?: string; rb?: string }) {
  return (
    <>
      <span className="small">{label}</span>
      <span className="bold">{a}{ra && <span className="tiny muted" style={{ display: 'block' }}>{ra}</span>}</span>
      <span className="bold">{b}{rb && <span className="tiny muted" style={{ display: 'block' }}>{rb}</span>}</span>
    </>
  )
}

// MARK: Enlace recibido

/** Al abrir el enlace de un amigo: su resumen frente al tuyo, sus retos y el botón para guardarlo. */
export function FriendImportScreen({ code }: { code: string }) {
  const data = useData()
  const mine = useMine()
  const unit = data.settings.unit
  const exercise = useExerciseName()
  const [friend, setFriend] = useState<FriendSnapshot | null>()
  useEffect(() => { void decodeSnapshot(code).then((f) => setFriend(f ?? null)) }, [code])
  const known = friend && data.friends.some((f) => friendKey(f.name) === friendKey(friend.name))
  const invites = friend ? invitations([friend], data.challenges) : []

  const saveFriend = (d: AppData, f: FriendSnapshot) => {
    d.friends = [...d.friends.filter((x) => friendKey(x.name) !== friendKey(f.name)), f]
  }
  const done = () => navigate(data.settings.onboarded ? 'profile' : 'home', ...(data.settings.onboarded ? ['friends'] : []))
  const save = () => {
    if (!friend) return
    update((d) => saveFriend(d, friend))
    done()
  }
  const join = (c: Challenge) => {
    if (!friend) return
    update((d) => {
      saveFriend(d, friend)
      if (!d.challenges.some((x) => x.id === c.id)) d.challenges.push(c)
    })
  }

  return (
    <>
      <NavBar title={t('Reto de un amigo', 'Friend challenge')} left={<button className="nav-btn" onClick={() => navigate('home')}>{t('Cerrar', 'Close')}</button>} />
      <div className="screen with-nav">
        {friend === undefined ? <p className="muted">{t('Leyendo…', 'Reading…')}</p> : friend === null ? (
          <Empty icon={Users} title={t('Enlace no válido', 'Invalid link')} message={t('El enlace está incompleto o dañado. Pide que te lo vuelvan a enviar.', 'The link is incomplete or damaged. Ask for it to be sent again.')} />
        ) : (
          <>
            {invites.map((c) => (
              <Card key={c.id} title={t(`${friend.name} te reta`, `${friend.name} challenges you`)} icon={Flag}>
                <strong>{challengeTitle(c, unit, exercise)}</strong>
                <span className="small muted">{challengeWhen(c)}{c.target ? '' : t(' · gana quien más sume', ' · highest total wins')}</span>
                <button className="btn primary" onClick={() => join(c)}><UserPlus size={18} /> {t('Aceptar el reto', 'Accept the challenge')}</button>
              </Card>
            ))}
            {friend.challenges?.filter((e) => data.challenges.some((c) => c.id === e.challenge.id)).map((e) => (
              <p key={e.challenge.id} className="small muted" style={{ margin: 0 }}>
                ✓ {challengeTitle(e.challenge, unit, exercise)}: {friend.name} {t('lleva', 'has')} {challengeValue(e.challenge, e.value, unit)}
              </p>
            ))}
            <Card title={`${friend.name} · ${relative(friend.at)}`} icon={UserPlus}>
              <div className="compare-table">
                <span /><span className="tiny muted clamp-1">{friend.name}</span><span className="tiny muted">{t('Tú', 'You')}</span>
                <span className="small">{t('Esta semana', 'This week')}</span><span className="bold">{sameWeek(friend.at) ? friend.week.sessions : '—'}</span><span className="bold">{mine.week.sessions}</span>
                <span className="small">{t('Este mes', 'This month')}</span><span className="bold">{sameMonth(friend.at) ? friend.month.sessions : '—'}</span><span className="bold">{mine.month.sessions}</span>
                <span className="small">{t('Racha (semanas)', 'Streak (weeks)')}</span><span className="bold">{friend.streak}</span><span className="bold">{mine.streak}</span>
                <span className="small">{t('Entrenamientos en total', 'Total workouts')}</span><span className="bold">{friend.total}</span><span className="bold">{mine.total}</span>
                {(friend.trophies || mine.trophies) && <><span className="small">{t('Trofeos de retos', 'Challenge trophies')}</span><span className="bold">{trophyText(friend.trophies) || '—'}</span><span className="bold">{trophyText(mine.trophies) || '—'}</span></>}
              </div>
            </Card>
            <button className="btn primary block" onClick={save}><UserPlus size={19} /> {known ? t(`Actualizar a ${friend.name}`, `Update ${friend.name}`) : t(`Añadir a ${friend.name} a mis retos`, `Add ${friend.name} to my challenges`)}</button>
            <ShareMine mine={mine} />
          </>
        )}
      </div>
    </>
  )
}
