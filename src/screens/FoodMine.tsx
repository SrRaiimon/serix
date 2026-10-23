import { Camera, Check, Minus, Plus, Search, Trash2, TriangleAlert, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Sheet } from '../components/ui'
import { editable, int, parseDecimal, uid } from '../lib/format'
import { t } from '../lib/i18n'
import { amountOf, optionals, recipeValues, type Recipe, type RecipeItem, suspectValue, dayTotals, loadBasicFoods, matches, type BasicFood, type MyFood, type SavedMeal } from '../lib/nutrition'
import { update, useData, withUndo } from '../lib/store'
import { ShareFoodButton, g, nb, fromBasic, fromMine, type Pickable } from './FoodParts'

// Comidas · mis alimentos: comidas guardadas, recetas y alimentos propios.

/** Comida guardada: nombre, cantidades y alimentos (se quitan aquí; para añadir, guárdala de nuevo desde el día). */
export function SavedMealSheet({ meal, onBack, onClose, onAdd }: { meal: SavedMeal; onBack: () => void; onClose: () => void; onAdd: () => void }) {
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
      <span className="small muted">{[`${int(v.kcal)} kcal`, `${g(v.p)} ${t('g prot.', 'g prot.')}`, `${g(v.c)} g ${t('hidratos', 'carbs')}`, `${g(v.f)} g ${t('grasa', 'fat')}`].map(nb).join(' · ')}</span>
      {changed && ok && <button className="btn secondary" onClick={save}><Check size={17} /> {t('Guardar cambios', 'Save changes')}</button>}
      <button className="nav-btn" style={{ color: 'var(--red-text)', alignSelf: 'flex-start' }} onClick={remove}><Trash2 size={16} /> {t('Borrar esta comida', 'Delete this meal')}</button>
    </Sheet>
  )
}

/** Receta: ingredientes con sus gramos y en cuántas raciones sale. Se guarda en «Mis alimentos». */
export function RecipeSheet({ initial, initialName, onBack, onClose, onSaved }: { initial?: MyFood; initialName?: string; onBack: () => void; onClose: () => void; onSaved: (f: MyFood) => void }) {
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
  // El peso cocinado, con los mismos límites que la copia de seguridad (si no, la receta cambiaba al restaurarla).
  const cookedG = parseDecimal(cooked)
  const recipe: Recipe = {
    items: items.map(({ text, ...i }) => ({ ...i, grams: parseDecimal(text) ?? 0 })).filter((i) => i.grams > 0 && i.grams <= 5000),
    servings,
    ...(cookedG !== null && cookedG >= 1 && cookedG <= 50000 ? { cookedG } : {}),
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
export function MyFoodSheet({ barcode: newBarcode, initialName, initial, onBack, onClose, onSaved }: {
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
      // Fibra, azúcares y sal no se editan aquí: se conservan los que tuviera.
      per100: { kcal: parsed.kcal!, p: parsed.p!, c: parsed.c!, f: parsed.f!, ...optionals(initial?.per100 ?? {}) },
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
