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
| 0.1.43 | 9,6 | 9,3 | 9,7 | 9,8 | 9,6 |
| 0.1.44 | 9,6 | 9,4 | 9,7 | 9,8 | 9,6 (9,625) |
| 0.1.45 | 9,6 | 9,5 | 9,7 | 9,8 | 9,7 (9,65) |
| 0.1.46 | 9,6 | 9,5 | 9,7 | 9,7 | 9,6 (9,625) |
| 0.1.47 | 9,6 | 9,4 | 9,6 | 9,6 | 9,6 (9,55) |
| 0.1.48 | 9,7 | 9,5 | 9,7 | 9,5 | 9,6 (9,6) |
| 0.1.49 | 9,7 | 9,5 | 9,7 | 9,6 | 9,6 (9,625) |
| 0.1.50 | 9,6 | 9,5 | 9,8 | 9,6 | 9,6 (9,625) |
| 0.1.51 | 9,6 | 9,6 | 9,8 | 9,6 | 9,7 (9,65) |
| 0.1.52 | 9,6 | 9,6 | 9,6 | 9,6 | 9,6 (9,6) |
| 0.1.53 | 9,6 | 9,6 | 9,3 | — (se detuvo; sin relanzar) | — |

## Rotación de zonas (serix-code)

En cada panel, `serix-code` revisa entera, además del diff, la zona revisada hace más tiempo («nunca» primero; a igual,
la de más arriba). El diff solo enseña lo cambiado: los fallos de la 0.1.14 y la 0.1.15 estaban en código que no se
volvía a leer. Al acabar el panel se apunta aquí la versión.

| Zona | Archivos | Revisada a fondo |
|---|---|---|
| Comidas | lib/nutrition.ts, lib/mealPlan.ts, screens/Food*.tsx | 0.1.48 |
| Amigos y retos | lib/friends.ts, lib/league.ts, screens/Friends.tsx | 0.1.42 |
| Temporizadores, avisos y PWA | lib/timer.ts, lib/lockScreen.ts, lib/intervals.ts, lib/voice.ts, lib/reminders.ts, lib/pwa.ts, sw-template.js | 0.1.43 |
| Estadísticas, metas y logros | lib/stats.ts, lib/goals.ts, lib/achievements.ts, lib/coach.ts, lib/insights.ts, lib/periodCard.ts, lib/shareCard.ts | 0.1.44 |
| Guardado y varias pestañas | lib/store.ts (migraciones, mergeData, deshacer), lib/customExercises.ts | 0.1.45 |
| Pantallas de edición | screens/SessionEdit.tsx, screens/Profile.tsx (medidas), screens/Photos.tsx, lib/photos.ts | 0.1.46 |
| Generador y programas | lib/generator.ts, lib/generatorSlots.ts, lib/balance.ts, screens/RoutinesPrograms.tsx | 0.1.47 |
| Importar y exportar | lib/importCsv.ts, lib/exportCsv.ts, lib/share.ts, lib/foodShare.ts, lib/transfer.ts, lib/zip.ts | 0.1.49 |
| Copia de seguridad | lib/backup.ts, lib/protect.ts | 0.1.50 |
| Progresión y autorregulación | lib/progression.ts, lib/autoreg.ts, lib/warmup.ts, lib/plates.ts, lib/bodyweight.ts | 0.1.51 |
| Entreno | lib/workout.ts, screens/Workout*.tsx, screens/Routines.tsx (editor) | 0.1.52 |
| Fechas y semanas | lib/format.ts, lib/recap.ts, lib/block.ts, lib/wod.ts, router | 0.1.53 |

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

## Pendientes tras 0.1.52

### Fallos míos de la 0.1.52 (por gravedad)
- **Fila resumen de recuperación sin barra** (ux, nuevo): «Recuperándose · ~37–43 h» ocupa casi todo el ancho y la barra queda a cero; poner el estado bajo el nombre o dejar «~37–43 h».
- **`applyDeload` (workout.ts ~167) no usa `lowerWeight`:** mancuerna de 24 → 22,5, curl de barra 12,5 → 12,5 y 5 → 5 (no baja). Un solo helper de «peso más bajo» también para `lightenDiscomfort`, `onLighter` y `loadSuggestion` (autoreg.ts).
- **La descarga contamina `usedWeights`:** no filtra `e.deload`; una descarga con mancuernas deja 22,5 y `dumbbellSeries` deduce la serie de 2,5 (20 sube a 22,5 en vez de 22). Filtrar `!e.deload`.
- **Aislamiento con polea o barra baja a 2,5 kg / 5 lb** (coach y code): curl barra 12,5 → 10 (−20 %), polea 10 → 7,5 (−25 %), 5 → 2,5; la subida (`progressionStep`, 5 %) sube de 1 en 1: asimétrico. Paso fino (1 kg / 2 lb o 1,25) solo para polea y máquina; 2,5 para barra o EZ; cabecera de `lowerWeight` contradictoria.
- Bajos: kettlebell en kg fuera de serie (17,5 → 13,5; 18 → 14 salta el 16) y en lb (35 → 30); mancuernas en lb a 5 lb (10 → 5); `failedStreak` lineal no salta sesiones cortadas; sin test de que Profile/Transfer usen `restoreData`, `RecoveryCard`, `TodayTarget`, `stallShown`; sustituir ejercicio pierde progression/tempo/percent; TM del 5/3/1 y tempo sin tope; «Bajar un 10 %» en asistidas baja la ayuda; `trainedTodayHome` duplicado (Home.tsx:50/209); `withUndo` frágil; `dropped` sin el tope de 1.000 km.

### serix-ux (9,6)
- Gemelos: el mapa los pinta como trabajados y no salen en la recuperación ni en «Series por semana y grupo». Músculos aún mezcla «7 días» y «4 semanas»; «Por debajo:» sin priorizar.
- Inicio el día de entreno con rutina: «Guarda una copia» + «Hoy ya has entrenado» + «Tu entrenador» (sin verificar tras entrenar). Importar de Strong con título sin centrar; «1000 toneladas» frente a «190,9 toneladas»; mapa oscuro y «+10 kcal sobre tus 1210» sin verificar. Bajada lineal sin ver en pantalla.

### serix-code (9,6)
- Zona Entreno leída entera (0.1.52): sin fallos altos (ver los de `applyDeload`/`usedWeights` arriba). Siguen los abiertos de antes: `loadSuggestion`, `plates.ts` `loadBar`, `bodyweight.ts` `fillBodyweights`, `share.ts` decode sin topes, bajos de backup.ts, transfer.ts sin tope de QR, `plannedSets` ambiguo; partir generator.ts, figures.ts, nutrition.ts y Food.tsx.

### serix-coach (9,6)
- `lowerWeight` verificado en 140 kg y 315 lb: mancuernas de 2 y de 2,5 kg, barra en kg y lb, kettlebell estándar, todo baja a pesos que existen.
- Generador sin tocar: `homeLegs` por nivel (generatorSlots.ts:53; búlgara y peso muerto a una pierna solo desde intermedio), `Negative_Pull-Up` solo con barra, segundo `homePull`, abdomen < 4 series, elevación lateral, RDL a 2 series. Nutrición: `restDayKcal`, aviso «más calorías» con `up < 60`, 2 evaluaciones en `weightAdvice`, 5/3/1 por semana de calendario. Idea: test de barrido que compruebe que todo peso bajado existe.

### serix-perf-a11y (9,6)
- Lighthouse móvil 99/100/100/100 en dos pasadas (FCP 0,9-1,0 s, LCP 1,9-2,0 s, TBT 0-100 ms, CLS 0-0,003). axe 0 violaciones en todas las pantallas y temas, también con 0, 1 y 5 grupos recuperándose y la fila resumen. Zonas táctiles cumplen (con `::after`).
- Abiertos: chunk de entrada de ~312 kB (LCP < 1,5 s), dos h1 en «Objetivo diario», campos de objetivo a 80×25, recorte de texto en el e2e; sin re-medir el entreno en curso ni el peso de Inicio.

## Pendientes tras 0.1.53 (hecho en la 0.1.54: escaleras de peso unificadas, descarga de asistidas y lastre, lightenDiscomfort/onLighter/loadSuggestion/lighten con lowerWeight, mancuernas en lb, curl con barra al subir, relative(), tons(), Gemelos en recuperación, «Por debajo» ordenado, copia el día de entreno, history en blockDeload, test de barrido)
- Sin hacer: generador (homeLegs por nivel, Negative_Pull-Up con barra, segundo homePull; rompió el barrido dos veces), nutrición (restDayKcal, `up < 60`, 2 evaluaciones, 5/3/1), Gemelos en «Series por semana» (el índice de MAIN_GROUPS va en enlaces de amigos y el generador), ventana única de Músculos, chunk de entrada de 312 kB, h1 doble de «Objetivo diario», campos de 80×25, share/transfer/backup (topes), partir ficheros grandes, kettlebell en lb y fuera de serie, `failedStreak` lineal con sesiones cortadas, tests de RecoveryCard/TodayTarget/stallShown, importar de Strong centrado.
- Hecho además en la 0.1.54 (segunda pasada): kettlebell por serie real (kg y lb), `failedStreak` sin sesiones cortadas, 2 evaluaciones en `weightAdvice`, aviso de entreno extra solo si `up >= 60`, topes de share/transfer/backup (rutinas, ejercicios, descompresión, ids repetidos, trainingTime), título de hojas centrado y h2 en hojas, `todayWhy`/`stallOffered` con test.
- Tercer intento fallido en el generador: reordenar `squat` (sentadilla de peso corporal antes que la búlgara) rompe el barrido (fatLoss/intermediate/bodyweight/3d/45: empuje 28, tirón 18,5). Hace falta primero el segundo `homePull` y tocar `balanceWeek`.
- Sigue sin hacer: ventana única de Músculos, Gemelos en «Series por semana», chunk de entrada, restDayKcal (sin criterio concreto), 5/3/1 por semana de calendario, partir ficheros grandes.
- Tercera pasada 0.1.54: «Equilibrio muscular» con la misma ventana que «Series por semana», Gemelos en «Series por semana» (`weeklyCalfSets`, fuera de MAIN_GROUPS). El 5/3/1 ya iba por semana de calendario. Siguen sin hacer: generador (principiante en casa, `homePull` extra), chunk de entrada (Home va en el entry; sin perfilar), `restDayKcal`.
