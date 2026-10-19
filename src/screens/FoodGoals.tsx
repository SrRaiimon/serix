import { HeartPulse } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Segmented, Sheet } from '../components/ui'
import { editable, fromKg, int, parseDecimal } from '../lib/format'
import { t } from '../lib/i18n'
import { ACTIVITY, adjustGoals, AIMS, CARRY_OVER_MAX, computeGoals, maintenanceKcal, proteinReference, trainingShift, defaultProteinPerKg, PROTEIN_PER_KG, activeMeals, type Aim, type Sex } from '../lib/nutrition'
import { updateSettings, useData } from '../lib/store'
import { reminderTime } from '../lib/foodReminders'

// Objetivo de calorías y macros (Comidas → Objetivo y la bienvenida): aparte de Food.tsx, que pasaba de 2000 líneas.

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
  // La proteína por kilo que sale de verdad (con su tope) y si no hay déficit posible al perder grasa.
  const reference = ready ? proteinReference(w!, h!) : 0
  const realPerKg = computed && reference ? Math.round((computed.protein / reference) * 10) / 10 : perKgValue
  const capped = !!computed && realPerKg < perKgValue - 0.05
  const maintenance = computed && maintenanceKcal(computed)
  const noDeficit = aim === 'lose' && !!computed && !!maintenance && computed.kcal >= maintenance - 50
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
          {/* Lo que sale de verdad (con el tope del 35 % de las calorías), no lo elegido: antes decía 2,2 y daba 1,9. */}
          {aim === 'lose'
            ? t(`Proteína: ${editable(realPerKg)} g por kilo; al perder grasa ayuda a no perder músculo.`, `Protein: ${editable(realPerKg)} g per kg; when losing fat it helps keep muscle.`)
            : t(`Proteína: ${editable(realPerKg)} g por kilo (con 1,6 g basta a la mayoría).`, `Protein: ${editable(realPerKg)} g per kg (1.6 g is enough for most people).`)}
          {capped && ` ${t('Con estas calorías no pasa del 35 % de ellas, para dejar sitio a los hidratos.', 'With these calories it stays at 35% of them, to leave room for carbs.')}`}
          {noDeficit && <><br /><strong>{t(`Con tus datos gastas unas ${int(maintenance!)} kcal: comer menos no es recomendable sin supervisión médica. Para perder grasa, mejor sumar actividad (caminar, entrenar).`, `With your details you burn about ${int(maintenance!)} kcal: eating less is not advisable without medical supervision. To lose fat, add activity instead (walking, training).`)}</strong></>}
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
