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

## Rotación de zonas (serix-code)

En cada panel, `serix-code` revisa entera, además del diff, la zona revisada hace más tiempo («nunca» primero; a igual,
la de más arriba). El diff solo enseña lo cambiado: los fallos de la 0.1.14 y la 0.1.15 estaban en código que no se
volvía a leer. Al acabar el panel se apunta aquí la versión.

| Zona | Archivos | Revisada a fondo |
|---|---|---|
| Comidas | lib/nutrition.ts, lib/mealPlan.ts, screens/Food*.tsx | 0.1.15 |
| Amigos y retos | lib/friends.ts, lib/league.ts, screens/Friends.tsx | 0.1.42 |
| Temporizadores, avisos y PWA | lib/timer.ts, lib/lockScreen.ts, lib/intervals.ts, lib/voice.ts, lib/reminders.ts, lib/pwa.ts, sw-template.js | 0.1.43 |
| Estadísticas, metas y logros | lib/stats.ts, lib/goals.ts, lib/achievements.ts, lib/coach.ts, lib/insights.ts, lib/periodCard.ts, lib/shareCard.ts | 0.1.44 |
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

## Pendientes tras 0.1.44 (ux recorrió la web con puppeteer a 375×812; perf midió con Lighthouse y axe)

### serix-ux (9,6)
- Mapa en oscuro: tonos 4-9 y 1-3 casi iguales; Progreso › Músculos con muchos grupos «Recuperándose · ~48 h» y barras
  casi invisibles (ordenar por el más cercano a estar listo o agrupar).
- Inicio con entreno de hoy: aviso «Aún recuperándose…» + «Empezar igualmente» + «Guarda una copia» apilados antes de
  «Esta semana».
- Detalle de rutina con «Aún sin estrenar» e «Igual que antes» a la vez (¿sesiones sin routineId?).
- Entreno: «Movilidad 5 min» y calentamiento de cuatro filas antes de la primera serie.
- Textos: «Más de 900» (son 1081, Onboarding.tsx:280); «sesión» (Progress.tsx:642, WorkoutExercise.tsx:506/524) frente a
  «semana» en el entrenador; «Hacer sesión de descarga» en ajustes; «Frente a la última vez» sin los saltados
  (Session.tsx:219); «@8»; «77,5…» cortado; título de rutina cortado; aviso de bíceps; logros en pasado; dominadas con tu peso.
- Figuras: disco del remo y lumbar de la hack (sin verificar).

### serix-code (9,4)
- Zona Estadísticas, metas y logros — media: insights.ts:23-30 sessionScores no excluye descargas; stats.ts:467 compara
  entrenos libres por el nombre por defecto (y rompe al cambiar de idioma); shareCard.ts:128-129 muestra «85 kg × 8» en
  dominadas en vez de «+10 kg» (usar record.added).
- Baja: logro de récords cuenta dos por ejercicio repetido; repRecords desempata por orden del array; exerciseHistory
  mete drop sets en el 1RM; periodStats O(m·n) (175 ms con 1500 sesiones); embeddedFont no reintenta; navigator.share
  con cualquier error → «cancelled» sin descargar; consejo moreSets repetido con 10 series; meta por debajo del 1RM
  actual se logra al instante.
- Abiertos de antes: addRest(-15) con < 15 s; pwa.ts register sin catch; rollingAverage O(n²); weighDue con pesada
  futura; segundo aviso del SW; speechSynthesis.cancel en iOS; foodStep; plannedSets/deloadSets(2); salir de un reto;
  reto de repeticiones con ejercicios por tiempo; tope de récords y reloj en la liga; cambio de nombre que duplica;
  One-Arm_Flat_Bench_Dumbbell_Flye; test de armLen y TIE.directArm; migrateData en refreshFromDisk; partir
  generator.ts y figures.ts; setUnits.

### serix-coach (9,7)
- Ejercicios avanzados a principiantes sin material: Bodyweight_Bulgarian_Split_Squat, Single_Leg_Deadlift,
  Negative_Pull-Up; Glute_Ham_Raise 2×3-6 en fatLoss con mancuernas intermedio; ¿Mountain_Climbers y Freehand_Jump_Squat
  cuentan como cuádriceps?
- Remo invertido con barra de puerta (1076); abdomen < 4 series en fatLoss/general ≥45 min (160 de 1800 con su criterio);
  día B principiante con Floor_Press 2×6-10 primero en gimnasio 3d/60; asistidas sin sugerencia de bajar la ayuda;
  RDL a 2 series primero en pierna B de principiante.
- Su script (scratchpad/m1) no pasó a tests/; sus filtros de «hombro directo» y «gimnasio» fallaron.

### serix-perf-a11y (9,8)
- Lighthouse móvil 99-100 (LCP 2,0 s); axe 0 violaciones en 15 pantallas, claro y oscuro; placeholder a 6,3:1 oscuro.
- Menores: input «Tu nombre» de Amigos 140×43 (min-height 44px); buscador de Ejercicios 243×25; .toggle 51×31 (zona 27×27);
  precarga de nutrition en la bienvenida; LCP < 1,8 s.
