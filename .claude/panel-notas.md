# Notas del panel de evaluadores

Lo actualiza `/serix-panel` tras cada evaluación: una fila por versión y los pendientes de la última, que se
pasan a cada evaluador la vez siguiente.

| Versión | Diseño y uso | Código | Entrenador | Rendimiento y accesibilidad | Global |
|---|---|---|---|---|---|
| 0.0.66 | 6,8 | 7,6 | 7,6 | 8,6 | 7,7 |
| 0.0.67 | 7,3 | 8,1 | 7,9 | 8,9 | 8,1 |
| 0.0.68 | 7,6 | 8,3 | 8,3 | 9,1 | 8,3 |
| 0.0.69 | 8,1 | 8,5 | 8,4 | 9,2 | 8,6 |
| 0.0.70 | 8,4 | 8,5 | 8,5 | 9,4 | 8,7 |
| 0.0.73 | 8,6 | 8,8 | 8,8 | 9,5 | 8,9 |
| 0.0.84 | 8,8 | 8,9 | 9,0 | 9,6 | 9,1 |
| 0.0.92 | 8,9 | 9,1 | 8,9 | 9,7 | 9,2 (9,15) |
| 0.0.94 | 9,0 | 9,2 | 9,1 | 9,8 | 9,3 (9,28) |
| 0.0.96 | 9,2 | 9,3 | 9,2 | 9,5 | 9,3 (9,30) |
| 0.0.99 | 9,3 | 9,4 | 9,3 | 9,7 | 9,4 (9,43) |
| 0.1.2 | 9,4 | 9,3 | 9,4 | 9,8 | 9,5 (9,48) |
| 0.1.3 | 9,5 | 9,4 | 9,5 | 9,8 | 9,6 (9,55) |
| 0.1.4 | 9,6 | 9,5 | 9,6 | — (se paró: salió la 0.1.5) | — |
| 0.1.5 | 9,7 | 9,6 | 9,6 | 9,9 | 9,7 |
| 0.1.6 | 9,7 | 9,6 | 9,7 | 9,8 | 9,7 |
| 0.1.7 | 9,8 | 9,5 | 9,7 | 9,9 | 9,7 (9,725) |
| 0.1.8 | 9,8 | 9,5 | 9,8 | 9,8 | 9,7 (9,725) |
| 0.1.10 | 9,8 | 9,4 | 9,8 | 9,7 | 9,7 (9,675) |
| 0.1.12 | 9,8 | 9,5 | 9,8 | 9,8 | 9,7 (9,725) |
| 0.1.15 | 9,8 | 9,1 | 9,8 | 9,8 | 9,6 (9,625) |
| 0.1.42 | 9,6 | 9,2 | 9,6 | 9,6 | 9,5 |

## Rotación de zonas (serix-code)

En cada panel, `serix-code` revisa entera, además del diff, la zona revisada hace más tiempo («nunca» primero; a igual,
la de más arriba). El diff solo enseña lo cambiado: los fallos de la 0.1.14 y la 0.1.15 estaban en código que no se
volvía a leer. Al acabar el panel se apunta aquí la versión.

| Zona | Archivos | Revisada a fondo |
|---|---|---|
| Comidas | lib/nutrition.ts, lib/mealPlan.ts, screens/Food*.tsx | 0.1.15 |
| Amigos y retos | lib/friends.ts, lib/league.ts, screens/Friends.tsx | 0.1.42 |
| Temporizadores, avisos y PWA | lib/timer.ts, lib/lockScreen.ts, lib/intervals.ts, lib/voice.ts, lib/reminders.ts, lib/pwa.ts, sw-template.js | nunca |
| Estadísticas, metas y logros | lib/stats.ts, lib/goals.ts, lib/achievements.ts, lib/coach.ts, lib/insights.ts, lib/periodCard.ts, lib/shareCard.ts | nunca |
| Guardado y varias pestañas | lib/store.ts (migraciones, mergeData, deshacer), lib/customExercises.ts | nunca |
| Pantallas de edición | screens/SessionEdit.tsx, screens/Profile.tsx (medidas), screens/Photos.tsx, lib/photos.ts | nunca |
| Generador y programas | lib/generator.ts, lib/generatorSlots.ts, lib/balance.ts, screens/RoutinesPrograms.tsx | 0.1.9 |
| Importar y exportar | lib/importCsv.ts, lib/exportCsv.ts, lib/share.ts, lib/foodShare.ts, lib/transfer.ts, lib/zip.ts | 0.1.15 |
| Copia de seguridad | lib/backup.ts, lib/protect.ts | 0.1.15 |
| Progresión y autorregulación | lib/progression.ts, lib/autoreg.ts, lib/warmup.ts, lib/plates.ts, lib/bodyweight.ts | 0.1.15 |
| Entreno | lib/workout.ts, screens/Workout*.tsx, screens/Routines.tsx (editor) | 0.1.15 |
| Fechas y semanas | lib/format.ts, lib/recap.ts, lib/block.ts, lib/wod.ts, router | 0.1.15 |

## Revisiones fuera del panel (Claude, 0.1.37-0.1.41)

Zona entera leída y arreglado lo encontrado, con test que falla antes del arreglo. No sustituye a serix-code: la
tabla de arriba sigue mandando en la rotación; esto es para no repetir lo ya visto.
- 0.1.37 Amigos y retos: enlace viejo pisaba el resumen nuevo; objetivo «50.000» leído como 50; aviso de tu propio
  enlace; semanas con reloj adelantado; unirse dos veces.
- 0.1.38 Temporizadores y PWA: descanso terminado dos veces al volver (doble pitido y voz); intervalos sin pantalla
  encendida al volver; voces cargadas antes; hora de la pantalla bloqueada en el idioma de la app.
- 0.1.39 Estadísticas, metas y logros: «+0 kg» en la tarjeta de récord; récords de logros ≠ resumen; descansos de
  «Lo que te hace rendir mejor» desde el entreno anterior de cualquier tipo; meta conseguida con la fecha de la marca.
- 0.1.40 Guardado y varias pestañas: relectura a mitad de un guardado perdía lo de esta pestaña.
- 0.1.41 Pantallas de edición: corregir un entreno borraba las molestias de ejercicios sin series; cámara guiada sin
  aviso si no hay cámara y sin poder repetir. Programas: 1RM del 5/3/1 sin tope. Sin fallos: importar y exportar
  (CSV, zip, QR), progresión y autorregulación, workout.ts (las pantallas Workout*.tsx no se leyeron línea a línea).

## Pendientes tras 0.1.42 (panel en una sesión nueva: sin Lighthouse ni axe instalados; ux y perf usaron un
## playwright-core que ya estaba en el disco con el Chrome del sistema y midieron a mano).

### serix-ux (9,6)
- **Bienvenida duplica el programa** (Onboarding.tsx:214 frente a :157): «Guardar programa» guarda las rutinas pero
  `onboarded` solo se pone en el paso de comidas; si se cierra ahí, vuelve la bienvenida y quedan 6 rutinas y
  «Cuerpo completo · Hipertrofia (2)». Marcar onboarded al guardar el programa.
- Programa por defecto (principiante, músculo, 3 d, gimnasio): Cuerpo completo B sin press (la regla de
  generator.ts:766 acepta la elevación lateral o el tríceps como empuje; contradice el changelog 0.1.17).
- Torso A principiante 6d/60: 9 de empuje frente a 3 de tirón y sin remo; variantes del mismo aislamiento en días
  seguidos (tríceps, jalón, extensión de cuádriceps). Kettlebell 4d/45: Torso B de 3 ejercicios, sin press de
  hombro, dos zancadas en Pierna B.
- Mapa en oscuro: tonos 4-9 y 1-3 casi iguales (styles.css:1869-1870).
- «77,5…» cortado en «Última vez» del detalle (Exercises.tsx:335); dominadas con tu peso encabezan «Tus mejores
  marcas» (104 kg); descarga «sesión» en Progreso (Progress.tsx:642) y «semana» en el entrenador; aviso de bíceps
  olvidado en la tarjeta de Pierna B (Home.tsx:238); logros pendientes en pasado (achievements.ts:45-55); «Frente a
  la última vez» no dice los ejercicios saltados; título de rutina cortado en el entreno; «Más de 900» (son 1081);
  «@8» sin explicar; «Hacer sesión de descarga» aún en el menú de ajustes.
- Figuras: el disco del remo con barra aún tapa rodilla y muslo; en la hack arriba la lumbar se separa del raíl.

### serix-code (9,2)
- **Media:** saveAsRoutine reasigna a la rutina todos los entrenos sin rutina con el mismo nombre (workout.ts:493),
  también «Entrenamiento libre»; sin deshacer. No reasignar con el nombre por defecto o exigir los mismos ejercicios.
  (ux lo da por bueno: la idea vale, falta acotarla.)
- **Media (Amigos y retos):** liveChallenges corta a 10 por fecha de fin y deja fuera el reto nuevo
  (friends.ts:236); amigos sin nombre comparten friendKey y se pisan (friends.ts:306, Friends.tsx:227); la
  clasificación final solo se asienta al abrir Retos y un resumen nuevo la borra (Friends.tsx:412-415, :641).
- Baja-media: plannedSets sin rutina invierte mal la descarga con round(done/0.6) (workout.ts:339); deloadSets(2).
- Baja (Amigos): salir de un reto vuelve como invitación (friends.ts:158-165); reto de repeticiones con ejercicios
  por tiempo (Friends.tsx:291); tope de récords de la liga 15 y no 25 (league.ts:21-24, recentRecords corta a 3);
  reloj adelantado fuera de la liga (league.ts:28); cambiar de nombre duplica (friends.ts:180, :457).
- Baja: descanso de localStorage restaurado en todas las pestañas (timer.ts:311-320); One-Arm_Flat_Bench_Dumbbell_Flye
  con dos mancuernas (figures.ts:4400); test de armLen; comentario de foreLen2 no vale para la vista de perfil;
  migrateData en cada refreshFromDisk (store.ts:620).
- De antes: hooks-order con returns de varias líneas; beforeDeload en backup.ts:111 y migrateData; test de
  TIE.directArm; partir generator.ts (1080) y figures.ts (5028); decidir setUnits (stats.ts:44).

### serix-coach (9,6)
- **Hombro lateral en hipertrofia:** volume.ts:19 suma 0,5 de hombro por press, remo y jalón y balanceWeek
  (generator.ts:511) quita la elevación lateral: sin ella 32/48 programas de gimnasio (48/48 en kettlebell,
  suspensión y peso corporal); 59 sin ningún ejercicio de hombro. Contar el hombro directo aparte.
- **Empuje mal contado:** pushPullShares (volume.ts:47, :51) cuenta el deltoides de remos y jalones como empuje.
  Siguen 3 semanas sin ningún press (Fuerza principiante gimnasio 2×30; kettlebell fatLoss 2×30), 78 días de cuerpo
  completo sin press, 5 con dos remos. El test debe exigir un press o tríceps como músculo principal.
- Remo invertido con barra de puerta: 1364 programas (generatorSlots.ts:32, :55; NEEDS_BAR en generator.ts:142).
- Mismo ejercicio en días seguidos: 283 con barra (el test tolera 300) y 976 sin barra (no se mide).
- Abdomen en fatLoss/general ≥45 min: 52 con < 4 series, 53 sin directo. Días < 60 %: 27 PPL, 11 otros.
- Asistidas sin progresión (workout.ts:100). Lying_Triceps_Press como aislamiento (8-12).
- Figuras: respaldo de la hack a unos 40-45° (va a −18°); aperturas de perfil (figures.ts:305) con los brazos al
  suelo (comprobar qué ejercicios usan aún esa figura).

### serix-perf-a11y (9,6)
- **Contraste de controles < 3:1 (1.4.11):** .set-check (styles.css:1327, 2,0:1 claro y 2,7:1 oscuro), .pick-circle
  (:1657), .coach-hide (:2821). Usar --text-2 o un color ≥ 3:1.
- Anillo de foco recortado por overflow hidden en .list (:512-517) y .home-tools (:1142): 33 controles.
  outline-offset -2px en .list > .list-row:focus-visible y .home-tool:focus-visible.
- LCP de la primera visita 3,2 s (red Slow 4G real): precargar Onboarding si no se ha hecho el cuestionario y quitar
  la precarga de nutrition (86 % sin usar en la bienvenida).
- Anillo del h1 corta las letras (styles.css:147); marcador «Tu nombre» en oscuro a 4,0:1.
- Test del orden de luminancia del mapa; JS y CSS sin usar. Medir con Lighthouse y axe reales cuando estén.
