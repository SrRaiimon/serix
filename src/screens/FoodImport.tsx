import { Utensils } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card, Empty, NavBar } from '../components/ui'
import { uid } from '../lib/format'
import { decodeFood } from '../lib/foodShare'
import { t } from '../lib/i18n'
import { recipeValues, type MyFood } from '../lib/nutrition'
import { navigate } from '../lib/router'
import { update } from '../lib/store'

/** Abrir un alimento o una receta que te han pasado por enlace y guardarlo en «Mis alimentos». */
export function FoodImportScreen({ code }: { code: string }) {
  const [food, setFood] = useState<MyFood | null>()
  useEffect(() => { decodeFood(code).then(setFood, () => setFood(null)) }, [code])
  if (food === undefined) return <><NavBar title={t('Alimento', 'Food')} /><div className="screen with-nav" /></>
  if (food === null) {
    return (
      <>
        <NavBar title={t('Alimento', 'Food')} />
        <div className="screen with-nav">
          <Empty icon={Utensils} title={t('Enlace no válido', 'Invalid link')} message={t('El enlace está incompleto o dañado. Pide que te lo vuelvan a mandar.', 'The link is incomplete or damaged. Ask for it to be sent again.')}
            action={<button className="btn primary" onClick={() => navigate('food')}>{t('Ir a Comidas', 'Go to Food')}</button>} />
        </div>
      </>
    )
  }
  const v = food.per100
  const recipe = food.recipe && recipeValues(food.recipe)
  const save = () => {
    update((d) => { d.nutrition.foods.push({ ...food, id: uid(), source: 'mine' }) })
    navigate('food')
  }
  return (
    <>
      <NavBar title={food.recipe ? t('Receta', 'Recipe') : t('Alimento', 'Food')} />
      <div className="screen with-nav">
        <h1 style={{ margin: 0 }}>{food.name}</h1>
        {food.brand && <span className="muted">{food.brand}</span>}
        <Card title={t('Por 100 g', 'Per 100 g')}>
          <span>{t(`${Math.round(v.kcal)} kcal · ${v.p} g proteína · ${v.c} g hidratos · ${v.f} g grasa`, `${Math.round(v.kcal)} kcal · ${v.p} g protein · ${v.c} g carbs · ${v.f} g fat`)}</span>
          {food.portion && <span className="small muted">{t(`Ración: ${food.portion.label || ''} ${food.portion.g} g`, `Portion: ${food.portion.label || ''} ${food.portion.g} g`)}</span>}
        </Card>
        {food.recipe && recipe && (
          <Card title={t(`Ingredientes (${food.recipe.servings} raciones)`, `Ingredients (${food.recipe.servings} servings)`)}>
            {food.recipe.items.map((i, n) => <span key={n} className="small">{i.name}: {i.grams} g</span>)}
            <span className="small muted">{t(`Total: ${Math.round(recipe.total.kcal)} kcal · ración de ${Math.round(recipe.portionG)} g`, `Total: ${Math.round(recipe.total.kcal)} kcal · ${Math.round(recipe.portionG)} g serving`)}</span>
          </Card>
        )}
        <button className="btn primary" onClick={save}>{t('Guardar en Mis alimentos', 'Save to My foods')}</button>
        <button className="btn plain" onClick={() => navigate('food')}>{t('Ahora no', 'Not now')}</button>
        <p className="small muted" style={{ margin: 0 }}>{t('Los valores los ha puesto quien te lo pasa: revísalos si algo no cuadra.', 'The values were entered by whoever sent it: check them if something looks off.')}</p>
      </div>
    </>
  )
}
