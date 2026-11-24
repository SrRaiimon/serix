import { GoalsSheet } from './FoodGoals'
import { weekDone } from '../lib/schedule'
import { Bell, CalendarDays, Star, Check, ChevronLeft, ChevronRight, Ellipsis, Shuffle, Sparkles, Plus, RotateCcw, Target, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ActionSheet, Card, LargeTitle, Sheet, useToast } from '../components/ui'
import { day as longDay, editable, int, uid } from '../lib/format'
import { locale, t } from '../lib/i18n'
import { dayText, dayFiber, dayOptional, SALT_MAX, weekdayOf, weekTemplate, FIBER_GOAL, waterGoal, dayGoalOptions, dayKey, goalsForDay, weightAdvice, type DayGoalOptions, dayTotals, entryTotals, fromDayKey, loadBasicFoods, ALL_MEALS, activeMeals, mealLabel, planFor, shiftDay, type BasicFood, type FoodEntry, type MealKey, type NutritionGoals, type DayPlan, type Per100 } from '../lib/nutrition'
import { update, useData, withUndo } from '../lib/store'
import { dueMeals, takePendingAdd } from '../lib/foodReminders'
import { useRoute } from '../lib/router'
import { buildDishes, fitDish, makePlan, mealTargets, pickDish, planMeals, rateDish, rateRemoved, usualFoods, type Dish } from '../lib/mealPlan'
import { g, nb } from './FoodParts'
import { AddFoodSheet, EntrySheet } from './FoodAdd'
import { FastCard, HabitsSheet, MealsSheet, MonthSheet, ShoppingSheet, SupplementsCard, WaterCard, WeightAdviceCard } from './FoodCards'

// Comidas (ver lib/nutrition.ts): lo comido cada día frente a tu objetivo, por comidas.

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
  // También con las medidas (el gasto del entreno va con tu peso) y el día de hoy (pasada la medianoche cambia).
  const goalOpts = useMemo(() => dayGoalOptions(data), [data.sessions, data.nutrition.trainingDays, data.settings, data.measurements, today])
  const target = baseGoals && goalsForDay(baseGoals, data.nutrition.entries, day, goalOpts)
  const advice = useMemo(() => {
    if (!baseGoals || day !== today || (data.settings.nutritionAdviceAt ?? 0) > Date.now() - 14 * 86400000) return undefined
    return weightAdvice(data.measurements, baseGoals, data.nutrition.entries, Date.now(), data.settings.nutritionAdviceAt ?? 0)
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
  const pending = planMeals().filter((m) => plan?.meals[m] && !entries.some((e) => e.meal === m))
  const targets = target ? mealTargets(target, entries, pending) : {}
  const proposals = Object.fromEntries(pending.map((m) => {
    const slot = plan!.meals[m]!
    const dish = dishes.find((x) => x.id === slot.dish)
    return [m, dish && targets[m] ? { dish, items: fitDish(dish, targets[m]!, slot.removed) } : undefined]
  })) as Partial<Record<MealKey, { dish: Dish; items: ReturnType<typeof fitDish> }>>
  const [shopping, setShopping] = useState(false)
  const [weekShopping, setWeekShopping] = useState(false)
  const [mealsSheet, setMealsSheet] = useState(false)
  const [habits, setHabits] = useState(false)
  const [weekMenu, setWeekMenu] = useState(false)
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
    const open = planMeals().filter((m) => !entries.some((e) => e.meal === m))
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
      {target ? <DaySummary totals={totals} entries={entries} goals={target} base={baseGoals!} day={day} canMark={!!goalOpts.training && canPlan && !data.sessions.some((x) => dayKey(x.start) === day)} /> : (
        <Card title={t('Calcula tu objetivo', 'Work out your goal')}>
          <span className="small muted">{t('Con tu peso, altura, edad y actividad te decimos cuántas calorías y cuánta proteína te tocan al día para tu objetivo.', 'With your weight, height, age and activity we tell you how many calories and how much protein you need a day for your goal.')}</span>
          {/* Secundario: lo que se viene a hacer aquí es apuntar comida («Añadir» en cada comida); el objetivo es opcional. */}
          <button className="btn secondary" onClick={() => setGoals(true)}><Target size={18} /> {t('Calcular objetivo (opcional)', 'Work out goal (optional)')}</button>
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
              <span className="small muted">{[t(`${typical.length} alimentos`, `${typical.length} foods`), ...(proteinOnly ? [] : [`${int(v.kcal)} kcal`]), `${g(v.p)} ${t('g prot.', 'g prot.')}`].map(nb).join(' · ')}</span>
            </span>
          </button>
        )
      })()}
      {day <= today && <WaterCard day={day} goal={waterGoal(baseGoals?.sex)} />}
      {day === today && data.settings.fasting && <FastCard />}
      {day <= today && !!data.settings.supplements?.length && <SupplementsCard day={day} onEdit={() => setHabits(true)} />}

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
              {items.length > 0 && <span className="meal-total">{proteinOnly ? nb(`${g(sums.p)} ${t('g prot.', 'g prot.')}`) : nb(`${int(sums.kcal)} kcal`)}</span>}
              <button className="meal-more" onClick={() => setMealMenu(meal)} aria-label={t(`Opciones de ${mealLabel(meal)}`, `${mealLabel(meal)} options`)}><Ellipsis size={20} /></button>
            </div>
            <div className="list">
              {items.map((e) => {
                const v = entryTotals(e)
                return (
                  <button key={e.id} className="list-row" onClick={() => setEditing(e)}>
                    <span className="grow" style={{ minWidth: 0 }}>
                      <span className="bold clamp-2" style={{ display: 'block', fontSize: 15 }}>{e.name}</span>
                      <span className="small muted">{[...(e.ref?.kind === 'quick' ? [t('A mano', 'By hand')] : [nb(`${g(e.grams)} g`)]), ...(proteinOnly || (e.ref?.kind === 'quick' && !v.p) ? [] : [nb(`${g(v.p)} ${t('g prot.', 'g prot.')}`)])].join(' · ')}</span>
                    </span>
                    {proteinOnly ? <strong className="food-kcal">{g(v.p)}<small> {t('g prot.', 'g prot.')}</small></strong> : <strong className="food-kcal">{int(v.kcal)}<small> kcal</small></strong>}
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
                        ...(proteinOnly ? [] : [`${int(yesterdaySums.kcal)} kcal`]), `${g(yesterdaySums.p)} ${t('g prot.', 'g prot.')}`].map(nb).join(' · ')}
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
          ...(baseGoals && dishes.length ? [{ label: t('Menú de la semana', 'Menu for the week'), onSelect: () => setWeekMenu(true) }] : []),
          { label: t('Lista de la compra de la semana', 'Shopping list for the week'), onSelect: () => setWeekShopping(true) },
          { label: t('Elegir y renombrar las comidas', 'Choose and rename meals'), onSelect: () => setMealsSheet(true) },
          { label: t('Suplementos y ayuno', 'Supplements and fasting'), onSelect: () => setHabits(true) },
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
      {habits && <HabitsSheet onClose={() => setHabits(false)} />}
      {weekMenu && baseGoals && <WeekMenuSheet dishes={dishes} goals={baseGoals} opts={goalOpts} onClose={() => setWeekMenu(false)} onCopied={() => showToast(t('Lista copiada', 'List copied'))} />}
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
function DaySummary({ totals, entries, goals, base, day, canMark }: { totals: Per100; entries: FoodEntry[]; goals: NutritionGoals & { carried?: number; training?: boolean; shift?: number }; base: NutritionGoals; day: string; canMark: boolean }) {
  // Hoy sin entreno: con la semana ya cumplida es un día de descanso, no un entreno que falta (ver weekDone).
  const data = useData()
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
            {/* Respecto a qué: el objetivo de un día normal (el que pusiste), no solo «−200». */}
            <span className="muted">{goals.training
              // Con «Lo que gastas», un entreno corto puede quedar por debajo de tu gasto medio: «+-200» no tenía sentido.
              ? Math.abs(goals.shift ?? 0) < 30
                ? t(`Día de entreno: sin cambio sobre tus ${int(base.kcal)} kcal`, `Training day: no change from your ${int(base.kcal)} kcal`)
                : (goals.shift ?? 0) >= 0
                ? t(`Día de entreno: +${int(goals.shift ?? 0)} kcal sobre tus ${int(base.kcal)}`, `Training day: +${int(goals.shift ?? 0)} kcal over your ${int(base.kcal)}`)
                : t(`Día de entreno: −${int(-(goals.shift ?? 0))} kcal de tus ${int(base.kcal)}`, `Training day: −${int(-(goals.shift ?? 0))} kcal from your ${int(base.kcal)}`)
              : day === dayKey()
                ? (weekDone(data)
                  ? t(`Hoy, día de descanso: −${int(-(goals.shift ?? 0))} kcal de tus ${int(base.kcal)}`, `Today, rest day: −${int(-(goals.shift ?? 0))} kcal from your ${int(base.kcal)}`)
                  // Rutinas puede decir «te toca hoy»: aquí se explica que cuenta como descanso hasta entrenar o marcarlo.
                  : t(`Sin entreno aún hoy: −${int(-(goals.shift ?? 0))} kcal de tus ${int(base.kcal)}. Si vas a entrenar, márcalo.`, `No workout yet today: −${int(-(goals.shift ?? 0))} kcal from your ${int(base.kcal)}. If you are training, mark it.`))
                : t(`Día de descanso: −${int(-(goals.shift ?? 0))} kcal de tus ${int(base.kcal)}`, `Rest day: −${int(-(goals.shift ?? 0))} kcal from your ${int(base.kcal)}`)}</span>
            {canMark && <button className="btn secondary btn-sm" onClick={() => mark(!goals.training)}>{day === dayKey()
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
        {/* Sin nada apuntado, «Te quedan 2340 kcal» repetía la cifra de arriba (y la proteína ya sale en su columna). */}
        {totals.kcal === 0 ? null : <>
          {left >= 0 ? t(`Te quedan ${int(left)} kcal`, `${int(left)} kcal left`) : t(`${int(-left)} kcal de más`, `${int(-left)} kcal over`)}
          {goals.protein > totals.p ? t(` y ${g(goals.protein - totals.p)} g de proteína`, ` and ${g(goals.protein - totals.p)} g of protein`) : t(' · proteína cumplida', ' · protein reached')}
        </>}
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
            <span className={salt.g > SALT_MAX ? 'over' : ''}><span className="muted">{t('Sal', 'Salt')}</span> <strong>{editable(Math.round(salt.g * 10) / 10)}</strong><span className="muted"> / {SALT_MAX} g {t('máx.', 'max')}</span></span>
            {missing > 0 && <span className="tiny muted day-extras-note">{t(`Sin contar los alimentos sin el dato (${missing}). Los azúcares incluyen los de la fruta y la leche.`, `Not counting foods without the data (${missing}). Sugars include those in fruit and milk.`)}</span>}
            {missing === 0 && <span className="tiny muted day-extras-note">{t('Los azúcares incluyen los de la fruta y la leche.', 'Sugars include those in fruit and milk.')}</span>}
          </div>
        )
      })()}
    </div>
  )
}

/**
 * Menú de los próximos 7 días (con el objetivo de cada día: entreno o descanso), para organizar la
 * semana o cocinar en tuppers el domingo, con la lista de la compra de todo. Otro toque, otro menú.
 */
function WeekMenuSheet({ dishes, goals, opts, onClose, onCopied }: { dishes: Dish[]; goals: NutritionGoals; opts: DayGoalOptions; onClose: () => void; onCopied: () => void }) {
  const data = useData()
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31))
  const [shopping, setShopping] = useState(false)
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const day = shiftDay(dayKey(), i)
    const target = goalsForDay(goals, data.nutrition.entries, day, opts)
    const targets = mealTargets(target, [], planMeals())
    const plan = makePlan(dishes, data.nutrition, day, seed + i, targets)
    const meals = planMeals().flatMap((m) => {
      const dish = dishes.find((x) => x.id === plan.meals[m]?.dish)
      return dish && targets[m] ? [{ meal: m, dish, items: fitDish(dish, targets[m]!) }] : []
    })
    return { day, target, meals }
  }), [dishes, goals, opts, seed, data.nutrition])
  if (shopping) {
    return <ShoppingSheet title={t('Compra para la semana', 'Shopping for the week')} items={days.flatMap((d) => d.meals.flatMap((m) => m.items))}
      note={t('Cantidades del menú de los 7 días. El peso es el del alimento tal como se llama: «cocido» o «hecho», ya cocinado; «crudo», sin cocinar.', 'Amounts for the 7-day menu. Weights match the food name: "cooked" means after cooking, "raw" before.')}
      onClose={() => setShopping(false)} onCopied={onCopied} />
  }
  return (
    <Sheet title={t('Menú de la semana', 'Menu for the week')} onClose={onClose} right={<button className="nav-btn" onClick={onClose}>{t('Cerrar', 'Close')}</button>}
      footer={<div className="row" style={{ gap: 8 }}>
        <button className="btn secondary grow" onClick={() => setSeed(seed + 7)}><Shuffle size={17} /> {t('Otro menú', 'Another menu')}</button>
        <button className="btn primary grow" onClick={() => setShopping(true)}>{t('Lista de la compra', 'Shopping list')}</button>
      </div>}>
      <span className="small muted">{t('Con tu objetivo de cada día. Aprende de lo que apuntas, como el menú del día; para apuntarlo, usa «Proponme el menú» cada día.', 'Based on your goal for each day. It learns from what you log, like the daily menu; to log it, use "Suggest a menu" each day.')}</span>
      {days.map((d) => (
        <Card key={d.day} title={`${longDay(fromDayKey(d.day))}${d.target.training ? t(' · entreno', ' · training') : ''}`}>
          {d.meals.map((m) => (
            <div key={m.meal} className="row between small" style={{ gap: 8, alignItems: 'flex-start' }}>
              <span className="muted" style={{ width: 82, flexShrink: 0 }}>{mealLabel(m.meal)}</span>
              <span className="grow">{m.items.map((i) => `${i.name} ${g(i.grams)} g`).join(', ')}</span>
            </div>
          ))}
          <span className="tiny muted">{`${int(d.meals.reduce((n, m) => n + m.items.reduce((k, i) => k + (i.per100.kcal * i.grams) / 100, 0), 0))} kcal · ${t('objetivo', 'goal')} ${int(d.target.kcal)}`}</span>
        </Card>
      ))}
    </Sheet>
  )
}

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
        <strong className="food-kcal">{proteinOnly ? <>{g(v.p)}<small> {t('g prot.', 'g prot.')}</small></> : <>{int(v.kcal)}<small> kcal</small></>}</strong>
      </div>
      <ul className="proposal-items">
        {items.map((i) => (
          <li key={i.key}>
            <span className="grow" style={{ minWidth: 0 }}>{i.name} <span className="muted">{nb(`${g(i.grams)} g`)}</span></span>
            <button className="icon-btn proposal-remove" onClick={() => remove(i.key)} aria-label={t(`Quitar ${i.name}`, `Remove ${i.name}`)}><X size={16} /></button>
          </li>
        ))}
      </ul>
      {!proteinOnly && <span className="small muted">{[`${g(v.p)} ${t('g prot.', 'g prot.')}`, `${g(v.c)} g ${t('hidratos', 'carbs')}`, `${g(v.f)} g ${t('grasa', 'fat')}`].map(nb).join(' · ')}</span>}
      <div className="proposal-actions">
        <button className="btn primary btn-sm" onClick={accept}><Check size={17} /> {t('Apuntar', 'Log it')}</button>
        <button className="btn secondary btn-sm" onClick={other}><Shuffle size={16} /> {t('Otra opción', 'Another option')}</button>
      </div>
    </div>
  )
}
