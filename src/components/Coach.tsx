import { BadgeCheck, Feather, Minus, Plus, Repeat, X } from 'lucide-react'
import { useMemo } from 'react'
import { applyTip, coachTips, hideTip, type CoachTip } from '../lib/coach'
import { startOfWeek } from '../lib/format'
import { t } from '../lib/i18n'
import { MAIN_GROUPS } from '../lib/labels'
import { finishedSessions, update, useData } from '../lib/store'
import { Card, useCatalog, useToast } from './ui'

const groupName = (g: number) => t(...MAIN_GROUPS[g][0]).toLowerCase()

function tipText(tip: CoachTip): { title: string; detail: string; action: string } {
  switch (tip.kind) {
    case 'easyWeek':
      return {
        title: t('Toca una semana más suave', 'Time for an easier week'),
        detail: tip.tired
          ? t('Tus últimos entrenos llegabas cansado. Una semana con menos series y un 10 % menos de peso te deja volver con más fuerza.', 'You arrived tired at your last workouts. A week with fewer sets and 10% less weight lets you come back stronger.')
          : t(`${tip.stalled} ejercicios llevan semanas sin mejorar. Una semana con menos series y un 10 % menos de peso suele desatascarlos.`, `${tip.stalled} exercises have not improved for weeks. A week with fewer sets and 10% less weight usually gets them moving.`),
        action: t('Hacerla esta semana', 'Do it this week'),
      }
    case 'swap':
      return {
        title: t(`Cambia ${tip.name}`, `Swap ${tip.name}`),
        detail: t(`No mejora desde hace varias sesiones. Prueba unas semanas con ${tip.alt.name}: trabaja lo mismo con otro estímulo.`, `It has not improved for several sessions. Try ${tip.alt.name} for a few weeks: same muscles, a new stimulus.`),
        action: t(`Cambiar por ${tip.alt.name}`, `Swap for ${tip.alt.name}`),
      }
    case 'moreSets':
      return {
        title: t(`Poco volumen de ${groupName(tip.group)}`, `Low ${groupName(tip.group)} volume`),
        detail: t(`Tu programa le da unas ${tip.planned} series a la semana; para tu objetivo conviene al menos ${tip.min}.`, `Your program gives it about ${tip.planned} sets a week; for your goal aim for at least ${tip.min}.`),
        action: t(`Una serie más en ${tip.exerciseName}`, `One more set of ${tip.exerciseName}`),
      }
    case 'addExercise':
      return {
        title: t(`Tu programa no trabaja ${groupName(tip.group)}`, `Your program skips ${groupName(tip.group)}`),
        detail: t(`Ningún ejercicio lo trabaja. Añadir uno equilibra el cuerpo y evita descompensaciones.`, `No exercise works it. Adding one keeps your body balanced.`),
        action: t(`Añadir ${tip.exercise.name} a ${tip.routineName}`, `Add ${tip.exercise.name} to ${tip.routineName}`),
      }
    case 'fewerSets':
      return {
        title: t(`Mucho volumen de ${groupName(tip.group)}`, `High ${groupName(tip.group)} volume`),
        detail: t(`Unas ${tip.planned} series a la semana; más de ${tip.max} suele cansar sin dar más resultado.`, `About ${tip.planned} sets a week; more than ${tip.max} tends to tire you without extra results.`),
        action: t(`Una serie menos en ${tip.exerciseName}`, `One set less of ${tip.exerciseName}`),
      }
  }
}

const ICONS = { easyWeek: Feather, swap: Repeat, moreSets: Plus, addExercise: Plus, fewerSets: Minus }

/** El entrenador de la semana en Inicio: pocos consejos, cada uno con un botón que lo aplica. */
export function CoachCard() {
  const data = useData()
  const catalog = useCatalog()
  const sessions = useMemo(() => finishedSessions(data), [data])
  const tips = useMemo(() => coachTips({ routines: data.routines, sessions, settings: data.settings, catalog }), [data.routines, sessions, data.settings, catalog])
  const [toast, showToast] = useToast()
  const easy = data.settings.easyWeek === startOfWeek(Date.now()).getTime()
  if (!tips.length && !easy) return toast
  return (
    <Card title={t('Tu entrenador', 'Your coach')} icon={BadgeCheck}>
      {easy && (
        <div className="coach-tip">
          <Feather size={18} className="coach-icon" aria-hidden="true" />
          <span className="grow">
            <span className="bold" style={{ display: 'block' }}>{t('Semana suave en marcha', 'Easy week on')}</span>
            <span className="small muted">{t('Tus rutinas empiezan con menos series y un 10 % menos de peso hasta el domingo.', 'Your routines start with fewer sets and 10% less weight until Sunday.')}</span>
          </span>
          <button className="link-btn small" onClick={() => update((d) => { d.settings.easyWeek = undefined })}>{t('Quitar', 'Undo')}</button>
        </div>
      )}
      {tips.map((tip) => {
        const text = tipText(tip)
        const Icon = ICONS[tip.kind]
        return (
          <div key={tip.id} className="coach-tip">
            <Icon size={18} className="coach-icon" aria-hidden="true" />
            <span className="grow">
              <span className="bold" style={{ display: 'block' }}>{text.title}</span>
              <span className="small muted">{text.detail}</span>
              <button className="btn secondary btn-sm coach-action" onClick={() => {
                update((d) => applyTip(d, tip))
                showToast(t('Hecho: ya está en tus rutinas', 'Done: it is in your routines'))
              }}>{text.action}</button>
            </span>
            <button className="icon-btn coach-hide" aria-label={t('Ahora no', 'Not now')} onClick={() => update((d) => hideTip(d, tip.id))}><X size={16} /></button>
          </div>
        )
      })}
      {toast}
    </Card>
  )
}
