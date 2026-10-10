import { Flag, ListChecks, Pause, Play, Plus, RefreshCw, Square, Trophy } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, NavBar, Overlay, Sheet, Thumb, useCatalog, useScrollLock, useTick } from '../components/ui'
import { clock, day, fromKg, parseDecimal, relative, toKg } from '../lib/format'
import { plural, t } from '../lib/i18n'
import { positionAt, type Segment } from '../lib/intervals'
import { navigate } from '../lib/router'
import { finishedSessions, update, useData } from '../lib/store'
import { playTone, unlockAudio } from '../lib/timer'
import { speak } from '../lib/voice'
import { amountText, better, formatHint, formatTitle, previousTries, scoreText, wodDay, wodOf, wodSession, type Wod, type WodRecord } from '../lib/wod'
import { keepScreenOn } from '../lib/workout'
import { ExerciseSheet } from './Exercises'

// WOD del día (ver lib/wod.ts): el entreno, el cronómetro y el resultado, que queda en el historial.

/** Variante elegida con «Otro WOD» (mientras la app esté abierta). */
let savedVariant = { day: '', variant: 0 }

const benchName = (n: number) => [
  t('Prueba 1 · escalera', 'Test 1 · ladder'), t('Prueba 2 · 20 minutos', 'Test 2 · 20 minutes'),
  t('Prueba 3 · cinco rondas', 'Test 3 · five rounds'), t('Prueba 4 · cada minuto', 'Test 4 · every minute'),
][n - 1]

export function WodScreen() {
  const data = useData()
  const catalog = useCatalog()
  const today = wodDay()
  const [variant, setVariantState] = useState(savedVariant.day === today ? savedVariant.variant : 0)
  const setVariant = (v: number) => { savedVariant = { day: today, variant: v }; setVariantState(v) }
  const wod = useMemo(() => wodOf(today, data.settings.equipment, data.settings.level, variant, catalog), [today, data.settings.equipment, data.settings.level, variant, catalog])
  const sessions = useMemo(() => finishedSessions(data), [data])
  const tries = previousTries(sessions, wod.key)
  const best = tries.reduce<typeof tries[number] | undefined>((b, s) => (!b || better(s.wod!, b.wod!) ? s : b), undefined)
  const history = sessions.filter((s) => s.wod).slice(0, 5)
  const [run, setRun] = useState(false)
  const [result, setResult] = useState<{ start: number; end: number; rounds: number; seconds?: number }>()
  const [info, setInfo] = useState<string>()

  return (
    <>
      <NavBar showBack title={t('WOD del día', 'Workout of the day')} />
      <div className="screen with-nav">
        <section className="card wod-hero">
          <span className="small muted">{day(Date.now())}{wod.benchmark ? ` · ${t('prueba del sábado', 'Saturday test')}` : ''}</span>
          <h1 className="wod-title">{wod.benchmark ? benchName(wod.benchmark) : formatTitle(wod)}</h1>
          {wod.benchmark && <span className="bold">{formatTitle(wod)}</span>}
          <span className="small muted">{formatHint(wod)}</span>
          <ol className="wod-moves">
            {wod.moves.map((m, i) => {
              const e = catalog.get(m.exerciseId)
              return (
                <li key={m.exerciseId}>
                  <button className="row wod-move" onClick={() => setInfo(m.exerciseId)}>
                    <Thumb exerciseId={m.exerciseId} size={44} />
                    <span className="wod-amount">{amountText(m, wod)}</span>
                    <span className="grow">
                      <span className="bold clamp-2">{e?.name ?? m.exerciseId}</span>
                      {(m.loaded || wod.format === 'emom') && (
                        <span className="small muted" style={{ display: 'block' }}>
                          {[wod.format === 'emom' ? t(`minutos ${i + 1}, ${i + 1 + wod.moves.length}…`, `minutes ${i + 1}, ${i + 1 + wod.moves.length}…`) : '', m.loaded ? t('con un peso que muevas sin parar', 'with a weight you can move without stopping') : ''].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
          <button className="btn primary block" onClick={() => { unlockAudio(); setRun(true) }}><Play size={19} fill="currentColor" /> {t('Empezar', 'Start')}</button>
          <span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button className="btn secondary btn-sm" onClick={() => setResult({ start: Date.now() - wod.minutes * 60000, end: Date.now(), rounds: wod.format === 'emom' ? wod.minutes : 0 })}><ListChecks size={16} /> {t('Apuntar resultado', 'Log result')}</button>
            {!wod.benchmark || variant > 0 ? <button className="btn secondary btn-sm" onClick={() => setVariant(variant + 1)}><RefreshCw size={16} /> {t('Otro WOD', 'Another WOD')}</button> : null}
          </span>
        </section>

        {tries.length > 0 && best && (
          <Card title={t('Tus intentos', 'Your attempts')} icon={Trophy}>
            {tries.slice(0, 5).map((s) => (
              <button key={s.id} className="row between wod-try" onClick={() => navigate('progress', 'session', s.id)}>
                <span>{relative(s.start)}</span>
                <strong>{scoreText(s.wod!)}{s.id === best.id ? ' 🏆' : ''}</strong>
              </button>
            ))}
            <span className="small muted">{t('Esta prueba se repite cada 4 semanas: intenta mejorar tu marca.', 'This test repeats every 4 weeks: try to beat your best.')}</span>
          </Card>
        )}

        <p className="small muted" style={{ margin: 0 }}>
          {t('Adáptalo si hace falta: menos repeticiones, menos peso o un ejercicio más fácil. Lo importante es moverse bien y sin parar. El WOD cambia cada día según tu material y tu nivel (Perfil → Repetir cuestionario).',
            'Scale it if you need to: fewer reps, less weight or an easier exercise. What matters is moving well and keeping going. The WOD changes every day based on your equipment and level (Profile → Redo questionnaire).')}
        </p>

        {history.length > 0 && (
          <Card title={t('Tus últimos WOD', 'Your recent WODs')} icon={Flag}>
            {history.map((s) => (
              <button key={s.id} className="row between wod-try" onClick={() => navigate('progress', 'session', s.id)}>
                <span className="clamp-1">{formatTitle(s.wod!)} · <span className="muted">{relative(s.start)}</span></span>
                <strong style={{ whiteSpace: 'nowrap' }}>{scoreText(s.wod!)}</strong>
              </button>
            ))}
          </Card>
        )}
      </div>
      {run && <WodRun wod={wod} onCancel={() => setRun(false)} onDone={(r) => { setRun(false); setResult(r) }} />}
      {result && <ResultSheet wod={wod} draft={result} onClose={() => setResult(undefined)} />}
      {info && <ExerciseSheet exerciseId={info} onClose={() => setInfo(undefined)} />}
    </>
  )
}

const PREP = 10

function segmentsOf(wod: Wod): Segment[] {
  const prep: Segment = { kind: 'prep', seconds: PREP, round: 0 }
  if (wod.format === 'emom') return [prep, ...Array.from({ length: wod.minutes }, (_, i): Segment => ({ kind: 'work', seconds: 60, round: i + 1 }))]
  return [prep, { kind: 'work', seconds: wod.minutes * 60, round: 1 }]
}

function WodRun({ wod, onCancel, onDone }: { wod: Wod; onCancel: () => void; onDone: (r: { start: number; end: number; rounds: number; seconds?: number }) => void }) {
  useScrollLock()
  const catalog = useCatalog()
  const now = useTick(200)
  const segments = useMemo(() => segmentsOf(wod), [wod])
  const [startAt] = useState(() => Date.now())
  const [paused, setPaused] = useState<{ at: number }>()
  const [pausedTotal, setPausedTotal] = useState(0)
  const [rounds, setRounds] = useState(0)
  const elapsed = (paused?.at ?? now) - startAt - pausedTotal
  const pos = positionAt(segments, elapsed)
  const workSeconds = Math.max(0, elapsed / 1000 - PREP)
  const lastIndex = useRef(-1)
  const lastSecond = useRef(-1)
  const ended = useRef(false)

  useEffect(() => {
    void keepScreenOn(true)
    return () => void keepScreenOn(false)
  }, [])

  const finish = (early: boolean) => {
    if (ended.current) return
    ended.current = true
    playTone('end')
    navigator.vibrate?.([300, 120, 300])
    const end = Date.now()
    const start = startAt + PREP * 1000
    if (wod.format === 'forTime') onDone({ start, end, rounds, ...(early ? { seconds: Math.round(workSeconds) } : {}) })
    else if (wod.format === 'emom') onDone({ start, end, rounds: early ? Math.max(0, pos.segment.round - 1) : wod.minutes })
    else onDone({ start, end, rounds })
  }

  // Avisos: al empezar, en cada minuto del EMOM, los 3 últimos segundos y al acabar el tiempo.
  useEffect(() => {
    if (paused) return
    if (pos.done) return finish(false)
    if (pos.index !== lastIndex.current) {
      if (lastIndex.current >= 0) {
        playTone('go')
        navigator.vibrate?.(150)
        const move = wod.format === 'emom' ? wod.moves[(pos.segment.round - 1) % wod.moves.length] : undefined
        speak(move ? `${amountText(move)} ${catalog.get(move.exerciseId)?.name ?? ''}` : t('Adelante', 'Go'))
      } else speak(t('Prepárate', 'Get ready'))
      lastIndex.current = pos.index
      lastSecond.current = -1
    }
    const second = Math.ceil(pos.remaining)
    if (second !== lastSecond.current) {
      if (second <= 3 && second >= 1) playTone('tick')
      lastSecond.current = second
    }
  })

  const toggle = () => {
    if (paused) {
      setPausedTotal(pausedTotal + Date.now() - paused.at)
      setPaused(undefined)
    } else setPaused({ at: Date.now() })
  }
  const prep = pos.segment.kind === 'prep'
  const current = wod.format === 'emom' && !prep ? wod.moves[(pos.segment.round - 1) % wod.moves.length] : undefined
  const r = 46
  const c = 2 * Math.PI * r
  const progress = pos.segment.seconds ? pos.remaining / pos.segment.seconds : 0
  const color = prep ? 'var(--gold)' : 'var(--accent)'
  const big = prep ? Math.ceil(pos.remaining) : wod.format === 'forTime' ? Math.floor(workSeconds) : Math.ceil(pos.remaining)

  return (
    <Overlay>
      <div className="rest-full interval-run" role="timer" aria-label={clock(big)}>
        <span className="interval-phase" style={{ color }}>{prep ? t('PREPÁRATE', 'GET READY') : wod.format === 'emom' ? t(`MINUTO ${pos.segment.round} DE ${wod.minutes}`, `MINUTE ${pos.segment.round} OF ${wod.minutes}`) : formatTitle(wod).toUpperCase()}</span>
        <div className="rest-full-ring">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r={r} stroke="#1f2126" strokeWidth="4" fill="none" />
            <circle cx="50" cy="50" r={r} stroke={color} strokeWidth="4" fill="none" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - progress)} transform="rotate(-90 50 50)" />
          </svg>
          <div className="rest-full-center">
            <span className="rest-full-label">{wod.format === 'emom' ? '' : plural(rounds, ['ronda', 'rondas'], ['round', 'rounds'])}</span>
            <span className={`rest-full-time ${pos.remaining <= 3 && !pos.done ? 'last' : ''}`}>{clock(big)}</span>
            <span className="rest-full-label">{wod.format === 'forTime' && !prep ? t(`Límite ${wod.minutes} min`, `Cap ${wod.minutes} min`) : ''}</span>
          </div>
        </div>
        <p className="interval-cue">
          {current ? `${amountText(current)} · ${catalog.get(current.exerciseId)?.name ?? ''}`
            : wod.moves.map((m) => `${amountText(m, wod)} ${catalog.get(m.exerciseId)?.name ?? ''}`).join(' · ')}
        </p>
        <div className="rest-full-actions">
          <button className="btn plain" onClick={onCancel}><Square size={18} /> {t('Parar', 'Stop')}</button>
          {wod.format === 'emom'
            ? <button className="btn plain" onClick={() => finish(true)}><Flag size={18} /> {t('Terminar', 'Finish')}</button>
            : <button className="btn plain" onClick={() => { setRounds((n) => n + 1); navigator.vibrate?.(30) }}><Plus size={18} /> {t('Ronda', 'Round')}</button>}
          {wod.format === 'forTime' && !prep
            ? <button className="btn primary" onClick={() => finish(true)}><Flag size={18} /> {t('¡Hecho!', 'Done!')}</button>
            : <button className="btn primary" onClick={toggle}>{paused ? <><Play size={18} fill="currentColor" /> {t('Seguir', 'Resume')}</> : <><Pause size={18} /> {t('Pausa', 'Pause')}</>}</button>}
        </div>
      </div>
    </Overlay>
  )
}

/** «12:34» o «754» → segundos. */
function parseClock(text: string): number | undefined {
  const m = text.trim().match(/^(\d{1,3})(?::(\d{1,2}))?$/)
  if (!m) return undefined
  return m[2] === undefined ? Number(m[1]) * 60 : Number(m[1]) * 60 + Number(m[2])
}

function ResultSheet({ wod, draft, onClose }: { wod: Wod; draft: { start: number; end: number; rounds: number; seconds?: number }; onClose: () => void }) {
  const catalog = useCatalog()
  const { settings } = useData()
  const unit = settings.unit
  const [rounds, setRounds] = useState(String(draft.rounds))
  const [reps, setReps] = useState('')
  const [finished, setFinished] = useState(wod.format !== 'forTime' || draft.seconds !== undefined || draft.rounds === 0)
  const [time, setTime] = useState(draft.seconds !== undefined ? clock(draft.seconds) : '')
  const [load, setLoad] = useState('')
  const loaded = wod.moves.some((m) => m.loaded)
  const total = wod.ladder?.length ?? wod.rounds ?? 0
  const seconds = parseClock(time)
  const roundsN = Number(rounds) || 0
  const record: WodRecord | undefined =
    wod.format === 'forTime'
      ? (finished ? (seconds !== undefined && seconds > 0 ? { key: wod.key, format: wod.format, minutes: wod.minutes, rounds: total, seconds } : undefined)
        : { key: wod.key, format: wod.format, minutes: wod.minutes, rounds: Math.min(roundsN, total) })
      : { key: wod.key, format: wod.format, minutes: wod.minutes, rounds: wod.format === 'emom' ? Math.min(roundsN, wod.minutes) : roundsN, ...(wod.format === 'amrap' && Number(reps) > 0 ? { reps: Number(reps) } : {}) }
  const save = () => {
    if (!record) return
    const kg = loaded ? toKg(parseDecimal(load) ?? 0, unit) : 0
    const session = wodSession(wod, { ...record, ...(wod.benchmark ? { benchmark: wod.benchmark } : {}) }, catalog, draft.start, draft.end, kg)
    update((d) => { d.sessions.push(session) })
    onClose()
    navigate('progress', 'session', session.id)
  }
  return (
    <Sheet title={t('Tu resultado', 'Your result')} onClose={onClose} left={<button className="nav-btn" onClick={onClose}>{t('Cancelar', 'Cancel')}</button>}
      footer={<button className="btn primary block" disabled={!record} onClick={save}>{t('Guardar en el historial', 'Save to history')}</button>}>
      <div className="list">
        {wod.format === 'forTime' && (
          <label className="list-row">
            <span className="grow">{t('Lo terminé dentro del tiempo', 'I finished within the cap')}</span>
            <input type="checkbox" className="toggle" checked={finished} onChange={(e) => setFinished(e.target.checked)} />
          </label>
        )}
        {wod.format === 'forTime' && finished ? (
          <label className="list-row">
            <span className="grow">{t('Tiempo (min:seg)', 'Time (min:sec)')}</span>
            <input inputMode="numeric" placeholder="12:34" style={{ textAlign: 'right', width: 90, fontSize: 17 }} value={time} onChange={(e) => setTime(e.target.value)} aria-label={t('Tiempo', 'Time')} />
          </label>
        ) : (
          <label className="list-row">
            <span className="grow">{wod.format === 'emom' ? t('Minutos cumplidos', 'Minutes completed') : t('Rondas completas', 'Full rounds')}</span>
            <input inputMode="numeric" style={{ textAlign: 'right', width: 70, fontSize: 17 }} value={rounds} onChange={(e) => setRounds(e.target.value.replace(/\D/g, ''))} aria-label={t('Rondas', 'Rounds')} />
          </label>
        )}
        {wod.format === 'amrap' && (
          <label className="list-row">
            <span className="grow">{t('Repeticiones de la ronda a medias', 'Reps of the unfinished round')}</span>
            <input inputMode="numeric" placeholder="0" style={{ textAlign: 'right', width: 70, fontSize: 17 }} value={reps} onChange={(e) => setReps(e.target.value.replace(/\D/g, ''))} aria-label={t('Repeticiones', 'Reps')} />
          </label>
        )}
        {loaded && (
          <label className="list-row">
            <span className="grow">{t('Peso usado (opcional)', 'Weight used (optional)')}</span>
            <input inputMode="decimal" placeholder={unit === 'kg' ? '20' : '45'} style={{ textAlign: 'right', width: 70, fontSize: 17 }} value={load} onChange={(e) => setLoad(e.target.value)} aria-label={t('Peso', 'Weight')} />
            <span className="muted">{unit}</span>
          </label>
        )}
      </div>
      {record && <span className="small muted">{t('Resultado', 'Result')}: <strong>{scoreText(record)}</strong>{loaded && load ? ` · ${fromKg(toKg(parseDecimal(load) ?? 0, unit), unit)} ${unit}` : ''}. {t('Queda en tu historial como un entrenamiento más (cuenta para la racha y los retos).', 'It is saved to your history as a workout (it counts towards your streak and challenges).')}</span>}
    </Sheet>
  )
}
