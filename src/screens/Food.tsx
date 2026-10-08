import { Barcode, Bell, CalendarDays, Share2, Star, Camera, Check, ChefHat, Droplet, ChevronLeft, ChevronRight, Ellipsis, Shuffle, Sparkles, Globe, HeartPulse, Minus, PenLine, Plus, RotateCcw, Search, Target, Trash2, TriangleAlert, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ActionSheet, Card, LargeTitle, Segmented, Sheet, useToast } from '../components/ui'
import { day as longDay, editable, fromKg, int, monthYear, parseDecimal, uid } from '../lib/format'
import { lang, locale, t } from '../lib/i18n'
import {
  ACTIVITY, adjustGoals, AIMS, amountOf, dayText, favoriteKey, lastWeek, stem, dayFiber, dayOptional, optionals, SALT_MAX, traffic, weekdayOf, weekTemplate, FIBER_GOAL, recipeValues, waterGoal, type Recipe, type RecipeItem, CARRY_OVER_MAX, computeGoals, dayGoalOptions, dayKey, dayStatus, goalsForDay, trainingShift, weightAdvice, type DayGoalOptions, type WeightAdvice, defaultProteinPerKg, doubtfulValues, portionLabel, PROTEIN_PER_KG, suspectValue, dayTotals, entryTotals, fetchOffProduct, fold, fromDayKey, loadBasicFoods, matches, MEALS, ALL_MEALS, activeMeals, defaultMealLabel, mealLabel, planFor,
  quickEntryAmount, recentFoods, searchOff, AESAN_SOURCE, barcodeVariants, findAesan, loadAesan, searchAesan, type AesanProduct, shownGrams, shiftDay, validBarcode, type Aim, type BasicFood, type FoodEntry, type FoodRef, type MealKey, type MyFood, type NutritionGoals,
  type DayPlan, type SavedMeal, type Per100, type Portion, type ScannedProduct, type Sex,
} from '../lib/nutrition'
import { update, updateSettings, useData, withUndo } from '../lib/store'
import { dueMeals, reminderTime, takePendingAdd } from '../lib/foodReminders'
import { encodeFood, foodLink } from '../lib/foodShare'
import { shareLink } from '../lib/share'
import { useRoute } from '../lib/router'
import { buildDishes, fitDish, makePlan, mealTargets, pickDish, rateDish, rateRemoved, usualFoods, type Dish } from '../lib/mealPlan'
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'

// Comidas (ver lib/nutrition.ts): lo comido cada día frente a tu objetivo, por comidas.

const g = (v: number) => (v >= 10 ? int(v) : editable(shownGrams(v)))
/** Une cifra y unidad con espacios que no se parten al cambiar de línea («11 g prot.»). */
const nb = (text: string) => text.replace(/ /g, '\u00a0')

export function FoodScreen() {
  const data = useData()
  const [day, setDay] = useState(dayKey())
  const [adding, setAdding] = useState<MealKey>()
  // Desde el acceso directo «Apuntar comida»: hoy, con el buscador de la comida que toca abierto.
  const route = useRoute()
  useEffect(() => {
    const meal = takePendingAdd()
    if (meal) { setDay(dayKey()); setAdding(meal) }
  }, [route])
  const [editing, setEditing] = useState<FoodEntry>()
  const [goals, setGoals] = useState(false)
  const [mealMenu, setMealMenu] = useState<MealKey>()
  const [toast, showToast] = useToast()
  const today = dayKey()
  const entries = useMemo(() => data.nutrition.entries.filter((e) => e.day === day).sort((a, b) => a.at - b.at), [data.nutrition.entries, day])
  const totals = dayTotals(entries)
  const baseGoals = data.settings.nutrition
  const goalOpts = useMemo(() => dayGoalOptions(data), [data.sessions, data.nutrition.trainingDays, data.settings])
  const target = baseGoals && goalsForDay(baseGoals, data.nutrition.entries, day, goalOpts)
  const advice = useMemo(() => {
    if (!baseGoals || day !== today || (data.settings.nutritionAdviceAt ?? 0) > Date.now() - 14 * 86400000) return undefined
    return weightAdvice(data.measurements, baseGoals, data.nutrition.entries)
  }, [baseGoals, day, today, data.settings.nutritionAdviceAt, data.measurements, data.nutrition.entries])
  const proteinOnly = target?.proteinOnly === true
  const [month, setMonth] = useState(false)
  // Menú propuesto (hoy y mañana): platos base de la lista básica y platos tuyos.
  const [basic, setBasic] = useState<BasicFood[]>()
  useEffect(() => { if (baseGoals) loadBasicFoods().then(setBasic, () => {}) }, [baseGoals])
  const dishes = useMemo(() => (basic ? buildDishes(basic, data.nutrition.entries, today) : []), [basic, data.nutrition.entries, today])
  const tomorrow = shiftDay(today, 1)
  const canPlan = day === today || day === tomorrow
  const plan = canPlan ? planFor(data.nutrition, day) : undefined
  const pending = MEALS.filter((m) => plan?.meals[m] && !entries.some((e) => e.meal === m))
  const targets = target ? mealTargets(target, entries, pending) : {}
  const proposals = Object.fromEntries(pending.map((m) => {
    const slot = plan!.meals[m]!
    const dish = dishes.find((x) => x.id === slot.dish)
    return [m, dish && targets[m] ? { dish, items: fitDish(dish, targets[m]!, slot.removed) } : undefined]
  })) as Partial<Record<MealKey, { dish: Dish; items: ReturnType<typeof fitDish> }>>
  const [shopping, setShopping] = useState(false)
  const [weekShopping, setWeekShopping] = useState(false)
  const [mealsSheet, setMealsSheet] = useState(false)
  const [dayMenu, setDayMenu] = useState(false)
  // Semana tipo: el día de la semana que toca, si el día está vacío.
  const weekday = weekdayOf(day)
  const weekdayName = fromDayKey(day).toLocaleDateString(locale(), { weekday: 'long' })
  const typical = entries.length ? undefined : data.nutrition.week?.days[weekday]
  const copyDay = (to: string) => {
    update((d) => { d.nutrition.entries.push(...entries.map((e, i) => ({ ...e, id: uid(), day: to, at: Date.now() + i }))) })
    showToast(to === today ? t(`Copiado a hoy: ${entries.length}`, `Copied to today: ${entries.length}`) : t(`Copiado a mañana: ${entries.length}`, `Copied to tomorrow: ${entries.length}`))
  }
  const applyTypical = () => {
    if (!typical) return
    update((d) => { d.nutrition.entries.push(...typical.map((x, i) => ({ id: uid(), day, ...x, at: Date.now() + i }))) })
    showToast(t(`Apuntado tu ${weekdayName} tipo`, `Logged your usual ${weekdayName}`))
  }
  const shareDay = async () => {
    const text = dayText(entries, t(`Mis comidas · ${dayLabel === t('Hoy', 'Today') ? longDay(fromDayKey(day)) : dayLabel}`, `My food · ${dayLabel === 'Today' ? longDay(fromDayKey(day)) : dayLabel}`))
    try {
      if (navigator.share) await navigator.share({ text })
      else { await navigator.clipboard.writeText(text); showToast(t('Copiado: pégalo donde quieras', 'Copied: paste it anywhere')) }
    } catch { /* cancelado */ }
  }
  const saveWeek = () => {
    const days = weekTemplate(data.nutrition.entries, day)
    const n = Object.keys(days).length
    if (!n) return showToast(t('Esta semana aún no tiene nada apuntado', 'Nothing logged this week yet'))
    update((d) => { d.nutrition.week = { saved: Date.now(), days } })
    showToast(t(`Semana tipo guardada: ${n} ${n === 1 ? 'día' : 'días'}`, `Usual week saved: ${n} ${n === 1 ? 'day' : 'days'}`))
  }
  // Se guardan los menús de hoy y mañana; los de días pasados se tiran.
  const setPlan = (next?: DayPlan) => update((d) => {
    d.nutrition.plans = [...(d.nutrition.plans ?? []).filter((p) => p.day >= today && p.day !== day), ...(next ? [next] : [])]
  })
  const newPlan = () => {
    const open = MEALS.filter((m) => !entries.some((e) => e.meal === m))
    const all = target ? mealTargets(target, entries, open) : {}
    setPlan(makePlan(dishes, data.nutrition, day, Math.floor(Math.random() * 2 ** 31), all))
  }
  const dayLabel = day === today ? t('Hoy', 'Today') : day === shiftDay(today, -1) ? t('Ayer', 'Yesterday') : day === tomorrow ? t('Mañana', 'Tomorrow') : longDay(fromDayKey(day))

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
        <>
          {baseGoals && <button className="btn secondary btn-sm" onClick={() => setMonth(true)} aria-label={t('Resumen del mes', 'Month overview')}><CalendarDays size={17} /> {t('Mes', 'Month')}</button>}
          <button className="btn secondary btn-sm" onClick={() => setGoals(true)} aria-label={t('Objetivo diario', 'Daily goal')}><Target size={17} /> {t('Objetivo', 'Goal')}</button>
        </>
      } />
      <div className="day-switch">
        <button className="icon-btn" onClick={() => setDay(shiftDay(day, -1))} aria-label={t('Día anterior', 'Previous day')}><ChevronLeft size={20} /></button>
        <strong className="grow">{dayLabel}</strong>
        <button className="icon-btn" onClick={() => setDayMenu(true)} aria-label={t('Opciones del día', 'Day options')}><Ellipsis size={20} /></button>
        <button className="icon-btn" disabled={day >= tomorrow} onClick={() => setDay(shiftDay(day, 1))} aria-label={t('Día siguiente', 'Next day')}><ChevronRight size={20} /></button>
      </div>

      {advice && baseGoals && <WeightAdviceCard advice={advice} goals={baseGoals} />}
      {target ? <DaySummary totals={totals} entries={entries} goals={target} day={day} canMark={!!goalOpts.training && canPlan && !data.sessions.some((x) => dayKey(x.start) === day)} /> : (
        <Card title={t('Calcula tu objetivo', 'Work out your goal')}>
          <span className="small muted">{t('Con tu peso, altura, edad y actividad te decimos cuántas calorías y cuánta proteína te tocan al día para tu objetivo.', 'With your weight, height, age and activity we tell you how many calories and how much protein you need a day for your goal.')}</span>
          <button className="btn primary" onClick={() => setGoals(true)}><Target size={18} /> {t('Calcular objetivo', 'Work out goal')}</button>
          {entries.length > 0 && <span className="small">{t(`Hoy llevas ${int(totals.kcal)} kcal y ${g(totals.p)} g de proteína.`, `So far today: ${int(totals.kcal)} kcal and ${g(totals.p)} g of protein.`)}</span>}
        </Card>
      )}

      {typical && (() => {
        const v = dayTotals(typical)
        return (
          <button className="list-row card-row" onClick={applyTypical}>
            <RotateCcw size={18} aria-hidden="true" />
            <span className="grow food-row-text">
              <span className="bold" style={{ display: 'block', fontSize: 15 }}>{t(`Apuntar tu ${weekdayName} tipo`, `Log your usual ${weekdayName}`)}</span>
              <span className="small muted">{[t(`${typical.length} alimentos`, `${typical.length} foods`), ...(proteinOnly ? [] : [`${int(v.kcal)} kcal`]), `${g(v.p)} g prot.`].map(nb).join(' · ')}</span>
            </span>
          </button>
        )
      })()}
      {day <= today && <WaterCard day={day} goal={waterGoal(baseGoals?.sex)} />}

      {target && canPlan && dishes.length > 0 && (plan ? (
        <div className="plan-bar">
          <Sparkles size={17} aria-hidden="true" />
          <span className="grow small bold">{pending.length ? (day === today ? t('Menú propuesto para hoy', "Today's suggested menu") : t('Menú propuesto para mañana', "Tomorrow's suggested menu")) : t('Menú apuntado', 'Menu logged')}</span>
          {pending.length > 0 && <button className="nav-btn small" onClick={() => setShopping(true)}>{t('Compra', 'Shopping')}</button>}
          <button className="nav-btn small" onClick={newPlan}>{t('Rehacer', 'Redo')}</button>
          <button className="nav-btn small" onClick={() => setPlan()}>{t('Quitar', 'Remove')}</button>
        </div>
      ) : (
        <button className="list-row card-row plan-start" onClick={newPlan}>
          <Sparkles size={20} aria-hidden="true" />
          <span className="grow">
            <span className="bold" style={{ display: 'block' }}>{day === today ? t('Proponme el menú de hoy', 'Suggest a menu for today') : t('Proponme el menú de mañana', 'Suggest a menu for tomorrow')}</span>
            <span className="small muted">{t('Desayuno, comida, merienda y cena que cuadran con tu objetivo. Aprende de lo que apuntas y de lo que cambias.', 'Breakfast, lunch, snack and dinner that fit your goal. It learns from what you log and what you change.')}</span>
          </span>
        </button>
      ))}

      {day === today && data.settings.foodReminders && (() => {
        const due = dueMeals(data.nutrition.entries).filter((m) => !pending.includes(m))
        if (!due.length) return null
        return (
          <button className="list-row card-row reminder-row" onClick={() => setAdding(due[0])}>
            <Bell size={18} aria-hidden="true" />
            <span className="grow">{t(`Falta apuntar: ${due.map((m) => mealLabel(m).toLowerCase()).join(', ')}`, `Not logged yet: ${due.map((m) => mealLabel(m).toLowerCase()).join(', ')}`)}</span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        )
      })()}

      {ALL_MEALS.filter((m) => activeMeals().includes(m) || entries.some((e) => e.meal === m)).map((meal) => {
        const items = entries.filter((e) => e.meal === meal)
        const sums = dayTotals(items)
        const yesterdayItems = items.length ? [] : data.nutrition.entries.filter((e) => e.day === shiftDay(day, -1) && e.meal === meal)
        const yesterdaySums = dayTotals(yesterdayItems)
        return (
          <section key={meal} className="meal">
            <div className="list-header">
              <span className="grow">{mealLabel(meal)}</span>
              {items.length > 0 && <span className="meal-total">{proteinOnly ? nb(`${g(sums.p)} g prot.`) : nb(`${int(sums.kcal)} kcal`)}</span>}
              <button className="meal-more" onClick={() => setMealMenu(meal)} aria-label={t(`Opciones de ${mealLabel(meal)}`, `${mealLabel(meal)} options`)}><Ellipsis size={20} /></button>
            </div>
            <div className="list">
              {items.map((e) => {
                const v = entryTotals(e)
                return (
                  <button key={e.id} className="list-row" onClick={() => setEditing(e)}>
                    <span className="grow" style={{ minWidth: 0 }}>
                      <span className="bold clamp-2" style={{ display: 'block', fontSize: 15 }}>{e.name}</span>
                      <span className="small muted">{[...(e.ref?.kind === 'quick' ? [t('A mano', 'By hand')] : [nb(`${g(e.grams)} g`)]), ...(proteinOnly || (e.ref?.kind === 'quick' && !v.p) ? [] : [nb(`${g(v.p)} g prot.`)])].join(' · ')}</span>
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
                    <span className="small muted clamp-1" style={{ display: 'block' }}>{yesterdayItems.map((x) => x.name).join(', ')}</span>
                    <span className="small muted" style={{ display: 'block' }}>
                      {[t(`${yesterdayItems.length} ${yesterdayItems.length === 1 ? 'alimento' : 'alimentos'}`, `${yesterdayItems.length} ${yesterdayItems.length === 1 ? 'food' : 'foods'}`),
                        ...(proteinOnly ? [] : [`${int(yesterdaySums.kcal)} kcal`]), `${g(yesterdaySums.p)} g prot.`].map(nb).join(' · ')}
                    </span>
                  </span>
                </button>
              )}
              {proposals[meal] && (
                <Proposal dish={proposals[meal]!.dish} meal={meal} day={day} target={targets[meal]!} items={proposals[meal]!.items} proteinOnly={proteinOnly}
                  others={pending.filter((m) => m !== meal).map((m) => plan!.meals[m]!.dish)} dishes={dishes} onDone={showToast} />
              )}
              <button className="list-row accent" onClick={() => setAdding(meal)}><Plus size={20} /> {t('Añadir', 'Add')}</button>
              {items.length >= 2 && !data.nutrition.meals.some((m) => m.items.length === items.length && m.items.every((x, i) => x.name === items[i].name)) && (
                <button className="list-row small muted" onClick={() => saveMeal(meal)}><Star size={18} aria-hidden="true" /> {t('Guardar como comida para repetirla otro día', 'Save as a meal to repeat it another day')}</button>
              )}
            </div>
          </section>
        )
      })}

      {entries.length > 0 && (
        <div className="day-actions">
          {day < today && <button className="btn secondary btn-sm" onClick={() => copyDay(today)}>{t('Copiar a hoy', 'Copy to today')}</button>}
          {day === today && <button className="btn secondary btn-sm" onClick={() => copyDay(tomorrow)}>{t('Copiar a mañana', 'Copy to tomorrow')}</button>}
          <button className="btn secondary btn-sm" onClick={() => void shareDay()}>{t('Compartir el día', 'Share the day')}</button>
          <button className="btn secondary btn-sm" onClick={() => setDayMenu(true)}>{t('Más', 'More')}</button>
        </div>
      )}

      <p className="list-footer" style={{ margin: 0 }}>
        {t('Alimentos básicos: tabla CIQUAL de la ANSES (Francia, Licence Ouverte 2.0), con las calorías calculadas como en las etiquetas de la UE. Productos de supermercado: base de datos de alimentos y bebidas comercializados en España en 2022 de la AESAN (actualizada el 29/09/2026) y Open Food Facts (ODbL). Son valores orientativos, no consejo médico.',
          'Basic foods: ANSES CIQUAL table (France, Licence Ouverte 2.0), with calories calculated as on EU labels. Supermarket products: AESAN database of food and drinks sold in Spain in 2022 (updated 29/09/2026) and Open Food Facts (ODbL). Values are approximate, not medical advice.')}
      </p>

      {dayMenu && (
        <ActionSheet title={dayLabel} onClose={() => setDayMenu(false)} options={[
          ...(entries.length && day !== today ? [{ label: t('Copiar este día a hoy', 'Copy this day to today'), onSelect: () => copyDay(today) }] : []),
          ...(entries.length && day !== tomorrow ? [{ label: t('Copiar este día a mañana', 'Copy this day to tomorrow'), onSelect: () => copyDay(tomorrow) }] : []),
          ...(entries.length ? [{ label: t('Compartir este día', 'Share this day'), onSelect: () => void shareDay() }] : []),
          { label: t('Lista de la compra de la semana', 'Shopping list for the week'), onSelect: () => setWeekShopping(true) },
          { label: t('Elegir y renombrar las comidas', 'Choose and rename meals'), onSelect: () => setMealsSheet(true) },
          { label: t('Guardar esta semana como semana tipo', 'Save this week as my usual week'), onSelect: saveWeek },
          ...(data.nutrition.week ? [{ label: t('Borrar la semana tipo', 'Delete my usual week'), destructive: true, onSelect: () => withUndo(t('Semana tipo borrada', 'Usual week deleted'), () => update((d) => { delete d.nutrition.week })) }] : []),
        ]} />
      )}
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
      {adding && <AddFoodSheet day={day} meal={adding} goals={target} onClose={() => setAdding(undefined)} onAdded={(text) => showToast(text)} />}
      {editing && <EntrySheet entry={editing} day={entries} goals={target} onClose={() => setEditing(undefined)} />}
      {goals && <GoalsSheet onClose={() => setGoals(false)} />}
      {shopping && <ShoppingSheet items={Object.values(proposals).flatMap((x) => x?.items ?? [])} title={day === today ? t('Compra para hoy', 'Shopping for today') : t('Compra para mañana', 'Shopping for tomorrow')} onClose={() => setShopping(false)} onCopied={() => showToast(t('Lista copiada', 'List copied'))} />}
      {mealsSheet && <MealsSheet onClose={() => setMealsSheet(false)} />}
      {weekShopping && (() => {
        // Con semana tipo, sus 7 días; si no, lo que comiste los últimos 7 días (para repetirlo).
        const usual = data.nutrition.week
        const items = usual ? Object.values(usual.days).flatMap((d) => d ?? [])
          : data.nutrition.entries.filter((e) => e.day < today && e.day >= shiftDay(today, -7))
        return (
          <ShoppingSheet title={t('Compra de la semana', 'Shopping for the week')}
            items={items.filter((x) => x.ref?.kind !== 'quick').map((x) => ({ key: x.name, name: x.name, grams: x.grams }))}
            note={usual ? t('Cantidades de tu semana tipo (los 7 días). El peso es el del alimento tal como se llama: «cocido» o «hecho», ya cocinado; «crudo», sin cocinar.', 'Amounts from your usual week (all 7 days). Weights match the food name: "cooked" means after cooking, "raw" before.')
              : t('No tienes semana tipo: son las cantidades de lo que comiste los últimos 7 días. Puedes guardar una semana como semana tipo en este mismo menú.', 'You have no usual week: these are the amounts you ate over the last 7 days. You can save a week as your usual week from this same menu.')}
            onClose={() => setWeekShopping(false)} onCopied={() => showToast(t('Lista copiada', 'List copied'))} />
        )
      })()}
      {month && baseGoals && <MonthSheet goals={baseGoals} opts={goalOpts} onClose={() => setMonth(false)} onPick={(d) => { setDay(d); setMonth(false) }} />}
      {toast}
    </div>
  )
}

/** Calorías del día frente al objetivo y los tres macronutrientes. */
function DaySummary({ totals, entries, goals, day, canMark }: { totals: Per100; entries: FoodEntry[]; goals: NutritionGoals & { carried?: number; training?: boolean; shift?: number }; day: string; canMark: boolean }) {
  const fiber = dayFiber(entries)
  // Hoy sin entreno todavía: se puede marcar que vas a entrenar para tener ya el objetivo de entreno.
  const mark = (on: boolean) => update((d) => {
    const keep = shiftDay(dayKey(), -60)
    d.nutrition.trainingDays = [...(d.nutrition.trainingDays ?? []).filter((x) => x !== day && x >= keep), ...(on ? [day] : [])]
  })
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
        </div>
        <div className="food-bar" role="progressbar" aria-label={t('Proteína del día', 'Protein today')} aria-valuemin={0} aria-valuemax={goals.protein} aria-valuenow={Math.round(totals.p)}>
          <div style={{ transform: `scaleX(${pct(totals.p, goals.protein) / 100})` }} />
        </div>
        <span className="small muted food-left">{missing > 0 ? t(`Te quedan ${g(missing)} g`, `${g(missing)} g left`) : t('Objetivo cumplido', 'Goal reached')}</span>
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
        {goals.training !== undefined && (
          <span className="day-kind small">
            <span className="muted">{goals.training
              ? t(`Día de entreno: +${int(goals.shift ?? 0)} kcal`, `Training day: +${int(goals.shift ?? 0)} kcal`)
              : t(`Día de descanso: −${int(-(goals.shift ?? 0))} kcal`, `Rest day: −${int(-(goals.shift ?? 0))} kcal`)}</span>
            {canMark && <button className="nav-btn small" onClick={() => mark(!goals.training)}>{day === dayKey()
              ? (goals.training ? t('Hoy no entreno', 'Not training today') : t('Hoy entreno', 'Training today'))
              : (goals.training ? t('Mañana no entreno', 'Not training tomorrow') : t('Mañana entreno', 'Training tomorrow'))}</button>}
          </span>
        )}
        {!!goals.carried && <span className="small muted">{day > dayKey()
          ? t(`${int(goals.carried)} kcal menos: hoy llevas más de tu objetivo.`, `${int(goals.carried)} kcal less: you are over your goal today.`)
          : t(`${int(goals.carried)} kcal menos: el día anterior te pasaste.`, `${int(goals.carried)} kcal less: you went over the day before.`)}</span>}
      </div>
      <div className={`food-bar ${left < 0 ? 'over' : ''}`} role="progressbar" aria-label={t('Calorías del día', 'Calories today')} aria-valuemin={0} aria-valuemax={goals.kcal} aria-valuenow={Math.round(totals.kcal)}>
        <div style={{ transform: `scaleX(${pct(totals.kcal, goals.kcal) / 100})` }} />
      </div>
      <span className={`small food-left ${left < 0 ? 'over' : 'muted'}`}>
        {left >= 0 ? t(`Te quedan ${int(left)} kcal`, `${int(left)} kcal left`) : t(`${int(-left)} kcal de más`, `${int(-left)} kcal over`)}
        {goals.protein > totals.p ? t(` y ${g(goals.protein - totals.p)} g de proteína`, ` and ${g(goals.protein - totals.p)} g of protein`) : t(' · proteína cumplida', ' · protein reached')}
      </span>
      <div className="food-macros">
        {macros.map((m) => (
          <div key={m.label}>
            <span className="tiny muted">{m.label}</span>
            <span className="food-macro-value"><strong>{g(m.value)}</strong><span className="muted"> / {int(m.goal)} g</span></span>
            <div className="food-bar thin" aria-hidden="true"><div style={{ transform: `scaleX(${pct(m.value, m.goal) / 100})` }} /></div>
          </div>
        ))}
      </div>
      {totals.kcal > 0 && (() => {
        const sugar = dayOptional(entries, 'sugar'), salt = dayOptional(entries, 'salt')
        const missing = Math.max(fiber.missing, sugar.missing, salt.missing)
        return (
          <div className="day-extras small">
            <span><span className="muted">{t('Fibra', 'Fibre')}</span> <strong>{g(fiber.g)}</strong><span className="muted"> / {FIBER_GOAL} g</span></span>
            <span><span className="muted">{t('Azúcares', 'Sugars')}</span> <strong>{g(sugar.g)} g</strong></span>
            <span className={salt.g > SALT_MAX ? 'over' : ''}><span className="muted">{t('Sal', 'Salt')}</span> <strong>{editable(Math.round(salt.g * 10) / 10)}</strong><span className="muted"> / {SALT_MAX} g máx.</span></span>
            {missing > 0 && <span className="tiny muted day-extras-note">{t(`Sin contar los alimentos sin el dato (${missing}). Los azúcares incluyen los de la fruta y la leche.`, `Not counting foods without the data (${missing}). Sugars include those in fruit and milk.`)}</span>}
            {missing === 0 && <span className="tiny muted day-extras-note">{t('Los azúcares incluyen los de la fruta y la leche.', 'Sugars include those in fruit and milk.')}</span>}
          </div>
        )
      })()}
    </div>
  )
}

/** Vasos de agua del día (250 ml cada uno). */
function WaterCard({ day, goal }: { day: string; goal: number }) {
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
function WeightAdviceCard({ advice, goals }: { advice: WeightAdvice; goals: NutritionGoals }) {
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

/** Azúcares y sal de la cantidad elegida, con su semáforo por 100 g (bajo, medio o alto). */
function SugarSalt({ per100, grams, drink }: { per100: Per100; grams: number; drink: boolean }) {
  const items = (['sugar', 'salt'] as const).filter((k) => per100[k] !== undefined)
  if (!items.length) return null
  const names = { sugar: t('Azúcares', 'Sugars'), salt: t('Sal', 'Salt') }
  const levels = { low: t('bajo', 'low'), medium: t('medio', 'medium'), high: t('alto', 'high') }
  return (
    <div className="sugar-salt">
      {items.map((k) => {
        const level = traffic(k, per100[k]!, drink)
        const amount = (per100[k]! * grams) / 100
        return (
          <span key={k} className="tl-item">
            <span className="muted">{names[k]}</span> <strong>{k === 'salt' && amount < 10 ? editable(Math.round(amount * 100) / 100) : g(amount)} g</strong>
            <span className={`tl ${level}`}>{levels[level]}</span>
          </span>
        )
      })}
    </div>
  )
}

// MARK: Menú propuesto

/** Plato propuesto para una comida: se apunta de un toque, se cambia por otro o se le quitan alimentos. */
function Proposal({ dish, meal, day, target, items, proteinOnly, others, dishes, onDone }: {
  dish: Dish
  meal: MealKey
  day: string
  target: { kcal: number; p: number }
  items: ReturnType<typeof fitDish>
  proteinOnly: boolean
  /** Platos de las otras comidas pendientes, para no repetir el principal al cambiar. */
  others: string[]
  dishes: Dish[]
  onDone: (text: string) => void
}) {
  const data = useData()
  const v = dayTotals(items)
  const accept = () => {
    update((d) => {
      d.nutrition.entries.push(...items.map((i, n) => ({ id: uid(), day, meal, name: i.name, grams: i.grams, per100: i.per100, ...(i.ref ? { ref: i.ref } : {}), at: Date.now() + n })))
      d.nutrition.prefs = rateDish(d.nutrition.prefs, dish.id, true)
    })
    onDone(t(`${mealLabel(meal)} apuntada`, `${mealLabel(meal)} logged`))
  }
  const other = () => {
    const plan = planFor(data.nutrition, day)
    const slot = plan?.meals[meal]
    const skipped = [...(slot?.skipped ?? []), dish.id]
    const avoid = new Set(others.map((id) => dishes.find((d) => d.id === id)?.items.find((i) => i.role === 'p')?.key).filter((k): k is string => !!k))
    const next = pickDish(dishes, meal, { seed: plan?.seed ?? 0, day, prefs: rateDish(data.nutrition.prefs, dish.id, false), usual: usualFoods(data.nutrition.entries, day)[meal], skip: skipped, avoid, target })
    update((d) => {
      d.nutrition.prefs = rateDish(d.nutrition.prefs, dish.id, false)
      // Cuando ya no quedan platos sin ver, se vuelve a empezar.
      const p = planFor(d.nutrition, day)
      if (p && next) p.meals[meal] = { dish: next.id, skipped: next.id === dish.id || dishes.filter((x) => x.meal === meal).every((x) => skipped.includes(x.id)) ? [] : skipped }
    })
  }
  const remove = (key: string) => {
    if (items.length <= 1) return other()
    update((d) => {
      const slot = planFor(d.nutrition, day)?.meals[meal]
      if (slot) slot.removed = [...(slot.removed ?? []), key]
      d.nutrition.prefs = rateRemoved(d.nutrition.prefs, key)
    })
  }
  return (
    <div className="proposal">
      <div className="proposal-head">
        <span className="grow" style={{ minWidth: 0 }}>
          <span className="tiny muted bold proposal-kicker">{dish.mine ? t('De lo que sueles comer', 'From what you usually eat') : t('Propuesta', 'Suggestion')}</span>
          <span className="bold clamp-2" style={{ display: 'block', fontSize: 15 }}>{dish.mine ? items.map((i) => i.name).join(', ') : dish.name}</span>
        </span>
        <strong className="food-kcal">{proteinOnly ? <>{g(v.p)}<small> g prot.</small></> : <>{int(v.kcal)}<small> kcal</small></>}</strong>
      </div>
      <ul className="proposal-items">
        {items.map((i) => (
          <li key={i.key}>
            <span className="grow" style={{ minWidth: 0 }}>{i.name} <span className="muted">{nb(`${g(i.grams)} g`)}</span></span>
            <button className="icon-btn proposal-remove" onClick={() => remove(i.key)} aria-label={t(`Quitar ${i.name}`, `Remove ${i.name}`)}><X size={16} /></button>
          </li>
        ))}
      </ul>
      {!proteinOnly && <span className="small muted">{[`${g(v.p)} g prot.`, `${g(v.c)} g ${t('hidratos', 'carbs')}`, `${g(v.f)} g ${t('grasa', 'fat')}`].map(nb).join(' · ')}</span>}
      <div className="proposal-actions">
        <button className="btn primary btn-sm" onClick={accept}><Check size={17} /> {t('Apuntar', 'Log it')}</button>
        <button className="btn secondary btn-sm" onClick={other}><Shuffle size={16} /> {t('Otra opción', 'Another option')}</button>
      </div>
    </div>
  )
}

/** Lista de la compra del menú propuesto: cada alimento una vez, con lo que suma en el día. */
/** Compartir un alimento propio o una receta con un enlace (lib/foodShare.ts). */
function ShareFoodButton({ food }: { food: MyFood }) {
  const [copied, setCopied] = useState(false)
  const share = async () => {
    const link = foodLink(await encodeFood(food))
    const r = await shareLink(food.name, link, t(`${food.name}: guárdalo en tus alimentos de Serix`, `${food.name}: save it to your Serix foods`))
    if (r === 'copied') setCopied(true)
  }
  return <button className="nav-btn" onClick={() => void share()} aria-label={t(`Compartir ${food.name}`, `Share ${food.name}`)}>{copied ? t('Copiado', 'Copied') : <Share2 size={18} />}</button>
}

/** Comida a la que va un alimento: botones con 4 o menos, desplegable con más. */
function MealPicker({ value, onChange }: { value: MealKey; onChange: (m: MealKey) => void }) {
  const list = activeMeals().includes(value) ? activeMeals() : ALL_MEALS.filter((m) => activeMeals().includes(m) || m === value)
  if (list.length <= 4) return <Segmented value={value} onChange={onChange} options={list.map((m) => ({ value: m, label: mealLabel(m) }))} />
  return (
    <select className="field" value={value} onChange={(e) => onChange(e.target.value as MealKey)} aria-label={t('Comida', 'Meal')}>
      {list.map((m) => <option key={m} value={m}>{mealLabel(m)}</option>)}
    </select>
  )
}

/** Qué comidas tiene tu día (almuerzo de media mañana, recena…) y cómo se llaman. */
function MealsSheet({ onClose }: { onClose: () => void }) {
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

function ShoppingSheet({ items, title, note, onClose, onCopied }: { items: { key: string; name: string; grams: number }[]; title: string; note?: string; onClose: () => void; onCopied: () => void }) {
  const list = [...items.reduce((m, i) => m.set(i.key, { name: i.name, grams: (m.get(i.key)?.grams ?? 0) + i.grams }), new Map<string, { name: string; grams: number }>()).values()]
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
          <div key={x.name} className="list-row">
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
function MonthSheet({ goals, opts, onClose, onPick }: { goals: NutritionGoals; opts: DayGoalOptions; onClose: () => void; onPick: (day: string) => void }) {
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

/** Un alimento listo para elegir la cantidad. */
interface Pickable {
  name: string
  detail?: string
  per100: Per100
  portions: Portion[]
  ref?: FoodRef
  grams?: number
  /** El alimento de «Mis alimentos» detrás (guardado o aún no: se guarda al añadirlo). */
  source?: MyFood
}

const fromBasic = (f: BasicFood): Pickable => ({
  name: lang() === 'en' ? f.en : f.es,
  per100: { kcal: f.kcal, p: f.p, c: f.c, f: f.f, ...optionals(f) },
  portions: [{ label: `${lang() === 'en' ? f.portion.en : f.portion.es}`, g: f.portion.g }],
  ref: { kind: 'basic', id: f.id },
})

const fromMine = (f: MyFood): Pickable => ({
  name: f.name,
  // La marca solo si añade algo (a veces coincide con el nombre del producto).
  detail: f.brand && !fold(f.name).includes(fold(f.brand)) ? f.brand : undefined,
  per100: f.per100,
  portions: f.portion ? [f.portion] : [],
  ref: f.source !== 'mine' && f.barcode ? { kind: 'off', id: f.barcode } : { kind: 'mine', id: f.id },
  source: f,
})

type View = { kind: 'list' } | { kind: 'amount'; food: Pickable } | { kind: 'scan' } | { kind: 'create'; barcode?: string; name?: string } | { kind: 'quick'; name?: string } | { kind: 'fix'; food: MyFood }
  | { kind: 'recipe'; initial?: MyFood; name?: string }

function AddFoodSheet({ day, meal: initialMeal, goals, onClose, onAdded }: { day: string; meal: MealKey; goals?: NutritionGoals; onClose: () => void; onAdded: (text: string) => void }) {
  const data = useData()
  const [view, setView] = useState<View>({ kind: 'list' })
  const [editMeal, setEditMeal] = useState<string>()
  const [meal, setMeal] = useState(initialMeal)
  const [query, setQuery] = useState('')
  const [basic, setBasic] = useState<BasicFood[]>()
  const [basicError, setBasicError] = useState(false)
  const [off, setOff] = useState<{ query: string; state: 'loading' | 'offline' | ScannedProduct[] }>()
  const abort = useRef<AbortController>(null)
  useEffect(() => { loadBasicFoods().then(setBasic).catch(() => setBasicError(true)) }, [])
  useEffect(() => () => abort.current?.abort(), [])
  const dayEntries = data.nutrition.entries.filter((e) => e.day === day)

  const add = (food: Pickable, grams: number, close = true) => {
    update((d) => {
      // Un producto de Open Food Facts o escaneado se guarda en «Mis alimentos» al añadirlo, no al abrirlo.
      const f = food.source
      if (f && !d.nutrition.foods.some((x) => x.id === f.id || (f.barcode && x.barcode === f.barcode))) d.nutrition.foods.push(f)
      d.nutrition.entries.push({ id: uid(), day, meal, name: food.name, grams, per100: food.per100, ref: food.ref, at: Date.now() })
    })
    onAdded(t(`Añadido a ${mealLabel(meal).toLowerCase()}: ${food.name}`, `Added to ${mealLabel(meal).toLowerCase()}: ${food.name}`))
    if (close) onClose()
  }
  const productFood = (product: ScannedProduct, source: 'off' | 'aesan' = 'off'): MyFood => data.nutrition.foods.find((f) => f.barcode === product.barcode)
    ?? { id: uid(), name: product.name, brand: product.brand, barcode: product.barcode, per100: product.per100, portion: product.portion, source }
  const pickProduct = (product: ScannedProduct, source?: 'off' | 'aesan') => setView({ kind: 'amount', food: fromMine(productFood(product, source)) })
  /** Añadir de un toque la ración del envase. */
  const addProduct = (product: ScannedProduct, source?: 'off' | 'aesan') => add(fromMine(productFood(product, source)), product.portion?.g ?? 100, false)
  // Productos de supermercado de la AESAN: se cargan al empezar a buscar.
  const [shops, setShops] = useState<AesanProduct[] | 'error'>()
  const [shopsMax, setShopsMax] = useState(15)
  const [basicMax, setBasicMax] = useState(25)
  useEffect(() => setBasicMax(25), [query])
  useEffect(() => {
    if (query.trim().length >= 3 && !shops) loadAesan().then((d) => setShops(d.list), () => setShops('error'))
  }, [query, shops])
  useEffect(() => setShopsMax(15), [query])
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

  const mealPicker = <MealPicker value={meal} onChange={setMeal} />
  if (view.kind === 'amount') {
    const source = view.food.source
    const recipe = source?.recipe ? source : undefined
    const key = favoriteKey(view.food.ref)
    const favorite = key ? {
      on: (data.nutrition.favorites ?? []).includes(key),
      toggle: () => update((d) => {
        const list = d.nutrition.favorites ?? []
        d.nutrition.favorites = list.includes(key) ? list.filter((x) => x !== key) : [key, ...list].slice(0, 60)
        // Un producto aún sin guardar se guarda en «Mis alimentos» para poder encontrarlo luego.
        if (source && !d.nutrition.foods.some((x) => x.id === source.id || (source.barcode && x.barcode === source.barcode))) d.nutrition.foods.push(source)
      }),
    } : undefined
    return <AmountSheet food={view.food} title={t('Añadir', 'Add')} onBack={() => setView({ kind: 'list' })} onClose={onClose} onSave={(grams) => add(view.food, grams)} favorite={favorite}
      dayEntries={dayEntries} goals={goals} onFix={source && !recipe ? () => setView({ kind: 'fix', food: source }) : undefined}
      extra={<>
        {mealPicker}
        {recipe && <button className="list-row card-row accent" onClick={() => setView({ kind: 'recipe', initial: recipe })}><ChefHat size={19} /> {t('Ver o cambiar la receta', 'View or edit the recipe')}</button>}
      </>} />
  }
  if (view.kind === 'recipe') {
    return <RecipeSheet initial={view.initial} initialName={view.name} onBack={() => setView(view.initial ? { kind: 'amount', food: fromMine(view.initial) } : { kind: 'list' })} onClose={onClose}
      onSaved={(f) => { onAdded(t('Receta guardada en Mis alimentos', 'Recipe saved to My foods')); setView({ kind: 'amount', food: fromMine(f) }) }} />
  }
  if (view.kind === 'fix') {
    return <MyFoodSheet initial={view.food} onBack={() => setView({ kind: 'amount', food: fromMine(view.food) })} onClose={onClose}
      onSaved={(f) => { onAdded(t('Guardado en Mis alimentos', 'Saved to My foods')); setView({ kind: 'amount', food: fromMine(f) }) }} />
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
  // Favoritos (solo sin buscar): de la lista básica o de «Mis alimentos».
  const favorites = q ? [] : (data.nutrition.favorites ?? []).map((key): Pickable | undefined => {
    const [kind, id] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)]
    if (kind === 'basic') { const f = basic?.find((x) => x.id === id); return f && fromBasic(f) }
    const f = data.nutrition.foods.find((x) => (kind === 'off' ? x.barcode === id : x.id === id))
    return f && fromMine(f)
  }).filter((f): f is Pickable => !!f)
  // Sin buscar, solo los habituales; al buscar, toda la lista (los habituales primero).
  const basicsAll = (() => {
    if (!q) return (basic ?? []).filter((f) => !f.more)
    // Los habituales primero; luego, los que empiezan por lo buscado («Lentejas rubias» antes que «Pasta de lentejas»).
    const start = stem(q)
    const rank = (f: BasicFood) => (f.more ? 1 : 0) * 2 + (fold(lang() === 'en' ? f.en : f.es).startsWith(start) ? 0 : 1)
    // Con una sola letra, solo los habituales (la lista ampliada tiene 2.600 y sale demasiado).
    return (basic ?? []).filter((f) => (q.length > 1 || !f.more) && matches(`${f.es} ${f.en}`, q)).map((f, i) => ({ f, i, r: rank(f) })).sort((a, b) => a.r - b.r || a.i - b.i).map((x) => x.f)
  })()
  const basics = q ? basicsAll.slice(0, basicMax) : basicsAll
  const offResults = off && off.query === q && Array.isArray(off.state) ? off.state : undefined
  const amountText = (per100: Per100, grams: number) => {
    const v = amountOf(per100, grams)
    return (proteinOnly ? [`${g(grams)} g`, `${g(v.p)} g prot.`] : [`${g(grams)} g`, `${int(v.kcal)} kcal`, `${g(v.p)} g prot.`]).map(nb).join(' · ')
  }
  /** Un apunte a mano: sus totales, sin inventar la proteína si no se escribió. */
  const quickText = (v: Per100) => [t('A mano', 'By hand'), ...(proteinOnly ? [] : [nb(`${int(v.kcal)} kcal`)]), ...(v.p > 0 || proteinOnly ? [nb(`${g(v.p)} g prot.`)] : [])].join(' · ')
  /** Lo que añade el «+»: la ración si la hay (o lo último que apuntaste), si no 100 g. */
  const quickGrams = (food: Pickable) => food.grams ?? food.portions[0]?.g ?? 100
  /** Misma línea para todos: [marca ·] [ración ·] g · kcal · prot. (la ración, solo si tiene nombre propio: «1 huevo»). */
  const detailText = (per100: Per100, grams: number, extra: { brand?: string; portion?: Portion }) => [
    extra.brand,
    extra.portion && extra.portion.g === grams && portionLabel(extra.portion.label) !== portionLabel() ? nb(portionLabel(extra.portion.label)) : undefined,
    amountText(per100, grams),
  ].filter(Boolean).join(' · ')
  /** Fila de un alimento: el «+» añade lo que dice la línea; si sus valores no cuadran, hay que abrirlo antes. */
  const foodRow = (key: string, name: string, detail: string, doubtful: boolean, onOpen: () => void, onAdd: () => void, grams: number) => (
    <div key={key} className="list-row quick-row">
      <button className="quick-main" onClick={onOpen}>
        <span className="bold clamp-2" style={{ display: 'block', fontSize: 15 }}>{name}</span>
        <span className="small muted">{detail}</span>
        {doubtful && <span className="small doubt-line"><TriangleAlert size={14} aria-hidden="true" /> {t('Las kcal no cuadran: revisa la etiqueta', 'Calories do not add up: check the label')}</span>}
      </button>
      {doubtful
        ? <button className="icon-btn plain-chevron" onClick={onOpen} aria-label={t(`Revisar ${name}`, `Review ${name}`)}><ChevronRight size={20} /></button>
        : <button className="icon-btn" onClick={onAdd} aria-label={t(`Añadir ${g(grams)} g de ${name}`, `Add ${g(grams)} g of ${name}`)}><Plus size={19} /></button>}
    </div>
  )
  const addMeal = (id: string) => {
    const m = data.nutrition.meals.find((x) => x.id === id)
    if (!m) return
    update((d) => {
      d.nutrition.entries.push(...m.items.map((x, i) => ({ id: uid(), day, meal, name: x.name, grams: x.grams, per100: x.per100, ref: x.ref, at: Date.now() + i })))
    })
    onAdded(t(`Añadida: ${m.name}`, `Added: ${m.name}`))
    onClose()
  }
  const row = (key: string, food: Pickable) => {
    const grams = quickGrams(food)
    return foodRow(key, food.name, detailText(food.per100, grams, { brand: food.detail, portion: food.portions[0] }), food.ref?.kind !== 'basic' && doubtfulValues(food.per100),
      () => setView({ kind: 'amount', food }), () => add(food, grams, false), grams)
  }

  if (editMeal) {
    const m = data.nutrition.meals.find((x) => x.id === editMeal)
    if (m) return <SavedMealSheet meal={m} onBack={() => setEditMeal(undefined)} onClose={onClose} onAdd={() => addMeal(m.id)} />
  }
  return (
    <Sheet title={t(`Añadir a ${mealLabel(meal).toLowerCase()}`, `Add to ${mealLabel(meal).toLowerCase()}`)} onClose={onClose} scrollKey={q}
      left={<button className="nav-btn" onClick={onClose}>{t('Cerrar', 'Close')}</button>}>
      <label className="search">
        <Search size={18} />
        <input type="search" placeholder={t('Buscar alimento', 'Search food')} value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && q.length >= 3 && !basics.length && !mine.length) void searchOnline(q) }} />
        {query && <button onClick={() => setQuery('')} aria-label={t('Borrar', 'Clear')}><X size={18} /></button>}
      </label>
      <div className="food-tools">
        <button className="btn secondary btn-sm" onClick={() => setView({ kind: 'scan' })}><Barcode size={17} aria-hidden="true" /> {t('Escanear código', 'Scan barcode')}</button>
        <button className="btn secondary btn-sm" onClick={() => setView({ kind: 'create', name: q || undefined })}><Camera size={17} aria-hidden="true" /> {t('Leer etiqueta', 'Read label')}</button>
      </div>
      {data.nutrition.entries.length < 5 && !q && (
        <span className="small muted">{t('Toca el + para añadir la cantidad que pone debajo del nombre, o toca el alimento para elegir otra.', 'Tap + to add the amount shown under the name, or tap the food to choose another.')}</span>
      )}

      {favorites.length > 0 && (
        <>
          <div className="list-header">{t('Favoritos', 'Favourites')}</div>
          <div className="list">{favorites.map((f) => row(`fav-${favoriteKey(f.ref)}`, f))}</div>
        </>
      )}
      {saved.length > 0 && (
        <>
          <div className="list-header">{t('Mis comidas', 'My meals')}</div>
          <div className="list">
            {saved.map((m) => {
              const v = dayTotals(m.items)
              return (
                <div key={m.id} className="list-row quick-row">
                  <button className="quick-main" onClick={() => setEditMeal(m.id)} aria-label={t(`Ver o cambiar ${m.name}`, `View or edit ${m.name}`)}>
                    <span className="bold clamp-2" style={{ display: 'block', fontSize: 15 }}>{m.name}</span>
                    <span className="small muted">{[t(`${m.items.length} alimentos`, `${m.items.length} foods`), ...(proteinOnly ? [] : [`${int(v.kcal)} kcal`]), `${g(v.p)} g prot.`].map(nb).join(' · ')}</span>
                  </button>
                  <button className="icon-btn" onClick={() => addMeal(m.id)} aria-label={t(`Añadir ${m.name}`, `Add ${m.name}`)}><Plus size={19} /></button>
                </div>
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
                    <span className="small muted">{e.ref?.kind === 'quick' ? quickText(entryTotals(e)) : amountText(e.per100, e.grams)}</span>
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
        {basicsAll.length > basics.length && <button className="list-row accent" onClick={() => setBasicMax(basicMax + 50)}><Plus size={19} /> {t(`Ver más (${basicsAll.length - basics.length})`, `Show more (${basicsAll.length - basics.length})`)}</button>}
        {basic && q && basics.length === 0 && <div className="list-row small muted">{t('Sin resultados en la lista básica.', 'No results in the basic list.')}</div>}
        <button className="list-row accent" onClick={() => setView({ kind: 'create', name: q || undefined })}><Plus size={20} /> {q ? t(`Crear «${q}»`, `Create "${q}"`) : t('Crear alimento', 'Create food')}</button>
        <button className="list-row accent" onClick={() => setView({ kind: 'create', name: q || undefined })}><Camera size={19} /> {t('Leer la etiqueta de un envase', 'Read a pack label')}</button>
        <button className="list-row accent" onClick={() => setView({ kind: 'recipe', name: q || undefined })}><ChefHat size={19} /> {t('Crear una receta', 'Create a recipe')}</button>
        <button className="list-row accent" onClick={() => setView({ kind: 'quick', name: q || undefined })}><PenLine size={19} /> {t('Apuntar calorías y macros a mano', 'Log calories and macros by hand')}</button>
      </div>
      {q.length >= 3 && (() => {
        const mineCodes = new Set(data.nutrition.foods.map((f) => f.barcode).filter(Boolean))
        const found = Array.isArray(shops) ? searchAesan(shops, q, 61).filter((p) => !mineCodes.has(p.barcode)) : []
        return (
          <>
            <div className="list-header">{t('Supermercados en España', 'Supermarkets in Spain')}</div>
            <div className="list">
              {found.slice(0, shopsMax).map((p) => {
                const grams = p.portion?.g ?? 100
                return foodRow(p.barcode, p.name, detailText(p.per100, grams, { brand: p.brand, portion: p.portion }), doubtfulValues(p.per100), () => pickProduct(p, 'aesan'), () => addProduct(p, 'aesan'), grams)
              })}
              {found.length > shopsMax && <button className="list-row accent" onClick={() => setShopsMax(60)}><Plus size={19} /> {t('Ver más productos', 'Show more products')}</button>}
              {shops === undefined && <div className="list-row small muted">{t('Cargando productos…', 'Loading products…')}</div>}
              {shops === 'error' && <div className="list-row small muted">{t('No se han podido cargar los productos. Comprueba la conexión.', 'Could not load the products. Check your connection.')}</div>}
              {Array.isArray(shops) && found.length === 0 && <div className="list-row small muted">{t('Sin productos con ese nombre.', 'No products with that name.')}</div>}
            </div>
            <p className="list-footer" style={{ margin: 0 }}>{t(`${AESAN_SOURCE}, actualizada el 29/09/2026 (datos de las etiquetas recogidos por Kantar Worldpanel; pueden haber cambiado). Valores por 100 g o 100 ml.`, `${AESAN_SOURCE} (Spanish Food Safety Agency), updated 29/09/2026 (label data collected by Kantar Worldpanel, may have changed). Values per 100 g or 100 ml.`)}</p>
          </>
        )
      })()}
      {q.length >= 3 && (
        <>
          <div className="list-header">Open Food Facts</div>
          <div className="list">
            {offResults?.filter((p) => !data.nutrition.foods.some((f) => f.barcode === p.barcode)).map((p) => {
              const grams = p.portion?.g ?? 100
              return foodRow(p.barcode, p.name, detailText(p.per100, grams, { brand: p.brand, portion: p.portion }), doubtfulValues(p.per100), () => pickProduct(p), () => addProduct(p), grams)
            })}
            {offResults && offResults.length === 0 && <div className="list-row small muted">{t('Sin productos con ese nombre.', 'No products with that name.')}</div>}
            {off?.query === q && off.state === 'offline' ? (
              <div className="list-row" style={{ flexWrap: 'wrap' }}>
                <span className="grow small">{t('Open Food Facts está saturado ahora mismo (es un servicio gratuito de voluntarios). Si sigue fallando, escanea el código de barras.', 'Open Food Facts is overloaded right now (a free volunteer service). If it keeps failing, scan the barcode.')}</span>
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
/** Última forma de escribir la cantidad (gramos o raciones), para la próxima vez. */
let lastAmountMode: 'g' | 'portion' = 'g'

function AmountSheet({ food, title, initialGrams, onBack, onClose, onSave, onDelete, onFix, extra, dayEntries, goals, editingId, favorite }: {
  food: Pickable
  /** Marcar como favorito (si se puede). */
  favorite?: { on: boolean; toggle: () => void }
  title: string
  initialGrams?: number
  onBack?: () => void
  onClose: () => void
  onSave: (grams: number) => void
  onDelete?: () => void
  /** Corregir los valores del alimento (cuando no cuadran). */
  onFix?: () => void
  extra?: ReactNode
  /** Lo apuntado ese día, para enseñar cómo queda tras añadirlo. */
  dayEntries?: FoodEntry[]
  goals?: NutritionGoals
  /** Al editar, esa entrada no cuenta en «antes». */
  editingId?: string
}) {
  const start = initialGrams ?? food.grams ?? food.portions[0]?.g ?? 100
  const portion = food.portions[0]
  // En raciones («2 yogures») si el alimento tiene una ración con nombre y la última vez se usó así.
  const canPortion = !!portion && portion.g !== 100
  const [mode, setModeState] = useState<'g' | 'portion'>(canPortion ? lastAmountMode : 'g')
  const [text, setText] = useState(editable(mode === 'portion' && portion ? Math.round((start / portion.g) * 100) / 100 : start))
  const typed = parseDecimal(text) ?? 0
  const grams = mode === 'portion' && portion ? Math.round(typed * portion.g * 10) / 10 : typed
  const setMode = (m: 'g' | 'portion') => {
    if (!portion || m === mode) return
    lastAmountMode = m
    setText(editable(m === 'portion' ? Math.round((grams / portion.g) * 100) / 100 : grams))
    setModeState(m)
  }
  const valid = grams > 0 && grams <= 5000
  const v = amountOf(food.per100, valid ? grams : 0)
  const options: { label: string; g: number }[] = [
    ...(portion ? [{ label: `${portionLabel(portion.label)} · ${g(portion.g)} g`, g: portion.g }, { label: `× 2 · ${g(portion.g * 2)} g`, g: portion.g * 2 }, { label: `× 3 · ${g(portion.g * 3)} g`, g: portion.g * 3 }] : []),
    ...(portion?.g === 100 ? [] : [{ label: '100 g', g: 100 }]),
  ]
  const step = mode === 'portion' ? 0.5 : portion && portion.g < 30 ? 5 : 10
  const nudge = (dir: 1 | -1) => setText(editable(Math.max(0, Math.round(((valid ? typed : 0) + dir * step) / step) * step)))
  const before = dayEntries ? dayTotals(dayEntries.filter((e) => e.id !== editingId)) : undefined
  const after = before && valid ? { kcal: before.kcal + Math.round(v.kcal), p: before.p + v.p } : undefined
  const proteinOnly = goals?.proteinOnly === true
  const doubtful = food.ref?.kind !== 'basic' && food.ref?.kind !== 'quick' && doubtfulValues(food.per100)
  const suspect = doubtful ? suspectValue(food.per100) : undefined
  const saveButton = (primary: boolean, label: string) => (
    <button className={`btn ${primary ? 'primary' : 'secondary'} block`} disabled={!valid} onClick={() => onSave(Math.round(grams * 10) / 10)}>{label}</button>
  )
  return (
    <Sheet title={title} onClose={onClose}
      left={onBack ? <button className="nav-btn" onClick={onBack}>{t('Atrás', 'Back')}</button> : <button className="nav-btn" onClick={onClose}>{t('Cerrar', 'Close')}</button>}
      footer={doubtful && onFix ? (
        // Con datos que no cuadran, lo primero es corregirlos; añadir tal cual queda como segunda opción.
        <div className="stack-buttons">
          <button className="btn primary block" onClick={onFix}><PenLine size={18} /> {t('Corregir valores', 'Fix values')}</button>
          {saveButton(false, t('Añadir de todos modos', 'Add anyway'))}
        </div>
      ) : saveButton(true, onDelete ? t('Guardar', 'Save') : t('Añadir', 'Add'))}>
      <header className="ex-head row" style={{ alignItems: 'flex-start' }}>
        <span className="grow" style={{ minWidth: 0 }}>
          <h2 className="ex-title" style={{ fontSize: 24 }}>{food.name}</h2>
          {food.detail && <span className="muted">{food.detail}</span>}
        </span>
        {favorite && (
          <button className={`icon-btn fav-btn ${favorite.on ? 'on' : ''}`} onClick={favorite.toggle} aria-pressed={favorite.on}
            aria-label={favorite.on ? t('Quitar de favoritos', 'Remove from favourites') : t('Añadir a favoritos', 'Add to favourites')}>
            <Star size={20} fill={favorite.on ? 'currentColor' : 'none'} />
          </button>
        )}
      </header>
      {doubtful && (
        <p className="food-health doubt small" style={{ margin: 0 }}>
          <TriangleAlert size={16} />
          <span className="grow">
            {t(`Estos valores no cuadran: pone ${int(food.per100.kcal)} kcal por 100 g, pero su proteína, hidratos y grasa dan unas ${int(4 * food.per100.p + 4 * food.per100.c + 9 * food.per100.f)} kcal. Mira la etiqueta del envase.`,
              `These values do not add up: it says ${int(food.per100.kcal)} kcal per 100 g, but its protein, carbs and fat give about ${int(4 * food.per100.p + 4 * food.per100.c + 9 * food.per100.f)} kcal. Check the label on the pack.`)}
          </span>
        </p>
      )}
      {canPortion && (
        <Segmented value={mode} onChange={setMode} options={[
          { value: 'g', label: t('En gramos', 'In grams') },
          { value: 'portion', label: t(`En raciones (${portionLabel(portion!.label)})`, `In servings (${portionLabel(portion!.label)})`) },
        ]} />
      )}
      <div className="list-row card-row amount-row">
        <label className="grow bold" htmlFor="food-grams">{mode === 'portion' ? t('Raciones', 'Servings') : t('Cantidad', 'Amount')}</label>
        <button className="icon-btn" onClick={() => nudge(-1)} disabled={!valid || typed <= step} aria-label={mode === 'portion' ? t('Media ración menos', 'Half a serving less') : t(`Quitar ${step} g`, `Remove ${step} g`)}><Minus size={17} /></button>
        <input id="food-grams" className="field" inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} aria-label={mode === 'portion' ? t('Número de raciones', 'Number of servings') : t('Cantidad en gramos', 'Amount in grams')} style={{ width: 80, textAlign: 'right' }} />
        <span className="muted" style={{ minWidth: 14 }}>{mode === 'portion' ? '×' : 'g'}</span>
        <button className="icon-btn" onClick={() => nudge(1)} aria-label={mode === 'portion' ? t('Media ración más', 'Half a serving more') : t(`Añadir ${step} g`, `Add ${step} g`)}><Plus size={17} /></button>
      </div>
      {mode === 'portion' && valid && <span className="small muted" style={{ marginTop: -6 }}>{t(`${g(grams)} g en total`, `${g(grams)} g in total`)}</span>}
      {portion && mode === 'g' && (
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
      <SugarSalt per100={food.per100} grams={valid ? grams : 0} drink={!!portion && /lata|vaso|botell|brik|caña|copa|taza|tercio/i.test(portion.label)} />
      {after && before && goals && (
        <div className={`after-bars ${doubtful ? 'unsure' : ''}`} aria-label={onDelete ? t('Con este cambio, hoy', 'With this change, today') : t('Tras añadirlo, hoy', 'After adding it, today')}>
          <span className="tiny muted">{doubtful ? t('Si lo añades así (datos dudosos)', 'If you add it as is (doubtful values)') : onDelete ? t('Con este cambio, hoy', 'With this change, today') : t('Tras añadirlo, hoy', 'After adding it, today')}</span>
          {!proteinOnly && <AfterBar label="kcal" before={before.kcal} after={after.kcal} goal={goals.kcal} format={int} />}
          <AfterBar label={t('Proteína', 'Protein')} before={before.p} after={after.p} goal={goals.protein} format={(x) => `${g(x)} g`} />
          {/* Hidratos y grasa en una línea, siempre, con lo que suma este alimento. Ámbar si se pasan; con datos dudosos, se dice. */}
          {!proteinOnly && (
            <span className="small muted after-rest">
              {([['c', t('Hidratos', 'Carbs'), goals.carbs], ['f', t('Grasa', 'Fat'), goals.fat]] as const).map(([key, label, goal]) => {
                const total = before[key] + v[key]
                const unsure = doubtful && suspect === key
                return (
                  <span key={key} style={{ display: 'block' }}>
                    <span className={!unsure && total > goal ? 'warn' : ''}>{nb(`${label} +${g(v[key])} → ${g(total)} / ${int(goal)} g`)}</span>
                    {unsure && <span>{t(' (dato dudoso)', ' (doubtful value)')}</span>}
                  </span>
                )
              })}
            </span>
          )}
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
        <span className="small bold">{label} <span className="after-delta">{after >= before ? '+' : '−'}{format(Math.abs(after - before))}</span></span>
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
  const proteinOnly = useData().settings.nutrition?.proteinOnly === true
  const [name, setName] = useState(initialName ?? '')
  const [values, setValues] = useState({ kcal: fmt(initial?.kcal), p: fmt(initial?.p), c: fmt(initial?.c), f: fmt(initial?.f) })
  const num = (x: string) => (x.trim() === '' ? 0 : parseDecimal(x))
  const parsed = { kcal: num(values.kcal), p: num(values.p), c: num(values.c), f: num(values.f) }
  // En «solo proteína» lo obligatorio es la proteína (las calorías no se ven); si no, las calorías.
  const ok = parsed.kcal !== null && parsed.kcal >= 0 && parsed.kcal <= 5000 && [parsed.p, parsed.c, parsed.f].every((x) => x !== null && x >= 0 && x <= 500)
    && (proteinOnly ? parsed.p! > 0 : parsed.kcal > 0)
  const field = (key: keyof typeof values, label: string, unit: string) => (
    <label className="list-row">
      <span className="grow">{label}</span>
      <input inputMode="decimal" placeholder="—" style={{ textAlign: 'right', width: 88, fontSize: 17 }} value={values[key]} onChange={(e) => setValues({ ...values, [key]: e.target.value })} aria-label={label} />
      <span className="muted" style={{ width: 32 }}>{unit}</span>
    </label>
  )
  // Referencias redondas y orientativas (un plato de restaurante varía mucho): mejor que dejarlo sin apuntar.
  const examples = [
    { name: t('Pizza entera', 'Whole pizza'), kcal: 900, p: 35, c: 110, f: 35 },
    { name: t('Menú del día', 'Set lunch menu'), kcal: 1100, p: 45, c: 120, f: 45 },
    { name: t('Hamburguesa con patatas', 'Burger and fries'), kcal: 1000, p: 40, c: 100, f: 48 },
    { name: t('Bocadillo', 'Sandwich (baguette)'), kcal: 500, p: 22, c: 60, f: 17 },
  ]
  return (
    <Sheet title={t('Apuntar a mano', 'Log by hand')} onClose={onClose}
      left={onBack ? <button className="nav-btn" onClick={onBack}>{t('Atrás', 'Back')}</button> : <button className="nav-btn" onClick={onClose}>{t('Cerrar', 'Close')}</button>}
      footer={<button className="btn primary block" disabled={!ok} onClick={() => onSave(name.trim().slice(0, 120) || t(`${mealLabel(meal)} (a mano)`, `${mealLabel(meal)} (manual)`), { kcal: parsed.kcal!, p: parsed.p!, c: parsed.c!, f: parsed.f! })}>{onDelete ? t('Guardar', 'Save') : t('Añadir', 'Add')}</button>}>
      <p className="small muted" style={{ margin: 0 }}>{proteinOnly
        ? t('Para un plato que no está en la lista (por ejemplo, comiendo fuera): escribe la proteína que lleva, aproximada.', 'For a dish that is not in the list (for example, eating out): type roughly how much protein it has.')
        : t('Para un plato que no está en la lista (por ejemplo, comiendo fuera): escribe el total. Solo las calorías son obligatorias.', 'For a dish that is not in the list (for example, eating out): type the total. Only calories are required.')}</p>
      <div className="list">
        <label className="list-row"><input className="grow" style={{ fontSize: 17 }} value={name} placeholder={t('Qué era (opcional)', 'What it was (optional)')} onChange={(e) => setName(e.target.value)} /></label>
      </div>
      <div className="list">
        {proteinOnly ? field('p', t('Proteína', 'Protein'), 'g') : (
          <>
            {field('kcal', t('Calorías', 'Calories'), 'kcal')}
            {field('p', t('Proteína', 'Protein'), 'g')}
            {field('c', t('Hidratos', 'Carbs'), 'g')}
            {field('f', t('Grasa', 'Fat'), 'g')}
          </>
        )}
      </div>
      {!onDelete && (
        <>
          <div className="list-header">{t('Si no sabes cuánto es (aproximado)', "If you don't know (approximate)")}</div>
          <div className="list">
            {examples.map((x) => (
              <button key={x.name} className="list-row" aria-pressed={values.kcal === String(x.kcal) && values.p === String(x.p)}
                onClick={() => { setValues({ kcal: String(x.kcal), p: String(x.p), c: String(x.c), f: String(x.f) }); if (!name.trim() || name === initialName) setName(x.name) }}>
                <span className="grow">
                  <span style={{ display: 'block' }}>{x.name}</span>
                  <span className="small muted">≈ {(proteinOnly ? [`${x.p} g prot.`] : [`${int(x.kcal)} kcal`, `${x.p} g prot.`, `${x.c} g hidr.`, `${x.f} g grasa`]).map(nb).join(' · ')}</span>
                </span>
                {values.kcal === String(x.kcal) && values.p === String(x.p) && <span className="check">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
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
      extra={<MealPicker value={meal} onChange={setMeal} />} />
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
    const known = data.nutrition.foods.find((f) => f.barcode && barcodeVariants(code).includes(f.barcode))
    if (known) return onFound(known)
    setState({ kind: 'looking', code })
    // Primero la base de datos de la AESAN (productos vendidos en España; funciona sin conexión una vez cargada).
    const shop = await findAesan(code).catch(() => undefined)
    if (shop) return onFound({ id: uid(), name: shop.name, ...(shop.brand ? { brand: shop.brand } : {}), barcode: shop.barcode, per100: shop.per100, ...(shop.portion ? { portion: shop.portion } : {}), source: 'aesan' })
    abort.current = new AbortController()
    let product: ScannedProduct | undefined | 'offline'
    try {
      product = await fetchOffProduct(code, abort.current.signal)
    } catch {
      return
    }
    if (product === 'offline') return setState({ kind: 'error', code, message: t('No hay conexión para consultar el producto. Inténtalo de nuevo o créalo a mano.', 'No connection to look up the product. Try again or create it yourself.') })
    if (!product) return onMissing(code)
    // Se guarda en «Mis alimentos» al añadirlo (así puedes corregirlo antes si no cuadra).
    onFound({ id: uid(), name: product.name, brand: product.brand, barcode: code, per100: product.per100, portion: product.portion, source: 'off' })
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
      {state.kind === 'looking' && <p className="small" style={{ margin: 0, textAlign: 'center' }}>{t(`Buscando el producto ${state.code}…`, `Looking up product ${state.code}…`)}</p>}
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

/** Comida guardada: nombre, cantidades y alimentos (se quitan aquí; para añadir, guárdala de nuevo desde el día). */
function SavedMealSheet({ meal, onBack, onClose, onAdd }: { meal: SavedMeal; onBack: () => void; onClose: () => void; onAdd: () => void }) {
  const [name, setName] = useState(meal.name)
  const [items, setItems] = useState(meal.items.map((i) => ({ ...i, text: editable(i.grams) })))
  const clean = items.map(({ text, ...i }) => ({ ...i, grams: parseDecimal(text) ?? 0 })).filter((i) => i.grams > 0 && i.grams <= 5000)
  const changed = name.trim() !== meal.name || JSON.stringify(clean) !== JSON.stringify(meal.items)
  const ok = name.trim() && clean.length > 0
  const v = dayTotals(clean)
  const save = () => update((d) => {
    const m = d.nutrition.meals.find((x) => x.id === meal.id)
    if (m) { m.name = name.trim().slice(0, 80); m.items = clean }
  })
  const remove = () => {
    onBack()
    withUndo(t(`Comida «${meal.name}» borrada`, `Meal "${meal.name}" deleted`), () => update((d) => { d.nutrition.meals = d.nutrition.meals.filter((x) => x.id !== meal.id) }))
  }
  return (
    <Sheet title={t('Comida guardada', 'Saved meal')} onClose={onClose}
      left={<button className="nav-btn" onClick={() => { if (changed && ok) save(); onBack() }}>{t('Atrás', 'Back')}</button>}
      footer={<button className="btn primary block" disabled={!ok} onClick={() => { if (changed) save(); onAdd() }}><Plus size={18} /> {t('Añadirla', 'Add it')}</button>}>
      <div className="list">
        <label className="list-row"><input className="grow" style={{ fontSize: 17 }} value={name} onChange={(e) => setName(e.target.value)} aria-label={t('Nombre de la comida', 'Meal name')} /></label>
      </div>
      <div className="list">
        {items.map((i, n) => (
          <div key={n} className="list-row">
            <span className="grow clamp-2" style={{ minWidth: 0 }}>{i.name}</span>
            <input inputMode="decimal" value={i.text} style={{ textAlign: 'right', width: 64, fontSize: 17 }} aria-label={t(`Gramos de ${i.name}`, `Grams of ${i.name}`)}
              onChange={(e) => setItems(items.map((x, m) => (m === n ? { ...x, text: e.target.value } : x)))} />
            <span className="muted">g</span>
            <button className="icon-btn proposal-remove" onClick={() => setItems(items.filter((_, m) => m !== n))} aria-label={t(`Quitar ${i.name}`, `Remove ${i.name}`)}><X size={16} /></button>
          </div>
        ))}
      </div>
      <span className="small muted">{[`${int(v.kcal)} kcal`, `${g(v.p)} g prot.`, `${g(v.c)} g ${t('hidratos', 'carbs')}`, `${g(v.f)} g ${t('grasa', 'fat')}`].map(nb).join(' · ')}</span>
      {changed && ok && <button className="btn secondary" onClick={save}><Check size={17} /> {t('Guardar cambios', 'Save changes')}</button>}
      <button className="nav-btn" style={{ color: 'var(--red-text)', alignSelf: 'flex-start' }} onClick={remove}><Trash2 size={16} /> {t('Borrar esta comida', 'Delete this meal')}</button>
    </Sheet>
  )
}

/** Receta: ingredientes con sus gramos y en cuántas raciones sale. Se guarda en «Mis alimentos». */
function RecipeSheet({ initial, initialName, onBack, onClose, onSaved }: { initial?: MyFood; initialName?: string; onBack: () => void; onClose: () => void; onSaved: (f: MyFood) => void }) {
  const data = useData()
  const [name, setName] = useState(initial?.name ?? initialName ?? '')
  const [items, setItems] = useState<(RecipeItem & { text: string })[]>(() => (initial?.recipe?.items ?? []).map((i) => ({ ...i, text: editable(i.grams) })))
  const [servings, setServings] = useState(initial?.recipe?.servings ?? 2)
  const [cooked, setCooked] = useState(initial?.recipe?.cookedG ? editable(initial.recipe.cookedG) : '')
  const [query, setQuery] = useState('')
  const [basic, setBasic] = useState<BasicFood[]>()
  useEffect(() => { loadBasicFoods().then(setBasic, () => {}) }, [])
  const q = query.trim()
  const found: Pickable[] = q.length < 2 ? [] : [
    ...data.nutrition.foods.filter((f) => f.id !== initial?.id && matches(`${f.name} ${f.brand ?? ''}`, q)).map(fromMine),
    ...(basic ?? []).filter((f) => matches(`${f.es} ${f.en}`, q)).map(fromBasic),
  ].slice(0, 8)
  const recipe: Recipe = {
    items: items.map(({ text, ...i }) => ({ ...i, grams: parseDecimal(text) ?? 0 })).filter((i) => i.grams > 0 && i.grams <= 5000),
    servings,
    ...(parseDecimal(cooked) ? { cookedG: parseDecimal(cooked)! } : {}),
  }
  const values = recipeValues(recipe)
  const serving = amountOf(values.per100, values.portionG)
  const ok = name.trim() && recipe.items.length > 0 && values.weight > 0
  const add = (f: Pickable) => {
    const grams = f.portions[0]?.g ?? 100
    setItems([...items, { name: f.name, grams, per100: f.per100, ...(f.ref ? { ref: f.ref } : {}), text: editable(grams) }])
    setQuery('')
  }
  const save = () => {
    if (!ok) return
    const food: MyFood = {
      id: initial?.id ?? uid(), name: name.trim().slice(0, 120), source: 'mine', per100: values.per100,
      portion: { label: t('1 ración', '1 serving'), g: values.portionG }, recipe,
    }
    update((d) => {
      const i = d.nutrition.foods.findIndex((x) => x.id === food.id)
      if (i >= 0) d.nutrition.foods[i] = food
      else d.nutrition.foods.push(food)
    })
    onSaved(food)
  }
  return (
    <Sheet title={initial ? t('Receta', 'Recipe') : t('Nueva receta', 'New recipe')} onClose={onClose}
      left={<button className="nav-btn" onClick={onBack}>{t('Atrás', 'Back')}</button>} right={initial && <ShareFoodButton food={initial} />}
      footer={<button className="btn primary block" disabled={!ok} onClick={save}>{t('Guardar receta', 'Save recipe')}</button>}>
      <div className="list">
        <label className="list-row"><input className="grow" style={{ fontSize: 17 }} value={name} placeholder={t('Nombre (p. ej. «Lentejas de mi madre»)', 'Name (e.g. "Mum\'s lentils")')} onChange={(e) => setName(e.target.value)} aria-label={t('Nombre de la receta', 'Recipe name')} /></label>
      </div>
      <div className="list-header">{t('Ingredientes, tal como los pesas', 'Ingredients, as you weigh them')}</div>
      <div className="list">
        {items.map((i, n) => (
          <div key={n} className="list-row">
            <span className="grow clamp-2" style={{ minWidth: 0 }}>{i.name}</span>
            <input inputMode="decimal" value={i.text} style={{ textAlign: 'right', width: 64, fontSize: 17 }} aria-label={t(`Gramos de ${i.name}`, `Grams of ${i.name}`)}
              onChange={(e) => setItems(items.map((x, m) => (m === n ? { ...x, text: e.target.value } : x)))} />
            <span className="muted">g</span>
            <button className="icon-btn proposal-remove" onClick={() => setItems(items.filter((_, m) => m !== n))} aria-label={t(`Quitar ${i.name}`, `Remove ${i.name}`)}><X size={16} /></button>
          </div>
        ))}
        <label className="list-row">
          <Search size={18} aria-hidden="true" />
          <input className="grow" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Añadir ingrediente', 'Add ingredient')} aria-label={t('Buscar ingrediente', 'Search ingredient')} />
        </label>
        {found.map((f, n) => (
          <button key={`${f.ref?.id ?? f.name}-${n}`} className="list-row" onClick={() => add(f)}>
            <Plus size={18} aria-hidden="true" />
            <span className="grow" style={{ minWidth: 0 }}><span className="clamp-1" style={{ display: 'block' }}>{f.name}</span><span className="small muted">{nb(`${int(f.per100.kcal)} kcal / 100 g`)}</span></span>
          </button>
        ))}
        {q.length >= 2 && !found.length && <div className="list-row small muted">{t('Sin resultados. Si es un producto, créalo antes en «Crear alimento».', 'No results. For a packaged product, create it first with "Create food".')}</div>}
      </div>
      <div className="list">
        <div className="list-row">
          <span className="grow">{t('Raciones', 'Servings')}</span>
          <button className="icon-btn" disabled={servings <= 1} onClick={() => setServings(servings - 1)} aria-label={t('Una ración menos', 'One serving fewer')}><Minus size={17} /></button>
          <strong style={{ minWidth: 24, textAlign: 'center' }}>{servings}</strong>
          <button className="icon-btn" disabled={servings >= 50} onClick={() => setServings(servings + 1)} aria-label={t('Una ración más', 'One serving more')}><Plus size={17} /></button>
        </div>
        <label className="list-row">
          <span className="grow">{t('Peso del plato hecho', 'Cooked dish weight')}<span className="small muted" style={{ display: 'block' }}>{t('Opcional: pésalo en la olla para ajustar el agua', 'Optional: weigh the pot to account for water')}</span></span>
          <input inputMode="decimal" value={cooked} placeholder={editable(Math.round(recipe.items.reduce((n, i) => n + i.grams, 0)))} style={{ textAlign: 'right', width: 72, fontSize: 17 }} onChange={(e) => setCooked(e.target.value)} aria-label={t('Peso del plato hecho en gramos', 'Cooked weight in grams')} />
          <span className="muted">g</span>
        </label>
      </div>
      {recipe.items.length > 0 && (
        <>
          <div className="list-header">{t(`Una ración · ${g(values.portionG)} g`, `One serving · ${g(values.portionG)} g`)}</div>
          <div className="stat-band food-band">
            <div><strong>{int(serving.kcal)}</strong><span>kcal</span></div>
            <div><strong>{g(serving.p)}</strong><span>{t('Proteína g', 'Protein g')}</span></div>
            <div><strong>{g(serving.c)}</strong><span>{t('Hidratos g', 'Carbs g')}</span></div>
            <div><strong>{g(serving.f)}</strong><span>{t('Grasa g', 'Fat g')}</span></div>
          </div>
        </>
      )}
    </Sheet>
  )
}

/** Crear un alimento propio o, con `initial`, corregir los valores de uno (p. ej. de Open Food Facts). */
function MyFoodSheet({ barcode: newBarcode, initialName, initial, onBack, onClose, onSaved }: {
  barcode?: string
  initialName?: string
  initial?: MyFood
  onBack: () => void
  onClose: () => void
  onSaved: (f: MyFood) => void
}) {
  const barcode = initial?.barcode ?? newBarcode
  const fmt = (v?: number) => (v === undefined ? '' : editable(v))
  // Foto de la etiqueta: rellena lo que lea y se revisa con la comprobación de abajo.
  const [reading, setReading] = useState<{ state: 'busy'; progress: number } | { state: 'done'; found: number } | { state: 'error' }>()
  const photo = useRef<HTMLInputElement>(null)
  const readLabel = async (file: File) => {
    setReading({ state: 'busy', progress: 0 })
    try {
      const { readNutritionLabel } = await import('../lib/labelOcr')
      const found = await readNutritionLabel(file, (progress) => setReading({ state: 'busy', progress }))
      const keys = (['kcal', 'p', 'c', 'f'] as const).filter((k) => found[k] !== undefined)
      setValues((v) => ({ ...v, ...Object.fromEntries(keys.map((k) => [k, editable(found[k]!)])), ...(found.portion && !v.portion ? { portion: editable(found.portion) } : {}) }))
      setReading(keys.length ? { state: 'done', found: keys.length } : { state: 'error' })
    } catch {
      setReading({ state: 'error' })
    }
  }
  const [name, setName] = useState(initial?.name ?? initialName ?? '')
  const [values, setValues] = useState({ kcal: fmt(initial?.per100.kcal), p: fmt(initial?.per100.p), c: fmt(initial?.per100.c), f: fmt(initial?.per100.f), portion: fmt(initial?.portion?.g) })
  const parsed = { kcal: parseDecimal(values.kcal), p: parseDecimal(values.p), c: parseDecimal(values.c), f: parseDecimal(values.f) }
  const valid = parsed.kcal !== null && parsed.kcal >= 0 && parsed.kcal <= 1000 && [parsed.p, parsed.c, parsed.f].every((x) => x !== null && x >= 0 && x <= 100)
  const ok = name.trim() && valid
  const portion = parseDecimal(values.portion)
  const save = () => {
    if (!ok) return
    const food: MyFood = {
      id: initial?.id ?? uid(), name: name.trim().slice(0, 120), source: 'mine',
      ...(initial?.brand ? { brand: initial.brand } : {}),
      per100: { kcal: parsed.kcal!, p: parsed.p!, c: parsed.c!, f: parsed.f! },
      ...(barcode ? { barcode } : {}),
      ...(portion && portion > 0 && portion <= 5000 ? { portion: { label: initial?.portion?.g === portion ? initial.portion.label : t('1 ración', '1 serving'), g: portion } } : {}),
    }
    update((d) => {
      // Corregido: sustituye al guardado (mismo id o mismo código) o se guarda ahora.
      const i = d.nutrition.foods.findIndex((x) => x.id === food.id || (barcode && x.barcode === barcode))
      if (i >= 0) d.nutrition.foods[i] = food
      else d.nutrition.foods.push(food)
    })
    onSaved(food)
  }
  // Si no cuadra, el campo más sospechoso: el macro que más kcal aporta si sobran, o las kcal si faltan.
  const check = valid ? { kcal: parsed.kcal!, p: parsed.p!, c: parsed.c!, f: parsed.f! } : undefined
  const calc = check ? 4 * check.p + 4 * check.c + 9 * check.f : 0
  const suspect: keyof typeof values | undefined = check ? suspectValue(check) : undefined
  const labels = { kcal: t('las calorías', 'the calories'), p: t('la proteína', 'the protein'), c: t('los hidratos', 'the carbs'), f: t('la grasa', 'the fat'), portion: '' }
  const field = (key: keyof typeof values, label: string, unit: string) => (
    <label className={`list-row ${suspect === key ? 'suspect' : ''}`}>
      <span className="grow">{label}</span>
      <input inputMode="decimal" placeholder={key === 'portion' ? '—' : '0'} style={{ textAlign: 'right', width: 88, fontSize: 17 }} value={values[key]} onChange={(e) => setValues({ ...values, [key]: e.target.value })} aria-label={label} aria-invalid={suspect === key || undefined} />
      <span className="muted" style={{ width: 28 }}>{unit}</span>
    </label>
  )
  return (
    <Sheet title={initial ? t('Corregir valores', 'Fix values') : t('Nuevo alimento', 'New food')} onClose={onClose}
      left={<button className="nav-btn" onClick={onBack}>{t('Atrás', 'Back')}</button>} right={initial && <ShareFoodButton food={initial} />}
      footer={<button className="btn primary block" disabled={!ok} onClick={save}>{t('Guardar', 'Save')}</button>}>
      {initial && <p className="small muted" style={{ margin: 0 }}>{t('Copia los valores por 100 g de la etiqueta. Se guarda en «Mis alimentos» con lo que escribas.', 'Copy the per 100 g values from the label. It is saved in "My foods" with what you type.')}</p>}
      {barcode && !initial && <p className="small muted" style={{ margin: 0 }}>{t(`El código ${barcode} no está en Open Food Facts. Copia los valores de la etiqueta y lo tendrás guardado para la próxima vez.`, `Code ${barcode} is not on Open Food Facts. Copy the values from the label and it will be saved for next time.`)}</p>}
      <input ref={photo} type="file" accept="image/*" capture="environment" hidden
        onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void readLabel(file) }} />
      <button className="list-row card-row" disabled={reading?.state === 'busy'} onClick={() => photo.current?.click()}>
        <Camera size={20} />
        <span className="grow" style={{ textAlign: 'left' }}>
          <span className="bold" style={{ display: 'block' }}>
            {reading?.state === 'busy' ? t(`Leyendo la etiqueta… ${Math.round(reading.progress * 100)} %`, `Reading the label… ${Math.round(reading.progress * 100)}%`) : t('Leer la etiqueta con una foto', 'Read the label from a photo')}
          </span>
          <span className="small muted">
            {reading?.state === 'done'
              ? t(`Leídos ${reading.found} de 4 valores. Revísalos con el envase delante.`, `Read ${reading.found} of 4 values. Check them against the pack.`)
              : reading?.state === 'error'
                ? t('No he podido leer la tabla. Prueba con más luz, la tabla recta y de cerca, o escríbelo a mano.', 'Could not read the table. Try with more light, the table straight and close up, or type it in.')
                : t('Haz la foto a la tabla nutricional. Se lee en el móvil: la foto no se envía a ningún sitio.', 'Photograph the nutrition table. It is read on the phone: the photo is not sent anywhere.')}
          </span>
        </span>
      </button>
      <div className="list">
        <label className="list-row"><input className="grow" style={{ fontSize: 17 }} value={name} placeholder={t('Nombre (p. ej. «Mi batido»)', 'Name (e.g. "My shake")')} onChange={(e) => setName(e.target.value)} /></label>
      </div>
      <div className="list-header">{t('Por 100 g (lo pone la etiqueta)', 'Per 100 g (on the label)')}</div>
      <div className="list">
        {field('kcal', t('Calorías', 'Calories'), 'kcal')}
        {field('p', t('Proteína', 'Protein'), 'g')}
        {field('c', t('Hidratos', 'Carbs'), 'g')}
        {field('f', t('Grasa', 'Fat'), 'g')}
      </div>
      {/* Comprobación al escribir: las kcal frente a las que dan sus macros (lo mismo que el aviso). */}
      {check && (suspect
        ? <p className="food-health doubt small" style={{ margin: 0 }}><TriangleAlert size={16} aria-hidden="true" /> <span>{t(`Con estos valores salen unas ${int(calc)} kcal, no ${int(check.kcal)}. Compara las cuatro cifras con la etiqueta; la que más se aleja parece ${labels[suspect]}.`, `These values give about ${int(calc)} kcal, not ${int(check.kcal)}. Compare all four numbers with the label; the one furthest off seems to be ${labels[suspect]}.`)}</span></p>
        : <p className="small muted" style={{ margin: 0 }}>{t(`Cuadra: sus macros dan unas ${int(calc)} kcal.`, `Adds up: its macros give about ${int(calc)} kcal.`)}</p>)}
      <div className="list">{field('portion', t('Una ración pesa', 'One serving weighs'), 'g')}</div>
    </Sheet>
  )
}

// MARK: Objetivo

export function GoalsSheet({ onClose }: { onClose: () => void }) {
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
  const [perKg, setPerKg] = useState(saved?.proteinPerKg)
  const [carry, setCarry] = useState(data.settings.nutritionCarryOver !== false)
  const [split, setSplit] = useState(data.settings.nutritionTrainingSplit !== false)
  const [burned, setBurned] = useState(data.settings.nutritionBurned === true)
  const [remind, setRemind] = useState(data.settings.foodReminders === true)
  const perKgValue = perKg ?? defaultProteinPerKg(aim)
  const [own, setOwn] = useState({ kcal: saved ? String(saved.kcal) : '', protein: saved ? String(saved.protein) : '', carbs: saved ? String(saved.carbs) : '', fat: saved ? String(saved.fat) : '' })

  const a = parseDecimal(age), h = parseDecimal(height), w = parseDecimal(weightText)
  const ready = a !== null && a >= 14 && a <= 100 && h !== null && h >= 120 && h <= 230 && w !== null && w >= 30 && w <= 300
  const computed = ready ? computeGoals({ sex, age: a!, heightCm: h!, weightKg: w!, activity, aim, ...(perKg ? { proteinPerKg: perKg } : {}) }) : undefined
  const ownGoals = (() => {
    const kcal = parseDecimal(own.kcal), protein = parseDecimal(own.protein), carbs = parseDecimal(own.carbs), fat = parseDecimal(own.fat)
    return kcal && kcal >= 800 && kcal <= 8000 && [protein, carbs, fat].every((x) => x !== null && x >= 0 && x <= 1000)
      ? { kcal, protein: protein!, carbs: carbs!, fat: fat! } : undefined
  })()
  // El ajuste según el peso se mantiene al recalcular (se puede quitar).
  const [keepAdjust, setKeepAdjust] = useState(true)
  const adjust = saved?.adjust && keepAdjust ? saved.adjust : 0
  const result = manual ? ownGoals : computed && adjust ? adjustGoals(computed, adjust) : computed
  const save = () => {
    if (!result) return
    updateSettings({ nutrition: { ...result, ...(proteinOnly ? { proteinOnly: true } : {}) }, nutritionCarryOver: carry, nutritionTrainingSplit: split, nutritionBurned: (split && burned) || undefined, foodReminders: remind || undefined })
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
      <Segmented value={manual ? 'own' : 'calc'} onChange={(v) => setManual(v === 'own')}
        options={[{ value: 'calc', label: t('Calcularlo', 'Work it out') }, { value: 'own', label: t('Escribirlo yo', 'Set my own') }]} />
      {manual ? (
        <div className="list">
          {numberRow(t('Calorías', 'Calories'), own.kcal, (v) => setOwn({ ...own, kcal: v }), 'kcal')}
          {numberRow(t('Proteína', 'Protein'), own.protein, (v) => setOwn({ ...own, protein: v }), 'g')}
          {numberRow(t('Hidratos', 'Carbs'), own.carbs, (v) => setOwn({ ...own, carbs: v }), 'g')}
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
          <div className="list-header">{t('Proteína por kilo de peso', 'Protein per kg of body weight')}</div>
          <Segmented value={String(perKgValue)} onChange={(v) => setPerKg(Number(v))}
            options={PROTEIN_PER_KG.map((x) => ({ value: String(x), label: `${editable(x)} g` }))} />
        </>
      )}
      {!manual && !!saved?.adjust && (
        <div className="list-row card-row">
          <span className="grow small">{keepAdjust
            ? t(`Incluye ${saved.adjust > 0 ? '+' : '−'}${int(Math.abs(saved.adjust))} kcal del ajuste según tu peso.`, `Includes ${saved.adjust > 0 ? '+' : '−'}${int(Math.abs(saved.adjust))} kcal from the weight adjustment.`)
            : t('Sin el ajuste según tu peso.', 'Without the weight adjustment.')}</span>
          <button className="nav-btn small" onClick={() => setKeepAdjust(!keepAdjust)}>{keepAdjust ? t('Quitarlo', 'Remove it') : t('Mantenerlo', 'Keep it')}</button>
        </div>
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
          {aim === 'gain'
            ? t('Para ganar músculo: si en 2-3 semanas no subes de peso, añade 100-200 kcal.', 'To build muscle: if your weight has not gone up after 2-3 weeks, add 100-200 kcal.')
            : aim === 'lose'
              ? t('Para perder grasa: si en 2-3 semanas no bajas de peso, quita 100-200 kcal.', 'To lose fat: if your weight has not gone down after 2-3 weeks, remove 100-200 kcal.')
              : t('Para mantener: si en 2-3 semanas tu peso cambia más de 1 kg, ajusta 100-200 kcal.', 'To maintain: if your weight changes by more than 1 kg in 2-3 weeks, adjust by 100-200 kcal.')}
          <br />
          {aim === 'lose'
            ? t(`Proteína: ${editable(perKgValue)} g por kilo; al perder grasa ayuda a no perder músculo.`, `Protein: ${editable(perKgValue)} g per kg; when losing fat it helps keep muscle.`)
            : t(`Proteína: ${editable(perKgValue)} g por kilo (con 1,6 g basta a la mayoría).`, `Protein: ${editable(perKgValue)} g per kg (1.6 g is enough for most people).`)}
        </p>
      )}
      {!manual && <p className="tiny muted" style={{ margin: 0 }}>{t('Calorías estimadas con la fórmula de Mifflin-St Jeor.', 'Calories estimated with the Mifflin-St Jeor formula.')}</p>}
      <div className="list-header">{t('Opciones', 'Options')}</div>
      <label className="list-row card-row">
        <span className="grow">
          <span className="bold" style={{ display: 'block' }}>{t('Ver solo la proteína', 'Show protein only')}</span>
          <span className="small muted">{t('Oculta las calorías y el resto: para comer bien sin contar.', 'Hides calories and the rest: eat well without counting.')}</span>
        </span>
        <input type="checkbox" className="toggle" checked={proteinOnly} onChange={(e) => setProteinOnly(e.target.checked)} />
      </label>
      {!proteinOnly && (
        <label className="list-row card-row">
          <span className="grow">
            <span className="bold" style={{ display: 'block' }}>{t('Compensar al día siguiente', 'Make up for it the next day')}</span>
            <span className="small muted">{t(`Si un día te pasas de calorías, al siguiente se resta lo que te pasaste (como mucho un ${CARRY_OVER_MAX * 100} % del objetivo, para no comer demasiado poco).`, `If you go over your calories one day, the excess comes off the next day (at most ${CARRY_OVER_MAX * 100}% of the goal, so you don't eat too little).`)}</span>
          </span>
          <input type="checkbox" className="toggle" checked={carry} onChange={(e) => setCarry(e.target.checked)} />
        </label>
      )}
      {!proteinOnly && (() => {
        const perWeek = data.settings.weeklyGoal
        const { up, down } = trainingShift(result?.kcal ?? saved?.kcal ?? 2500, perWeek)
        return (
          <>
          <label className="list-row card-row">
            <span className="grow">
              <span className="bold" style={{ display: 'block' }}>{t('Más calorías los días de entreno', 'More calories on training days')}</span>
              <span className="small muted">{t(`Entrenando ${perWeek} días a la semana: +${up} kcal los días que entrenas y −${down} los de descanso, en hidratos. A la semana comes lo mismo.`, `Training ${perWeek} days a week: +${up} kcal on training days and −${down} on rest days, as carbs. Your weekly total stays the same.`)}</span>
            </span>
            <input type="checkbox" className="toggle" checked={split} onChange={(e) => setSplit(e.target.checked)} />
          </label>
          {split && (
            <div className="card" style={{ gap: 8 }}>
              <Segmented value={burned ? 'burned' : 'fixed'} onChange={(v) => setBurned(v === 'burned')}
                options={[{ value: 'fixed', label: t('Cantidad fija', 'Fixed amount') }, { value: 'burned', label: t('Lo que gastas', 'What you burn') }]} />
              <span className="small muted">{burned
                ? t('Los días que entrenas se suman las calorías estimadas de ese entreno (con tu peso y lo que duró); los de descanso, tu objetivo de siempre.', 'On training days the estimated calories of that workout are added (from your weight and how long it lasted); on rest days, your usual goal.')
                : t('Siempre lo mismo, y a la semana comes igual: más los días de entreno y algo menos los de descanso.', 'Always the same, and your weekly total does not change: more on training days, a bit less on rest days.')}</span>
            </div>
          )}
          </>
        )
      })()}
      <label className="list-row card-row">
        <span className="grow">
          <span className="bold" style={{ display: 'block' }}>{t('Recordarme apuntar las comidas', 'Remind me to log meals')}</span>
          <span className="small muted">{t(`Si a las ${activeMeals().map(reminderTime).join(', ')} no has apuntado esa comida, te lo recuerda en la app, y con una notificación si la tienes abierta en segundo plano. Con la app cerrada no puede avisar.`,
            `If by ${activeMeals().map(reminderTime).join(', ')} you have not logged that meal, the app reminds you, with a notification if it is open in the background. It cannot remind you when closed.`)}</span>
        </span>
        <input type="checkbox" className="toggle" checked={remind} onChange={(e) => {
          setRemind(e.target.checked)
          if (e.target.checked && typeof Notification !== 'undefined' && Notification.permission === 'default') void Notification.requestPermission()
        }} />
      </label>
    </Sheet>
  )
}
