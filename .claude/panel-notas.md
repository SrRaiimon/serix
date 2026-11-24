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
| Guardado y varias pestañas | lib/store.ts (migraciones, mergeData, deshacer), lib/customExercises.ts | 0.1.45 |
| Pantallas de edición | screens/SessionEdit.tsx, screens/Profile.tsx (medidas), screens/Photos.tsx, lib/photos.ts | 0.1.46 |
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

## Pendientes tras 0.1.46 (ux sin repetir bienvenida ni subpantallas de Perfil; perf midió con Lighthouse y axe)

### serix-ux (9,6)
- Inicio el día de entreno: siguen apiladas tres tarjetas (recuperación, «Tu semana pasada» con «Entendido» y «Tu entrenador»
  con «Cambia Dominadas») antes de «Esta semana»; una sola prioridad.
- Mapa en oscuro: tonos 1-3 y 4-9 casi iguales (solo se distingue 10+).
- Progreso › Músculos repite 8 veces «Recuperándose · ~48 h»: una línea resumen. Resumen: «114 kg» de dominadas parece un peso
  de barra (poner «máx. estimado»); detalle del entreno: «+10 kg × 8» sin el peso corporal.
- Sin verificar: bienvenida con «Tu plan» y vista previa seguidas; detalle de rutina «Aún sin estrenar» + «Igual que antes»;
  calentamiento como texto y «¿Cómo estás hoy?»; «@8», «77,5…» cortado, título de rutina cortado, aviso de bíceps, logros
  en pasado, «sesión»/«semana», figuras (disco del remo, lumbar de la hack).

### serix-code (9,5)
- Diff 0.1.46 (baja): `recoveryHint` (Home.tsx:49-51) no mira `active` y oculta la copia aunque no haya aviso; quien entrena
  4+ días casi nunca ve el recordatorio de copia, sin tope de espera; regla de «cansado» duplicada en NextCard (:206) y
  recoveryHint (:49): sacarla a una función.
- Zona Pantallas de edición — media: Photos.tsx:325/~245 la postura de la cámara guiada (Perfil/Espalda) se pierde, AddSheet
  abre siempre en «Frente» (arreglo de una línea); photos.ts:~185 importPhotos deduplica por fecha|pose y descarta la segunda
  foto del mismo día y postura (pérdida silenciosa).
- Baja: importación a medias por cuota sin reload() y aviso engañoso «No es un archivo de fotos de Serix»; AddSheet.save dice
  «No se ha podido leer la imagen» ante cualquier error (cuota); fechas sin validar rango al importar; Viewer lanza
  deletePhoto/updatePhoto con void; SessionEdit.save resucita un entreno borrado en otra pestaña y `end` puede quedar en el
  futuro; medidas sin editar y dos del mismo día; `lastPhotoAt` viaja en la copia y engaña en otro móvil. Falta cobertura de
  tests de fotos.
- De antes (baja): zona Guardado y varias pestañas (flush con knownRev desfasado ~385, mergeRecord por valores enteros ~265,
  runMigrations copia superficial ~410, migrateData sin saneado ~430, mergeList sin clave, aviso de deshacer que se pierde);
  compareWithLast con «Free workout» frente a «Entrenamiento libre»; repRecords, exerciseHistory con drop sets, periodStats
  O(m·n), embeddedFont sin reintento, navigator.share, moreSets repetido, meta bajo el 1RM, logro de récords duplicado;
  addRest(-15), pwa.ts register sin catch, rollingAverage O(n²), weighDue con pesada futura, SW segundo aviso, speechSynthesis
  en iOS, foodStep, plannedSets/deloadSets(2), retos y liga; One-Arm_Flat_Bench_Dumbbell_Flye; tests de armLen y
  TIE.directArm; partir generator.ts y figures.ts; setUnits.

### serix-coach (9,7)
- Principiante sin material: los 200 programas llevan Bodyweight_Bulgarian_Split_Squat (200), Single_Leg_Deadlift (283) o
  Negative_Pull-Up (165). Filtrar Single_Leg_Deadlift de HARD_START rompió el test de empuje/tirón de
  fatLoss/beginner/bodyweight/3d/45 y la búlgara la usa a propósito el programa «HIIT en casa» (tests/library-balance.test.ts):
  ajustar el relleno a la vez.
- Abdomen < 4 series en fatLoss/general ≥45 min: 322 de 1440; sin elevación lateral 88 de 150 programas de hipertrofia en
  gimnasio y 56 de 600 de gimnasio sin hombro; RDL a 2 series primero en 10 de 240 días B de principiante; asistidas sin
  sugerencia de bajar la ayuda (sin verificar); Mountain_Climbers y Freehand_Jump_Squat con muscle=quads.
- Recuperación (stats.recoveryHours, RECOVERING 0,6): bien; mejora posible con factor por grupo (brazos, hombros, gemelos
  tardan menos) y la frecuencia de las últimas semanas.
- Su barrido (scratchpad/m3/m.ts) debería pasar a tests/generator-sweep.test.ts con umbrales máximos.

### serix-perf-a11y (9,7)
- Lighthouse móvil 99-100 (LCP 2,0 s); axe 0 violaciones en las pantallas, también Progreso › Músculos con datos.
- **Borde de `.recovery-bar` (styles.css:2298, `var(--text-3)`) a 2,00:1 en claro y 2,69:1 en oscuro: 1.4.11 pide 3:1.** Usar
  `var(--text-2)` o un borde de mayor opacidad.
- Zonas táctiles: buscador de Ejercicios 243×25 sin zona ampliada; `.toggle` 51×31 (zona 27×27, fila de 81 px); input «Tu
  nombre» de Amigos 140×43.
- Precarga de nutrition en la bienvenida (LCP < 1,8 s).
