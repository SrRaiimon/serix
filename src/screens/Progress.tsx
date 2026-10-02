import { AlertTriangle, ArrowDownRight, ArrowUpRight, Scale, Calendar, ChartColumn, ChartLine, Clock, Dumbbell, Info, PersonStanding, Share2, TrendingDown, Trophy, Weight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { BarChart, HBarChart, LineChart } from '../components/charts'
import { MuscleHeatMap } from '../components/MuscleMap'
import { Card, Empty, LargeTitle, NavBar, Segmented, Thumb, Tile, useCatalog, useProgressive, useToast } from '../components/ui'
import { periodCardSVG, periodLabel, summarize, type Period } from '../lib/periodCard'
import { shareImage, svgToPng } from '../lib/shareCard'
import { duration, fromKg, int, monthYear, num, shortDay, volume, weight, weightValue } from '../lib/format'
import { MAIN_GROUPS, muscleLabel } from '../lib/labels'
import { navigate } from '../lib/router'
import { exerciseHistory, monthToDate, muscleLoad, records, sessionDuration, setsByMuscle, STALL_SESSIONS, stalls, weekly, type PeriodStats } from '../lib/stats'
import { finishedSessions, updateSettings, useData, type Session } from '../lib/store'
import type { Unit } from '../lib/format'
import { ExerciseSheet } from './Exercises'
import { SessionRow } from '../components/SessionRow'
import { RecoveryCard } from '../components/Recovery'
import { YearMap } from '../components/YearMap'
import { RepRecordsCard } from '../components/RepRecords'
import { balanceTip, muscleBalance } from '../lib/balance'
import { weeklyGroupSets, weeklyRange } from '../lib/autoreg'
import { AchievementsList } from '../components/Achievements'
import { locale, t } from '../lib/i18n'

type Section = 'summary' | 'history' | 'records' | 'achievements'
let savedSection: Section = 'summary'

export function ProgressScreen() {
  const data = useData()
  // Paso 3 de la guía de primeros pasos.
  useEffect(() => {
    if (!data.settings.guideProgressSeen) updateSettings({ guideProgressSeen: true })
  }, [data.settings.guideProgressSeen])
  const sessions = useMemo(() => finishedSessions(data), [data])
  const [section, setSectionState] = useState<Section>(savedSection)
  const setSection = (s: Section) => {
    savedSection = s
    setSectionState(s)
  }
  const unit = data.settings.unit

  return (
    <div className="screen">
      <LargeTitle title={t('Progreso', 'Progress')} />
      {sessions.length === 0 ? (
        <Empty icon={ChartLine} title={t('Sin datos todavía', 'No data yet')} message={t('Completa tu primer entrenamiento y aquí verás tu volumen, récords y progreso por ejercicio.', 'Finish your first workout and you will see your volume, records and progress per exercise here.')} />
      ) : (
        <>
          <Segmented value={section} onChange={setSection} options={[
            { value: 'summary', label: t('Resumen', 'Summary') },
            { value: 'history', label: t('Historial', 'History') },
            { value: 'records', label: t('Récords', 'Records') },
            { value: 'achievements', label: t('Logros', 'Badges') },
          ]} />
          {section === 'summary' && <Summary sessions={sessions} unit={unit} />}
          {section === 'history' && <History sessions={sessions} unit={unit} />}
          {section === 'records' && <Records sessions={sessions} unit={unit} />}
          {section === 'achievements' && <AchievementsList sessions={sessions} measurements={data.measurements} unit={unit} />}
        </>
      )}
    </div>
  )
}

/** Series de los últimos 7 días por grupo frente a un rango orientativo según el objetivo. */
function WeeklyVolume({ sessions }: { sessions: Session[] }) {
  const catalog = useCatalog()
  const { settings } = useData()
  const groups = useMemo(() => weeklyGroupSets(sessions, (id) => catalog.get(id)?.secondaryMuscles ?? []), [sessions, catalog])
  if (!groups.some((g) => g.sets > 0)) return null
  const [min, max] = weeklyRange(settings.goal)
  const scale = Math.max(max * 1.25, ...groups.map((g) => g.sets))
  const pct = (v: number) => `${(v / scale) * 100}%`
  const low = groups.filter((g) => g.sets < min).map((g) => t(...g.name).toLowerCase())
  const high = groups.filter((g) => g.sets > max).map((g) => t(...g.name).toLowerCase())
  return (
    <Card title={t('Series por grupo (7 días)', 'Sets per group (7 days)')} icon={Dumbbell}>
      <div className="volume-rows">
        {groups.map((g) => {
          const state = g.sets < min ? 'low' : g.sets > max ? 'high' : 'ok'
          return (
            <div key={g.name[0]} className="volume-row">
              <span className="small clamp-1">{t(...g.name)}</span>
              <div className="volume-track" role="img" aria-label={`${t(...g.name)}: ${num(g.sets)} ${t('series', 'sets')}`}>
                <span className="volume-range" style={{ left: pct(min), width: pct(max - min) }} />
                <span className={`volume-fill ${state}`} style={{ width: pct(g.sets) }} />
              </div>
              <span className="small bold" style={{ textAlign: 'right' }}>{num(g.sets)}</span>
            </div>
          )
        })}
      </div>
      <span className="small muted">
        {t(`Zona marcada: ${min}–${max} series por semana, lo orientativo para tu objetivo. Los músculos secundarios cuentan media serie.`, `Shaded zone: ${min}–${max} sets per week, the usual guide for your goal. Secondary muscles count as half a set.`)}
        {low.length > 0 && ` ${t(`Por debajo: ${low.join(', ')}.`, `Below: ${low.join(', ')}.`)}`}
        {high.length > 0 && ` ${t(`Por encima (vigila la recuperación): ${high.join(', ')}.`, `Above (watch your recovery): ${high.join(', ')}.`)}`}
      </span>
    </Card>
  )
}

/** Equilibrio entre músculos opuestos en las últimas 4 semanas (lib/balance.ts). */
function BalanceCard({ sessions }: { sessions: Session[] }) {
  const balance = useMemo(() => muscleBalance(sessions), [sessions])
  if (balance.total === 0) return null
  return (
    <Card title={t('Equilibrio muscular (4 semanas)', 'Muscle balance (4 weeks)')} icon={Scale}>
      {balance.pairs.map((p) => {
        const [a, b] = p.sets
        const total = a + b
        return (
          <div key={p.id} className="balance">
            <span className="row between small">
              <span className="bold">{t(...p.sides[0])} <span className="muted">{a}</span></span>
              <span className="bold">{t(...p.sides[1])} <span className="muted">{b}</span></span>
            </span>
            <div className="balance-bar" role="img" aria-label={`${t(...p.sides[0])} ${a} ${t('series', 'sets')}, ${t(...p.sides[1])} ${b} ${t('series', 'sets')}`}>
              <span style={{ width: `${total ? (a / total) * 100 : 50}%` }} className={p.short === 0 ? 'short' : ''} />
              <span style={{ width: `${total ? (b / total) * 100 : 50}%` }} className={p.short === 1 ? 'short' : ''} />
            </div>
            {total === 0
              ? <span className="small muted">{t('Sin series de estos grupos en 4 semanas.', 'No sets for these groups in 4 weeks.')}</span>
              : total < 12
                ? <span className="small muted">{t('Aún pocas series para valorarlo.', 'Too few sets to judge yet.')}</span>
                : <span className={`small ${p.short !== undefined ? 'warn-text' : 'muted'}`}>{p.short !== undefined && <AlertTriangle size={14} style={{ verticalAlign: -2 }} />} {balanceTip(p)}</span>}
          </div>
        )
      })}
      {balance.neglected.length > 0 && (
        <span className="small warn-text"><AlertTriangle size={14} style={{ verticalAlign: -2 }} /> {t(`Sin ninguna serie en 4 semanas: ${balance.neglected.map((n) => t(...n).toLowerCase()).join(', ')}.`, `No sets at all in 4 weeks: ${balance.neglected.map((n) => t(...n).toLowerCase()).join(', ')}.`)}</span>
      )}
    </Card>
  )
}

function WeeklyMuscles({ sessions }: { sessions: Session[] }) {
  const catalog = useCatalog()
  const load = useMemo(
    () => muscleLoad(sessions, Date.now() - 7 * 86400000, (id) => catalog.get(id)?.secondaryMuscles ?? []),
    [sessions, catalog],
  )
  const trained = Object.values(load).some((v) => v > 0)
  const missing = MAIN_GROUPS.filter(([, keys]) => keys.every((k) => (load[k] ?? 0) < 1)).map(([label]) => t(...label))
  return (
    <Card title={t('Músculos esta semana', 'Muscles this week')} icon={PersonStanding}>
      <MuscleHeatMap load={load} />
      <span className="small muted">
        {!trained
          ? t('No has entrenado en los últimos 7 días.', 'You have not trained in the last 7 days.')
          : missing.length
            ? t(`Sin trabajar en los últimos 7 días: ${missing.join(', ')}.`, `Not trained in the last 7 days: ${missing.join(', ')}.`)
            : t('Has trabajado todos los grupos principales en los últimos 7 días.', 'You have trained every main group in the last 7 days.')}
      </span>
    </Card>
  )
}

/** Diferencia con el mismo tramo del mes anterior, en texto corto. */
function Delta({ now, before, format }: { now: number; before: number; format: (v: number) => string }) {
  if (before === 0 && now === 0) return null
  const diff = now - before
  if (Math.abs(diff) < 1e-6) return <span className="tiny muted">{t('igual que el mes pasado', 'same as last month')}</span>
  const up = diff > 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className="tiny row" style={{ gap: 2, color: up ? 'var(--green-text)' : 'var(--text-2)' }}>
      <Icon size={13} /> {up ? '+' : '−'}{format(Math.abs(diff))} {t('vs. mes pasado', 'vs. last month')}
    </span>
  )
}

function MonthCard({ sessions, unit }: { sessions: Session[]; unit: Unit }) {
  const { current, previous } = useMemo(() => monthToDate(sessions), [sessions])
  const month = new Date().toLocaleDateString(locale(), { month: 'long' })
  const item = (label: string, key: keyof PeriodStats, format: (v: number) => string) => (
    <div className="month-stat">
      <span className="bold">{format(current[key])}</span>
      <span className="small muted">{label}</span>
      <Delta now={current[key]} before={previous[key]} format={format} />
    </div>
  )
  return (
    <Card title={`${t('Este mes', 'This month')} (${month})`} icon={Calendar}>
      <div className="month-grid">
        {item(t('Entrenos', 'Workouts'), 'sessions', (v) => String(v))}
        {item(t('Volumen', 'Volume'), 'volume', (v) => volume(v, unit))}
        {item(t('Series efectivas', 'Working sets'), 'sets', (v) => String(v))}
        {item(t('Tiempo', 'Time'), 'time', (v) => duration(v))}
      </div>
      <span className="small muted">
        {current.records > 0 ? (current.records === 1 ? t('1 récord batido este mes. ', '1 record broken this month. ') : t(`${current.records} récords batidos este mes. `, `${current.records} records broken this month. `)) : ''}
        {t('Se compara con el mismo número de días del mes anterior.', 'Compared with the same number of days last month.')}
      </span>
    </Card>
  )
}

const PERIODS: { value: Period; label: () => string }[] = [
  { value: 'month', label: () => t('Este mes', 'This month') },
  { value: 'lastMonth', label: () => t('Mes pasado', 'Last month') },
  { value: 'year', label: () => t('Este año', 'This year') },
  { value: 'lastYear', label: () => t('Año pasado', 'Last year') },
]

/** Resumen del mes o del año como imagen para compartir (lib/periodCard.ts). */
function ShareSummaryCard({ sessions, unit }: { sessions: Session[]; unit: Unit }) {
  const [period, setPeriod] = useState<Period>('month')
  const [image, setImage] = useState<{ file: File; url: string }>()
  const [toast, showToast] = useToast()
  const summary = useMemo(() => summarize(sessions, period), [sessions, period])
  // La imagen se prepara antes de tocar «Compartir»: el menú del sistema tiene que abrirse al instante.
  useEffect(() => {
    let cancelled = false
    let url: string | undefined
    setImage(undefined)
    svgToPng(periodCardSVG(summary, unit))
      .then((blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setImage({ file: new File([blob], `serix-${periodLabel(summary).replace(/\s+/g, '-')}.png`, { type: 'image/png' }), url })
      })
      .catch(() => setImage(undefined))
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [summary, unit])
  const share = async () => {
    if (!image) return
    if ((await shareImage(image.file, t('Mi resumen en Serix', 'My Serix summary'))) === 'downloaded') showToast(t('Imagen descargada', 'Image downloaded'))
  }
  return (
    <Card title={t('Tu resumen para compartir', 'Your summary to share')} icon={Share2}>
      <Segmented value={period} onChange={setPeriod} options={PERIODS.map((p) => ({ value: p.value, label: p.label() }))} />
      {summary.sessions === 0
        ? <span className="small muted">{t('No hay entrenamientos en este periodo.', 'There are no workouts in this period.')}</span>
        : (
          <>
            <div className="period-preview">{image ? <img src={image.url} alt={t(`Resumen de ${periodLabel(summary)}`, `Summary of ${periodLabel(summary)}`)} /> : <span className="small muted">{t('Preparando la imagen…', 'Preparing the image…')}</span>}</div>
            <button className="btn primary" disabled={!image} onClick={() => void share()}><Share2 size={18} /> {t('Compartir imagen', 'Share image')}</button>
          </>
        )}
      {toast}
    </Card>
  )
}

function Summary({ sessions, unit }: { sessions: Session[]; unit: Unit }) {
  // El modo sencillo deja lo básico; el volumen por grupo y el equilibrio son para quien ya controla.
  const simple = useData().settings.simpleMode === true
  const weeks = weekly(sessions, 12)
  const thisWeek = weeks[weeks.length - 1]
  const muscles = setsByMuscle(sessions, Date.now() - 30 * 86400000)
  const totalTime = sessions.reduce((t, s) => t + sessionDuration(s), 0)
  return (
    <>
      <div className="grid-2">
        <Tile icon={Calendar} value={thisWeek.sessions} label={t('Entrenos esta semana', 'Workouts this week')} />
        <Tile icon={Weight} value={volume(thisWeek.volume, unit)} label={t('Volumen esta semana', 'Volume this week')} />
        <Tile icon={Dumbbell} value={sessions.length} label={t('Entrenos totales', 'Total workouts')} />
        <Tile icon={Clock} value={duration(totalTime)} label={t('Tiempo total', 'Total time')} />
      </div>
      <MonthCard sessions={sessions} unit={unit} />
      <YearMap sessions={sessions} unit={unit} />
      <ShareSummaryCard sessions={sessions} unit={unit} />
      <Stalls sessions={sessions} unit={unit} />
      <RecoveryCard sessions={sessions} />
      <WeeklyMuscles sessions={sessions} />
      {!simple && <WeeklyVolume sessions={sessions} />}
      {!simple && <BalanceCard sessions={sessions} />}
      <Card title={t('Volumen semanal', 'Weekly volume')} icon={ChartColumn}>
        <BarChart data={weeks.map((w) => ({ label: shortDay(w.start), value: fromKg(w.volume, unit) }))} />
        <span className="small muted">{t(`Últimas 12 semanas · ${unit} levantados (peso × repeticiones)`, `Last 12 weeks · ${unit} lifted (weight × reps)`)}</span>
      </Card>
      <Card title={t('Entrenamientos por semana', 'Workouts per week')} icon={Calendar}>
        <BarChart data={weeks.map((w) => ({ label: shortDay(w.start), value: w.sessions }))} height={130} color="var(--blue-text)" />
      </Card>
      {muscles.length > 0 && (
        <Card title={t('Series por músculo (30 días)', 'Sets per muscle (30 days)')} icon={PersonStanding}>
          <HBarChart items={muscles.map((m) => ({ label: muscleLabel(m.muscle), value: m.sets }))} />
          <span className="small muted">{t('Para ganar músculo se suelen recomendar 10-20 series semanales por grupo.', 'For muscle gain, 10-20 weekly sets per group are usually recommended.')}</span>
        </Card>
      )}
    </>
  )
}

/** Ejercicios hechos el último mes que no mejoran desde hace varias sesiones. */
function Stalls({ sessions, unit }: { sessions: Session[]; unit: Unit }) {
  const list = useMemo(() => stalls(sessions, Date.now() - 30 * 86400000), [sessions])
  if (!list.length) return null
  return (
    <Card title={t('Estancados', 'Stalled')} icon={TrendingDown}>
      {list.map((x) => (
        <button key={x.exerciseId} className="row" style={{ textAlign: 'left' }} onClick={() => navigate('progress', 'exercise', x.exerciseId)}>
          <Thumb exerciseId={x.exerciseId} size={36} />
          <span className="grow">
            <span className="bold clamp-2" style={{ fontSize: 15 }}>{x.name}</span>
            <span className="small muted">{t('Mejor 1RM est.', 'Best est. 1RM')}: ~{int(fromKg(x.best, unit))} {unit}</span>
          </span>
        </button>
      ))}
      <span className="small muted">
        {t(`${STALL_SESSIONS} sesiones o más sin superar su mejor marca. Al empezarlos en el entrenamiento te propondremos una sesión de descarga (menos series y −10 % de peso) o cambiar a una variante.`,
          `${STALL_SESSIONS} or more sessions without beating their best. When you start them in a workout we will suggest a deload session (fewer sets and −10% weight) or switching to a variation.`)}
      </span>
    </Card>
  )
}

function History({ sessions, unit }: { sessions: Session[]; unit: Unit }) {
  // Con años de historial se pintan de 50 en 50 al ir bajando (pintarlos todos de golpe se notaba).
  const { shown, sentinel } = useProgressive(sessions, '')
  const total = new Map<string, number>()
  for (const s of sessions) {
    const key = monthYear(s.start)
    total.set(key, (total.get(key) ?? 0) + 1)
  }
  const months = new Map<string, Session[]>()
  for (const s of shown) {
    const key = monthYear(s.start)
    months.set(key, [...(months.get(key) ?? []), s])
  }
  return (
    <>
      {[...months].map(([month, list]) => (
        <div key={month} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="list-header">{month} · {total.get(month)}</div>
          <div className="list">
            {list.map((s) => <SessionRow key={s.id} session={s} unit={unit} onClick={() => navigate('progress', 'session', s.id)} />)}
          </div>
        </div>
      ))}
      {sentinel}
    </>
  )
}

function Records({ sessions, unit }: { sessions: Session[]; unit: Unit }) {
  const list = records(sessions)
  if (!list.length) return <Empty icon={Trophy} title={t('Sin récords', 'No records')} message={t('Los récords aparecen al registrar series con peso.', 'Records appear when you log sets with weight.')} />
  return (
    <>
      <div className="list">
        {list.map((r) => (
          <button key={r.exerciseId} className="list-row" onClick={() => navigate('progress', 'exercise', r.exerciseId)}>
            <Thumb exerciseId={r.exerciseId} size={44} />
            <span className="grow">
              <span className="bold clamp-2" style={{ fontSize: 15 }}>{r.name}</span>
              <span className="small muted">{weight(r.weight, unit)} × {r.reps} · {shortDay(r.date)}</span>
            </span>
            <span style={{ textAlign: 'right' }}>
              <span className="bold" style={{ display: 'block' }}>{weightValue(r.e1rm, unit)}</span>
              <span className="tiny muted">{t('1RM est.', 'est. 1RM')}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="list-footer">{t('Mejor serie de cada ejercicio según el 1RM estimado (fórmula de Epley). Toca uno para ver su evolución.', 'Best set of each exercise by estimated 1RM (Epley formula). Tap one to see its progress.')}</p>
    </>
  )
}

type Metric = 'e1rm' | 'weight' | 'volume'

export function ExerciseProgressScreen({ id }: { id: string }) {
  const data = useData()
  const unit = data.settings.unit
  const sessions = useMemo(() => finishedSessions(data), [data])
  const points = useMemo(() => exerciseHistory(id, sessions), [id, sessions])
  const name = sessions.flatMap((s) => s.exercises).find((e) => e.exerciseId === id)?.name ?? t('Ejercicio', 'Exercise')
  const [metric, setMetric] = useState<Metric>('e1rm')
  const [detail, setDetail] = useState(false)
  const value = (p: (typeof points)[number]) => fromKg(metric === 'e1rm' ? p.e1rm : metric === 'weight' ? p.maxWeight : p.volume, unit)
  const first = points[0]
  const last = points[points.length - 1]
  const change = points.length >= 2 ? value(last) - value(first) : 0

  return (
    <>
      <NavBar showBack title={name} right={<button className="icon-btn" onClick={() => setDetail(true)} aria-label={t('Técnica', 'Technique')}><Info size={19} /></button>} />
      <div className="screen with-nav">
        <Segmented value={metric} onChange={setMetric} options={[
          { value: 'e1rm', label: t('1RM est.', 'Est. 1RM') },
          { value: 'weight', label: t('Peso máx.', 'Max weight') },
          { value: 'volume', label: t('Volumen', 'Volume') },
        ]} />
        <Card>
          {points.length >= 2 ? (
            <>
              <LineChart points={points.map((p) => ({ x: p.date, y: value(p) }))} />
              <span className="bold row" style={{ gap: 6, color: change >= 0 ? 'var(--green-text)' : 'var(--red-text)' }}>
                {change >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                {change >= 0 ? '+' : ''}{num(change)} {unit} {t('desde el', 'since')} {shortDay(first.date)}
              </span>
            </>
          ) : (
            <span className="muted">{t('Necesitas al menos dos sesiones de este ejercicio para ver la gráfica.', 'You need at least two sessions of this exercise to see the chart.')}</span>
          )}
        </Card>
        <RepRecordsCard exerciseId={id} sessions={sessions} unit={unit} />
        <div className="list-header">{t('Sesiones', 'Sessions')}</div>
        <div className="list">
          {[...points].reverse().map((p) => (
            <div key={p.date} className="list-row">
              <span className="grow">{shortDay(p.date)}</span>
              <span className="small muted">{t('máx.', 'max')} {weight(p.maxWeight, unit)}</span>
              <span className="bold" style={{ minWidth: 70, textAlign: 'right' }}>{weightValue(p.e1rm, unit)} <span className="tiny muted">1RM</span></span>
            </div>
          ))}
        </div>
      </div>
      {detail && <ExerciseSheet exerciseId={id} onClose={() => setDetail(false)} />}
    </>
  )
}
