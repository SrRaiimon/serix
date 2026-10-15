import { StatBand, Thumb } from './ui'
import { rest, uid } from '../lib/format'
import type { GeneratedProgram } from '../lib/generator'
import { t } from '../lib/i18n'
import { update } from '../lib/store'
import { defaultTracking, targetText } from '../lib/tracking'

// Piezas del programa generado que comparten Rutinas y el cuestionario inicial. Aparte de Routines.tsx para
// que la bienvenida no descargue la pantalla de Rutinas entera (con ejercicios, gráficas y compartir).

export function saveProgram(program: GeneratedProgram) {
  update((d) => {
    program.days.forEach((dayPlan, index) => {
      d.routines.push({
        id: uid(),
        name: dayPlan.name,
        notes: program.summary,
        programName: program.name,
        order: index,
        createdAt: Date.now(),
        exercises: dayPlan.exercises.map((g) => {
          const tracking = defaultTracking(g.exercise)
          return {
            exerciseId: g.exercise.id, name: g.exercise.name, muscle: g.exercise.muscle,
            sets: g.sets, repsMin: g.repsMin, repsMax: g.repsMax, rest: g.rest, tracking,
            ...(tracking === 'time' ? { targetSeconds: 60 } : {}),
            // Los programas generados suben el peso solos (doble progresión salvo que se indique otra).
            ...(tracking === 'weight_reps' ? { progression: g.progression ?? 'double' } : {}),
            ...(g.trainingMax ? { trainingMax: g.trainingMax, tmSince: Date.now() } : {}),
          }
        }),
      })
    })
    d.settings.activeProgram = program.name
  })
}

/** Sin gimnasio, si hay barra de dominadas en casa (si no, el programa usa remos en su lugar). */
export function PullupBarRow({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="list-row">
      <span className="grow">
        {t('Tengo barra de dominadas', 'I have a pull-up bar')}
        <span className="small muted" style={{ display: 'block' }}>{t('Si no, en vez de dominadas, remos', 'If not, rows instead of pull-ups')}</span>
      </span>
      <input type="checkbox" className="toggle" checked={value} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

export function ProgramPreview({ program }: { program: GeneratedProgram }) {
  // Las cifras del programa, como en el resto de la app: días, ejercicios y series por sesión y su duración
  // (la misma cuenta que routineMinutes: ~45 s por serie más su descanso y ~2,5 min por ejercicio).
  const perDay = program.days.map((d) => ({
    exercises: d.exercises.length,
    sets: d.exercises.reduce((n, g) => n + g.sets, 0),
    minutes: Math.round(d.exercises.reduce((n, g) => n + g.sets * (45 + g.rest) + 150, 0) / 60),
  }))
  const avg = (f: (x: (typeof perDay)[number]) => number) => Math.round(perDay.reduce((n, x) => n + f(x), 0) / Math.max(1, perDay.length))
  return (
    <>
      <section className="program-hero">
        <span className="hero-ribbon" aria-hidden="true" />
        <span className="small muted">{program.summary}</span>
        <strong className="program-hero-name">{program.name}</strong>
      </section>
      <StatBand items={[
        { value: program.days.length, label: t('días', 'days') },
        { value: avg((x) => x.exercises), label: t('ejercicios', 'exercises') },
        { value: avg((x) => x.sets), label: t('series', 'sets') },
        { value: `~${avg((x) => x.minutes)}′`, label: t('por sesión', 'per session') },
      ]} />
      {program.days.map((d, i) => (
        <div key={d.name} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 className="list-header program-day">
            <span className="program-day-num">{i + 1}</span>
            {d.name.replace(/^[^·]*·\s*/, '')}
            <span className="program-day-meta">{t(`${perDay[i].exercises} ejercicios · ~${perDay[i].minutes} min`, `${perDay[i].exercises} exercises · ~${perDay[i].minutes} min`)}</span>
          </h2>
          <div className="list">
            {d.exercises.map((g) => (
              <div key={g.exercise.id} className="list-row">
                <Thumb exerciseId={g.exercise.id} size={44} />
                <span className="grow">
                  <span className="bold clamp-2" style={{ fontSize: 15 }}>{g.exercise.name}</span>
                  <span className="small muted">{targetText({ ...g, tracking: defaultTracking(g.exercise), targetSeconds: 60 })} · {rest(g.rest)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
