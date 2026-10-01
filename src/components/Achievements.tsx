import { Award, CalendarCheck, Clock, Dumbbell, Flame, Medal, Shapes, Trophy, type LucideIcon } from 'lucide-react'
import { useMemo } from 'react'
import { shortDay, type Unit } from '../lib/format'
import { achievements, type AchievementGroup, type AchievementState } from '../lib/achievements'
import { t } from '../lib/i18n'
import type { Measurement, Session } from '../lib/store'
import { Card } from './ui'

const ICONS: Record<AchievementGroup, LucideIcon> = {
  consistency: CalendarCheck, volume: Dumbbell, records: Trophy, strength: Medal, variety: Shapes, time: Clock,
}

export function useAchievements(sessions: Session[], measurements: Measurement[], unit: Unit) {
  return useMemo(() => achievements(sessions, measurements, unit), [sessions, measurements, unit])
}

function Badge({ a }: { a: AchievementState }) {
  const Icon = a.id.startsWith('streak') ? Flame : ICONS[a.group]
  const done = a.unlockedAt !== undefined
  return (
    <div className={`badge ${done ? 'done' : ''}`}>
      <span className="badge-icon"><Icon size={22} /></span>
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="bold" style={{ display: 'block', fontSize: 15 }}>{t(...a.title)}</span>
        <span className="small muted" style={{ display: 'block' }}>{t(...a.detail)}</span>
        {done ? (
          <span className="tiny badge-date">{t('Conseguido el', 'Unlocked on')} {shortDay(a.unlockedAt!)}</span>
        ) : a.progress ? (
          <span className="badge-progress" role="meter" aria-valuemin={0} aria-valuemax={a.progress[1]} aria-valuenow={Math.min(a.progress[0], a.progress[1])}
            aria-label={`${Math.min(a.progress[0], a.progress[1])} / ${a.progress[1]}`}>
            <span style={{ width: `${Math.min(100, (a.progress[0] / a.progress[1]) * 100)}%` }} />
            <em className="tiny">{Math.min(a.progress[0], a.progress[1]).toLocaleString()} / {a.progress[1].toLocaleString()}</em>
          </span>
        ) : null}
      </span>
    </div>
  )
}

/** Todos los logros: conseguidos primero (los más recientes arriba) y luego los pendientes. */
export function AchievementsList({ sessions, measurements, unit }: { sessions: Session[]; measurements: Measurement[]; unit: Unit }) {
  const list = useAchievements(sessions, measurements, unit)
  const done = list.filter((a) => a.unlockedAt !== undefined).sort((a, b) => b.unlockedAt! - a.unlockedAt!)
  const pending = list.filter((a) => a.unlockedAt === undefined)
  return (
    <>
      <Card>
        <div className="row" style={{ gap: 10 }}>
          <Award size={28} color="var(--accent-text)" />
          <strong style={{ fontSize: 20 }}>{done.length} / {list.length}</strong>
          <span className="muted">{t('logros conseguidos', 'achievements unlocked')}</span>
        </div>
      </Card>
      <div className="badges">{done.map((a) => <Badge key={a.id} a={a} />)}</div>
      {pending.length > 0 && <div className="list-header">{t('Pendientes', 'Still to go')}</div>}
      <div className="badges">{pending.map((a) => <Badge key={a.id} a={a} />)}</div>
    </>
  )
}

/** Logros conseguidos en un entrenamiento concreto (para el resumen al terminar). */
export function NewAchievements({ session, sessions, measurements, unit }: { session: Session; sessions: Session[]; measurements: Measurement[]; unit: Unit }) {
  const list = useAchievements(sessions, measurements, unit).filter((a) => a.sessionId === session.id)
  if (!list.length) return null
  return (
    <Card title={list.length === 1 ? t('¡Nuevo logro!', 'New achievement!') : t(`¡${list.length} logros nuevos!`, `${list.length} new achievements!`)} icon={Award}>
      <div className="badges">{list.map((a) => <Badge key={a.id} a={a} />)}</div>
    </Card>
  )
}
