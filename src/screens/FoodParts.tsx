import { Share2 } from 'lucide-react'
import { useState } from 'react'
import { Segmented } from '../components/ui'
import { editable, int } from '../lib/format'
import { dataLang, t } from '../lib/i18n'
import { traffic, ALL_MEALS, activeMeals, fold, mealLabel, optionals, shownGrams, type BasicFood, type FoodRef, type MealKey, type MyFood, type Per100, type Portion } from '../lib/nutrition'
import { encodeFood, foodLink } from '../lib/foodShare'
import { shareLink } from '../lib/share'

// Piezas de Comidas que usan tanto la pantalla del día (Food.tsx) como las hojas de añadir (FoodAdd.tsx).

export const g = (v: number) => (v >= 10 ? int(v) : editable(shownGrams(v)))

/** Une cifra y unidad con espacios que no se parten al cambiar de línea («11 g prot.»). */
export const nb = (text: string) => text.replace(/ /g, '\u00a0')

/** Azúcares y sal de la cantidad elegida, con su semáforo por 100 g (bajo, medio o alto). */
export function SugarSalt({ per100, grams, drink }: { per100: Per100; grams: number; drink: boolean }) {
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

/** Lista de la compra del menú propuesto: cada alimento una vez, con lo que suma en el día. */
/** Compartir un alimento propio o una receta con un enlace (lib/foodShare.ts). */
export function ShareFoodButton({ food }: { food: MyFood }) {
  const [copied, setCopied] = useState(false)
  const share = async () => {
    const link = foodLink(await encodeFood(food))
    const r = await shareLink(food.name, link, t(`${food.name}: guárdalo en tus alimentos de Serix`, `${food.name}: save it to your Serix foods`))
    if (r === 'copied') setCopied(true)
  }
  return <button className="nav-btn" onClick={() => void share()} aria-label={t(`Compartir ${food.name}`, `Share ${food.name}`)}>{copied ? t('Copiado', 'Copied') : <Share2 size={18} />}</button>
}

/** Comida a la que va un alimento: botones con 4 o menos, desplegable con más. */
export function MealPicker({ value, onChange }: { value: MealKey; onChange: (m: MealKey) => void }) {
  const list = activeMeals().includes(value) ? activeMeals() : ALL_MEALS.filter((m) => activeMeals().includes(m) || m === value)
  if (list.length <= 4) return <Segmented value={value} onChange={onChange} options={list.map((m) => ({ value: m, label: mealLabel(m) }))} />
  return (
    <select className="field" value={value} onChange={(e) => onChange(e.target.value as MealKey)} aria-label={t('Comida', 'Meal')}>
      {list.map((m) => <option key={m} value={m}>{mealLabel(m)}</option>)}
    </select>
  )
}

/** Un alimento listo para elegir la cantidad. */
export interface Pickable {
  name: string
  detail?: string
  per100: Per100
  portions: Portion[]
  ref?: FoodRef
  grams?: number
  /** El alimento de «Mis alimentos» detrás (guardado o aún no: se guarda al añadirlo). */
  source?: MyFood
}

export const fromBasic = (f: BasicFood): Pickable => ({
  name: dataLang() === 'en' ? f.en : f.es,
  per100: { kcal: f.kcal, p: f.p, c: f.c, f: f.f, ...optionals(f) },
  portions: [{ label: `${dataLang() === 'en' ? f.portion.en : f.portion.es}`, g: f.portion.g }],
  ref: { kind: 'basic', id: f.id },
})

export const fromMine = (f: MyFood): Pickable => ({
  name: f.name,
  // La marca solo si añade algo (a veces coincide con el nombre del producto).
  detail: f.brand && !fold(f.name).includes(fold(f.brand)) ? f.brand : undefined,
  per100: f.per100,
  portions: f.portion ? [f.portion] : [],
  ref: f.source !== 'mine' && f.barcode ? { kind: 'off', id: f.barcode } : { kind: 'mine', id: f.id },
  source: f,
})
