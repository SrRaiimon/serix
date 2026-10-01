import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { Catalog, type RawExercise } from '../src/lib/catalog'
import { ALIASES, customId, matchExercise, parseCsv, parseDate, parseDuration, parseWorkouts, toSessions } from '../src/lib/importCsv'

const catalog = new Catalog((JSON.parse(readFileSync('public/exercises_es.json', 'utf8')) as { exercises: RawExercise[] }).exercises)

// Ejemplos con el formato de cada app (datos inventados).
const STRONG = `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
2024-03-04 18:30:00,"Pierna, día 1",1h 5m,"Squat (Barbell)",W,40.0,10,0,0,"","Buenas sensaciones",
2024-03-04 18:30:00,"Pierna, día 1",1h 5m,"Squat (Barbell)",1,100.0,5,0,0,"",,8
2024-03-04 18:30:00,"Pierna, día 1",1h 5m,"Squat (Barbell)",2,100.0,5,0,0,,,9
2024-03-04 18:30:00,"Pierna, día 1",1h 5m,"Squat (Barbell)",D,80.0,8,0,0,,,
2024-03-04 18:30:00,"Pierna, día 1",1h 5m,"Plank",1,0,0,0,60,,,
2024-03-04 18:30:00,"Pierna, día 1",1h 5m,"Running (Treadmill)",1,0,0,3.2,1200,,,
2024-03-04 18:30:00,"Pierna, día 1",1h 5m,"Rest Timer",Rest Timer,0,0,0,90,,,
2024-03-06 19:00:00,"Empuje",45m,"Bench Press (Barbell)",1,80.0,8,0,0,,,
2024-03-06 19:00:00,"Empuje",45m,"Mi ejercicio raro",1,10.0,12,0,0,,,
`
const HEVY = `"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"
"Upper","5 Mar 2024, 18:00","5 Mar 2024, 19:10","","Bench Press (Barbell)",,"",0,"warmup",40,10,,0,
"Upper","5 Mar 2024, 18:00","5 Mar 2024, 19:10","","Bench Press (Barbell)",,"",1,"normal",80,8,,0,8.5
"Upper","5 Mar 2024, 18:00","5 Mar 2024, 19:10","","Bicep Curl (Dumbbell)",0,"",0,"normal",14,10,,0,
"Upper","5 Mar 2024, 18:00","5 Mar 2024, 19:10","","Triceps Rope Pushdown",0,"",0,"failure",25,12,,0,
`

test('CSV con comillas, comas dentro y punto y coma', () => {
  assert.deepEqual(parseCsv('a,b\n"x, y","say ""hi"""\r\n'), [['a', 'b'], ['x, y', 'say "hi"']])
  assert.deepEqual(parseCsv('﻿a;b;c\n1;2;3'), [['a', 'b', 'c'], ['1', '2', '3']])
})

test('fechas y duraciones', () => {
  assert.equal(parseDate('2024-03-04 18:30:00'), new Date(2024, 2, 4, 18, 30).getTime())
  assert.equal(parseDate('5 Mar 2024, 18:00'), new Date(2024, 2, 5, 18, 0).getTime())
  assert.equal(parseDuration('1h 5m'), 65 * 60000)
  assert.equal(parseDuration('45m'), 45 * 60000)
})

test('Strong: entrenamientos, tipos de serie, tiempo y distancia', () => {
  const { format, workouts } = parseWorkouts(STRONG, 'kg')
  assert.equal(format, 'strong')
  assert.equal(workouts.length, 2)
  const [leg] = workouts
  assert.equal(leg.name, 'Pierna, día 1')
  assert.equal(leg.end - leg.start, 65 * 60000)
  assert.equal(leg.notes, 'Buenas sensaciones')
  // «Rest Timer» no es un ejercicio.
  assert.deepEqual(leg.exercises.map((e) => e.name), ['Squat (Barbell)', 'Plank', 'Running (Treadmill)'])
  const squat = leg.exercises[0].sets
  assert.deepEqual(squat.map((s) => [s.weight, s.reps, s.warmup, s.kind ?? '-', s.rpe ?? '-']),
    [[40, 10, true, '-', '-'], [100, 5, false, '-', 8], [100, 5, false, '-', 9], [80, 8, false, 'drop', '-']])
  assert.equal(leg.exercises[1].sets[0].duration, 60)
  assert.equal(leg.exercises[2].sets[0].distance, 3.2)
})

test('Strong en libras', () => {
  const { workouts } = parseWorkouts(STRONG, 'lb')
  assert.ok(Math.abs(workouts[0].exercises[0].sets[1].weight - 45.359) < 0.01)
  assert.ok(Math.abs(workouts[0].exercises[2].sets[0].distance! - 5.15) < 0.01)
})

test('Hevy: calentamiento, al fallo y superseries', () => {
  const { format, workouts } = parseWorkouts(HEVY, 'kg')
  assert.equal(format, 'hevy')
  const [w] = workouts
  assert.equal(w.end - w.start, 70 * 60000)
  assert.deepEqual(w.exercises.map((e) => e.name), ['Bench Press (Barbell)', 'Bicep Curl (Dumbbell)', 'Triceps Rope Pushdown'])
  assert.equal(w.exercises[0].sets[0].warmup, true)
  assert.equal(w.exercises[0].sets[1].rpe, 8.5)
  assert.equal(w.exercises[2].sets[0].kind, 'failure')
  assert.equal(w.exercises[1].group, '0')
})

test('archivo que no es de Strong ni de Hevy', () => {
  assert.throws(() => parseWorkouts('a,b\n1,2', 'kg'), /unknown-format/)
})

test('todos los alias apuntan a ejercicios que existen', () => {
  const missing = Object.entries(ALIASES).filter(([, id]) => !catalog.get(id))
  assert.deepEqual(missing, [])
})

test('emparejar nombres de Strong y Hevy con el catálogo', () => {
  const id = (n: string) => matchExercise(n, catalog)?.id
  assert.equal(id('Bench Press (Barbell)'), 'Barbell_Bench_Press_-_Medium_Grip')
  assert.equal(id('Squat (Barbell)'), 'Barbell_Squat')
  assert.equal(id('Pull Up'), 'Pullups')
  // Sin alias: por palabras en común.
  assert.equal(id('Leg Extensions'), 'Leg_Extensions')
  assert.equal(id('Mi ejercicio raro'), undefined)
})

test('sesiones: ejercicios sin equivalencia conservan su nombre y no se duplican al reimportar', () => {
  const { workouts } = parseWorkouts(STRONG + HEVY.split('\n').slice(0, 0).join(''), 'kg')
  const mapping = new Map(workouts.flatMap((w) => w.exercises).map((e) => [e.name, matchExercise(e.name, catalog)]))
  const sessions = toSessions(workouts, mapping, [])
  assert.equal(sessions.length, 2)
  const custom = sessions[1].exercises[1]
  assert.equal(custom.exerciseId, customId('Mi ejercicio raro'))
  assert.equal(custom.name, 'Mi ejercicio raro')
  assert.equal(sessions[0].exercises[1].tracking, 'time')
  assert.equal(sessions[0].exercises[2].tracking, 'distance_time')
  assert.ok(sessions.every((s) => s.exercises.every((e) => e.sets.every((x) => x.done))))
  // Volver a importar el mismo archivo no añade nada.
  assert.equal(toSessions(workouts, mapping, sessions).length, 0)
})
