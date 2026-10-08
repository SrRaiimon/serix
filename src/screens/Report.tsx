import { ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { NavBar } from '../components/ui'
import { bodyweightText } from '../lib/bodyweight'
import { day, duration, editable, fromKg, int, shortDay, tons, weight } from '../lib/format'
import { locale, t } from '../lib/i18n'
import { dayGoalOptions, dayStatus, dayTotals, goalsForDay } from '../lib/nutrition'
import { periodStats, records, sessionDuration, sessionVolume, streakWeeks } from '../lib/stats'
import { finishedSessions, useData } from '../lib/store'

// Informe de un mes en una página, para enseñarlo a un entrenador o nutricionista: se imprime o se
// guarda en PDF con la opción de imprimir del móvil (sin servicios de fuera). Ver «@media print».

export function ReportScreen() {
  const data = useData()
  const unit = data.settings.unit
  const [offset, setOffset] = useState(0)
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() + offset, 1).getTime()
  const to = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1).getTime()
  const monthText = new Date(from).toLocaleDateString(locale(), { month: 'long', year: 'numeric' })
  const month = monthText[0].toUpperCase() + monthText.slice(1)

  const r = useMemo(() => {
    const all = finishedSessions(data)
    const sessions = all.filter((s) => s.start >= from && s.start < to).sort((a, b) => a.start - b.start)
    const stats = periodStats(all, from, to)
    const before = new Map(records(all.filter((s) => s.start < from)).map((x) => [x.exerciseId, x.e1rm]))
    const beaten = records(all.filter((s) => s.start < to)).filter((x) => x.date >= from && x.e1rm > (before.get(x.exerciseId) ?? 0) + 0.01)
      .sort((a, b) => b.e1rm - a.e1rm).slice(0, 8)
    const weights = data.measurements.filter((m) => m.weight !== undefined && m.date >= from && m.date < to).sort((a, b) => a.date - b.date)
    const lastMeasure = [...data.measurements].filter((m) => m.date < to).sort((a, b) => b.date - a.date)[0]
    const goals = data.settings.nutrition
    const opts = dayGoalOptions(data)
    const days = new Map<string, typeof data.nutrition.entries>()
    for (const e of data.nutrition.entries) {
      const d = new Date(`${e.day}T12:00:00`).getTime()
      if (d >= from && d < to) days.set(e.day, [...(days.get(e.day) ?? []), e])
    }
    const totals = [...days.values()].map((list) => ({ day: list[0].day, v: dayTotals(list) }))
    const avg = (k: 'kcal' | 'p') => (totals.length ? totals.reduce((n, x) => n + x.v[k], 0) / totals.length : 0)
    const met = goals ? totals.filter((x) => dayStatus(x.v, goalsForDay(goals, data.nutrition.entries, x.day, opts)) === 'met').length : 0
    return { sessions, stats, beaten, weights, lastMeasure, food: { days: totals.length, kcal: avg('kcal'), p: avg('p'), met }, streak: streakWeeks(all.filter((s) => s.start < to), Math.min(to - 1, Date.now())) }
  }, [data, from, to])

  const w0 = r.weights[0]?.weight
  const w1 = r.weights.at(-1)?.weight
  return (
    <>
      <NavBar showBack title={t('Informe del mes', 'Monthly report')} />
      <div className="screen with-nav report">
        <div className="row between no-print">
          <button className="icon-btn" onClick={() => setOffset(offset - 1)} aria-label={t('Mes anterior', 'Previous month')}><ChevronLeft size={20} /></button>
          <strong>{month}</strong>
          <button className="icon-btn" disabled={offset >= 0} onClick={() => setOffset(offset + 1)} aria-label={t('Mes siguiente', 'Next month')}><ChevronRight size={20} /></button>
        </div>
        <button className="btn primary no-print" onClick={() => window.print()}><Printer size={18} /> {t('Imprimir o guardar en PDF', 'Print or save as PDF')}</button>
        <p className="small muted no-print" style={{ margin: 0 }}>{t('En el menú de imprimir, elige «Guardar como PDF» para mandarlo por correo o WhatsApp.', 'In the print menu, choose "Save as PDF" to send it by email or WhatsApp.')}</p>

        <article className="report-page">
          <header>
            <span className="report-brand">SERIX</span>
            <h1>{t(`Informe de ${monthText}`, `Report for ${month}`)}</h1>
            {data.settings.name && <span className="muted">{data.settings.name}</span>}
          </header>

          <section>
            <h2>{t('Entrenamiento', 'Training')}</h2>
            <div className="report-grid">
              <div><strong>{r.stats.sessions}</strong><span>{t('entrenos', 'workouts')}</span></div>
              <div><strong>{duration(r.stats.time)}</strong><span>{t('entrenando', 'training')}</span></div>
              <div><strong>{tons(r.stats.volume, unit)}</strong><span>{t('peso movido', 'weight moved')}</span></div>
              <div><strong>{r.stats.sets}</strong><span>{t('series', 'sets')}</span></div>
              <div><strong>{r.stats.records}</strong><span>{t('marcas superadas', 'personal bests')}</span></div>
              <div><strong>{r.streak}</strong><span>{t('semanas seguidas', 'weeks in a row')}</span></div>
            </div>
            {r.beaten.length > 0 && (
              <table>
                <thead><tr><th>{t('Mejores marcas del mes', 'Best lifts this month')}</th><th>{t('Serie', 'Set')}</th><th>{t('Máx. est.', 'Est. max')}</th></tr></thead>
                <tbody>{r.beaten.map((x) => (
                  <tr key={x.exerciseId}><td>{x.name}</td><td>{x.added === undefined ? weight(x.weight, unit) : bodyweightText(x.added, unit)} × {x.reps}</td><td>{int(fromKg(x.e1rm, unit))} {unit}</td></tr>
                ))}</tbody>
              </table>
            )}
            {r.sessions.length > 0 && (
              <table>
                <thead><tr><th>{t('Día', 'Day')}</th><th>{t('Entreno', 'Workout')}</th><th>{t('Duración', 'Duration')}</th><th>{t('Peso movido', 'Weight moved')}</th></tr></thead>
                <tbody>{r.sessions.map((s) => (
                  <tr key={s.id}><td>{shortDay(s.start)}</td><td>{s.name}</td><td>{duration(sessionDuration(s))}</td><td>{tons(sessionVolume(s), unit)}</td></tr>
                ))}</tbody>
              </table>
            )}
          </section>

          {(w0 !== undefined || r.lastMeasure) && (
            <section>
              <h2>{t('Cuerpo', 'Body')}</h2>
              {w0 !== undefined && w1 !== undefined && (
                <p>{r.weights.length > 1
                  ? t(`Peso: de ${weight(w0, unit)} a ${weight(w1, unit)} (${w1 - w0 >= 0 ? '+' : '−'}${weight(Math.abs(w1 - w0), unit)}), ${r.weights.length} pesadas.`, `Weight: from ${weight(w0, unit)} to ${weight(w1, unit)} (${w1 - w0 >= 0 ? '+' : '−'}${weight(Math.abs(w1 - w0), unit)}), ${r.weights.length} weigh-ins.`)
                  : t(`Peso: ${weight(w0, unit)}.`, `Weight: ${weight(w0, unit)}.`)}</p>
              )}
              {r.lastMeasure && (
                <p className="small">{t(`Última medida (${day(r.lastMeasure.date)}): `, `Last measurement (${day(r.lastMeasure.date)}): `)}
                  {[
                    w0 === undefined && r.lastMeasure.weight !== undefined && `${t('peso', 'weight')} ${weight(r.lastMeasure.weight, unit)}`,
                    r.lastMeasure.bodyFat !== undefined && `${t('grasa', 'body fat')} ${editable(r.lastMeasure.bodyFat)} %`,
                    r.lastMeasure.waist !== undefined && `${t('cintura', 'waist')} ${editable(r.lastMeasure.waist)} cm`,
                    r.lastMeasure.chest !== undefined && `${t('pecho', 'chest')} ${editable(r.lastMeasure.chest)} cm`,
                    r.lastMeasure.arm !== undefined && `${t('brazo', 'arm')} ${editable(r.lastMeasure.arm)} cm`,
                    r.lastMeasure.thigh !== undefined && `${t('muslo', 'thigh')} ${editable(r.lastMeasure.thigh)} cm`,
                  ].filter(Boolean).join(' · ') || '—'}
                </p>
              )}
            </section>
          )}

          {r.food.days > 0 && (
            <section>
              <h2>{t('Comida', 'Food')}</h2>
              <p>
                {t(`${r.food.days} días apuntados · media de ${int(r.food.kcal)} kcal y ${int(r.food.p)} g de proteína.`, `${r.food.days} days logged · average ${int(r.food.kcal)} kcal and ${int(r.food.p)} g of protein.`)}
                {data.settings.nutrition && ` ${t(`${r.food.met} días dentro de tu objetivo (${int(data.settings.nutrition.kcal)} kcal, ${int(data.settings.nutrition.protein)} g de proteína).`, `${r.food.met} days on target (${int(data.settings.nutrition.kcal)} kcal, ${int(data.settings.nutrition.protein)} g protein).`)}`}
              </p>
            </section>
          )}

          <footer className="small muted">{t(`Generado con Serix el ${day(Date.now()).toLowerCase()}. Cifras orientativas.`, `Made with Serix on ${day(Date.now())}. Approximate figures.`)}</footer>
        </article>
      </div>
    </>
  )
}
