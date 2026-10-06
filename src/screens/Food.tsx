import { Barcode, ChevronLeft, ChevronRight, Ellipsis, Globe, HeartPulse, Minus, PenLine, Plus, RotateCcw, Search, Target, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ActionSheet, Card, LargeTitle, Segmented, Sheet, useToast } from '../components/ui'
import { day as longDay, editable, fromKg, int, parseDecimal, uid } from '../lib/format'
import { lang, t } from '../lib/i18n'
import {
  ACTIVITY, AIMS, amountOf, computeGoals, dayKey, dayTotals, entryTotals, fetchOffProduct, fold, fromDayKey, loadBasicFoods, matches, MEALS, mealLabel,
  quickEntryAmount, recentFoods, searchOff, shiftDay, validBarcode, type Aim, type BasicFood, type FoodEntry, type FoodRef, type MealKey, type MyFood, type NutritionGoals,
  type Per100, type Portion, type ScannedProduct, type Sex,
} from '../lib/nutrition'
import { update, updateSettings, useData, withUndo } from '../lib/store'
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'

// Comidas (ver lib/nutrition.ts): lo comido cada día frente a tu objetivo, por comidas.

const g = (v: number) => (v >= 10 ? int(v) : editable(Math.round(v * 10) / 10))

export function FoodScreen() {
  const data = useData()
  const [day, setDay] = useState(dayKey())
  const [adding, setAdding] = useState<MealKey>()
  const [editing, setEditing] = useState<FoodEntry>()
  const [goals, setGoals] = useState(false)
  const [mealMenu, setMealMenu] = useState<MealKey>()
  const [toast, showToast] = useToast()
  const today = dayKey()
  const entries = useMemo(() => data.nutrition.entries.filter((e) => e.day === day).sort((a, b) => a.at - b.at), [data.nutrition.entries, day])
  const totals = dayTotals(entries)
  const target = data.settings.nutrition
  const proteinOnly = target?.proteinOnly === true
  const dayLabel = day === today ? t('Hoy', 'Today') : day === shiftDay(today, -1) ? t('Ayer', 'Yesterday') : longDay(fromDayKey(day))

  const copyFrom = (meal: MealKey, from: string) => {
    const source = data.nutrition.entries.filter((e) => e.day === from && e.meal === meal)
    update((d) => {
      d.nutrition.entries.push(...source.map((e, i) => ({ ...e, id: uid(), day, at: Date.now() + i })))
    })
    showToast(t(`Copiado: ${source.length} de ayer`, `Copied: ${source.length} from yesterday`))
  }
  const saveMeal = (meal: MealKey) => {
    const items = entries.filter((e) => e.meal === meal)
    const name = prompt(t('Nombre de la comida (p. ej. «Desayuno de siempre»):', 'Meal name (e.g. "Usual breakfast"):'), `${mealLabel(meal)} · ${items[0]?.name ?? ''}`.slice(0, 60))
    if (!name?.trim()) return
    update((d) => {
      d.nutrition.meals.push({ id: uid(), name: name.trim().slice(0, 80), items: items.map(({ name, grams, per100, ref }) => ({ name, grams, per100, ref })) })
    })
    showToast(t('Comida guardada: la tienes al añadir', 'Meal saved: find it when adding'))
  }

  return (
    <div className="screen">
      <LargeTitle title={t('Comidas', 'Food')} actions={
        <button className="btn secondary btn-sm" onClick={() => setGoals(true)} aria-label={t('Objetivo diario', 'Daily goal')}><Target size={17} /> {t('Objetivo', 'Goal')}</button>
      } />
      <div className="day-switch">
        <button className="icon-btn" onClick={() => setDay(shiftDay(day, -1))} aria-label={t('Día anterior', 'Previous day')}><ChevronLeft size={20} /></button>
        <strong className="grow">{dayLabel}</strong>
        <button className="icon-btn" disabled={day >= today} onClick={() => setDay(shiftDay(day, 1))} aria-label={t('Día siguiente', 'Next day')}><ChevronRight size={20} /></button>
      </div>

      {target ? <DaySummary totals={totals} goals={target} /> : (
        <Card title={t('Calcula tu objetivo', 'Work out your goal')}>
          <span className="small muted">{t('Con tu peso, altura, edad y actividad te decimos cuántas calorías y cuánta proteína te tocan al día para tu objetivo.', 'With your weight, height, age and activity we tell you how many calories and how much protein you need a day for your goal.')}</span>
          <button className="btn primary" onClick={() => setGoals(true)}><Target size={18} /> {t('Calcular objetivo', 'Work out goal')}</button>
          {entries.length > 0 && <span className="small">{t(`Hoy llevas ${int(totals.kcal)} kcal y ${g(totals.p)} g de proteína.`, `So far today: ${int(totals.kcal)} kcal and ${g(totals.p)} g of protein.`)}</span>}
        </Card>
      )}

      {MEALS.map((meal) => {
        const items = entries.filter((e) => e.meal === meal)
        const sums = dayTotals(items)
        const yesterdayItems = items.length ? [] : data.nutrition.entries.filter((e) => e.day === shiftDay(day, -1) && e.meal === meal)
        const yesterdaySums = dayTotals(yesterdayItems)
        return (
          <section key={meal} className="meal">
            <div className="list-header">
              <span className="grow">{mealLabel(meal)}</span>
              {items.length > 0 && <span>{proteinOnly ? t(`${g(sums.p)} g proteína`, `${g(sums.p)} g protein`) : `${int(sums.kcal)} kcal`}</span>}
              <button className="meal-more" onClick={() => setMealMenu(meal)} aria-label={t(`Opciones de ${mealLabel(meal)}`, `${mealLabel(meal)} options`)}><Ellipsis size={20} /></button>
            </div>
            <div className="list">
              {items.map((e) => {
                const v = entryTotals(e)
                return (
                  <button key={e.id} className="list-row" onClick={() => setEditing(e)}>
                    <span className="grow" style={{ minWidth: 0 }}>
                      <span className="bold clamp-2" style={{ display: 'block', fontSize: 15 }}>{e.name}</span>
                      <span className="small muted">{[e.ref?.kind === 'quick' ? t('A mano', 'Manual') : `${g(e.grams)} g`, ...(proteinOnly ? [] : [t(`prot. ${g(v.p)} · hid. ${g(v.c)} · grasa ${g(v.f)}`, `prot. ${g(v.p)} · carbs ${g(v.c)} · fat ${g(v.f)}`)])].join(' · ')}</span>
                    </span>
                    {proteinOnly ? <strong className="food-kcal">{g(v.p)}<small> g prot.</small></strong> : <strong className="food-kcal">{int(v.kcal)}<small> kcal</small></strong>}
                  </button>
                )
              })}
              {yesterdayItems.length > 0 && (
                <button className="list-row" onClick={() => copyFrom(meal, shiftDay(day, -1))}>
                  <RotateCcw size={18} />
                  <span className="grow food-row-text">
                    <span className="bold" style={{ display: 'block', fontSize: 15 }}>{t('Repetir lo de ayer', "Repeat yesterday's")}</span>
                    <span className="small muted">
                      {yesterdayItems.length === 1 ? yesterdayItems[0].name : t(`${yesterdayItems[0].name} y ${yesterdayItems.length - 1} más`, `${yesterdayItems[0].name} and ${yesterdayItems.length - 1} more`)}
                      {' · '}{proteinOnly ? `${g(yesterdaySums.p)} g prot.` : `${int(yesterdaySums.kcal)} kcal`}
                    </span>
                  </span>
                </button>
              )}
              <button className="list-row accent" onClick={() => setAdding(meal)}><Plus size={20} /> {t('Añadir', 'Add')}</button>
            </div>
          </section>
        )
      })}

      <p className="list-footer" style={{ margin: 0 }}>
        {t('Alimentos básicos: tabla CIQUAL de la ANSES (Francia, Licence Ouverte 2.0), con las calorías calculadas como en las etiquetas de la UE. Productos con código de barras: Open Food Facts (ODbL). Son valores orientativos, no consejo médico.',
          'Basic foods: ANSES CIQUAL table (France, Licence Ouverte 2.0), with calories calculated as on EU labels. Barcode products: Open Food Facts (ODbL). Values are approximate, not medical advice.')}
      </p>

      {mealMenu && (() => {
        const meal = mealMenu
        const yesterday = shiftDay(day, -1)
        const fromYesterday = data.nutrition.entries.filter((e) => e.day === yesterday && e.meal === meal).length
        const here = entries.filter((e) => e.meal === meal)
        return (
          <ActionSheet title={mealLabel(meal)} onClose={() => setMealMenu(undefined)} options={[
            { label: t('Añadir alimento', 'Add food'), onSelect: () => setAdding(meal) },
            ...(fromYesterday ? [{ label: t(`Repetir lo de ayer (${fromYesterday})`, `Repeat yesterday's (${fromYesterday})`), onSelect: () => copyFrom(meal, yesterday) }] : []),
            ...(here.length ? [{ label: t('Guardar como comida', 'Save as a meal'), onSelect: () => saveMeal(meal) }] : []),
            ...(here.length ? [{
              label: t('Vaciar', 'Clear'), destructive: true, onSelect: () => withUndo(t(`${mealLabel(meal)} vaciada`, `${mealLabel(meal)} cleared`), () => update((d) => {
                d.nutrition.entries = d.nutrition.entries.filter((e) => !(e.day === day && e.meal === meal))
              })),
            }] : []),
          ]} />
        )
      })()}
      {adding && <AddFoodSheet day={day} meal={adding} onClose={() => setAdding(undefined)} onAdded={(text) => showToast(text)} />}
      {editing && <EntrySheet entry={editing} day={entries} goals={target} onClose={() => setEditing(undefined)} />}
      {goals && <GoalsSheet onClose={() => setGoals(false)} />}
      {toast}
    </div>
  )
}

/** Calorías del día frente al objetivo y los tres macronutrientes. */
function DaySummary({ totals, goals }: { totals: Per100; goals: NutritionGoals }) {
  const left = goals.kcal - totals.kcal
  const pct = (v: number, total: number) => (total > 0 ? Math.min(100, (v / total) * 100) : 0)
  if (goals.proteinOnly) {
    const missing = goals.protein - totals.p
    return (
      <div className="card food-summary">
        <div className="food-kcal-row">
          <span>
            <strong className="food-big">{g(totals.p)}</strong>
            <span className="muted"> / {int(goals.protein)} g {t('de proteína', 'of protein')}</span>
          </span>
          <span className="small muted">{missing > 0 ? t(`Faltan ${g(missing)} g`, `${g(missing)} g to go`) : t('Objetivo cumplido', 'Goal reached')}</span>
        </div>
        <div className="food-bar" role="progressbar" aria-label={t('Proteína del día', 'Protein today')} aria-valuemin={0} aria-valuemax={goals.protein} aria-valuenow={Math.round(totals.p)}>
          <div style={{ transform: `scaleX(${pct(totals.p, goals.protein) / 100})` }} />
        </div>
      </div>
    )
  }
  const macros = [
    { label: t('Proteína', 'Protein'), value: totals.p, goal: goals.protein },
    { label: t('Hidratos', 'Carbs'), value: totals.c, goal: goals.carbs },
    { label: t('Grasa', 'Fat'), value: totals.f, goal: goals.fat },
  ]
  return (
    <div className="card food-summary">
      <div className="food-kcal-row">
        <span>
          <strong className="food-big">{int(totals.kcal)}</strong>
          <span className="muted"> / {int(goals.kcal)} kcal</span>
        </span>
        <span className={`small ${left < 0 ? 'over' : 'muted'}`}>{left >= 0 ? t(`Te quedan ${int(left)}`, `${int(left)} left`) : t(`${int(-left)} de más`, `${int(-left)} over`)}</span>
      </div>
      <div className={`food-bar ${left < 0 ? 'over' : ''}`} role="progressbar" aria-label={t('Calorías del día', 'Calories today')} aria-valuemin={0} aria-valuemax={goals.kcal} aria-valuenow={Math.round(totals.kcal)}>
        <div style={{ transform: `scaleX(${pct(totals.kcal, goals.kcal) / 100})` }} />
      </div>
      <div className="food-macros">
        {macros.map((m) => (
          <div key={m.label}>
            <span className="tiny muted">{m.label}</span>
            <span className="food-macro-value"><strong>{g(m.value)}</strong><span className="muted"> / {int(m.goal)} g</span></span>
            <div className="food-bar thin" aria-hidden="true"><div style={{ transform: `scaleX(${pct(m.value, m.goal) / 100})` }} /></div>
          </div>
        ))}
      </div>
    </div>
  )
}

// MARK: Añadir

/** Un alimento listo para elegir la cantidad. */
interface Pickable {
  name: string
  detail?: string
  per100: Per100
  portions: Portion[]
  ref?: FoodRef
  grams?: number
}

const fromBasic = (f: BasicFood): Pickable => ({
  name: lang() === 'en' ? f.en : f.es,
  per100: { kcal: f.kcal, p: f.p, c: f.c, f: f.f },
  portions: [{ label: `${lang() === 'en' ? f.portion.en : f.portion.es}`, g: f.portion.g }],
  ref: { kind: 'basic', id: f.id },
})

const fromMine = (f: MyFood): Pickable => ({
  name: f.name,
  // La marca solo si añade algo (a veces coincide con el nombre del producto).
  detail: f.brand && !fold(f.name).includes(fold(f.brand)) ? f.brand : undefined,
  per100: f.per100,
  portions: f.portion ? [f.portion] : [],
  ref: f.source === 'off' && f.barcode ? { kind: 'off', id: f.barcode } : { kind: 'mine', id: f.id },
})

type View = { kind: 'list' } | { kind: 'amount'; food: Pickable } | { kind: 'scan' } | { kind: 'create'; barcode?: string; name?: string } | { kind: 'quick'; name?: string }

function AddFoodSheet({ day, meal: initialMeal, onClose, onAdded }: { day: string; meal: MealKey; onClose: () => void; onAdded: (text: string) => void }) {
  const data = useData()
  const [view, setView] = useState<View>({ kind: 'list' })
  const [meal, setMeal] = useState(initialMeal)
  const [query, setQuery] = useState('')
  const [basic, setBasic] = useState<BasicFood[]>()
  const [basicError, setBasicError] = useState(false)
  const [off, setOff] = useState<{ query: string; state: 'loading' | 'offline' | ScannedProduct[] }>()
  const abort = useRef<AbortController>(null)
  useEffect(() => { loadBasicFoods().then(setBasic).catch(() => setBasicError(true)) }, [])
  useEffect(() => () => abort.current?.abort(), [])
  const goals = data.settings.nutrition
  const dayEntries = data.nutrition.entries.filter((e) => e.day === day)

  const add = (food: Pickable, grams: number, close = true) => {
    update((d) => {
      d.nutrition.entries.push({ id: uid(), day, meal, name: food.name, grams, per100: food.per100, ref: food.ref, at: Date.now() })
    })
    onAdded(t(`Añadido a ${mealLabel(meal).toLowerCase()}: ${food.name}`, `Added to ${mealLabel(meal).toLowerCase()}: ${food.name}`))
    if (close) onClose()
  }
  /** Un producto de Open Food Facts se guarda en «Mis alimentos» (una vez) y se elige la cantidad. */
  const pickProduct = (product: ScannedProduct) => {
    const known = data.nutrition.foods.find((f) => f.barcode === product.barcode)
    const food: MyFood = known ?? { id: uid(), name: product.name, brand: product.brand, barcode: product.barcode, per100: product.per100, portion: product.portion, source: 'off' }
    if (!known) update((d) => { d.nutrition.foods.push(food) })
    setView({ kind: 'amount', food: fromMine(food) })
  }
  /** Añadir de un toque la ración del envase (y guardar el producto en «Mis alimentos»). */
  const addProduct = (product: ScannedProduct) => {
    if (!product.portion) return
    const known = data.nutrition.foods.find((f) => f.barcode === product.barcode)
    const food: MyFood = known ?? { id: uid(), name: product.name, brand: product.brand, barcode: product.barcode, per100: product.per100, portion: product.portion, source: 'off' }
    if (!known) update((d) => { d.nutrition.foods.push(food) })
    add(fromMine(food), product.portion.g, false)
  }
  const searchOnline = async (text: string) => {
    abort.current?.abort()
    abort.current = new AbortController()
    setOff({ query: text, state: 'loading' })
    try {
      setOff({ query: text, state: await searchOff(text, abort.current.signal) })
    } catch {
      /* cancelada */
    }
  }

  const mealPicker = <Segmented value={meal} onChange={setMeal} options={MEALS.map((m) => ({ value: m, label: mealLabel(m) }))} />
  if (view.kind === 'amount') {
    return <AmountSheet food={view.food} title={t('Añadir', 'Add')} onBack={() => setView({ kind: 'list' })} onClose={onClose} onSave={(grams) => add(view.food, grams)}
      dayEntries={dayEntries} goals={goals} extra={mealPicker} />
  }
  if (view.kind === 'scan') {
    return <ScanSheet onBack={() => setView({ kind: 'list' })} onClose={onClose}
      onFound={(f) => setView({ kind: 'amount', food: fromMine(f) })}
      onMissing={(barcode) => setView({ kind: 'create', barcode })} />
  }
  if (view.kind === 'quick') {
    return <QuickEntrySheet initialName={view.name} meal={meal} onBack={() => setView({ kind: 'list' })} onClose={onClose}
      onSave={(name, total) => {
        const { grams, per100 } = quickEntryAmount(total)
        add({ name, per100, portions: [], ref: { kind: 'quick', id: uid() } }, grams)
      }} />
  }
  if (view.kind === 'create') {
    return <MyFoodSheet barcode={view.barcode} initialName={view.name} onBack={() => setView({ kind: 'list' })} onClose={onClose}
      onSaved={(f) => setView({ kind: 'amount', food: fromMine(f) })} />
  }

  const q = query.trim()
  const proteinOnly = goals?.proteinOnly === true
  const recent = q ? [] : recentFoods(data.nutrition.entries, 8)
  const mine = data.nutrition.foods.filter((f) => !q || matches(`${f.name} ${f.brand ?? ''}`, q))
  const saved = data.nutrition.meals.filter((m) => !q || matches(m.name, q))
  const basics = (basic ?? []).filter((f) => !q || matches(`${f.es} ${f.en}`, q))
  const offResults = off && off.query === q && Array.isArray(off.state) ? off.state : undefined
  const amountText = (per100: Per100, grams: number) => {
    const v = amountOf(per100, grams)
    return proteinOnly ? `${g(grams)} g · ${g(v.p)} g prot.` : `${g(grams)} g · ${int(v.kcal)} kcal · ${g(v.p)} g prot.`
  }
  const per100Text = (per100: Per100) => (proteinOnly
    ? t(`100 g: ${g(per100.p)} g de proteína`, `100 g: ${g(per100.p)} g protein`)
    : t(`100 g: ${int(per100.kcal)} kcal · ${g(per100.p)} g de proteína`, `100 g: ${int(per100.kcal)} kcal · ${g(per100.p)} g protein`))
  const addMeal = (id: string) => {
    const m = data.nutrition.meals.find((x) => x.id === id)
    if (!m) return
    update((d) => {
      d.nutrition.entries.push(...m.items.map((x, i) => ({ id: uid(), day, meal, name: x.name, grams: x.grams, per100: x.per100, ref: x.ref, at: Date.now() + i })))
    })
    onAdded(t(`Añadida: ${m.name}`, `Added: ${m.name}`))
    onClose()
  }
  const row = (key: string, food: Pickable, detail?: string) => (
    <button key={key} className="list-row" onClick={() => setView({ kind: 'amount', food })}>
      <span className="grow food-row-text">
        <span className="bold clamp-2" style={{ display: 'block', fontSize: 15 }}>{food.name}</span>
        <span className="small muted clamp-1">{food.detail ? `${food.detail} · ` : ''}{detail ?? per100Text(food.per100)}</span>
      </span>
    </button>
  )

  return (
    <Sheet title={t(`Añadir a ${mealLabel(meal).toLowerCase()}`, `Add to ${mealLabel(meal).toLowerCase()}`)} onClose={onClose} scrollKey={q}
      left={<button className="nav-btn" onClick={onClose}>{t('Cerrar', 'Close')}</button>}>
      <div className="row">
        <label className="search grow">
          <Search size={18} />
          <input type="search" placeholder={t('Buscar alimento', 'Search food')} value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && q.length >= 3 && !basics.length && !mine.length) void searchOnline(q) }} />
          {query && <button onClick={() => setQuery('')} aria-label={t('Borrar', 'Clear')}><X size={18} /></button>}
        </label>
        <button className="icon-btn" onClick={() => setView({ kind: 'scan' })} aria-label={t('Escanear código de barras', 'Scan barcode')}><Barcode size={20} /></button>
      </div>

      {saved.length > 0 && (
        <>
          <div className="list-header">{t('Mis comidas', 'My meals')}</div>
          <div className="list">
            {saved.map((m) => {
              const v = dayTotals(m.items)
              return (
                <button key={m.id} className="list-row" onClick={() => addMeal(m.id)} aria-label={t(`Añadir ${m.name}`, `Add ${m.name}`)}>
                  <span className="grow food-row-text">
                    <span className="bold clamp-2" style={{ display: 'block', fontSize: 15 }}>{m.name}</span>
                    <span className="small muted">{proteinOnly ? `${g(v.p)} g prot.` : `${int(v.kcal)} kcal · ${g(v.p)} g prot.`} · {m.items.map((x) => x.name).join(', ')}</span>
                  </span>
                  <span className="icon-btn" aria-hidden="true"><Plus size={19} /></span>
                </button>
              )
            })}
          </div>
        </>
      )}
      {recent.length > 0 && (
        <>
          <div className="list-header">{t('Recientes', 'Recent')}</div>
          <div className="list">
            {recent.map((e) => {
              const food: Pickable = { name: e.name, per100: e.per100, portions: [], ref: e.ref, grams: e.grams }
              return (
                <div key={e.id} className="list-row quick-row">
                  <button className="quick-main" onClick={() => setView({ kind: 'amount', food })}>
                    <span className="bold clamp-2" style={{ display: 'block', fontSize: 15 }}>{e.name}</span>
                    <span className="small muted">{e.ref?.kind === 'quick' ? amountText(e.per100, e.grams).replace(/^[^·]+· /, `${t('A mano', 'Manual')} · `) : amountText(e.per100, e.grams)}</span>
                  </button>
                  <button className="icon-btn" onClick={() => add(food, e.grams, false)} aria-label={t(`Añadir ${g(e.grams)} g de ${e.name}`, `Add ${g(e.grams)} g of ${e.name}`)}><Plus size={19} /></button>
                </div>
              )
            })}
          </div>
        </>
      )}
      {mine.length > 0 && (
        <>
          <div className="list-header">{t('Mis alimentos', 'My foods')}</div>
          <div className="list">{mine.map((f) => row(f.id, fromMine(f)))}</div>
        </>
      )}
      <div className="list-header">{t('Alimentos básicos', 'Basic foods')}</div>
      <div className="list">
        {basicError && <div className="list-row small muted">{t('No se ha podido cargar la lista. Comprueba la conexión.', 'Could not load the list. Check your connection.')}</div>}
        {basics.map((f) => row(f.id, fromBasic(f)))}
        {basic && q && basics.length === 0 && <div className="list-row small muted">{t('Sin resultados en la lista básica.', 'No results in the basic list.')}</div>}
        <button className="list-row accent" onClick={() => setView({ kind: 'create', name: q || undefined })}><Plus size={20} /> {q ? t(`Crear «${q}»`, `Create "${q}"`) : t('Crear alimento', 'Create food')}</button>
        <button className="list-row accent" onClick={() => setView({ kind: 'quick', name: q || undefined })}><PenLine size={19} /> {t('Apuntar calorías y macros a mano', 'Log calories and macros by hand')}</button>
      </div>
      {q.length >= 3 && (
        <>
          <div className="list-header">Open Food Facts</div>
          <div className="list">
            {offResults?.map((p) => (
              <div key={p.barcode} className="list-row quick-row">
                <button className="quick-main" onClick={() => pickProduct(p)}>
                  <span className="bold clamp-2" style={{ display: 'block', fontSize: 15 }}>{p.name}</span>
                  <span className="small muted">{p.brand ? `${p.brand} · ` : ''}{p.portion ? `${p.portion.label}: ${amountText(p.per100, p.portion.g).split(' · ').slice(1).join(' · ')}` : per100Text(p.per100)}</span>
                </button>
                {p.portion && <button className="icon-btn" onClick={() => addProduct(p)} aria-label={t(`Añadir ${p.portion.label} de ${p.name}`, `Add ${p.portion.label} of ${p.name}`)}><Plus size={19} /></button>}
              </div>
            ))}
            {offResults && offResults.length === 0 && <div className="list-row small muted">{t('Sin productos con ese nombre.', 'No products with that name.')}</div>}
            {off?.query === q && off.state === 'offline' ? (
              <div className="list-row" style={{ flexWrap: 'wrap' }}>
                <span className="grow small">{t('Open Food Facts está saturado ahora mismo (es un servicio gratuito de voluntarios). Puede volver a fallar; si no, escanea el código.', 'Open Food Facts is overloaded right now (a free volunteer service). It may fail again; otherwise scan the barcode.')}</span>
                <button className="btn secondary btn-sm" onClick={() => void searchOnline(q)}><RotateCcw size={16} /> {t('Reintentar', 'Try again')}</button>
              </div>
            ) : !(off?.query === q) && (
              <button className="list-row accent" onClick={() => void searchOnline(q)}>
                <Globe size={19} /> <span className="grow">{t(`Buscar «${q}» en Open Food Facts`, `Search "${q}" on Open Food Facts`)}<span className="small muted" style={{ display: 'block', fontWeight: 400 }}>{t('Productos envasados; solo se envía este texto', 'Packaged products; only this text is sent')}</span></span>
              </button>
            )}
            {off?.query === q && off.state === 'loading' && <div className="list-row small muted">{t('Buscando…', 'Searching…')}</div>}
          </div>
        </>
      )}
    </Sheet>
  )
}

/** Cantidad en gramos (raciones de un toque, × 2 y × 3, − / +), lo que aporta y cómo queda el día. */
function AmountSheet({ food, title, initialGrams, onBack, onClose, onSave, onDelete, extra, dayEntries, goals, editingId }: {
  food: Pickable
  title: string
  initialGrams?: number
  onBack?: () => void
  onClose: () => void
  onSave: (grams: number) => void
  onDelete?: () => void
  extra?: ReactNode
  /** Lo apuntado ese día, para enseñar cómo queda tras añadirlo. */
  dayEntries?: FoodEntry[]
  goals?: NutritionGoals
  /** Al editar, esa entrada no cuenta en «antes». */
  editingId?: string
}) {
  const start = initialGrams ?? food.grams ?? food.portions[0]?.g ?? 100
  const [text, setText] = useState(editable(start))
  const grams = parseDecimal(text) ?? 0
  const valid = grams > 0 && grams <= 5000
  const v = amountOf(food.per100, valid ? grams : 0)
  const portion = food.portions[0]
  const options: { label: string; g: number }[] = [
    ...(portion ? [{ label: `${portion.label} · ${g(portion.g)} g`, g: portion.g }, { label: `× 2 · ${g(portion.g * 2)} g`, g: portion.g * 2 }, { label: `× 3 · ${g(portion.g * 3)} g`, g: portion.g * 3 }] : []),
    ...(portion?.g === 100 ? [] : [{ label: '100 g', g: 100 }]),
  ]
  const step = portion && portion.g < 30 ? 5 : 10
  const nudge = (dir: 1 | -1) => setText(editable(Math.max(0, Math.round(((valid ? grams : 0) + dir * step) / step) * step)))
  const before = dayEntries ? dayTotals(dayEntries.filter((e) => e.id !== editingId)) : undefined
  const after = before && valid ? { kcal: before.kcal + Math.round(v.kcal), p: before.p + v.p } : undefined
  const proteinOnly = goals?.proteinOnly === true
  return (
    <Sheet title={title} onClose={onClose}
      left={onBack ? <button className="nav-btn" onClick={onBack}>{t('Atrás', 'Back')}</button> : <button className="nav-btn" onClick={onClose}>{t('Cerrar', 'Close')}</button>}
      footer={<button className="btn primary block" disabled={!valid} onClick={() => onSave(Math.round(grams * 10) / 10)}>{onDelete ? t('Guardar', 'Save') : t('Añadir', 'Add')}</button>}>
      <header className="ex-head">
        <h2 className="ex-title" style={{ fontSize: 24 }}>{food.name}</h2>
        {food.detail && <span className="muted">{food.detail}</span>}
      </header>
      <div className="list-row card-row amount-row">
        <label className="grow bold" htmlFor="food-grams">{t('Cantidad', 'Amount')}</label>
        <button className="icon-btn" onClick={() => nudge(-1)} disabled={!valid || grams <= step} aria-label={t(`Quitar ${step} g`, `Remove ${step} g`)}><Minus size={17} /></button>
        <input id="food-grams" className="field" inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} aria-label={t('Cantidad en gramos', 'Amount in grams')} style={{ width: 80, textAlign: 'right' }} />
        <span className="muted">g</span>
        <button className="icon-btn" onClick={() => nudge(1)} aria-label={t(`Añadir ${step} g`, `Add ${step} g`)}><Plus size={17} /></button>
      </div>
      {options.length > 0 && (
        <div className="chips amount-chips">
          {options.map((p) => (
            <button key={p.label} className={`chip ${Math.abs(grams - p.g) < 0.05 ? 'active' : ''}`} onClick={() => setText(editable(p.g))}>{p.label}</button>
          ))}
        </div>
      )}
      {proteinOnly ? (
        <div className="stat-band">
          <div><strong>{g(v.p)}</strong><span>{t('Proteína (g)', 'Protein (g)')}</span></div>
          <div><strong>{g(grams)}</strong><span>{t('Gramos', 'Grams')}</span></div>
        </div>
      ) : (
        <div className="stat-band food-band">
          <div><strong>{int(v.kcal)}</strong><span>kcal</span></div>
          <div><strong>{g(v.p)}</strong><span>{t('Proteína g', 'Protein g')}</span></div>
          <div><strong>{g(v.c)}</strong><span>{t('Hidratos g', 'Carbs g')}</span></div>
          <div><strong>{g(v.f)}</strong><span>{t('Grasa g', 'Fat g')}</span></div>
        </div>
      )}
      {after && before && goals && (
        <div className="after-bars" aria-label={onDelete ? t('Con este cambio, hoy', 'With this change, today') : t('Tras añadirlo, hoy', 'After adding it, today')}>
          <span className="tiny muted">{onDelete ? t('Con este cambio, hoy', 'With this change, today') : t('Tras añadirlo, hoy', 'After adding it, today')}</span>
          {!proteinOnly && <AfterBar label="kcal" before={before.kcal} after={after.kcal} goal={goals.kcal} format={int} />}
          <AfterBar label={t('Proteína', 'Protein')} before={before.p} after={after.p} goal={goals.protein} format={(x) => `${g(x)} g`} />
        </div>
      )}
      {extra}
      {onDelete && <button className="btn plain" style={{ color: 'var(--red-text)' }} onClick={onDelete}><Trash2 size={18} /> {t('Quitar', 'Remove')}</button>}
    </Sheet>
  )
}

/** Barra del día: lo que ya llevas y, marcado, lo que suma este alimento. */
function AfterBar({ label, before, after, goal, format }: { label: string; before: number; after: number; goal: number; format: (v: number) => string }) {
  const pct = (v: number) => (goal > 0 ? Math.min(100, Math.max(0, (v / goal) * 100)) : 0)
  return (
    <div className="after-bar">
      <span className="row" style={{ justifyContent: 'space-between' }}>
        <span className="small bold">{label}</span>
        <span className={`small ${after > goal ? 'over' : ''}`}><strong>{format(after)}</strong><span className="muted"> / {format(goal)}</span></span>
      </span>
      <div className={`food-bar ${after > goal ? 'over' : ''}`} aria-hidden="true">
        <div style={{ transform: `scaleX(${pct(Math.min(before, after)) / 100})` }} />
        <div className="after-new" style={{ left: `${pct(Math.min(before, after))}%`, width: `${Math.max(0, pct(after) - pct(Math.min(before, after)))}%` }} />
      </div>
    </div>
  )
}

/** Apuntar un plato sin buscar el alimento: calorías y macros totales (p. ej. comer fuera). */
function QuickEntrySheet({ initialName, initial, meal, onBack, onClose, onSave, onDelete }: {
  initialName?: string
  initial?: Per100
  meal: MealKey
  onBack?: () => void
  onClose: () => void
  onSave: (name: string, total: Per100) => void
  onDelete?: () => void
}) {
  const fmt = (v?: number) => (v === undefined ? '' : editable(Math.round(v * 10) / 10))
  const [name, setName] = useState(initialName ?? '')
  const [values, setValues] = useState({ kcal: fmt(initial?.kcal), p: fmt(initial?.p), c: fmt(initial?.c), f: fmt(initial?.f) })
  const num = (x: string) => (x.trim() === '' ? 0 : parseDecimal(x))
  const parsed = { kcal: num(values.kcal), p: num(values.p), c: num(values.c), f: num(values.f) }
  const ok = parsed.kcal !== null && parsed.kcal > 0 && parsed.kcal <= 5000 && [parsed.p, parsed.c, parsed.f].every((x) => x !== null && x >= 0 && x <= 500)
  const field = (key: keyof typeof values, label: string, unit: string) => (
    <label className="list-row">
      <span className="grow">{label}</span>
      <input inputMode="decimal" placeholder="0" style={{ textAlign: 'right', width: 80, fontSize: 17 }} value={values[key]} onChange={(e) => setValues({ ...values, [key]: e.target.value })} aria-label={label} />
      <span className="muted" style={{ width: 32 }}>{unit}</span>
    </label>
  )
  return (
    <Sheet title={t('Apuntar a mano', 'Log by hand')} onClose={onClose}
      left={onBack ? <button className="nav-btn" onClick={onBack}>{t('Atrás', 'Back')}</button> : <button className="nav-btn" onClick={onClose}>{t('Cerrar', 'Close')}</button>}
      footer={<button className="btn primary block" disabled={!ok} onClick={() => onSave(name.trim().slice(0, 120) || t(`${mealLabel(meal)} (a mano)`, `${mealLabel(meal)} (manual)`), { kcal: parsed.kcal!, p: parsed.p!, c: parsed.c!, f: parsed.f! })}>{onDelete ? t('Guardar', 'Save') : t('Añadir', 'Add')}</button>}>
      <p className="small muted" style={{ margin: 0 }}>{t('Para un plato que no está en la lista (por ejemplo, comiendo fuera): escribe el total. Solo las calorías son obligatorias.', 'For a dish that is not in the list (for example, eating out): type the total. Only calories are required.')}</p>
      <div className="list">
        <label className="list-row"><input className="grow" style={{ fontSize: 17 }} value={name} placeholder={t('Qué era (opcional)', 'What it was (optional)')} onChange={(e) => setName(e.target.value)} /></label>
      </div>
      <div className="list">
        {field('kcal', t('Calorías', 'Calories'), 'kcal')}
        {field('p', t('Proteína', 'Protein'), 'g')}
        {field('c', t('Hidratos', 'Carbs'), 'g')}
        {field('f', t('Grasa', 'Fat'), 'g')}
      </div>
      {onDelete && <button className="btn plain" style={{ color: 'var(--red-text)' }} onClick={onDelete}><Trash2 size={18} /> {t('Quitar', 'Remove')}</button>}
    </Sheet>
  )
}

function EntrySheet({ entry, day, goals, onClose }: { entry: FoodEntry; day: FoodEntry[]; goals?: NutritionGoals; onClose: () => void }) {
  const [meal, setMeal] = useState(entry.meal)
  const edit = (fn: (e: FoodEntry) => void) => update((d) => {
    const e = d.nutrition.entries.find((x) => x.id === entry.id)
    if (e) fn(e)
  })
  const remove = () => { onClose(); withUndo(t(`Quitado: ${entry.name}`, `Removed: ${entry.name}`), () => update((d) => { d.nutrition.entries = d.nutrition.entries.filter((x) => x.id !== entry.id) })) }
  if (entry.ref?.kind === 'quick') {
    return (
      <QuickEntrySheet initialName={entry.name} initial={entryTotals(entry)} meal={entry.meal} onClose={onClose} onDelete={remove}
        onSave={(name, total) => { const { grams, per100 } = quickEntryAmount(total); edit((e) => { e.name = name; e.grams = grams; e.per100 = per100 }); onClose() }} />
    )
  }
  return (
    <AmountSheet food={{ name: entry.name, per100: entry.per100, portions: [], ref: entry.ref }} title={t('Editar', 'Edit')} initialGrams={entry.grams} onClose={onClose}
      dayEntries={day} goals={goals} editingId={entry.id}
      onSave={(grams) => { edit((e) => { e.grams = grams; e.meal = meal }); onClose() }}
      onDelete={() => { onClose(); withUndo(t(`Quitado: ${entry.name}`, `Removed: ${entry.name}`), () => update((d) => { d.nutrition.entries = d.nutrition.entries.filter((x) => x.id !== entry.id) })) }}
      extra={<Segmented value={meal} onChange={setMeal} options={MEALS.map((m) => ({ value: m, label: mealLabel(m) }))} />} />
  )
}

// MARK: Código de barras

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'] as const
interface Detector { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> }

/** El lector del navegador si lo tiene (Chrome en Android) y, si no, el de ZXing (WebAssembly) servido desde la propia app. */
async function barcodeDetector(): Promise<Detector> {
  const Native = (window as unknown as { BarcodeDetector?: { new (o: { formats: string[] }): Detector; getSupportedFormats: () => Promise<string[]> } }).BarcodeDetector
  if (Native) {
    const supported = await Native.getSupportedFormats().catch(() => [] as string[])
    if (supported.includes('ean_13')) return new Native({ formats: FORMATS.filter((f) => supported.includes(f)) })
  }
  const { BarcodeDetector, prepareZXingModule } = await import('barcode-detector/ponyfill')
  prepareZXingModule({ overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) } })
  return new BarcodeDetector({ formats: [...FORMATS] })
}

type ScanState = { kind: 'idle' } | { kind: 'scanning' } | { kind: 'looking'; code: string } | { kind: 'error'; message: string; code?: string }

function ScanSheet({ onBack, onClose, onFound, onMissing }: { onBack: () => void; onClose: () => void; onFound: (f: MyFood) => void; onMissing: (barcode: string) => void }) {
  const data = useData()
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream>(null)
  const abort = useRef<AbortController>(null)
  const [state, setState] = useState<ScanState>({ kind: 'idle' })
  const [manual, setManual] = useState('')

  const stop = () => {
    stream.current?.getTracks().forEach((x) => x.stop())
    stream.current = null
  }
  useEffect(() => () => { stop(); abort.current?.abort() }, [])

  const lookup = async (code: string) => {
    stop()
    // Ya lo tienes guardado: sin conexión y sin volver a preguntar.
    const known = data.nutrition.foods.find((f) => f.barcode === code)
    if (known) return onFound(known)
    setState({ kind: 'looking', code })
    abort.current = new AbortController()
    let product: ScannedProduct | undefined | 'offline'
    try {
      product = await fetchOffProduct(code, abort.current.signal)
    } catch {
      return
    }
    if (product === 'offline') return setState({ kind: 'error', code, message: t('No hay conexión para consultar el producto. Inténtalo de nuevo o créalo a mano.', 'No connection to look up the product. Try again or create it yourself.') })
    if (!product) return onMissing(code)
    const food: MyFood = { id: uid(), name: product.name, brand: product.brand, barcode: code, per100: product.per100, portion: product.portion, source: 'off' }
    update((d) => { d.nutrition.foods.push(food) })
    onFound(food)
  }

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      return setState({ kind: 'error', message: t('Este navegador no permite usar la cámara. Escribe el código a mano.', 'This browser cannot use the camera. Type the code instead.') })
    }
    try {
      const [detector, media] = await Promise.all([
        barcodeDetector(),
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }),
      ])
      stream.current = media
      const v = video.current!
      v.srcObject = media
      await v.play()
      setState({ kind: 'scanning' })
      let busy = false
      const tick = async () => {
        if (!stream.current) return
        if (!busy && v.videoWidth) {
          busy = true
          const found = await detector.detect(v).catch(() => [])
          busy = false
          const code = found.map((x) => x.rawValue).find(validBarcode)
          if (code) {
            navigator.vibrate?.(30)
            return void lookup(code)
          }
        }
        setTimeout(() => requestAnimationFrame(() => void tick()), 120)
      }
      void tick()
    } catch (e) {
      stop()
      const denied = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError')
      setState({ kind: 'error', message: denied ? t('Sin permiso para la cámara. Puedes darlo en los ajustes del navegador o escribir el código a mano.', 'No camera permission. You can allow it in the browser settings or type the code.')
        : t('No se ha podido abrir la cámara. Escribe el código a mano.', 'Could not open the camera. Type the code instead.') })
    }
  }
  useEffect(() => { void start() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const typed = manual.replace(/\s/g, '')
  return (
    <Sheet title={t('Escanear', 'Scan')} onClose={onClose} left={<button className="nav-btn" onClick={() => { stop(); onBack() }}>{t('Atrás', 'Back')}</button>}>
      <div className={`transfer-camera barcode-camera ${state.kind === 'scanning' ? 'on' : ''}`}>
        <video ref={video} playsInline muted />
        {state.kind !== 'scanning' && <Barcode size={56} />}
        <div className="transfer-aim barcode-aim" />
      </div>
      {state.kind === 'scanning' && <p className="small muted" style={{ margin: 0, textAlign: 'center' }}>{t('Apunta al código de barras del envase.', 'Point at the barcode on the package.')}</p>}
      {state.kind === 'looking' && <p className="small" style={{ margin: 0, textAlign: 'center' }}>{t(`Buscando ${state.code} en Open Food Facts…`, `Looking up ${state.code} on Open Food Facts…`)}</p>}
      {state.kind === 'error' && (
        <div className="card">
          <span className="small">{state.message}</span>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {state.code ? <button className="btn secondary" onClick={() => void lookup(state.code!)}>{t('Reintentar', 'Try again')}</button>
              : <button className="btn secondary" onClick={() => void start()}>{t('Abrir la cámara', 'Open camera')}</button>}
            {state.code && <button className="btn plain" onClick={() => onMissing(state.code!)}>{t('Crearlo a mano', 'Create it yourself')}</button>}
          </div>
        </div>
      )}
      <div className="list-header">{t('O escribe el código', 'Or type the code')}</div>
      <div className="row">
        <input className="field grow" inputMode="numeric" placeholder="8410000000000" value={manual} onChange={(e) => setManual(e.target.value)} aria-label={t('Código de barras', 'Barcode')} />
        <button className="btn secondary" disabled={!validBarcode(typed)} onClick={() => void lookup(typed)}>{t('Buscar', 'Look up')}</button>
      </div>
      {typed.length >= 8 && !validBarcode(typed) && <span className="small muted">{t('Ese código no es válido: revisa los números.', 'That code is not valid: check the digits.')}</span>}
      <p className="list-footer" style={{ margin: 0 }}>
        {t('Solo se envía el código de barras a Open Food Facts, una base de datos abierta (ODbL) hecha por voluntarios; nunca tus datos. El producto se guarda en «Mis alimentos».',
          'Only the barcode is sent to Open Food Facts, an open database (ODbL) built by volunteers; never your data. The product is saved to "My foods".')}{' '}
        <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">openfoodfacts.org</a>
      </p>
    </Sheet>
  )
}

// MARK: Mis alimentos

function MyFoodSheet({ barcode, initialName, onBack, onClose, onSaved }: { barcode?: string; initialName?: string; onBack: () => void; onClose: () => void; onSaved: (f: MyFood) => void }) {
  const [name, setName] = useState(initialName ?? '')
  const [values, setValues] = useState({ kcal: '', p: '', c: '', f: '', portion: '' })
  const parsed = { kcal: parseDecimal(values.kcal), p: parseDecimal(values.p), c: parseDecimal(values.c), f: parseDecimal(values.f) }
  const ok = name.trim() && parsed.kcal !== null && parsed.kcal >= 0 && parsed.kcal <= 1000 && [parsed.p, parsed.c, parsed.f].every((x) => x !== null && x >= 0 && x <= 100)
  const portion = parseDecimal(values.portion)
  const save = () => {
    if (!ok) return
    const food: MyFood = {
      id: uid(), name: name.trim().slice(0, 120), source: 'mine',
      per100: { kcal: parsed.kcal!, p: parsed.p!, c: parsed.c!, f: parsed.f! },
      ...(barcode ? { barcode } : {}),
      ...(portion && portion > 0 && portion <= 5000 ? { portion: { label: t('1 ración', '1 serving'), g: portion } } : {}),
    }
    update((d) => { d.nutrition.foods.push(food) })
    onSaved(food)
  }
  const field = (key: keyof typeof values, label: string, unit: string) => (
    <label className="list-row">
      <span className="grow">{label}</span>
      <input inputMode="decimal" placeholder="0" style={{ textAlign: 'right', width: 80, fontSize: 17 }} value={values[key]} onChange={(e) => setValues({ ...values, [key]: e.target.value })} aria-label={label} />
      <span className="muted" style={{ width: 28 }}>{unit}</span>
    </label>
  )
  return (
    <Sheet title={t('Nuevo alimento', 'New food')} onClose={onClose}
      left={<button className="nav-btn" onClick={onBack}>{t('Atrás', 'Back')}</button>}
      footer={<button className="btn primary block" disabled={!ok} onClick={save}>{t('Guardar', 'Save')}</button>}>
      {barcode && <p className="small muted" style={{ margin: 0 }}>{t(`El código ${barcode} no está en Open Food Facts. Copia los valores de la etiqueta y lo tendrás guardado para la próxima vez.`, `Code ${barcode} is not on Open Food Facts. Copy the values from the label and it will be saved for next time.`)}</p>}
      <div className="list">
        <label className="list-row"><input className="grow" style={{ fontSize: 17 }} value={name} placeholder={t('Nombre (p. ej. «Mi batido»)', 'Name (e.g. "My shake")')} onChange={(e) => setName(e.target.value)} /></label>
      </div>
      <div className="list-header">{t('Por 100 g (lo pone la etiqueta)', 'Per 100 g (on the label)')}</div>
      <div className="list">
        {field('kcal', t('Calorías', 'Calories'), 'kcal')}
        {field('p', t('Proteína', 'Protein'), 'g')}
        {field('c', t('Carbohidratos', 'Carbs'), 'g')}
        {field('f', t('Grasa', 'Fat'), 'g')}
      </div>
      <div className="list-header">{t('Opcional', 'Optional')}</div>
      <div className="list">{field('portion', t('Una ración pesa', 'One serving weighs'), 'g')}</div>
    </Sheet>
  )
}

// MARK: Objetivo

function GoalsSheet({ onClose }: { onClose: () => void }) {
  const data = useData()
  const saved = data.settings.nutrition
  const lastWeight = useMemo(() => {
    let best: { date: number; weight: number } | undefined
    for (const m of data.measurements) if (m.weight !== undefined && (!best || m.date > best.date)) best = { date: m.date, weight: m.weight }
    return best?.weight
  }, [data.measurements])
  const defaultAim: Aim = data.settings.goal === 'fatLoss' ? 'lose' : data.settings.goal === 'hypertrophy' ? 'gain' : 'keep'
  const [sex, setSex] = useState<Sex>(saved?.sex ?? 'm')
  const [age, setAge] = useState(saved?.age ? String(saved.age) : '')
  const [height, setHeight] = useState(saved?.heightCm ? String(saved.heightCm) : '')
  const [weightText, setWeightText] = useState(saved?.weightKg ? editable(saved.weightKg) : lastWeight ? editable(Math.round(fromKg(lastWeight, 'kg') * 10) / 10) : '')
  const [activity, setActivity] = useState(saved?.activity ?? 1.55)
  const [aim, setAim] = useState<Aim>(saved?.aim ?? defaultAim)
  const [manual, setManual] = useState(!!saved && saved.sex === undefined)
  const [proteinOnly, setProteinOnly] = useState(saved?.proteinOnly === true)
  const [own, setOwn] = useState({ kcal: saved ? String(saved.kcal) : '', protein: saved ? String(saved.protein) : '', carbs: saved ? String(saved.carbs) : '', fat: saved ? String(saved.fat) : '' })

  const a = parseDecimal(age), h = parseDecimal(height), w = parseDecimal(weightText)
  const ready = a !== null && a >= 14 && a <= 100 && h !== null && h >= 120 && h <= 230 && w !== null && w >= 30 && w <= 300
  const computed = ready ? computeGoals({ sex, age: a!, heightCm: h!, weightKg: w!, activity, aim }) : undefined
  const ownGoals = (() => {
    const kcal = parseDecimal(own.kcal), protein = parseDecimal(own.protein), carbs = parseDecimal(own.carbs), fat = parseDecimal(own.fat)
    return kcal && kcal >= 800 && kcal <= 8000 && [protein, carbs, fat].every((x) => x !== null && x >= 0 && x <= 1000)
      ? { kcal, protein: protein!, carbs: carbs!, fat: fat! } : undefined
  })()
  const result = manual ? ownGoals : computed
  const save = () => {
    if (!result) return
    updateSettings({ nutrition: { ...result, ...(proteinOnly ? { proteinOnly: true } : {}) } })
    onClose()
  }
  const numberRow = (label: string, value: string, set: (v: string) => void, unit: string) => (
    <label className="list-row">
      <span className="grow">{label}</span>
      <input inputMode="decimal" placeholder="0" style={{ textAlign: 'right', width: 80, fontSize: 17 }} value={value} onChange={(e) => set(e.target.value)} aria-label={label} />
      <span className="muted" style={{ width: 36 }}>{unit}</span>
    </label>
  )

  return (
    <Sheet title={t('Objetivo diario', 'Daily goal')} onClose={onClose}
      left={<button className="nav-btn" onClick={onClose}>{t('Cancelar', 'Cancel')}</button>}
      footer={<button className="btn primary block" disabled={!result} onClick={save}>{t('Guardar objetivo', 'Save goal')}</button>}>
      <p className="food-health small" style={{ margin: 0 }}>
        <HeartPulse size={16} />
        <span>{t('Es una estimación, no una pauta médica. Si estás embarazada, tienes una enfermedad o tienes o has tenido un trastorno de la conducta alimentaria, consúltalo antes con un profesional sanitario.',
          'This is an estimate, not medical advice. If you are pregnant, have an illness, or have or have had an eating disorder, talk to a health professional first.')}</span>
      </p>
      <label className="list-row card-row">
        <span className="grow">
          <span className="bold" style={{ display: 'block' }}>{t('Ver solo la proteína', 'Show protein only')}</span>
          <span className="small muted">{t('Oculta las calorías y el resto: para comer bien sin contar.', 'Hides calories and the rest: eat well without counting.')}</span>
        </span>
        <input type="checkbox" className="toggle" checked={proteinOnly} onChange={(e) => setProteinOnly(e.target.checked)} />
      </label>
      <Segmented value={manual ? 'own' : 'calc'} onChange={(v) => setManual(v === 'own')}
        options={[{ value: 'calc', label: t('Calcularlo', 'Work it out') }, { value: 'own', label: t('Escribirlo yo', 'Set my own') }]} />
      {manual ? (
        <div className="list">
          {numberRow(t('Calorías', 'Calories'), own.kcal, (v) => setOwn({ ...own, kcal: v }), 'kcal')}
          {numberRow(t('Proteína', 'Protein'), own.protein, (v) => setOwn({ ...own, protein: v }), 'g')}
          {numberRow(t('Carbohidratos', 'Carbs'), own.carbs, (v) => setOwn({ ...own, carbs: v }), 'g')}
          {numberRow(t('Grasa', 'Fat'), own.fat, (v) => setOwn({ ...own, fat: v }), 'g')}
        </div>
      ) : (
        <>
          <Segmented value={sex} onChange={setSex} options={[{ value: 'm', label: t('Hombre', 'Male') }, { value: 'f', label: t('Mujer', 'Female') }]} />
          <div className="list">
            {numberRow(t('Edad', 'Age'), age, setAge, t('años', 'yrs'))}
            {numberRow(t('Altura', 'Height'), height, setHeight, 'cm')}
            {numberRow(t('Peso', 'Weight'), weightText, setWeightText, 'kg')}
          </div>
          <div className="list-header">{t('Actividad', 'Activity')}</div>
          <div className="list">
            {ACTIVITY.map((x) => (
              <button key={x.value} className="list-row" onClick={() => setActivity(x.value)} aria-pressed={activity === x.value}>
                <span className="grow"><span className="bold" style={{ display: 'block' }}>{x.label()}</span><span className="small muted">{x.detail()}</span></span>
                {activity === x.value && <span className="check">✓</span>}
              </button>
            ))}
          </div>
          <div className="list-header">{t('Objetivo', 'Goal')}</div>
          <div className="list">
            {AIMS.map((x) => (
              <button key={x.id} className="list-row" onClick={() => setAim(x.id)} aria-pressed={aim === x.id}>
                <span className="grow"><span className="bold" style={{ display: 'block' }}>{x.label()}</span><span className="small muted">{x.detail()}</span></span>
                {aim === x.id && <span className="check">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
      {result && (
        <div className="stat-band food-band">
          <div><strong>{int(result.kcal)}</strong><span>kcal</span></div>
          <div><strong>{int(result.protein)}</strong><span>{t('Proteína g', 'Protein g')}</span></div>
          <div><strong>{int(result.carbs)}</strong><span>{t('Hidratos g', 'Carbs g')}</span></div>
          <div><strong>{int(result.fat)}</strong><span>{t('Grasa g', 'Fat g')}</span></div>
        </div>
      )}
      {!manual && (
        <p className="list-footer" style={{ margin: 0 }}>
          {t('Se calcula con la fórmula de Mifflin-St Jeor y tu actividad. Proteína: 1,8 g por kilo (2,2 si pierdes grasa). Es una estimación: si en 2-3 semanas tu peso no va como quieres, ajusta las calorías un 5-10 %.',
            'Calculated with the Mifflin-St Jeor formula and your activity. Protein: 1.8 g per kg (2.2 when losing fat). It is an estimate: if your weight is not moving as you want after 2-3 weeks, adjust calories by 5-10%.')}
        </p>
      )}
    </Sheet>
  )
}
