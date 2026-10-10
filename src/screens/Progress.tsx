import { AlertTriangle, Utensils, ArrowDownRight, ArrowUpRight, Scale, Calendar, ChartColumn, ChartLine, Dumbbell, FileText, Info, PersonStanding, Plus, Search, Sparkles, Target, X, Share2, TrendingDown, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { BarChart, HBarChart, LineChart } from '../components/charts'
import { MuscleHeatMap } from '../components/MuscleMap'
import { ActionSheet, Card, Sheet, StatBand, Empty, LargeTitle, NavBar, Segmented, Thumb, useCatalog, useProgressive, useToast } from '../components/ui'
import { periodCardSVG, periodLabel, summarize, type Period } from '../lib/periodCard'
import { shareImage, svgToPng } from '../lib/shareCard'
import { duration, fromKg, int, monthYear, num, parseDecimal, shortDay, toKg, uid, tonnes, tons, weight, weightValue } from '../lib/format'
import { MAIN_GROUPS, muscleLabel } from '../lib/labels'
import { navigate } from '../lib/router'
import { exerciseHistory, monthToDate, newRecords, type ExercisePoint, sessionVolume, streakWeeks, muscleLoad, records, sessionDuration, setsByMuscle, STALL_SESSIONS, stalls, weekly, type PeriodStats } from '../lib/stats'
import { finishedSessions, updateSettings, useData, withUndo, type Session } from '../lib/store'
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
import { searchSessions } from '../lib/history'
import { goalStatus, weightGoalStatus, type LiftGoal } from '../lib/goals'
import { insights, type Insight } from '../lib/insights'
import { ExercisePicker } from './Exercises'
import type { Exercise } from '../lib/catalog'
import { blankPastSession, SessionEditSheet } from './SessionEdit'
import { bodyweightText } from '../lib/bodyweight'
import { weeklyIntake } from '../lib/nutrition'

type Section = 'summary' | 'muscles' | 'history' | 'records' | 'achievements'
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
        <>
        <WeightFoodCard />
        <Empty icon={ChartLine} title={t('Sin datos todavía', 'No data yet')} message={t('Completa tu primer entrenamiento y aquí verás tu volumen, récords y progreso por ejercicio.', 'Finish your first workout and you will see your volume, records and progress per exercise here.')} />
        <LogPastButton />
        </>
      ) : (
        <>
          <Segmented value={section} onChange={setSection} options={[
            { value: 'summary', label: t('Resumen', 'Summary') },
            { value: 'muscles', label: t('Músculos', 'Muscles') },
            { value: 'history', label: t('Historial', 'History') },
            { value: 'records', label: t('Récords', 'Records') },
            { value: 'achievements', label: t('Logros', 'Badges') },
          ]} />
          {section === 'summary' && <Summary sessions={sessions} unit={unit} />}
          {section === 'muscles' && <Muscles sessions={sessions} />}
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
  const catalog = useCatalog()
  const balance = useMemo(() => muscleBalance(sessions, Date.now(), (id) => catalog.get(id)?.secondaryMuscles ?? []), [sessions, catalog])
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
  if (Math.abs(diff) < 1e-6) return null
  const up = diff > 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className="tiny row" style={{ gap: 2, whiteSpace: 'nowrap', color: up ? 'var(--text)' : 'var(--text-2)', fontWeight: up ? 700 : 400 }}>
      <Icon size={13} /> {up ? '+' : '−'}{format(Math.abs(diff))} {t('vs. mes ant.', 'vs. last mo.')}
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
        {item(t('Peso movido', 'Weight moved'), 'volume', (v) => tonnes(v, unit))}
        {item(t('Series hechas', 'Sets done'), 'sets', (v) => String(v))}
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

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Calorías y peso semana a semana: para ver si el objetivo de Comidas está funcionando. */
function WeightFoodCard() {
  const data = useData()
  const unit = data.settings.unit
  const goal = data.settings.nutrition
  const weeks = useMemo(() => weeklyIntake(data.nutrition.entries, data.measurements, 12), [data.nutrition.entries, data.measurements])
  const fed = weeks.filter((w) => w.days > 0)
  const weighed = weeks.filter((w) => w.weight !== undefined)
  if (!fed.length && weighed.length < 2) return null
  const avg = fed.length ? Math.round(fed.reduce((a, w) => a + w.kcal * w.days, 0) / fed.reduce((a, w) => a + w.days, 0)) : 0
  const change = weighed.length >= 2 ? weighed[weighed.length - 1].weight! - weighed[0].weight! : undefined
  const kg = (v: number) => weight(Math.abs(v), unit)
  // Récords en las semanas con la proteína cumplida (media ≥ 90 % del objetivo) frente a las demás.
  const proteinWeeks = useMemo(() => {
    if (!goal) return undefined
    const sessions = finishedSessions(data)
    const per = weeks.filter((w) => w.days >= 3).map((w) => {
      const end = w.start.getTime() + 7 * 86400000
      const inWeek = sessions.filter((x) => x.start >= w.start.getTime() && x.start < end)
      return { ok: w.p >= goal.protein * 0.9, records: inWeek.reduce((n, x) => n + newRecords(x, sessions).length, 0), trained: inWeek.length > 0 }
    }).filter((w) => w.trained)
    const yes = per.filter((w) => w.ok), no = per.filter((w) => !w.ok)
    if (yes.length < 2 || no.length < 2) return undefined
    const avg = (l: typeof per) => l.reduce((n, w) => n + w.records, 0) / l.length
    return { yes: avg(yes), no: avg(no), weeks: per.length }
  }, [goal, data, weeks])
  return (
    <Card title={t('Calorías y peso', 'Calories and weight')} icon={Utensils}>
      {fed.length > 0 && (
        <>
          <BarChart data={weeks.map((w) => ({ label: shortDay(w.start), value: w.kcal }))} reference={goal && !goal.proteinOnly ? goal.kcal : undefined} currentLabel={t('esta sem.', 'this wk')} />
          <span className="small muted">{goal && !goal.proteinOnly
            ? t(`Calorías al día (media de los días apuntados). La línea discontinua es tu objetivo, ${int(goal.kcal)} kcal.`, `Calories a day (average of logged days). The dashed line is your goal, ${int(goal.kcal)} kcal.`)
            : t('Calorías al día (media de los días apuntados).', 'Calories a day (average of logged days).')}</span>
        </>
      )}
      {weighed.length >= 2 && (
        <>
          <LineChart points={weighed.map((w) => ({ x: w.start.getTime(), y: fromKg(w.weight!, unit) }))} height={140} />
          <span className="small muted">{t('Peso medio de cada semana.', 'Average weight each week.')}</span>
        </>
      )}
      <span className="small">
        {capitalize([
          fed.length ? t(`En estas semanas comes de media ${int(avg)} kcal al día`, `Over these weeks you eat ${int(avg)} kcal a day on average`) : '',
          change === undefined ? '' : Math.abs(change) < 0.2 ? t('tu peso se mantiene', 'your weight is stable')
            : change < 0 ? t(`has bajado ${kg(change)}`, `you have lost ${kg(change)}`) : t(`has subido ${kg(change)}`, `you have gained ${kg(change)}`),
        ].filter(Boolean).join(t(' y ', ' and ')) + '.')}
      </span>
      {proteinWeeks && (
        <span className="small">
          {t(`Las semanas que llegaste a tu proteína batiste ${num(proteinWeeks.yes)} récords de media; las demás, ${num(proteinWeeks.no)}.`, `In weeks when you hit your protein you set ${num(proteinWeeks.yes)} records on average; in the others, ${num(proteinWeeks.no)}.`)}
          <span className="muted">{t(` (${proteinWeeks.weeks} semanas con entrenos y comida apuntada; es una comparación, no prueba la causa)`, ` (${proteinWeeks.weeks} weeks with workouts and food logged; a comparison, not proof of cause)`)}</span>
        </span>
      )}
    </Card>
  )
}

// Recuerda si se abrieron las estadísticas de más mientras la app sigue abierta.
let moreOpen = false

/** Lo principal arriba (marcas, el mes y lo que no avanza); el resto, plegado. */
function Summary({ sessions, unit }: { sessions: Session[]; unit: Unit }) {
  const [more, setMoreState] = useState(moreOpen)
  const setMore = (v: boolean) => { moreOpen = v; setMoreState(v) }
  const weeks = weekly(sessions, 12)
  const totalTime = sessions.reduce((t, s) => t + sessionDuration(s), 0)
  return (
    <>
      <BestLifts sessions={sessions} unit={unit} />
      <GoalsCard sessions={sessions} unit={unit} />
      <MonthCard sessions={sessions} unit={unit} />
      <Stalls sessions={sessions} unit={unit} />
      <InsightsCard sessions={sessions} />
      <button className="btn secondary block" onClick={() => setMore(!more)} aria-expanded={more}>
        {more ? t('Ocultar estadísticas', 'Hide stats') : t('Más estadísticas', 'More stats')}
      </button>
      {more && (
        <>
          <StatBand items={[
            { value: sessions.length, label: t('Entrenos totales', 'Total workouts') },
            { value: hours(totalTime), label: t('Tiempo total', 'Total time') },
            { value: streakWeeks(sessions), label: t('Semanas seguidas', 'Weeks in a row') },
            { value: tons(sessions.reduce((v, s) => v + sessionVolume(s), 0), unit), label: t('Peso movido en total', 'Total weight moved') },
          ]} />
          <Card title={t('Peso movido cada semana', 'Weight moved each week')} icon={ChartColumn}>
            <BarChart data={weeks.map((w) => ({ label: shortDay(w.start), value: fromKg(w.volume, unit) }))} average currentLabel={t('esta sem.', 'this wk')}
              tick={(v) => (v >= 1000 ? (unit === 'kg' ? `${num(v / 1000)} t` : `${num(v / 1000)}k`) : num(v))} />
            <span className="small muted">{t(`Últimas 12 semanas. Es la suma de peso × repeticiones de todas tus series, en ${unit === 'kg' ? 'toneladas' : 'miles de lb'}. La línea discontinua es tu media.`, `Last 12 weeks. It adds up weight × reps of all your sets, in ${unit === 'kg' ? 'tonnes' : 'thousands of lb'}. The dashed line is your average.`)}</span>
          </Card>
          <WeightFoodCard />
          <YearMap sessions={sessions} unit={unit} />
        </>
      )}
      <ShareSummaryCard sessions={sessions} unit={unit} />
      <button className="btn secondary" onClick={() => navigate('progress', 'report')}><FileText size={18} /> {t('Informe del mes (imprimir o PDF)', 'Monthly report (print or PDF)')}</button>
    </>
  )
}

/** Todo lo de los músculos: recuperación, la semana en el mapa, series por grupo y equilibrio. */
function Muscles({ sessions }: { sessions: Session[] }) {
  // El modo sencillo deja lo básico; el volumen por grupo y el equilibrio son para quien ya controla.
  const simple = useData().settings.simpleMode === true
  const muscles = useMemo(() => (simple ? setsByMuscle(sessions, Date.now() - 30 * 86400000) : []), [sessions, simple])
  return (
    <>
      <RecoveryCard sessions={sessions} />
      <WeeklyMuscles sessions={sessions} />
      {!simple && <WeeklyVolume sessions={sessions} />}
      {!simple && <BalanceCard sessions={sessions} />}
      {simple && muscles.length > 0 && (
        <Card title={t('Series por músculo (30 días)', 'Sets per muscle (30 days)')} icon={PersonStanding}>
          <HBarChart items={muscles.map((m) => ({ label: muscleLabel(m.muscle), value: m.sets }))} />
        </Card>
      )}
    </>
  )
}

/** Horas totales sin minutos a partir de 10 h, para que la cifra quepa entera. */
function hours(ms: number): string {
  return ms >= 10 * 3600000 ? `${Math.round(ms / 3600000)} h` : duration(ms)
}

/** Las tres mejores marcas (1RM estimado), en grande: lo primero que se quiere ver en Progreso. */
function BestLifts({ sessions, unit }: { sessions: Session[]; unit: Unit }) {
  const { top, before } = useMemo(() => {
    const monthAgo = Date.now() - 30 * 86400000
    return {
      top: records(sessions).sort((a, b) => b.e1rm - a.e1rm).slice(0, 3),
      before: new Map(records(sessions.filter((s) => s.start < monthAgo)).map((r) => [r.exerciseId, r.e1rm])),
    }
  }, [sessions])
  if (!top.length) return null
  return (
    <Card title={t('Tus mejores marcas', 'Your best lifts')} icon={Trophy}>
      <div className="best-lifts">
        {top.map((r) => (
          <button key={r.exerciseId} onClick={() => navigate('progress', 'exercise', r.exerciseId)}>
            <strong>{int(fromKg(r.e1rm, unit))}<small> {unit}</small></strong>
            <span className="clamp-2">{r.name}</span>
            {(r.e1rm - (before.get(r.exerciseId) ?? r.e1rm)) >= 0.5 && (
              <em title={t('Mejora en los últimos 30 días', 'Gain in the last 30 days')}>+{int(fromKg(r.e1rm - before.get(r.exerciseId)!, unit))} {unit} · 30 d</em>
            )}
          </button>
        ))}
      </div>
      <span className="small muted">{t('El peso que podrías levantar una sola vez, calculado con tu mejor serie, y cuánto ha subido en 30 días. Toca uno para ver su evolución.', 'The weight you could lift once, worked out from your best set, and how much it rose in 30 days. Tap one to see its progress.')}</span>
    </Card>
  )
}

/** Lo que te hace rendir mejor, según tus entrenos (lib/insights.ts). */
function InsightsCard({ sessions }: { sessions: Session[] }) {
  const list = useMemo(() => insights(sessions), [sessions])
  if (!list.length) return null
  const pct = (d: number) => `${Math.round(d * 100)} %`
  const when = { morning: t('por la mañana', 'in the morning'), afternoon: t('por la tarde', 'in the afternoon'), evening: t('por la noche', 'in the evening') }
  const text = (x: Insight) => x.kind === 'sleep'
    ? t(`Los días que duermes bien (4-5) rindes un ${pct(x.diff)} más que cuando duermes mal (1-2).`, `On days you sleep well (4-5) you perform ${pct(x.diff)} better than when you sleep badly (1-2).`)
    : x.kind === 'time'
      ? t(`Rindes un ${pct(x.diff)} más entrenando ${when[x.best]} que ${when[x.worst]}.`, `You perform ${pct(x.diff)} better training ${when[x.best]} than ${when[x.worst]}.`)
      : x.better === 'long'
        ? t(`Con 3 o más días de descanso antes rindes un ${pct(x.diff)} más que entrenando seguido.`, `With 3+ rest days before, you perform ${pct(x.diff)} better than training back to back.`)
        : t(`Entrenando seguido (1-2 días de descanso) rindes un ${pct(x.diff)} más que tras parar 3 días o más.`, `Training back to back (1-2 rest days) you perform ${pct(x.diff)} better than after 3+ days off.`)
  return (
    <Card title={t('Lo que te hace rendir mejor', 'What makes you perform better')} icon={Sparkles}>
      <ul className="recap-list">{list.map((x) => <li key={x.kind}>{text(x)}</li>)}</ul>
      <span className="tiny muted">{t('Según tus entrenos: tu mejor serie de cada ejercicio frente a tu marca anterior. Es lo que pasa en tus datos, no una regla; con más entrenos, más fiable.', 'From your workouts: your best set in each exercise against your previous best. It is what happens in your data, not a rule; more workouts make it more reliable.')}</span>
    </Card>
  )
}

/** Metas de fuerza: progreso, previsión a tu ritmo y si llegas a la fecha. */
function GoalsCard({ sessions, unit }: { sessions: Session[]; unit: Unit }) {
  const { settings } = useData()
  const goals = settings.liftGoals ?? []
  const [adding, setAdding] = useState(false)
  const [menu, setMenu] = useState<LiftGoal>()
  const [weightGoal, setWeightGoal] = useState(false)
  const dateText = (ms: number) => new Date(ms).toLocaleDateString(locale(), { day: 'numeric', month: 'long' })
  return (
    <Card title={t('Tus metas', 'Your goals')} icon={Target}>
      {goals.length === 0 && !settings.weightGoal && <span className="small muted">{t('Ponte una meta, por ejemplo «100 kg en press de banca» o «75 kg de peso para junio», y te diremos cuándo llegarías a tu ritmo.', 'Set a goal, e.g. "100 kg bench press" or "75 kg body weight by June", and we will tell you when you would get there at your pace.')}</span>}
      <WeightGoalRow unit={unit} onEdit={() => setWeightGoal(true)} />
      {goals.map((g) => {
        const st = goalStatus(g, sessions)
        return (
          <button key={g.id} className="goal-row" onClick={() => setMenu(g)}>
            <span className="row between">
              <span className="bold clamp-1">{g.name} · {int(fromKg(g.kg, unit))} {unit}</span>
              <span className="small muted">{st.doneAt ? '✓' : `${int(fromKg(st.current, unit))} ${unit}`}</span>
            </span>
            <span className="food-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(st.progress * 100)}>
              <span style={{ transform: `scaleX(${st.progress})` }} />
            </span>
            <span className="small muted">
              {st.doneAt ? t(`¡Conseguida el ${dateText(st.doneAt)}!`, `Achieved on ${dateText(st.doneAt)}!`)
                : st.eta ? t(`A tu ritmo, hacia el ${dateText(st.eta)}`, `At your pace, around ${dateText(st.eta)}`) + (g.by ? (st.onTrack ? t(': llegas a tiempo.', ': on track.') : t(`; tu fecha es el ${dateText(g.by)}.`, `; your date is ${dateText(g.by)}.`)) : '.')
                  : t('Ahora mismo no está subiendo: hacen falta unas semanas de entrenos para calcular tu ritmo.', 'Not going up right now: a few weeks of workouts are needed to work out your pace.')}
            </span>
          </button>
        )
      })}
      <span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn secondary btn-sm" onClick={() => setAdding(true)}><Plus size={16} /> {t('Meta de fuerza', 'Strength goal')}</button>
        {!settings.weightGoal && <button className="btn secondary btn-sm" onClick={() => setWeightGoal(true)}><Scale size={16} /> {t('Meta de peso', 'Weight goal')}</button>}
      </span>
      {weightGoal && <WeightGoalSheet unit={unit} onClose={() => setWeightGoal(false)} />}
      {goals.length > 0 && <span className="tiny muted">{t('Las de fuerza se miden con el máximo estimado a una repetición: 85 kg × 5 ya cuentan como unos 99 kg.', 'Strength goals use the estimated one-rep max: 85 kg × 5 already count as about 99 kg.')}</span>}
      {adding && <GoalSheet sessions={sessions} unit={unit} onClose={() => setAdding(false)} />}
      {menu && (
        <ActionSheet title={menu.name} onClose={() => setMenu(undefined)} options={[
          { label: t('Ver evolución', 'See progress'), onSelect: () => navigate('progress', 'exercise', menu.exerciseId) },
          { label: t('Quitar la meta', 'Remove the goal'), destructive: true, onSelect: () => withUndo(t('Meta quitada', 'Goal removed'), () => updateSettings({ liftGoals: goals.filter((x) => x.id !== menu.id) })) },
        ]} />
      )}
    </Card>
  )
}

/** Meta de peso corporal: a qué ritmo vas según tus pesadas y si llegas a la fecha. */
function WeightGoalRow({ unit, onEdit }: { unit: Unit; onEdit: () => void }) {
  const { settings, measurements } = useData()
  const goal = settings.weightGoal
  const weighIns = useMemo(() => measurements.filter((m) => m.weight).map((m) => ({ date: m.date, weight: m.weight! })), [measurements])
  if (!goal) return null
  const st = weightGoalStatus(goal, weighIns)
  const kg = (v: number) => `${num(Math.round(fromKg(v, unit) * 10) / 10)} ${unit}`
  const dateText = (ms: number) => new Date(ms).toLocaleDateString(locale(), { day: 'numeric', month: 'long' })
  const pace = st?.perWeek !== undefined ? t(`${st.perWeek > 0 ? '+' : ''}${num(fromKg(st.perWeek, unit))} ${unit}/semana`, `${st.perWeek > 0 ? '+' : ''}${num(fromKg(st.perWeek, unit))} ${unit}/week`) : ''
  return (
    <button className="goal-row" onClick={onEdit}>
      <span className="row between">
        <span className="bold clamp-1">{t('Peso corporal', 'Body weight')} · {kg(goal.kg)}</span>
        <span className="small muted">{st?.doneAt ? '✓' : st ? kg(st.current) : ''}</span>
      </span>
      <span className="food-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((st?.progress ?? 0) * 100)}>
        <span style={{ transform: `scaleX(${st?.progress ?? 0})` }} />
      </span>
      <span className="small muted">
        {!st ? t('Pésate para empezar a medir tu ritmo.', 'Weigh yourself to start tracking your pace.')
          : st.doneAt ? t(`¡Conseguida el ${dateText(st.doneAt)}!`, `Achieved on ${dateText(st.doneAt)}!`)
            : st.eta ? `${pace} · ${t(`a este ritmo, hacia el ${dateText(st.eta)}`, `at this pace, around ${dateText(st.eta)}`)}${goal.by ? (st.onTrack ? t(': llegas a tiempo.', ': on track.') : t(`; para el ${dateText(goal.by)} harían falta ${num(fromKg(Math.abs(st.neededPerWeek ?? 0), unit))} ${unit}/semana.`, `; by ${dateText(goal.by)} you would need ${num(fromKg(Math.abs(st.neededPerWeek ?? 0), unit))} ${unit}/week.`)) : '.'}`
              : st.perWeek !== undefined ? `${pace} · ${t('ahora vas en la otra dirección o casi igual.', 'right now you are going the other way or barely moving.')}`
                : t('Hacen falta 2 semanas de pesadas para calcular tu ritmo.', 'Two weeks of weigh-ins are needed to work out your pace.')}
        {st?.tooFast && !st.doneAt ? ` ${t('Ojo: más de un 1 % de tu peso por semana es demasiado rápido para mantener el músculo; mejor más tiempo.', 'Careful: more than 1% of your weight a week is too fast to keep your muscle; better give it more time.')}` : ''}
      </span>
    </button>
  )
}

function WeightGoalSheet({ unit, onClose }: { unit: Unit; onClose: () => void }) {
  const { settings, measurements } = useData()
  const latest = [...measurements].filter((m) => m.weight).sort((a, b) => b.date - a.date)[0]?.weight
  const goal = settings.weightGoal
  const [kgText, setKgText] = useState(goal ? num(fromKg(goal.kg, unit)) : '')
  const [by, setBy] = useState(goal?.by ? new Date(goal.by).toISOString().slice(0, 10) : '')
  const value = parseDecimal(kgText)
  const kg = value ? toKg(value, unit) : 0
  const from = goal?.from ?? latest
  const valid = !!from && kg >= 30 && kg <= 300 && Math.abs(kg - from) >= 0.5
  const save = () => {
    if (!valid || !from) return
    updateSettings({ weightGoal: { kg, from, createdAt: goal?.createdAt ?? Date.now(), ...(by ? { by: new Date(`${by}T12:00:00`).getTime() } : {}) } })
    onClose()
  }
  return (
    <Sheet title={t('Meta de peso', 'Weight goal')} onClose={onClose} left={<button className="nav-btn" onClick={onClose}>{t('Cancelar', 'Cancel')}</button>}
      footer={<button className="btn primary block" disabled={!valid} onClick={save}>{t('Guardar meta', 'Save goal')}</button>}>
      <div className="list">
        <label className="list-row">
          <span className="grow">{t('Quiero llegar a', 'I want to reach')}</span>
          <input inputMode="decimal" style={{ textAlign: 'right', width: 80, fontSize: 17 }} value={kgText} onChange={(e) => setKgText(e.target.value)} aria-label={t('Peso de la meta', 'Goal weight')} />
          <span className="muted">{unit}</span>
        </label>
        <label className="list-row">
          <span className="grow">{t('Para (opcional)', 'By (optional)')}</span>
          <input type="date" value={by} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setBy(e.target.value)} aria-label={t('Fecha de la meta', 'Goal date')} />
        </label>
      </div>
      <span className="small muted">{from
        ? t(`Partes de ${num(fromKg(from, unit))} ${unit}. Se mide con la tendencia de tus pesadas (Perfil → Medidas), no con la última, que varía mucho de un día a otro.`, `You start from ${num(fromKg(from, unit))} ${unit}. It uses the trend of your weigh-ins (Profile → Measurements), not the last one, which varies a lot day to day.`)
        : t('Primero apunta tu peso en Perfil → Medidas.', 'First log your weight in Profile → Measurements.')}</span>
      {goal && <button className="btn secondary danger" onClick={() => { withUndo(t('Meta quitada', 'Goal removed'), () => updateSettings({ weightGoal: undefined })); onClose() }}>{t('Quitar la meta', 'Remove the goal')}</button>}
    </Sheet>
  )
}

function GoalSheet({ sessions, unit, onClose }: { sessions: Session[]; unit: Unit; onClose: () => void }) {
  const { settings } = useData()
  const [exercise, setExercise] = useState<Exercise>()
  const [kgText, setKgText] = useState('')
  const [by, setBy] = useState('')
  if (!exercise) return <ExercisePicker single title={t('Meta: elige el ejercicio', 'Goal: pick the exercise')} onClose={onClose} onDone={(list) => {
    const e = list[0]
    const best = records(sessions).find((r) => r.exerciseId === e.id)?.e1rm ?? 0
    const step = unit === 'kg' ? 5 : 10
    setKgText(String(Math.ceil((fromKg(best, unit) + step) / step) * step))
    setExercise(e)
  }} />
  const value = parseDecimal(kgText)
  const best = records(sessions).find((r) => r.exerciseId === exercise.id)?.e1rm ?? 0
  const kg = value ? toKg(value, unit) : 0
  const valid = kg > best && kg < 1000
  const save = () => {
    if (!valid) return
    const goal: LiftGoal = { id: uid(), exerciseId: exercise.id, name: exercise.name, kg, from: best, createdAt: Date.now(), ...(by ? { by: new Date(`${by}T12:00:00`).getTime() } : {}) }
    updateSettings({ liftGoals: [...(settings.liftGoals ?? []), goal] })
    onClose()
  }
  return (
    <Sheet title={t('Nueva meta', 'New goal')} onClose={onClose} left={<button className="nav-btn" onClick={onClose}>{t('Cancelar', 'Cancel')}</button>}
      footer={<button className="btn primary block" disabled={!valid} onClick={save}>{t('Guardar meta', 'Save goal')}</button>}>
      <div className="list">
        <div className="list-row"><span className="grow">{t('Ejercicio', 'Exercise')}</span><strong>{exercise.name}</strong></div>
        <label className="list-row">
          <span className="grow">{t('Quiero llegar a', 'I want to reach')}</span>
          <input inputMode="decimal" style={{ textAlign: 'right', width: 80, fontSize: 17 }} value={kgText} onChange={(e) => setKgText(e.target.value)} aria-label={t('Peso de la meta', 'Goal weight')} />
          <span className="muted">{unit}</span>
        </label>
        <label className="list-row">
          <span className="grow">{t('Para (opcional)', 'By (optional)')}</span>
          <input type="date" value={by} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setBy(e.target.value)} aria-label={t('Fecha de la meta', 'Goal date')} />
        </label>
      </div>
      <span className="small muted">{best > 0
        ? t(`Ahora tu máximo estimado es ${int(fromKg(best, unit))} ${unit}. La meta tiene que ser mayor.`, `Your estimated max is now ${int(fromKg(best, unit))} ${unit}. The goal must be higher.`)
        : t('Aún no tienes series con peso en este ejercicio: la previsión saldrá cuando entrenes unas semanas.', 'You have no weighted sets in this exercise yet: the forecast will appear after a few weeks of training.')}</span>
    </Sheet>
  )
}

/** Ejercicios hechos el último mes que no mejoran desde hace varias sesiones. */
function Stalls({ sessions, unit }: { sessions: Session[]; unit: Unit }) {
  const list = useMemo(() => stalls(sessions, Date.now() - 30 * 86400000), [sessions])
  const [all, setAll] = useState(false)
  if (!list.length) return null
  // Los 3 primeros; el resto, al tocar «Ver todos» (con muchos, la lista tapaba el resumen).
  return (
    <Card title={t(`Sin mejorar últimamente (${list.length})`, `Not improving lately (${list.length})`)} icon={TrendingDown}>
      {(all ? list : list.slice(0, 3)).map((x) => (
        <button key={x.exerciseId} className="row" style={{ textAlign: 'left' }} onClick={() => navigate('progress', 'exercise', x.exerciseId)}>
          <Thumb exerciseId={x.exerciseId} size={36} />
          <span className="grow">
            <span className="bold clamp-2" style={{ fontSize: 15 }}>{x.name}</span>
            <span className="small muted">{t(`Igual en las últimas ${STALL_SESSIONS} veces · tu marca: ${int(fromKg(x.best, unit))} ${unit}`, `Same over the last ${STALL_SESSIONS} times · your best: ${int(fromKg(x.best, unit))} ${unit}`)}</span>
          </span>
        </button>
      ))}
      {list.length > 3 && <button className="nav-btn" style={{ alignSelf: 'flex-start', fontWeight: 600 }} onClick={() => setAll(!all)}>{all ? t('Ver menos', 'Show fewer') : t(`Ver todos (${list.length})`, `Show all (${list.length})`)}</button>}
      <span className="small muted">
        {t('Es normal atascarse. Cuando toque uno de estos, te propondremos un día más suave (menos series y un 10 % menos de peso) o cambiarlo por un ejercicio parecido.',
          'Getting stuck is normal. When one of these comes up we will suggest an easier day (fewer sets and 10% less weight) or swapping it for a similar exercise.')}
      </span>
    </Card>
  )
}

let savedHistoryQuery = ''
/** Apuntar un entrenamiento que no se registró en su momento. */
function LogPastButton() {
  const [draft, setDraft] = useState<Session>()
  return (
    <>
      <button className="btn secondary" onClick={() => setDraft(blankPastSession())}><Plus size={18} /> {t('Apuntar un entreno pasado', 'Log a past workout')}</button>
      {draft && <SessionEditSheet session={draft} isNew onClose={() => setDraft(undefined)} />}
    </>
  )
}

function History({ sessions: all, unit }: { sessions: Session[]; unit: Unit }) {
  const [query, setQuery] = useState(savedHistoryQuery)
  const search = (q: string) => { savedHistoryQuery = q; setQuery(q) }
  const sessions = useMemo(() => searchSessions(all, query, unit), [all, query, unit])
  // Con años de historial se pintan de 50 en 50 al ir bajando (pintarlos todos de golpe se notaba).
  const { shown, sentinel } = useProgressive(sessions, query)
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
      <LogPastButton />
      <label className="search">
        <Search size={18} />
        <input type="search" placeholder={t('Buscar: ejercicio, nombre o peso (p. ej. 100)', 'Search: exercise, name or weight (e.g. 100)')} value={query} onChange={(e) => search(e.target.value)} aria-label={t('Buscar en el historial', 'Search history')} />
        {query && <button onClick={() => search('')} aria-label={t('Borrar', 'Clear')}><X size={18} /></button>}
      </label>
      {query.trim() && <span className="small muted">{sessions.length === 1 ? t('1 entrenamiento', '1 workout') : t(`${sessions.length} entrenamientos`, `${sessions.length} workouts`)}</span>}
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
              <span className="small muted">{r.added === undefined ? weight(r.weight, unit) : bodyweightText(r.added, unit)} × {r.reps} · {shortDay(r.date)}</span>
            </span>
            <span style={{ textAlign: 'right' }}>
              <span className="bold" style={{ display: 'block' }}>{int(fromKg(r.e1rm, unit))} {unit}</span>
              <span className="tiny muted">{t('máx. est.', 'est. max')}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="list-footer">{t('Mejor serie de cada ejercicio según el 1RM estimado (fórmula de Epley). Toca uno para ver su evolución.', 'Best set of each exercise by estimated 1RM (Epley formula). Tap one to see its progress.')}</p>
    </>
  )
}

type Metric = 'e1rm' | 'weight' | 'volume'

/** Sesiones de más nueva a más vieja, juntando las seguidas que repiten peso, repeticiones y máximo estimado. */
function sessionRuns(points: ExercisePoint[]): { p: ExercisePoint; from: number; to: number; count: number }[] {
  const runs: { p: ExercisePoint; from: number; to: number; count: number }[] = []
  for (const p of [...points].reverse()) {
    const last = runs[runs.length - 1]
    if (last && last.p.maxWeight === p.maxWeight && last.p.repsAtMax === p.repsAtMax && Math.abs(last.p.e1rm - p.e1rm) < 0.01) {
      last.from = p.date
      last.count++
    } else runs.push({ p, from: p.date, to: p.date, count: 1 })
  }
  return runs
}

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
          { value: 'e1rm', label: t('Máx. estimado', 'Est. max') },
          { value: 'weight', label: t('Peso máx.', 'Max weight') },
          { value: 'volume', label: t('Volumen', 'Volume') },
        ]} />
        <Card>
          {points.length >= 2 ? (
            <>
              <LineChart points={points.map((p) => ({ x: p.date, y: value(p) }))} />
              <span className="row" style={{ gap: 8, alignItems: 'baseline' }}>
                <strong className="delta-big" style={{ color: change >= 0 ? 'var(--text)' : 'var(--red-text)' }}>{change >= 0 ? '+' : ''}{num(change)} {unit}</strong>
                <span className="small muted">{t('desde el', 'since')} {shortDay(first.date)}</span>
              </span>
              {metric === 'e1rm' && <span className="small muted">{t('Máximo estimado (1RM): el peso que podrías levantar una sola vez, calculado a partir de tus series.', 'Estimated max (1RM): the weight you could lift once, worked out from your sets.')}</span>}
            </>
          ) : (
            <span className="muted">{t('Necesitas al menos dos sesiones de este ejercicio para ver la gráfica.', 'You need at least two sessions of this exercise to see the chart.')}</span>
          )}
        </Card>
        <RepRecordsCard exerciseId={id} sessions={sessions} unit={unit} />
        <div className="list-header session-head"><span>{t('Sesiones', 'Sessions')}</span><span>{t('Serie', 'Set')}</span><span>{t('Máx. est.', 'Est. max')}</span><span>{t('Cambio', 'Change')}</span></div>
        <div className="list">
          {sessionRuns(points).map((run, i, runs) => {
            // Cambio del máximo estimado respecto al grupo anterior (el siguiente en la lista, que va de nuevo a viejo).
            const before = runs[i + 1]
            const diff = before ? fromKg(run.p.e1rm - before.p.e1rm, unit) : 0
            return (
              <div key={run.from} className="list-row session-row">
                <span>
                  {run.count > 1 ? `${shortDay(run.from)}–${shortDay(run.to)}` : shortDay(run.to)}
                  {run.count > 1 && <span className="tiny muted" style={{ display: 'block' }}>{t(`${run.count} sesiones iguales`, `${run.count} same sessions`)}</span>}
                </span>
                <span className="small muted">{weightValue(run.p.maxWeight, unit)} × {run.p.repsAtMax}</span>
                <span className="bold">{int(fromKg(run.p.e1rm, unit))} {unit}</span>
                <span className="session-delta">{Math.abs(diff) >= 0.5 ? `${diff > 0 ? '+' : '−'}${int(Math.abs(diff))} ${unit}` : '—'}</span>
              </div>
            )
          })}
        </div>
      </div>
      {detail && <ExerciseSheet exerciseId={id} onClose={() => setDetail(false)} />}
    </>
  )
}
