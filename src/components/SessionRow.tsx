import { Clock, Layers, Weight } from 'lucide-react'
import { duration, relative, volume, type Unit } from '../lib/format'
import { sessionDuration, sessionSets, sessionVolume } from '../lib/stats'
import type { Session } from '../lib/store'

/** Fila de un entrenamiento terminado (Inicio, Progreso, Perfil). */
export function SessionRow({ session, unit, onClick }: { session: Session; unit: Unit; onClick: () => void }) {
  return (
    <button className="list-row" onClick={onClick}>
      <span className="grow">
        <span className="row between">
          <span className="bold clamp-1">{session.name}</span>
          <span className="small muted" style={{ flexShrink: 0 }}>{relative(session.start)}</span>
        </span>
        <span className="small muted row" style={{ gap: 12, marginTop: 2 }}>
          <span className="row" style={{ gap: 4 }}><Clock size={13} /> {duration(sessionDuration(session))}</span>
          <span className="row" style={{ gap: 4 }}><Weight size={13} /> {volume(sessionVolume(session), unit)}</span>
          <span className="row" style={{ gap: 4 }}><Layers size={13} /> {sessionSets(session)}</span>
        </span>
        <span className="small clamp-1" style={{ color: 'var(--text-3)', display: 'block', marginTop: 2 }}>
          {session.exercises.map((e) => e.name).join(' · ')}
        </span>
      </span>
    </button>
  )
}
