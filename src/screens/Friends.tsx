import { QrCode as QrIcon, Share2, Trophy, UserPlus, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { QrSheet } from '../components/Qr'
import { ActionSheet, Card, Empty, NavBar, useToast } from '../components/ui'
import { relative, volume, weight, type Unit } from '../lib/format'
import { decodeSnapshot, encodeSnapshot, friendKey, friendLink, mySnapshot, sameMonth, sameWeek, type FriendSnapshot, type FriendStats } from '../lib/friends'
import { plural, t } from '../lib/i18n'
import { navigate } from '../lib/router'
import { shareLink } from '../lib/share'
import { finishedSessions, update, updateSettings, useData, withUndo } from '../lib/store'

// Retos entre amigos (ver lib/friends.ts): compartir tu resumen y comparar los que te mandan.

interface Row extends FriendSnapshot {
  me?: boolean
}

function useMine() {
  const data = useData()
  const sessions = useMemo(() => finishedSessions(data), [data])
  return useMemo(() => mySnapshot(data, sessions), [data, sessions])
}

/** Comparte el resumen propio por el menú del sistema (o copiándolo) y por QR. */
function ShareMine({ mine }: { mine: FriendSnapshot }) {
  const data = useData()
  const [toast, showToast] = useToast()
  const [qr, setQr] = useState<string>()
  const [name, setName] = useState(data.settings.name)
  const share = async () => {
    const url = friendLink(await encodeSnapshot(mine))
    const result = await shareLink(t(`Reto Serix de ${mine.name}`, `${mine.name}'s Serix challenge`), url)
    if (result === 'copied') showToast(t('Enlace copiado: pégalo en WhatsApp', 'Link copied: paste it in WhatsApp'))
  }
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
        {t('Se comparte tu nombre, tus entrenamientos, volumen y series de esta semana y del mes, tu racha y tu mejor 1RM estimado en banca, sentadilla y peso muerto. Nada más.',
          'Your name, workouts, volume and sets this week and this month, your streak and your best estimated 1RM on bench, squat and deadlift are shared. Nothing else.')}
      </span>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn primary grow" onClick={() => void share()}><Share2 size={18} /> {t('Compartir', 'Share')}</button>
        <button className="btn secondary" onClick={() => void encodeSnapshot(mine).then((c) => setQr(friendLink(c)))}><QrIcon size={18} /> QR</button>
      </div>
      {qr && <QrSheet title={t('Tu reto', 'Your challenge')} url={qr} onClose={() => setQr(undefined)} onShare={() => void share()} />}
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
          <span className="grow clamp-1 bold">{r.me ? `${r.name} (${t('tú', 'you')})` : r.name}</span>
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
  const [menu, setMenu] = useState<FriendSnapshot>()
  const now = Date.now()
  const everyone: Row[] = [{ ...mine, me: true }, ...data.friends]
  const week = everyone.filter((r) => r.me || sameWeek(r.at, now))
  const month = everyone.filter((r) => r.me || sameMonth(r.at, now))
  const old = data.friends.filter((f) => !sameWeek(f.at, now))

  return (
    <>
      <NavBar showBack title={t('Retos con amigos', 'Friend challenges')} />
      <div className="screen with-nav">
        <ShareMine mine={mine} />
        {data.friends.length === 0 ? (
          <Empty icon={Users} title={t('Aún no hay amigos', 'No friends yet')}
            message={t('Comparte tu resumen y pide a tus amigos que te manden el suyo: al abrir su enlace se añaden aquí y podréis compararos cada semana.',
              'Share your summary and ask your friends to send you theirs: opening their link adds them here so you can compare every week.')} />
        ) : (
          <>
            <Ranking title={t('Esta semana', 'This week')} rows={week} unit={unit} pick={(r) => r.week} />
            <Ranking title={t('Este mes', 'This month')} rows={month} unit={unit} pick={(r) => r.month} />
            <Card title={t('Rachas y básicos', 'Streaks and main lifts')} icon={Users}>
              <div className="rank-table">
                <span /><span className="tiny muted">{t('Racha', 'Streak')}</span><span className="tiny muted">{t('Banca', 'Bench')}</span>
                <span className="tiny muted">{t('Sentadilla', 'Squat')}</span><span className="tiny muted">{t('P. muerto', 'Deadlift')}</span>
                {everyone.map((r) => (
                  <FriendCells key={r.me ? '__me' : friendKey(r.name)} r={r} unit={unit} onMenu={() => !r.me && setMenu(r)} />
                ))}
              </div>
              <span className="small muted">{t('Semanas seguidas entrenando y mejor 1RM estimado. Toca un amigo para quitarlo.', 'Weeks in a row training and best estimated 1RM. Tap a friend to remove them.')}</span>
            </Card>
            {old.length > 0 && (
              <p className="list-footer" style={{ margin: 0 }}>
                {t('Resúmenes de otra semana (no cuentan en «Esta semana»): ', 'Summaries from another week (not counted in "This week"): ')}
                {old.map((f) => `${f.name} (${relative(f.at).toLowerCase()})`).join(', ')}. {t('Pídeles uno nuevo.', 'Ask them for a new one.')}
              </p>
            )}
          </>
        )}
      </div>
      {menu && (
        <ActionSheet title={menu.name} onClose={() => setMenu(undefined)} options={[{
          label: t(`Quitar a ${menu.name}`, `Remove ${menu.name}`), destructive: true,
          onSelect: () => withUndo(t(`Quitado: ${menu.name}`, `Removed: ${menu.name}`), () => update((d) => { d.friends = d.friends.filter((f) => friendKey(f.name) !== friendKey(menu.name)) })),
        }]} />
      )}
    </>
  )
}

function FriendCells({ r, unit, onMenu }: { r: Row; unit: Unit; onMenu: () => void }) {
  const lift = (kg?: number) => (kg ? weight(kg, unit).replace(` ${unit}`, '') : '—')
  return (
    <>
      <button className={`clamp-1 bold rank-name ${r.me ? 'me' : ''}`} onClick={onMenu} style={{ textAlign: 'left' }}>{r.me ? t('Tú', 'You') : r.name}</button>
      <span>{r.streak}</span><span>{lift(r.lifts.bench)}</span><span>{lift(r.lifts.squat)}</span><span>{lift(r.lifts.deadlift)}</span>
    </>
  )
}

/** Al abrir el enlace de un amigo: su resumen frente al tuyo y el botón para guardarlo. */
export function FriendImportScreen({ code }: { code: string }) {
  const data = useData()
  const mine = useMine()
  const [friend, setFriend] = useState<FriendSnapshot | null>()
  useEffect(() => { void decodeSnapshot(code).then((f) => setFriend(f ?? null)) }, [code])
  const known = friend && data.friends.some((f) => friendKey(f.name) === friendKey(friend.name))

  const save = () => {
    if (!friend) return
    update((d) => {
      d.friends = [...d.friends.filter((f) => friendKey(f.name) !== friendKey(friend.name)), friend]
    })
    navigate(data.settings.onboarded ? 'profile' : 'home', ...(data.settings.onboarded ? ['friends'] : []))
  }

  return (
    <>
      <NavBar title={t('Reto de un amigo', 'Friend challenge')} left={<button className="nav-btn" onClick={() => navigate('home')}>{t('Cerrar', 'Close')}</button>} />
      <div className="screen with-nav">
        {friend === undefined ? <p className="muted">{t('Leyendo…', 'Reading…')}</p> : friend === null ? (
          <Empty icon={Users} title={t('Enlace no válido', 'Invalid link')} message={t('El enlace está incompleto o dañado. Pide que te lo vuelvan a enviar.', 'The link is incomplete or damaged. Ask for it to be sent again.')} />
        ) : (
          <>
            <Card title={`${friend.name} · ${relative(friend.at)}`} icon={UserPlus}>
              <div className="compare-table">
                <span /><span className="tiny muted clamp-1">{friend.name}</span><span className="tiny muted">{t('Tú', 'You')}</span>
                <span className="small">{t('Esta semana', 'This week')}</span><span className="bold">{sameWeek(friend.at) ? friend.week.sessions : '—'}</span><span className="bold">{mine.week.sessions}</span>
                <span className="small">{t('Este mes', 'This month')}</span><span className="bold">{sameMonth(friend.at) ? friend.month.sessions : '—'}</span><span className="bold">{mine.month.sessions}</span>
                <span className="small">{t('Racha (semanas)', 'Streak (weeks)')}</span><span className="bold">{friend.streak}</span><span className="bold">{mine.streak}</span>
                <span className="small">{t('Entrenamientos en total', 'Total workouts')}</span><span className="bold">{friend.total}</span><span className="bold">{mine.total}</span>
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
