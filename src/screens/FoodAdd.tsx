import { Barcode, Star, Camera, ChefHat, ChevronRight, Globe, Minus, PenLine, Plus, RotateCcw, Search, Trash2, TriangleAlert, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Segmented, Sheet } from '../components/ui'
import { editable, int, parseDecimal, uid } from '../lib/format'
import { dataLang, t } from '../lib/i18n'
import { amountOf, favoriteKey, stem, doubtfulValues, portionLabel, suspectValue, dayTotals, entryTotals, fold, loadBasicFoods, matches, mealLabel, quickEntryAmount, recentFoods, searchOff, AESAN_SOURCE, loadAesan, searchAesan, type AesanProduct, type BasicFood, type FoodEntry, type MealKey, type MyFood, type NutritionGoals, type Per100, type Portion, type ScannedProduct } from '../lib/nutrition'
import { update, useData, withUndo } from '../lib/store'
import { MealPicker, SugarSalt, fromBasic, fromMine, g, nb, type Pickable } from './FoodParts'
import { ScanSheet } from './FoodScan'
import { MyFoodSheet, RecipeSheet, SavedMealSheet } from './FoodMine'

// Comidas · añadir: buscar un alimento y elegir la cantidad. El escáner está en FoodScan.tsx; recetas y
// mis alimentos, en FoodMine.tsx.

type View = { kind: 'list' } | { kind: 'amount'; food: Pickable } | { kind: 'scan' } | { kind: 'create'; barcode?: string; name?: string } | { kind: 'quick'; name?: string } | { kind: 'fix'; food: MyFood }
  | { kind: 'recipe'; initial?: MyFood; name?: string }

export function AddFoodSheet({ day, meal: initialMeal, goals, onClose, onAdded }: { day: string; meal: MealKey; goals?: NutritionGoals; onClose: () => void; onAdded: (text: string) => void }) {
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
    return <ScanSheet onBack={() => setView({ kind: 'list' })} onClose={onClose} meal={meal}
      onFound={(f) => setView({ kind: 'amount', food: fromMine(f) })}
      onMissing={(barcode) => setView({ kind: 'create', barcode })}
      onBatch={(list, log) => {
        // Varios seguidos: se guardan en «Mis alimentos» y, si se pide, se apuntan con su ración (o 100 g).
        update((d) => {
          for (const f of list) {
            if (!d.nutrition.foods.some((x) => x.id === f.id || (f.barcode && x.barcode === f.barcode))) d.nutrition.foods.push(f)
            if (log) d.nutrition.entries.push({ id: uid(), day, meal, name: f.name, grams: f.portion?.g ?? 100, per100: f.per100, ref: fromMine(f).ref, at: Date.now() })
          }
        })
        onAdded(log ? t(`Apuntados ${list.length} productos en ${mealLabel(meal).toLowerCase()}`, `Logged ${list.length} products to ${mealLabel(meal).toLowerCase()}`)
          : t(`${list.length} productos guardados en Mis alimentos`, `${list.length} products saved to My foods`))
        onClose()
      }} />
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
    const rank = (f: BasicFood) => (f.more ? 1 : 0) * 2 + (fold(dataLang() === 'en' ? f.en : f.es).startsWith(start) ? 0 : 1)
    // Con una sola letra, solo los habituales (la lista ampliada tiene 2.600 y sale demasiado).
    return (basic ?? []).filter((f) => (q.length > 1 || !f.more) && matches(`${f.es} ${f.en}`, q)).map((f, i) => ({ f, i, r: rank(f) })).sort((a, b) => a.r - b.r || a.i - b.i).map((x) => x.f)
  })()
  const basics = q ? basicsAll.slice(0, basicMax) : basicsAll
  const offResults = off && off.query === q && Array.isArray(off.state) ? off.state : undefined
  const amountText = (per100: Per100, grams: number) => {
    const v = amountOf(per100, grams)
    return (proteinOnly ? [`${g(grams)} g`, `${g(v.p)} ${t('g prot.', 'g prot.')}`] : [`${g(grams)} g`, `${int(v.kcal)} kcal`, `${g(v.p)} ${t('g prot.', 'g prot.')}`]).map(nb).join(' · ')
  }
  /** Un apunte a mano: sus totales, sin inventar la proteína si no se escribió. */
  const quickText = (v: Per100) => [t('A mano', 'By hand'), ...(proteinOnly ? [] : [nb(`${int(v.kcal)} kcal`)]), ...(v.p > 0 || proteinOnly ? [nb(`${g(v.p)} ${t('g prot.', 'g prot.')}`)] : [])].join(' · ')
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
                    <span className="small muted">{[t(`${m.items.length} alimentos`, `${m.items.length} foods`), ...(proteinOnly ? [] : [`${int(v.kcal)} kcal`]), `${g(v.p)} ${t('g prot.', 'g prot.')}`].map(nb).join(' · ')}</span>
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
                  <span className="small muted">≈ {(proteinOnly ? [`${x.p} ${t('g prot.', 'g prot.')}`] : [`${int(x.kcal)} kcal`, `${x.p} ${t('g prot.', 'g prot.')}`, `${x.c} ${t('g hidr.', 'g carbs')}`, `${x.f} ${t('g grasa', 'g fat')}`]).map(nb).join(' · ')}</span>
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

export function EntrySheet({ entry, day, goals, onClose }: { entry: FoodEntry; day: FoodEntry[]; goals?: NutritionGoals; onClose: () => void }) {
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
