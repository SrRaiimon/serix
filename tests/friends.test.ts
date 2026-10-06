import assert from 'node:assert/strict'
import { test } from 'node:test'
import { alignWeeks, challengeProgress, challengeResult, challengeStatus, cleanChallenge, cleanSnapshot, settleChallenges, trophyCounts, trophyText, decodeSnapshot, encodeSnapshot, friendKey, invitations, mySnapshot, newChallenge, sameWeek, shareReminderDue, standings, WEEKS } from '../src/lib/friends'
import { toBase64Url } from '../src/lib/share'
import { defaultSettings, type AppData } from '../src/lib/store'
import { exercise, session, set } from './helpers'

const now = new Date(2026, 0, 14, 20).getTime() // miércoles
const at = (daysAgo: number, ex: ReturnType<typeof exercise>[]) => {
  const start = now - daysAgo * 86400000
  return session(0, ex, { start, end: start + 3600000 })
}
const sessions = [
  at(1, [exercise('Barbell_Bench_Press_-_Medium_Grip', [set(80, 5), set(80, 5)])]),
  at(9, [exercise('Barbell_Squat', [set(120, 5)]), exercise('Wide-Grip_Barbell_Bench_Press', [set(90, 1)])]),
  at(40, [exercise('Barbell_Deadlift', [set(150, 3)])]),
]
const data: AppData = { version: 1, routines: [], sessions, measurements: [], exerciseNotes: {}, friends: [], challenges: [], customExercises: [], nutrition: { entries: [], foods: [], meals: [] }, settings: { ...defaultSettings, name: '  Ana  ' } }

test('resumen propio: semana, mes, racha y mejores básicos', () => {
  const s = mySnapshot(data, sessions, now)
  assert.equal(s.name, 'Ana')
  assert.deepEqual(s.week, { sessions: 1, volume: 800, sets: 2, minutes: 60 })
  assert.equal(s.month.sessions, 2) // 13 de enero y 5 de enero
  assert.equal(s.total, 3)
  assert.equal(s.streak, 2)
  assert.equal(s.lifts.bench, 93.3) // 80 × 5 → 93,3 (mejor que 90 × 1)
  assert.equal(s.lifts.squat, 140)
  assert.equal(s.lifts.deadlift, 165)
})

test('enlace: ida y vuelta, y valores manipulados acotados', async () => {
  const s = mySnapshot(data, sessions, now)
  assert.deepEqual(await decodeSnapshot(await encodeSnapshot(s)), s)
  const evil = 'j' + toBase64Url(new TextEncoder().encode(JSON.stringify([1, 'x'.repeat(500), now, [-5, 1e12, 'a', 3], [], 9e9, 2, [99999, -1, 'x']])))
  const d = await decodeSnapshot(evil)
  assert.equal(d?.name.length, 40)
  assert.deepEqual(d?.week, { sessions: 0, volume: 1e8, sets: 0, minutes: 3 })
  assert.equal(d?.streak, 1000)
  assert.deepEqual(d?.lifts, { bench: undefined, squat: undefined, deadlift: undefined })
  assert.equal(await decodeSnapshot('zroto'), undefined)
  assert.equal(await decodeSnapshot('j' + toBase64Url(new TextEncoder().encode('[3,"x"]'))), undefined)
})

test('amigos por nombre y semanas comparables', () => {
  assert.equal(friendKey(' Ána '), friendKey('ana'))
  assert.equal(sameWeek(now - 86400000, now), true)
  assert.equal(sameWeek(now - 5 * 86400000, now), false) // el viernes anterior
})

// MARK: Retos y comparativas

const DAY_MS = 86400000

test('progreso de un reto: solo cuenta lo que entra en sus fechas', () => {
  const base = { id: 'abcd12', by: 'Ana', start: now - 10 * DAY_MS, end: now + DAY_MS }
  assert.equal(challengeProgress({ ...base, metric: 'sessions' }, sessions), 2) // la de hace 40 días no
  assert.equal(challengeProgress({ ...base, metric: 'volume' }, sessions), 800 + 600 + 90)
  assert.equal(challengeProgress({ ...base, metric: 'sets' }, sessions), 4)
  const reps = [at(2, [exercise('Pullups', [set(0, 8), set(0, 11), set(0, 15, { warmup: true })])])]
  assert.equal(challengeProgress({ ...base, metric: 'reps', exerciseId: 'Pullups' }, reps), 11) // el calentamiento no cuenta
})

test('series de un grupo muscular', () => {
  const s = [at(1, [exercise('a', [set(50, 10), set(50, 10)], { muscle: 'pectorals' }), exercise('b', [set(50, 10)], { muscle: 'quads' })])]
  const c = { id: 'abcd12', by: 'Ana', start: now - DAY_MS * 5, end: now + DAY_MS, metric: 'sets' as const }
  assert.equal(challengeProgress({ ...c, group: 0 }, s), 2) // pecho
  assert.equal(challengeProgress(c, s), 3)
})

test('clasificación, invitaciones y estado', () => {
  const c = { id: 'abcd12', by: 'Ana', start: now - DAY_MS, end: now + DAY_MS, metric: 'sessions' as const }
  const friend = { ...mySnapshot(data, sessions, now), name: 'Luis', challenges: [{ challenge: c, value: 3 }] }
  const rows = standings(c, 'Tú', 1, [friend], now)
  assert.deepEqual(rows.map((r) => [r.name, r.value]), [['Luis', 3], ['Tú', 1]])
  assert.deepEqual(invitations([friend], [], now).map((x) => x.id), ['abcd12'])
  assert.deepEqual(invitations([friend], [c], now), [])
  assert.deepEqual(invitations([friend], [], now + 2 * DAY_MS), []) // terminado: ya no se invita
  assert.equal(challengeStatus(c, now), 'active')
  assert.equal(challengeStatus(c, now - 2 * DAY_MS), 'upcoming')
})

test('enlace v2: semanas, grupos, récords, peso y retos van y vuelven', async () => {
  const c = newChallenge({ metric: 'reps', exerciseId: 'Pullups', exerciseName: 'Dominadas', by: 'Ana', target: 20 }, 30, now)
  const withChallenge: AppData = { ...data, challenges: [c], measurements: [{ id: 'm', date: now - DAY_MS, weight: 70 }], settings: { ...data.settings, shareBodyWeight: true } }
  const s = mySnapshot(withChallenge, sessions, now)
  assert.equal(s.weeks?.length, WEEKS)
  assert.deepEqual(s.weeks?.at(-1), [1, 800])
  assert.equal(s.bodyWeight, 70)
  assert.equal(s.challenges?.[0].challenge.id, c.id)
  assert.deepEqual(await decodeSnapshot(await encodeSnapshot(s)), s)
  // Sin permiso, el peso no viaja.
  assert.equal(mySnapshot({ ...withChallenge, settings: data.settings }, sessions, now).bodyWeight, undefined)
})

test('retos manipulados se descartan', () => {
  const ok = { id: 'abcd12', metric: 'sessions', start: now, end: now + DAY_MS, by: 'x' }
  assert.ok(cleanChallenge(ok))
  assert.equal(cleanChallenge({ ...ok, id: '<script>' }), undefined)
  assert.equal(cleanChallenge({ ...ok, metric: 'hack' }), undefined)
  assert.equal(cleanChallenge({ ...ok, end: now - 1 }), undefined)
  assert.equal(cleanChallenge({ ...ok, end: now + 400 * DAY_MS }), undefined) // más de un año
  assert.equal(cleanChallenge({ ...ok, metric: 'reps' }), undefined) // sin ejercicio
  assert.equal(cleanChallenge({ ...ok, group: 3 })?.group, undefined) // el grupo solo vale para series
  assert.equal(cleanChallenge({ ...ok, metric: 'sets', group: 99 })?.group, undefined)
})

test('semanas de un amigo alineadas con las tuyas', () => {
  const weeks: [number, number][] = [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8]]
  const f = { ...mySnapshot(data, sessions, now), weeks }
  assert.deepEqual(alignWeeks({ ...f, at: now }, now), weeks)
  // Resumen de hace dos semanas: sus 2 semanas más recientes no se conocen.
  assert.deepEqual(alignWeeks({ ...f, at: now - 14 * DAY_MS }, now), [[3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], undefined, undefined])
})

test('recordatorio de compartir: domingo o lunes, con amigos y sin compartir esa semana', () => {
  const sunday = new Date(2026, 0, 18, 11).getTime()
  const friend = mySnapshot(data, sessions, now)
  const d = (settings: Partial<AppData['settings']>, friends = [friend]): AppData => ({ ...data, friends, settings: { ...data.settings, ...settings } })
  assert.equal(shareReminderDue(d({}), sunday), true)
  assert.equal(shareReminderDue(d({}), now), false) // miércoles
  assert.equal(shareReminderDue(d({}, []), sunday), false)
  assert.equal(shareReminderDue(d({ friendShareAt: sunday - DAY_MS }), sunday), false)
  assert.equal(shareReminderDue(d({ friendReminderOff: true }), sunday), false)
  assert.equal(shareReminderDue(d({ friendReminderSnooze: sunday + DAY_MS }), sunday), false)
})

// MARK: Trofeos

test('al terminar un reto se guarda la clasificación y da medallas', () => {
  const c = { id: 'trofeo1', by: 'Ana', start: now - 20 * DAY_MS, end: now - 3600000, metric: 'sessions' as const, target: 2 }
  const luis = { ...mySnapshot(data, sessions, now), name: 'Luis', challenges: [{ challenge: c, value: 1 }] }
  const d: AppData = { ...data, friends: [luis], challenges: [c] }
  const settled = settleChallenges(d, sessions, now)!
  assert.deepEqual(settled[0].final, [{ name: 'Ana', value: 2, me: true }, { name: 'Luis', value: 1 }])
  assert.equal(settleChallenges({ ...d, challenges: settled }, sessions, now), undefined) // ya guardado: no cambia
  assert.deepEqual(challengeResult(settled[0]), { place: 1, of: 2, value: 2, medal: 'gold', completed: true })
  assert.deepEqual(trophyCounts(settled), [1, 0, 0, 1])
  assert.equal(trophyText([1, 0, 0, 1]), '🥇1 🎯1')
  // Un resumen tardío de Luis sube su valor; luego su resumen ya no trae el reto y no se pierde.
  const later = settleChallenges({ ...d, challenges: settled, friends: [{ ...luis, challenges: [{ challenge: c, value: 3 }] }] }, sessions, now)!
  assert.equal(challengeResult(later[0])?.medal, 'silver')
  assert.equal(settleChallenges({ ...d, challenges: later, friends: [{ ...luis, challenges: [] }] }, sessions, now), undefined)
})

test('en solitario no hay medalla, pero sí objetivo cumplido', () => {
  const c = { id: 'solo123', by: 'Ana', start: now - 20 * DAY_MS, end: now - 3600000, metric: 'sessions' as const, target: 1 }
  const settled = settleChallenges({ ...data, challenges: [c] }, sessions, now)!
  assert.deepEqual(challengeResult(settled[0]), { place: 1, of: 1, value: 2, medal: undefined, completed: true })
  // Un reto en curso no se cierra.
  assert.equal(settleChallenges({ ...data, challenges: [{ ...c, end: now + DAY_MS }] }, sessions, now), undefined)
})

test('los trofeos viajan en el resumen y se acotan; la clasificación final no viaja', async () => {
  const c = { id: 'trofeo1', by: 'Ana', start: now - 20 * DAY_MS, end: now - 3600000, metric: 'sessions' as const, final: [{ name: 'Ana', value: 2, me: true }, { name: 'Luis', value: 1 }] }
  const s = mySnapshot({ ...data, challenges: [c] }, sessions, now)
  assert.deepEqual(s.trophies, [1, 0, 0, 0])
  const back = await decodeSnapshot(await encodeSnapshot(s))
  assert.deepEqual(back?.trophies, [1, 0, 0, 0])
  assert.equal(back?.challenges?.[0].challenge.final, undefined)
  assert.deepEqual(cleanSnapshot({ ...s, trophies: [-1, 1e9, 'x', 2] })?.trophies, [0, 10000, 0, 2])
  assert.deepEqual(cleanChallenge(c)?.final, c.final) // en la copia de seguridad sí se guarda
})

test('récords recientes: solo mejoras de los últimos 30 días frente a lo anterior', () => {
  const B = 'Barbell_Squat'
  const hist = [
    at(60, [exercise(B, [set(100, 5)])]),
    at(20, [exercise(B, [set(110, 5)])]), // récord
    at(10, [exercise(B, [set(105, 5)])]), // no
    at(5, [exercise('Pullups', [set(10, 8)])]), // primera vez: no es récord
    at(2, [exercise(B, [set(110, 6)])]), // récord (más reps)
  ]
  const s = mySnapshot(data, hist, now)
  assert.deepEqual(s.prs?.map((r) => [r.exerciseId, r.weight, r.reps]), [[B, 110, 6]])
})
