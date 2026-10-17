import { HeartPulse, Flame, Check, Minimize2, Timer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Overlay, useScrollLock, useTick } from '../components/ui'
import { clock, fromKg, increment, toKg, weight, type Unit } from '../lib/format'
import { t } from '../lib/i18n'
import { type Session, type SetEntry } from '../lib/store'
import { addRest, dismissRestDone, setRestBig, stopRest, useRestTimer } from '../lib/timer'
import { isSetFilled, trackingOf } from '../lib/tracking'
import { editSession } from '../lib/workout'
import { lighten, readinessLevel, type Readiness } from '../lib/readiness'

// Entreno · alrededor de las series: cómo llegas hoy, el modo foco (un ejercicio a pantalla completa) y el descanso.

/** Tiempo tipo microondas: se teclean dígitos y se rellenan por la derecha (1, 3, 0 → 1:30). */
/** «¿Cómo estás hoy?»: tres toques antes de empezar; con una nota baja, propone aligerar el día. */
export function ReadinessCheck({ session, unit, warmup }: { session: Session; unit: Unit; warmup: () => void }) {
  const [draft, setDraft] = useState<Partial<Readiness>>(session.readiness ?? {})
  const [lightened, setLightened] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  const pick = (key: keyof Readiness, v: number) => setDraft((d) => ({ ...d, [key]: v }))
  // Con las tres respuestas, se guarda en el entrenamiento.
  useEffect(() => {
    const { sleep, energy, soreness } = draft
    const r = session.readiness
    if (sleep && energy && soreness && (r?.sleep !== sleep || r.energy !== energy || r.soreness !== soreness)) {
      editSession(session.id, (s) => { s.readiness = { sleep, energy, soreness } })
    }
  }, [draft])
  const level = session.readiness && readinessLevel(session.readiness)
  if (hidden || !open) {
    return (
      <div className="workout-pre">
        {!hidden && !session.readiness && <button className="btn small secondary" onClick={() => setOpen(true)}><HeartPulse size={15} /> {t('¿Cómo estás hoy?', 'How do you feel today?')}</button>}
        {!hidden && level === 'low' && !lightened && <button className="btn small secondary" onClick={() => { editSession(session.id, (s) => lighten(s, unit)); setLightened(true) }}>{t('Bajar un 10 % el peso de hoy', "Lower today's weights by 10%")}</button>}
        <button className="btn small secondary" onClick={warmup}><Flame size={15} /> {t('Calentar antes (5 min)', 'Warm up first (5 min)')}</button>
      </div>
    )
  }
  const rows: { key: keyof Readiness; label: string; low: string; high: string }[] = [
    { key: 'sleep', label: t('Sueño', 'Sleep'), low: t('fatal', 'awful'), high: t('genial', 'great') },
    { key: 'energy', label: t('Energía', 'Energy'), low: t('ninguna', 'none'), high: t('a tope', 'full') },
    { key: 'soreness', label: t('Agujetas', 'Soreness'), low: t('nada', 'none'), high: t('muchas', 'a lot') },
  ]
  return (
    <div className="readiness">
      <div className="row between">
        <span className="small bold">{t('¿Cómo estás hoy?', 'How do you feel today?')}</span>
        <button className="link-btn small muted" onClick={() => (session.readiness ? setOpen(false) : setHidden(true))}>{session.readiness ? t('Listo', 'Done') : t('Omitir', 'Skip')}</button>
      </div>
      {rows.map((r) => (
        <div key={r.key} className="readiness-row">
          <span className="small">{r.label}</span>
          <div className="readiness-scale" role="group" aria-label={`${r.label}: 1 ${r.low}, 5 ${r.high}`}>
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} className={`chip ${draft[r.key] === v ? 'active' : ''}`} aria-pressed={draft[r.key] === v} onClick={() => pick(r.key, v)}>{v}</button>
            ))}
          </div>
        </div>
      ))}
      {level === 'low' && (
        <div className="small" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span>{t('Día flojo: entrenar ayuda, pero mejor sin forzar. Baja un poco el peso o haz una serie menos.', 'Rough day: training still helps, but do not push it. Lower the weight a little or do one set less.')}</span>
          {lightened ? <span className="muted">{t('Hecho: un 10 % menos de peso en todo lo de hoy.', 'Done: 10% less weight on everything today.')}</span>
            : <button className="btn secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => { editSession(session.id, (s) => lighten(s, unit)); setLightened(true) }}>{t('Bajar un 10 % el peso de hoy', "Lower today's weights by 10%")}</button>}
        </div>
      )}
      {level === 'high' && <span className="small" style={{ color: 'var(--green-text)' }}>{t('Buen día para ir a por una marca.', 'A good day to go for a personal best.')}</span>}
    </div>
  )
}

/**
 * Modo foco: solo la serie que toca, a pantalla completa y con botones grandes (manos sudadas, móvil en
 * el suelo). «Hecha» pulsa el mismo botón de la serie en la lista, así el descanso, el RPE y los avisos
 * de récord funcionan igual que siempre.
 */
export function FocusMode({ session, unit, onClose }: { session: Session; unit: Unit; onClose: () => void }) {
  useScrollLock()
  const timer = useRestTimer()
  const now = useTick(250)
  const exercise = session.exercises.find((e) => e.sets.some((x) => !x.done))
  const set = exercise?.sets.find((x) => !x.done)
  const step = increment(unit)
  const edit = (patch: Partial<SetEntry>) => editSession(session.id, (s) => {
    const x = s.exercises.find((e) => e.id === exercise?.id)?.sets.find((y) => y.id === set?.id)
    if (x) Object.assign(x, patch)
  })
  const resting = timer.endAt && timer.endAt > now
  if (!exercise || !set) {
    return (
      <Overlay>
        <div className="focus-mode">
          <h1>{t('¡Todo hecho!', 'All done!')}</h1>
          <p className="muted">{t('Cierra el modo foco y pulsa «Terminar» para guardar el entreno.', 'Close focus mode and tap "Finish" to save the workout.')}</p>
          <button className="btn primary focus-done" onClick={onClose}>{t('Cerrar', 'Close')}</button>
        </div>
      </Overlay>
    )
  }
  const working = exercise.sets.filter((x) => !x.warmup && x.kind !== 'drop')
  const number = set.warmup ? undefined : working.findIndex((x) => x.id === set.id) + 1
  const timed = trackingOf(exercise) !== 'weight_reps'
  return (
    <Overlay>
      <div className="focus-mode">
        <div className="row between">
          <span className="small muted">{session.name}</span>
          <button className="btn small secondary" onClick={onClose}>{t('Salir del foco', 'Exit focus')}</button>
        </div>
        <h1 className="focus-name">{exercise.name}</h1>
        <span className="muted">{set.warmup ? t('Calentamiento', 'Warm-up') : t(`Serie ${number} de ${working.length}`, `Set ${number} of ${working.length}`)}{exercise.repsMax > 0 ? ` · ${exercise.repsMin === exercise.repsMax ? exercise.repsMin : `${exercise.repsMin}-${exercise.repsMax}`} reps` : ''}</span>
        {resting ? (
          <div className="focus-rest">
            <span className="small muted">{t('DESCANSO', 'REST')}</span>
            <strong>{clock(Math.ceil((timer.endAt! - now) / 1000))}</strong>
            <button className="btn secondary" onClick={stopRest}>{t('Saltar descanso', 'Skip rest')}</button>
          </div>
        ) : timed ? (
          <p className="muted">{t('Este ejercicio es por tiempo: apúntalo en la lista.', 'This exercise is timed: log it in the list.')}</p>
        ) : (
          <div className="focus-fields">
            {[
              { label: exercise.perHand ? `${unit} ${t('c/u', 'each')}` : unit, value: set.weight ? weight(set.weight, unit).replace(` ${unit}`, '') : '0', minus: () => edit({ weight: toKg(Math.max(0, fromKg(set.weight, unit) - step), unit) }), plus: () => edit({ weight: toKg(fromKg(set.weight, unit) + step, unit) }) },
              { label: 'reps', value: String(set.reps || 0), minus: () => edit({ reps: Math.max(0, set.reps - 1) }), plus: () => edit({ reps: set.reps + 1 }) },
            ].map((f) => (
              <div key={f.label} className="focus-field">
                <button className="focus-step" onClick={f.minus} aria-label={t(`Menos ${f.label}`, `Less ${f.label}`)}>−</button>
                <span className="focus-value"><strong>{f.value}</strong><small>{f.label}</small></span>
                <button className="focus-step" onClick={f.plus} aria-label={t(`Más ${f.label}`, `More ${f.label}`)}>+</button>
              </div>
            ))}
          </div>
        )}
        {!resting && !timed && (
          <button className="btn primary focus-done" disabled={!isSetFilled(set, 'weight_reps')}
            onClick={() => document.querySelector<HTMLButtonElement>(`#set-${CSS.escape(set.id)} .set-check`)?.click()}>
            <Check size={28} /> {t('Hecha', 'Done')}
          </button>
        )}
      </div>
    </Overlay>
  )
}

export function RestBar() {
  const timer = useRestTimer()
  const now = useTick(250)
  // Aviso visible unos segundos al terminar: útil si el móvil está en silencio (el iPhone, además,
  // no vibra desde una web).
  if (!timer.endAt && timer.finishedAt && now - timer.finishedAt < 5000) {
    return (
      <Overlay>
        {timer.big ? (
          <button className="rest-full rest-full-done" onClick={() => { dismissRestDone(); setRestBig(true) }}>
            <Timer size={64} />
            <strong className="rest-full-message">{t('¡Descanso terminado!', 'Rest is over!')}</strong>
            <span>{t('A por la siguiente serie', 'On to the next set')}</span>
          </button>
        ) : (
          <button className="rest-bar rest-done" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 45 }} onClick={dismissRestDone}>
            <div style={{ maxWidth: 528, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <Timer size={22} />
              <strong>{t('¡Descanso terminado! A por la siguiente serie', 'Rest is over! On to the next set')}</strong>
            </div>
          </button>
        )}
      </Overlay>
    )
  }
  if (!timer.endAt) return null
  const remaining = Math.max(0, (timer.endAt - now) / 1000)
  const progress = timer.total > 0 ? remaining / (timer.total / 1000) : 0
  if (timer.big) return <RestFullScreen remaining={remaining} progress={progress} />
  return (
    <Overlay>
    <div className="rest-bar" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 45 }}>
      <span className="rest-line" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
      <div style={{ maxWidth: 528, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="rest-expand" onClick={() => setRestBig(true)} aria-label={t('Ver la cuenta atrás en grande', 'Show the countdown full screen')}>
          <span className="rest-label">{t('Descanso', 'Rest')}</span>
          <span className="rest-time">{clock(Math.ceil(remaining))}</span>
        </button>
        <button className="btn small plain" onClick={() => addRest(-15)}>−15</button>
        <button className="btn small plain" onClick={() => addRest(15)}>+15</button>
        <button className="btn small primary" onClick={stopRest}>{t('Saltar', 'Skip')}</button>
      </div>
    </div>
    </Overlay>
  )
}

/** Cuenta atrás a pantalla completa, legible a distancia con el móvil apoyado. Fondo negro: en
 * pantallas OLED apenas gasta batería. */
function RestFullScreen({ remaining, progress }: { remaining: number; progress: number }) {
  useScrollLock()
  const r = 46
  const c = 2 * Math.PI * r
  const last = remaining <= 5
  return (
    <Overlay>
      <div className="rest-full" role="timer" aria-label={t(`Descanso: quedan ${Math.ceil(remaining)} segundos`, `Rest: ${Math.ceil(remaining)} seconds left`)}>
        <button className="rest-full-min" onClick={() => setRestBig(false)} aria-label={t('Reducir', 'Shrink')}><Minimize2 size={22} /></button>
        <div className="rest-full-ring">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r={r} stroke="#1f2126" strokeWidth="4" fill="none" />
            {/* Halo suave (anillo ancho y translúcido) bajo el progreso */}
            <circle cx="50" cy="50" r={r} stroke="var(--accent)" strokeOpacity="0.18" strokeWidth="9" fill="none" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - progress)} transform="rotate(-90 50 50)" />
            <circle cx="50" cy="50" r={r} stroke="var(--accent)" strokeWidth="4" fill="none" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - progress)} transform="rotate(-90 50 50)" />
          </svg>
          <div className="rest-full-center">
            <span className="rest-full-label">{t('Descanso', 'Rest')}</span>
            <span className={`rest-full-time ${last ? 'last' : ''}`}>{clock(Math.ceil(remaining))}</span>
          </div>
        </div>
        <div className="rest-full-actions">
          <button className="btn plain" onClick={() => addRest(-15)}>−15 s</button>
          <button className="btn plain" onClick={() => addRest(15)}>+15 s</button>
          <button className="btn primary" onClick={stopRest}>{t('Saltar', 'Skip')}</button>
        </div>
      </div>
    </Overlay>
  )
}
