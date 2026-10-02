import { CalendarDays } from 'lucide-react'
import { useMemo, useState, type PointerEvent } from 'react'
import { day, startOfDay, type Unit } from '../lib/format'
import { locale, plural, t } from '../lib/i18n'
import { navigate } from '../lib/router'
import type { Session } from '../lib/store'
import { SessionRow } from './SessionRow'
import { Card } from './ui'

// Mapa del año: los 12 últimos meses en filas y sus días en columnas, con los días entrenados en
// naranja (más intenso si hubo dos o más). Tocar un día muestra sus entrenamientos.

const CELL = 10
const GAP = 2
const LABEL = 34
const STEP = CELL + GAP

export function YearMap({ sessions, unit }: { sessions: Session[]; unit: Unit }) {
  const now = new Date()
  // Del mes de hace 11 meses al actual.
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)), [now.getFullYear(), now.getMonth()]) // eslint-disable-line react-hooks/exhaustive-deps
  const byDay = useMemo(() => {
    const map = new Map<number, Session[]>()
    for (const s of sessions) {
      const key = startOfDay(s.start).getTime()
      map.set(key, [...(map.get(key) ?? []), s])
    }
    return map
  }, [sessions])
  const [selected, setSelected] = useState<number>()
  const today = startOfDay(now).getTime()
  const trained = [...byDay.keys()].filter((k) => k >= months[0].getTime() && k <= today).length
  const width = LABEL + 31 * STEP
  const height = 12 * STEP

  // Un toque en cualquier punto elige el día más cercano (las celdas son pequeñas para el dedo).
  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - box.left) / box.width) * width - LABEL
    const y = ((e.clientY - box.top) / box.height) * height
    const row = Math.min(11, Math.max(0, Math.floor(y / STEP)))
    const month = months[row]
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    const col = Math.min(days - 1, Math.max(0, Math.floor(x / STEP)))
    const date = new Date(month.getFullYear(), month.getMonth(), col + 1).getTime()
    if (date <= today) setSelected(date)
  }

  const chosen = selected !== undefined ? [...(byDay.get(selected) ?? [])].sort((a, b) => a.start - b.start) : undefined
  return (
    <Card title={t('Tu año', 'Your year')} icon={CalendarDays}>
      <svg className="year-map" viewBox={`0 0 ${width} ${height}`} width="100%" onPointerUp={pick} role="img"
        aria-label={t(`${trained} días entrenados en los últimos 12 meses`, `${trained} days trained in the last 12 months`)}>
        {months.map((m, row) => {
          const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate()
          return (
            <g key={row} transform={`translate(0, ${row * STEP})`}>
              <text x={0} y={CELL - 1} className="year-map-label">{m.toLocaleDateString(locale(), { month: 'short' }).replace('.', '')}</text>
              {Array.from({ length: days }, (_, i) => {
                const date = new Date(m.getFullYear(), m.getMonth(), i + 1).getTime()
                const n = byDay.get(date)?.length ?? 0
                const future = date > today
                return (
                  <rect key={i} x={LABEL + i * STEP} y={0} width={CELL} height={CELL} rx={2}
                    className={`year-cell ${n >= 2 ? 'hot' : n ? 'on' : ''} ${future ? 'future' : ''} ${date === selected ? 'selected' : ''}`} />
                )
              })}
            </g>
          )
        })}
      </svg>
      <span className="small muted">{t(`${plural(trained, ['día entrenado', 'días entrenados'], ['day trained', 'days trained'])} en los últimos 12 meses. Toca un día para ver qué hiciste.`, `${plural(trained, ['día entrenado', 'días entrenados'], ['day trained', 'days trained'])} in the last 12 months. Tap a day to see what you did.`)}</span>
      {chosen && (
        <div className="year-day">
          <span className="small bold">{day(selected!)}</span>
          {chosen.length === 0
            ? <span className="small muted">{t('Día de descanso.', 'Rest day.')}</span>
            : <div className="list">{chosen.map((s) => <SessionRow key={s.id} session={s} unit={unit} onClick={() => navigate('progress', 'session', s.id)} />)}</div>}
        </div>
      )}
    </Card>
  )
}
