import { BellRing, ChartColumn, Flag, MessageCircle, QrCode as QrIcon, Share2, Trophy, UserMinus, UserPlus, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { QrSheet } from '../components/Qr'
import { Card, Empty, NavBar, Segmented, useCatalog, useToast } from '../components/ui'
import { addDays, dayKey, int, relative, shortDay, startOfWeek, tons, weight, type Unit } from '../lib/format'
import {
  alignWeeks,
  saveFriend,
  newerSnapshot,
  copiedToast,
  settleChallenges,
  trophyText,
  requestUpdate,
  shareMine,
  decodeSnapshot,
  encodeSnapshot,
  friendKey,
  friendLink,
  invitations,
  isStale,
  latestBodyWeight,
  mySnapshot,
  sameMonth,
  sameWeek,
  WEEKS,
  type Challenge,
  type FriendSnapshot,
  type FriendStats,
} from '../lib/friends'
import { plural, t } from '../lib/i18n'
import { MAIN_GROUPS } from '../lib/labels'
import { back, navigate } from '../lib/router'
import { finishedSessions, update, updateSettings, useData, withUndo } from '../lib/store'
import { crowns, pastChampions, weeklyLeague } from '../lib/league'
import { Challenges, NewChallengeSheet, TrophyCase, challengeTitle, challengeValue, challengeWhen, keepName, useExerciseName, useNameRow } from './FriendsChallenges'

// Retos entre amigos (ver lib/friends.ts): compartir tu resumen, retos con objetivo y fecha, y
// comparar los resúmenes que te mandan.

interface Row extends FriendSnapshot {
  me?: boolean
}

function useMine() {
  const data = useData()
  const sessions = useMemo(() => finishedSessions(data), [data])
  // El día en las dependencias: con la pantalla abierta de un día a otro, «esta semana» y la racha se recalculan.
  const today = dayKey(Date.now())
  return useMemo(() => mySnapshot(data, sessions), [data, sessions, today]) // eslint-disable-line react-hooks/exhaustive-deps
}

// MARK: Pantalla principal

/** Tu resumen: compartir por el menú del sistema o QR, y qué se comparte. */
function ShareMine({ mine }: { mine: FriendSnapshot }) {
  const data = useData()
  const [toast, showToast] = useToast()
  const [qr, setQr] = useState<string>()
  const [name, nameRow] = useNameRow()
  const share = async () => {
    keepName(name)
    if ((await shareMine()) === 'copied') showToast(copiedToast())
  }
  const hasWeight = latestBodyWeight(data) !== undefined
  return (
    <Card title={t('Tu resumen', 'Your summary')} icon={Share2}>
      {nameRow}
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
        <button className="btn primary grow" disabled={!name} onClick={() => void share()}><Share2 size={18} /> {t('Compartir', 'Share')}</button>
        <button className="btn secondary" disabled={!name} onClick={() => { keepName(name); void encodeSnapshot({ ...mine, name }).then((c) => setQr(friendLink(c))) }}><QrIcon size={18} /> QR</button>
      </div>
      {qr && <QrSheet title={t('Tu resumen para amigos', 'Your summary for friends')} url={qr}
        hint={t('Que tu amigo lo escanee con la cámara: se abrirá Serix con tu resumen para compararos.', 'Have your friend scan it with the camera: Serix will open with your summary to compare.')} onClose={() => setQr(undefined)} onShare={() => void share()} />}
      {toast}
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

/** Liga de la semana: puntos por constancia (no por kilos) y coronas de las semanas pasadas. */
function LeagueCard({ mine, friends }: { mine: FriendSnapshot; friends: FriendSnapshot[] }) {
  const rows = weeklyLeague(mine, friends)
  const champions = pastChampions(mine, friends)
  const lastWeek = champions.find((c) => c.weekStart === addDays(startOfWeek(Date.now()), -7).getTime())
  const board = crowns(champions)
  const missing = friends.length - (rows.length - 1)
  return (
    <Card title={t('Liga de la semana', 'Weekly league')} icon={Trophy}>
      {lastWeek && <span className="league-last">👑 {lastWeek.me ? t('Ganaste la semana pasada', 'You won last week') : t(`${lastWeek.name} ganó la semana pasada`, `${lastWeek.name} won last week`)}</span>}
      {rows.map((r, i) => (
        <div key={r.me ? '__me' : friendKey(r.name)} className={`rank-row ${r.me ? 'me' : ''}`}>
          <span className="rank-pos">{i + 1}</span>
          <span className="grow clamp-1">
            <span className="bold">{r.me ? `${r.name || t('Tú', 'You')} (${t('tú', 'you')})` : r.name}</span>
            <span className="tiny muted" style={{ display: 'block' }}>
              {[plural(r.sessions, ['entreno', 'entrenos'], ['workout', 'workouts']), plural(r.sets, ['serie', 'series'], ['set', 'sets']), r.prs ? plural(r.prs, ['récord', 'récords'], ['PR', 'PRs']) : '', r.streak >= 4 ? t(`racha ${r.streak}`, `streak ${r.streak}`) : ''].filter(Boolean).join(' · ')}
            </span>
          </span>
          <strong className="league-points">{r.points}<span className="tiny muted"> {t('pts', 'pts')}</span></strong>
        </div>
      ))}
      {board.length > 0 && <span className="small">{t('Coronas (8 semanas)', 'Crowns (8 weeks)')}: {board.map((b) => `${b.me ? t('tú', 'you') : b.name} ×${b.count}`).join(' · ')}</span>}
      <span className="tiny muted">
        {t('10 puntos por entreno (hasta 6), 1 por cada 5 series, 5 por récord y 5 más con 4 semanas seguidas. Cuenta la constancia, no los kilos.', '10 points per workout (up to 6), 1 per 5 sets, 5 per PR and 5 more with a 4-week streak. Consistency counts, not kilos.')}
        {missing > 0 ? ` ${t(`Faltan ${missing} por mandar su resumen de esta semana.`, `${missing} still need to send this week's summary.`)}` : ''}
      </span>
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
            <span className="muted" style={{ display: 'block' }}>{tons(pick(r).volume, unit)} · {plural(pick(r).sets, ['serie', 'series'], ['set', 'sets'])}</span>
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
  const month = everyone.filter((r) => r.me || sameMonth(r.at, now))
  const stale = data.friends.filter((f) => isStale(f, now))
  const sessions = useMemo(() => finishedSessions(data), [data])

  // Al terminar un reto se guarda su clasificación (y se completa con resúmenes que lleguen tarde).
  useEffect(() => {
    // El cálculo sobre los datos del momento de escribir (no los de este render): con varias pestañas, un reto unido entre medias no se pierde.
    if (settleChallenges(data, sessions)) update((d) => { const next = settleChallenges(d, finishedSessions(d)); if (next) d.challenges = next })
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
            <LeagueCard mine={mine} friends={data.friends} />
            <Ranking title={t('Este mes', 'This month')} rows={month} unit={unit} pick={(r) => r.month} />
            <Card title={t('Rachas y básicos', 'Streaks and main lifts')} icon={Users}>
              <div className="rank-table">
                <span /><span className="tiny muted">{t('Racha', 'Streak')}</span><span className="tiny muted">{t('Banca', 'Bench')}</span>
                <span className="tiny muted">{t('Sentadilla', 'Squat')}</span><span className="tiny muted">{t('P. muerto', 'Deadlift')}</span>
                {everyone.map((r) => (
                  <FriendCells key={r.me ? '__me' : friendKey(r.name)} r={r} unit={unit} />
                ))}
              </div>
              <span className="small muted">{t('Semanas seguidas entrenando y mejor máximo estimado. Toca un amigo para ver la comparativa completa.', 'Weeks in a row training and best estimated max. Tap a friend to see the full comparison.')}</span>
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
  const format = (v: number) => (measure === 'sessions' ? int(v) : tons(v, unit))
  const myWeight = latestBodyWeight(data)
  const ratio = (lift?: number, bw?: number) => (lift && bw ? `×${(lift / bw).toLocaleString(t('es-ES', 'en-GB'), { maximumFractionDigits: 2, minimumFractionDigits: 2 })}` : '—')
  const lift = (kg?: number) => (kg ? weight(kg, unit) : '—')
  const ask = () => void requestUpdate(friend.name).then((r) => r === 'copied' && showToast(copiedToast()))
  const remove = () => {
    back()
    withUndo(t(`Quitado: ${friend.name}`, `Removed: ${friend.name}`), () => update((d) => {
      // Antes de quitarlo, se asienta la clasificación de los retos terminados: si no, su resultado y tu medalla lo pierden.
      const settled = settleChallenges(d, finishedSessions(d))
      if (settled) d.challenges = settled
      d.friends = d.friends.filter((f) => friendKey(f.name) !== id)
    }))
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

        <Card title={t('Básicos (máximo estimado)', 'Main lifts (estimated max)')} icon={Trophy}>
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
  useEffect(() => {
    // Si el enlace cambia antes de terminar de leerse, el resultado del anterior no pisa al nuevo.
    let current = true
    void decodeSnapshot(code).then((f) => { if (current) setFriend(f ?? null) })
    return () => { current = false }
  }, [code])
  const known = friend && data.friends.some((f) => friendKey(f.name) === friendKey(friend.name))
  const newer = friend ? newerSnapshot(data.friends, friend) : undefined
  // ¿Tu propio enlace (para probarlo o reenviado)? Con tu nombre te verías dos veces en la liga. Solo un
  // aviso: un amigo puede llamarse igual que tú.
  const own = !!friend && !known && friendKey(friend.name) === friendKey(mine.name)
  const invites = friend ? invitations([friend], data.challenges, Date.now(), data.settings.leftChallenges) : []

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
      // Si te unes a uno que habías dejado, vuelve a contar.
      if (d.settings.leftChallenges) d.settings.leftChallenges = d.settings.leftChallenges.filter((x) => x !== c.id)
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
            {own && <p className="small muted" style={{ margin: 0 }}>{t('Lleva tu mismo nombre: si es tu propio resumen, no hace falta añadirlo; mándaselo a tus amigos.', 'It has your same name: if it is your own summary, there is no need to add it; send it to your friends.')}</p>}
            {newer ? (
              <>
                <p className="small muted" style={{ margin: 0 }}>
                  {t(`Ya tienes un resumen más reciente de ${friend.name} (${relative(newer.at).toLowerCase()}): este no lo sustituye.`, `You already have a newer summary from ${friend.name} (${relative(newer.at).toLowerCase()}): this one does not replace it.`)}
                </p>
                <button className="btn secondary block" onClick={done}>{t('Ir a mis retos', 'Go to my challenges')}</button>
              </>
            ) : (
              <button className="btn primary block" onClick={save}><UserPlus size={19} /> {known ? t(`Actualizar a ${friend.name}`, `Update ${friend.name}`) : t(`Añadir a ${friend.name} a mis retos`, `Add ${friend.name} to my challenges`)}</button>
            )}
            <ShareMine mine={mine} />
          </>
        )}
      </div>
    </>
  )
}
