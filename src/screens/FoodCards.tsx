import { GoalsSheet } from './FoodGoals'
import { Droplet, ChevronLeft, ChevronRight, HeartPulse, Minus, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, Chip, Sheet, useTick } from '../components/ui'
import { day as longDay, editable, int, monthYear } from '../lib/format'
import { locale, t } from '../lib/i18n'
import { adjustGoals, lastWeek, dayKey, dayStatus, goalsForDay, type DayGoalOptions, type WeightAdvice, dayTotals, fromDayKey, MEALS, ALL_MEALS, activeMeals, defaultMealLabel, type FoodEntry, type MealKey, type NutritionGoals } from '../lib/nutrition'
import { update, updateSettings, useData } from '../lib/store'
import { FAST_PLANS, fastState, supplementStreak, toggleSupplement } from '../lib/habits'
import { g, nb } from './FoodParts'

// Tarjetas y hojas de Comidas (suplementos, ayuno, hábitos, agua, aviso de ajuste, comidas, compra y mes). Salieron de Food.tsx para partirlo.

/** Suplementos del día: un toque para marcar cada uno, con los días seguidos. */
export function SupplementsCard({ day, onEdit }: { day: string; onEdit: () => void }) {
  const data = useData()
  const log = data.nutrition.supplements
  const taken = log?.[day] ?? []
  return (
    <div className="card" style={{ gap: 8 }}>
      <div className="row between">
        <span className="bold">{t('Suplementos', 'Supplements')}</span>
        <button className="link-btn small muted" onClick={onEdit}>{t('Editar', 'Edit')}</button>
      </div>
      <div className="chip-row" style={{ flexWrap: 'wrap' }}>
        {data.settings.supplements!.map((name) => {
          const on = taken.includes(name)
          const streak = supplementStreak(log, name, day)
          return (
            <Chip key={name} active={on} onClick={() => update((d) => { d.nutrition.supplements = toggleSupplement(d.nutrition.supplements, name, day) })}
              label={`${on ? '✓ ' : ''}${name}${streak >= 2 ? ` · ${streak} ${t('días', 'days')}` : ''}`} />
          )
        })}
      </div>
    </div>
  )
}

/** Ayuno intermitente: cuánto llevas y cuándo abres la ventana para comer. */
export function FastCard() {
  const { settings } = useData()
  const now = useTick(30000)
  const f = settings.fasting!
  const st = f.start ? fastState(f.start, f.hours, now) : undefined
  const clock = (ms: number) => new Date(ms).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })
  const hm = (h: number) => `${Math.floor(h)} h ${String(Math.floor((h % 1) * 60)).padStart(2, '0')} min`
  return (
    <div className="card" style={{ gap: 8 }}>
      <div className="row between">
        <span className="bold">{t(`Ayuno ${f.hours}/${24 - f.hours}`, `Fasting ${f.hours}/${24 - f.hours}`)}</span>
        {st && <span className="small muted">{st.done ? t('¡Conseguido!', 'Done!') : t(`Abres a las ${clock(st.endsAt)}`, `Window opens at ${clock(st.endsAt)}`)}</span>}
      </div>
      {st ? (
        <>
          <div className="food-bar"><div style={{ transform: `scaleX(${st.progress})`, background: st.done ? 'var(--green-text)' : undefined }} /></div>
          <span className="small muted">{t(`Llevas ${hm(st.hours)} de ${f.hours} h.`, `${hm(st.hours)} of ${f.hours} h so far.`)}</span>
          <button className="btn secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => updateSettings({ fasting: { hours: f.hours } })}>{t('Terminar el ayuno', 'End the fast')}</button>
        </>
      ) : (
        <>
          <span className="small muted">{t('Ventana para comer abierta. Al acabar tu última comida, empieza el ayuno.', 'Eating window open. After your last meal, start the fast.')}</span>
          <button className="btn secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => updateSettings({ fasting: { hours: f.hours, start: Date.now() } })}>{t('Empezar el ayuno', 'Start the fast')}</button>
        </>
      )}
    </div>
  )
}

/** Qué suplementos tomas y si haces ayuno intermitente. */
export function HabitsSheet({ onClose }: { onClose: () => void }) {
  const { settings } = useData()
  const [list, setList] = useState<string[]>(settings.supplements ?? [])
  const [name, setName] = useState('')
  const [fast, setFast] = useState<number>(settings.fasting?.hours ?? 0)
  const add = () => { const n = name.trim().slice(0, 30); if (n && !list.includes(n)) setList([...list, n]); setName('') }
  const save = () => {
    updateSettings({ supplements: list.length ? list : undefined, fasting: fast ? { hours: fast, start: settings.fasting?.start } : undefined })
    onClose()
  }
  return (
    <Sheet title={t('Suplementos y ayuno', 'Supplements and fasting')} onClose={onClose} left={<button className="nav-btn" onClick={onClose}>{t('Cancelar', 'Cancel')}</button>}
      footer={<button className="btn primary block" onClick={save}>{t('Guardar', 'Save')}</button>}>
      <div className="list-header">{t('Suplementos', 'Supplements')}</div>
      <div className="chip-row" style={{ flexWrap: 'wrap' }}>
        {list.map((x) => <Chip key={x} label={`${x} ✕`} onClick={() => setList(list.filter((y) => y !== x))} />)}
        {['Creatina', 'Proteína', 'Vitamina D', 'Omega 3', 'Magnesio'].filter((x) => !list.includes(x)).map((x) => <Chip key={x} label={`+ ${x}`} onClick={() => setList([...list, x])} />)}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <input className="field grow" value={name} maxLength={30} placeholder={t('Otro (p. ej. «Cafeína»)', 'Other (e.g. "Caffeine")')} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add() }} aria-label={t('Nuevo suplemento', 'New supplement')} />
        <button className="btn secondary" disabled={!name.trim()} onClick={add}>{t('Añadir', 'Add')}</button>
      </div>
      <span className="small muted">{t('Cada día los marcas con un toque en Comidas y ves cuántos días seguidos llevas.', 'Each day tick them with one tap in Food and see your streak.')}</span>
      <div className="list-header">{t('Ayuno intermitente', 'Intermittent fasting')}</div>
      <div className="chip-row" style={{ flexWrap: 'wrap' }}>
        <Chip label={t('No', 'Off')} active={!fast} onClick={() => setFast(0)} />
        {FAST_PLANS.map((h) => <Chip key={h} label={`${h}/${24 - h}`} active={fast === h} onClick={() => setFast(h)} />)}
      </div>
      <p className="food-health small" style={{ margin: 0 }}>
        <HeartPulse size={16} />
        <span>{t('El ayuno no es para todo el mundo: si estás embarazada, tienes diabetes, tomas medicación o tienes o has tenido un trastorno de la conducta alimentaria, consúltalo antes con un profesional sanitario.', 'Fasting is not for everyone: if you are pregnant, have diabetes, take medication, or have or have had an eating disorder, talk to a health professional first.')}</span>
      </p>
    </Sheet>
  )
}

/** Vasos de agua del día (250 ml cada uno). */
export function WaterCard({ day, goal }: { day: string; goal: number }) {
  const data = useData()
  const glasses = data.nutrition.water?.[day] ?? 0
  const set = (n: number) => update((d) => {
    const water = { ...(d.nutrition.water ?? {}) }
    if (n > 0) water[day] = n
    else delete water[day]
    d.nutrition.water = water
  })
  return (
    <div className="water-card">
      <Droplet size={20} aria-hidden="true" className="water-icon" />
      <span className="grow">
        <span className="bold" style={{ display: 'block' }}>{t('Agua', 'Water')}</span>
        <span className="small muted">{glasses >= goal ? t(`${glasses} vasos · objetivo cumplido`, `${glasses} glasses · goal reached`) : t(`${glasses} de ${goal} vasos (${editable((glasses * 250) / 1000)} l)`, `${glasses} of ${goal} glasses (${editable((glasses * 250) / 1000)} l)`)}</span>
      </span>
      <span className="water-dots" aria-hidden="true">
        {Array.from({ length: Math.max(goal, glasses) }, (_, i) => <i key={i} className={i < glasses ? 'on' : ''} />)}
      </span>
      <button className="icon-btn" disabled={glasses <= 0} onClick={() => set(glasses - 1)} aria-label={t('Un vaso menos', 'One glass fewer')}><Minus size={17} /></button>
      <button className="icon-btn" disabled={glasses >= 40} onClick={() => set(glasses + 1)} aria-label={t('Un vaso más', 'One more glass')}><Plus size={17} /></button>
    </div>
  )
}

/** Propuesta de subir o bajar calorías cuando el peso no va al ritmo del objetivo. */
export function WeightAdviceCard({ advice, goals }: { advice: WeightAdvice; goals: NutritionGoals }) {
  const kg = (v: number) => editable(Math.round(Math.abs(v) * 100) / 100)
  const trend = advice.rate < -0.05 ? t(`bajas ${kg(advice.rate)} kg por semana`, `you are losing ${kg(advice.rate)} kg a week`)
    : advice.rate > 0.05 ? t(`subes ${kg(advice.rate)} kg por semana`, `you are gaining ${kg(advice.rate)} kg a week`)
      : t('tu peso apenas cambia', 'your weight is barely changing')
  const aim = goals.aim === 'lose' ? t('para perder grasa conviene bajar entre un 0,25 y un 1 % del peso por semana', 'to lose fat, aim to lose 0.25-1% of body weight a week')
    : goals.aim === 'gain' ? t('para ganar músculo conviene subir entre un 0,1 y un 0,5 % del peso por semana', 'to build muscle, aim to gain 0.1-0.5% of body weight a week')
      : t('para mantener, tu peso no debería moverse más de un 0,3 % por semana', 'to maintain, your weight should not move more than 0.3% a week')
  const next = goals.kcal + advice.change
  const apply = () => updateSettings({ nutrition: adjustGoals(goals, advice.change), nutritionAdviceAt: Date.now() })
  return (
    <Card title={t('Ajuste según tu peso', 'Adjust to your weight')}>
      <span className="small">{t(`En las últimas semanas ${trend}, y ${aim}.`, `Over the last few weeks ${trend}, and ${aim}.`)}</span>
      <span className="small">
        {t(`Te propongo ${advice.change > 0 ? 'subir' : 'bajar'} ${int(Math.abs(advice.change))} kcal: de ${int(goals.kcal)} a ${int(next)} al día.`, `I suggest ${advice.change > 0 ? 'adding' : 'removing'} ${int(Math.abs(advice.change))} kcal: from ${int(goals.kcal)} to ${int(next)} a day.`)}
        {advice.eaten === undefined && t(' Cuenta con que comas lo que marca el objetivo.', ' This assumes you eat what your goal says.')}
      </span>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn primary btn-sm" onClick={apply}>{t(`Cambiar a ${int(next)} kcal`, `Change to ${int(next)} kcal`)}</button>
        <button className="btn secondary btn-sm" onClick={() => updateSettings({ nutritionAdviceAt: Date.now() })}>{t('Ahora no', 'Not now')}</button>
      </div>
    </Card>
  )
}

/** Qué comidas tiene tu día (almuerzo de media mañana, recena…) y cómo se llaman. */
export function MealsSheet({ onClose }: { onClose: () => void }) {
  const { settings } = useData()
  const [active, setActive] = useState<MealKey[]>(activeMeals())
  const [names, setNames] = useState<Partial<Record<MealKey, string>>>(settings.mealNames ?? {})
  const save = () => {
    const clean = Object.fromEntries(Object.entries(names).map(([k, v]) => [k, (v ?? '').trim().slice(0, 24)]).filter(([, v]) => v))
    const same = active.length === MEALS.length && MEALS.every((m) => active.includes(m))
    updateSettings({ meals: same ? undefined : ALL_MEALS.filter((m) => active.includes(m)), mealNames: Object.keys(clean).length ? clean : undefined })
    onClose()
  }
  return (
    <Sheet title={t('Tus comidas', 'Your meals')} onClose={onClose} left={<button className="nav-btn" onClick={onClose}>{t('Cancelar', 'Cancel')}</button>}
      footer={<button className="btn primary block" disabled={!active.length} onClick={save}>{t('Guardar', 'Save')}</button>}>
      <span className="small muted">{t('Activa las que haces y ponles tu nombre. Lo que ya apuntaste no se borra: si ocultas una comida con alimentos, vuelve a salir ese día.', 'Turn on the ones you have and name them as you like. Nothing logged is deleted: if you hide a meal that has food, it still shows that day.')}</span>
      <div className="list">
        {ALL_MEALS.map((m) => (
          <div key={m} className="list-row" style={{ gap: 10 }}>
            <input type="checkbox" className="toggle" checked={active.includes(m)} aria-label={defaultMealLabel(m)}
              onChange={(e) => setActive(e.target.checked ? [...active, m] : active.filter((x) => x !== m))} />
            <input className="field grow" value={names[m] ?? ''} placeholder={defaultMealLabel(m)} maxLength={24} aria-label={t(`Nombre de ${defaultMealLabel(m).toLowerCase()}`, `Name for ${defaultMealLabel(m).toLowerCase()}`)}
              onChange={(e) => setNames({ ...names, [m]: e.target.value })} />
          </div>
        ))}
      </div>
    </Sheet>
  )
}

export function ShoppingSheet({ items, title, note, onClose, onCopied }: { items: { key: string; name: string; grams: number }[]; title: string; note?: string; onClose: () => void; onCopied: () => void }) {
  const list = [...items.reduce((m, i) => m.set(i.key, { key: i.key, name: i.name, grams: (m.get(i.key)?.grams ?? 0) + i.grams }), new Map<string, { key: string; name: string; grams: number }>()).values()]
    .sort((a, b) => a.name.localeCompare(b.name))
  const text = list.map((x) => `- ${x.name}: ${g(x.grams)} g`).join('\n')
  const copy = async () => {
    try {
      if (navigator.share) await navigator.share({ title, text })
      else { await navigator.clipboard.writeText(text); onCopied() }
    } catch { /* cancelado */ }
  }
  return (
    <Sheet title={title} onClose={onClose} right={<button className="nav-btn" onClick={onClose}>{t('Cerrar', 'Close')}</button>}
      footer={<button className="btn primary block" onClick={copy}>{t('Compartir la lista', 'Share the list')}</button>}>
      <div className="list">
        {list.map((x) => (
          // Por clave, no por nombre: un alimento propio y uno de la lista pueden llamarse igual.
          <div key={x.key} className="list-row">
            <span className="grow">{x.name}</span>
            <span className="muted">{nb(`${g(x.grams)} g`)}</span>
          </div>
        ))}
      </div>
      <p className="list-footer" style={{ margin: 0 }}>{note ?? t('Cantidades de las comidas que quedan por apuntar. El peso es el del alimento tal como se llama: «cocido» o «hecho», ya cocinado; «crudo», sin cocinar.', 'Amounts for the meals not logged yet. Weights match the food name: "cooked" means after cooking, "raw" before.')}</p>
    </Sheet>
  )
}

// MARK: Mes

/** Calendario del mes: cada día en verde si cumpliste, rojo si te pasaste y ámbar si te quedaste corto. */
export function MonthSheet({ goals, opts, onClose, onPick }: { goals: NutritionGoals; opts: DayGoalOptions; onClose: () => void; onPick: (day: string) => void }) {
  const data = useData()
  const today = dayKey()
  const [first, setFirst] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const byDay = useMemo(() => {
    const m = new Map<string, FoodEntry[]>()
    for (const e of data.nutrition.entries) m.set(e.day, [...(m.get(e.day) ?? []), e])
    return m
  }, [data.nutrition.entries])
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const leading = (first.getDay() + 6) % 7
  const days = Array.from({ length: daysInMonth }, (_, i) => dayKey(new Date(first.getFullYear(), first.getMonth(), i + 1)))
  const info = days.map((key) => {
    const entries = byDay.get(key)
    // Hoy aún no ha terminado: se marca, pero no cuenta.
    if (!entries?.length || key >= today) return { key }
    const dayGoals = goalsForDay(goals, data.nutrition.entries, key, opts)
    const totals = dayTotals(entries)
    return { key, status: dayStatus(totals, dayGoals), diff: goals.proteinOnly ? totals.p - dayGoals.protein : totals.kcal - dayGoals.kcal }
  })
  const count = (s: string) => info.filter((x) => x.status === s).length
  const label = { met: t('Cumplido', 'On target'), over: t('Te pasaste', 'Over'), under: t('Te quedaste corto', 'Under') }
  const unit = goals.proteinOnly ? ' g' : ''
  const sign = (n: number) => (n > 0 ? `+${int(n)}` : `−${int(-n)}`)
  const thisMonth = first.getFullYear() === new Date().getFullYear() && first.getMonth() === new Date().getMonth()
  return (
    <Sheet title={t('Resumen del mes', 'Month overview')} onClose={onClose} right={<button className="nav-btn" onClick={onClose}>{t('Cerrar', 'Close')}</button>}>
      {(() => {
        const w = lastWeek(data.nutrition.entries, (d) => goalsForDay(goals, data.nutrition.entries, d, opts), today)
        if (!w.logged) return null
        return (
          <div className="card week-card">
            <strong>{t('Últimos 7 días', 'Last 7 days')}</strong>
            <div className="stat-band food-band">
              {!goals.proteinOnly && <div><strong>{int(w.kcal)}</strong><span>{t('kcal al día', 'kcal a day')}</span></div>}
              <div><strong>{g(w.p)}</strong><span>{t('g prot. al día', 'g protein a day')}</span></div>
              <div><strong>{w.met}/{w.logged}</strong><span>{t('días cumplidos', 'days on target')}</span></div>
            </div>
            <span className="small muted">
              {t(`Media de los ${w.logged} días con algo apuntado.`, `Average of the ${w.logged} days with something logged.`)}
              {w.top && t(` Lo que más proteína te dio: ${w.top.name} (${g(w.top.p)} g).`, ` Your top protein source: ${w.top.name} (${g(w.top.p)} g).`)}
            </span>
          </div>
        )
      })()}
      <div className="card food-month">
        <div className="row between">
          <button className="icon-btn" onClick={() => setFirst(new Date(first.getFullYear(), first.getMonth() - 1, 1))} aria-label={t('Mes anterior', 'Previous month')}><ChevronLeft size={20} /></button>
          <strong>{monthYear(first)}</strong>
          <button className="icon-btn" disabled={thisMonth} onClick={() => setFirst(new Date(first.getFullYear(), first.getMonth() + 1, 1))} aria-label={t('Mes siguiente', 'Next month')}><ChevronRight size={20} /></button>
        </div>
        <div className="food-month-grid">
          {t('LMXJVSD', 'MTWTFSS').split('').map((l, i) => <span key={i} className="tiny muted bold">{l}</span>)}
          {Array.from({ length: leading }, (_, i) => <span key={`e${i}`} />)}
          {info.map((x) => {
            const n = Number(x.key.slice(8))
            const future = x.key > today
            return (
              <button key={x.key} className={`mday ${x.status ?? ''} ${x.key === today ? 'today' : ''}`} disabled={future} onClick={() => onPick(x.key)}
                aria-label={`${longDay(fromDayKey(x.key))}${x.status ? `: ${label[x.status]}` : ''}`}>
                <span className="mday-n">{n}</span>
                {x.status && <span className="mday-d">{x.status === 'met' ? '✓' : sign(x.diff!) + unit}</span>}
              </button>
            )
          })}
        </div>
        <div className="month-legend">
          {(goals.proteinOnly ? ['met', 'under'] as const : ['met', 'over', 'under'] as const).map((s) => (
            <span key={s} className={`month-key ${s}`}><i aria-hidden="true" />{label[s]} <strong>{count(s)}</strong></span>
          ))}
        </div>
      </div>
      <p className="list-footer" style={{ margin: 0 }}>
        {goals.proteinOnly
          ? t('Cumplido: llegaste al 90 % de tu proteína. La cifra es lo que te faltó, en gramos.', 'On target: you reached 90% of your protein. The number is what you were short, in grams.')
          : t('Cumplido: a menos de un 10 % de tu objetivo de calorías. La cifra es lo que te pasaste o te faltó, en kcal. Toca un día para verlo.', 'On target: within 10% of your calorie goal. The number is how far over or under you were, in kcal. Tap a day to see it.')}
      </p>
    </Sheet>
  )
}

// MARK: Añadir

export { GoalsSheet }
