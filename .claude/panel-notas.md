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

## Pendientes tras 0.1.49 (duración del detalle de rutina y foco del interruptor: resueltos y medidos por ux y perf)

### serix-ux (9,7)
- Progreso › Músculos: «Recuperándose · ~47 h» repetido 8 veces (línea resumen con el detalle plegado) y pantalla muy larga; mapa en oscuro con
  tonos 1-3 y 4-9 casi iguales. «Equilibrio muscular»: «La proporción entre los dos es normal» idéntico para Empuje 19 / Tirón 22,5 y
  Cuádriceps 7,5 / Isquios 4 (casi 2:1) mientras más arriba los isquios están «por debajo».
- Inicio el día de entreno: «Hoy ya has entrenado» + recuperación + «Empezar igualmente» + «Tu semana pasada»/«Entendido»: un aviso menos.
- Título cortado en la cabecera del entreno («Día 1 · Cuerpo com…» con «0 de 18» al lado).
- Logros en pasado, también los pendientes («Entrenaste al menos una vez a la semana…», 79 / 100); pasar a presente.
- «sesión»/«semana»: «28 sem. de racha» frente a «Racha de 26 semanas».
- Detalle de rutina: «Igual que antes» repetido en cada fila (3 de 3, 12 de 12): mostrarlo solo si cambia algo; dice 28 min cuando los
  entrenos reales duran 50.
- Comidas: «Día de entreno: +10 kcal sobre tus 1210» con el suelo aplicado es ruido («sin cambio, suelo de 1200»); dos líneas de ajuste
  («+150 sobre tus 1500», «230 kcal menos») sin suma en un solo sitio. Separador de miles incoherente («1.200 kcal», «1.000 ejercicios» frente
  a «1200 / 1220 kcal», «1000 toneladas»).
- Sin recorrer: aviso de bíceps olvidado. Resueltos esta vez: «@8», «77,5…» cortado, bienvenida con usuario nuevo (limpia).

### serix-code (9,5)
- Diff 0.1.49 (media-baja, mío): `FoodGoals.tsx:132-135` «Incluye −150 kcal del ajuste según tu peso» y el botón «Quitarlo» usan `saved.adjust`, no el
  ajuste aplicado (0 si el suelo lo recorta o si cambió el objetivo): mostrar `adjust` y, si es 0 por el suelo, «El ajuste no cabe: ya estás en tu
  mínimo». `clampAdjust` devuelve decimales (−129,75 → kcal 1280,25, carbs 32,4): `Math.round` a decenas. Sin sexo no hay suelo. Con «Lo que
  gastas», el texto de «Más calorías los días de entreno» (FoodGoals.tsx:~196) sigue describiendo la cantidad fija.
- Test de `clampAdjust` (tests/mealPlan.test.ts) no prueba la rama del suelo: con la mujer de 52 kg el BMR (1240) y el suelo (1200) coinciden; añadir
  mujer de 45 kg, 160 cm, 40 años, kcal 1300 (BMR 1089) → `-100`. Sin test del texto de FoodGoals.
- Zona Importar y exportar (leída entera, sin fallos altos) — media: `share.ts:~154` `decode` no valida `payload.p` ni `tracking` (un enlace manipulado
  guarda `programName` como objeto y `tracking:'zzz'` y rompe Routines.tsx en cada arranque, porque la carga normal no sanea: validar con
  `typeof` y longitud y `oneOf`/TRACKING como backup.ts); `importCsv.ts` sin tope en peso, repeticiones, duración ni longitud de nombre (99999999999 kg
  entra tal cual); `toSessions` nunca pone `assisted` (un «Assisted Pull Up» de Hevy se importa como 30 kg de carga).
- Baja: `Math.max(0, weight)` borra los pesos negativos de Strong (asistidas); `parseDate` no lee «22 de dez. de 2025» (portugués) y toma «Z» como
  hora local; `num` con «1.234,5» da 0; «Workout» sin traducir; dos entrenos con el mismo inicio y nombre se fusionan; exportCsv: numeración por
  lados si R va antes que L, nota de un entreno sin series hechas no se exporta, notas con espacio o salto antes de «=» sin escapar; share.ts `catch`
  devuelve «cancelled» ante cualquier error y `clipboard.writeText` sin try, `tracking:'weight_reps'` explícito sin grupo se pierde; transfer.ts sin
  tope de QR, id de envío de 4 caracteres, sin límite al descomprimir (tampoco foodShare); zip.ts bien (sin ZIP64, sin comprimidos de otras apps).
- Del panel anterior (baja): `weightAdvice` no propone nada si `kcal − 150` queda bajo el suelo (mejor `Math.min(150, margen)`); sin 2 evaluaciones seguidas.
- De antes (baja): `restDayKcal`, `recoveryHint`, fotos (`importPhotos` con la caché `photos ?? []`, importación a medias por cuota, AddSheet.save,
  Viewer con void), SessionEdit.save, `lastPhotoAt` en la copia, guardado y varias pestañas (flush, mergeRecord, runMigrations, migrateData, mergeList,
  aviso de deshacer), Comidas (recordatorios solo la siguiente comida, FoodScan con «Atrás», `dayText` con «Whey 2.0», AmountSheet con 0 g, `key={n}`),
  compareWithLast con «Free workout», repRecords, exerciseHistory, periodStats, embeddedFont, navigator.share, addRest(-15), pwa.ts register,
  rollingAverage, weighDue, SW, speechSynthesis, foodStep, plannedSets/deloadSets(2), retos y liga; partir generator.ts (1111), figures.ts y
  nutrition.ts (1001)/Food.tsx (812); setUnits.

### serix-coach (9,7)
- Doble progresión sin descarga tras estancamiento (`progression.ts:196-199`): solo `linear` baja un 10 % tras 3 fallos; en `double` un estancado repite
  el peso («hold») indefinidamente. Propuesta: contador propio (failedStreak no vale), estancado si en 3 sesiones al mismo peso las repeticiones totales no
  superan la mejor anterior; a la 3.ª sugerir −10 % y vuelta a `repsMin` (`kind: 'down'`, `mode: 'double'`), antes si RPE ≥ 9,5 con rendimiento a la
  baja, sin repetir la bajada antes de 3 sesiones; tests: estancado en 3 sesiones baja, sube de 8 a 9 reps no baja. Es lo que más sube (~+0,1).
- Nutrición abiertos: exigir 2 evaluaciones seguidas en `weightAdvice` (tendencia de 21 días); `restDayKcal` en perder grasa («quemadas», −100-150 kcal);
  5/3/1 por semana de calendario y AMRAP; silencio en el límite (en el BMR y estancada, sin aviso: «revisa si apuntas todo, sube la actividad o pausa de
  dieta»); ocultar «Más calorías los días de entreno» si `up < 60`.
- Generador (3600 programas, idéntico): principiante sin material con Bulgarian_Split_Squat (200), Single_Leg_Deadlift (283), Negative_Pull-Up (165); abdomen
  < 4 series 322 de 1440; sin elevación lateral 88 de 150 de hipertrofia en gimnasio y 56 de 600 de gimnasio sin hombro; RDL a 2 series 10 de 240;
  asistidas sin sugerencia de bajar la ayuda (58 programas); Mountain_Climbers y Freehand_Jump_Squat como quads. Filtrar Single_Leg_Deadlift rompió el test de
  empuje/tirón de fatLoss/beginner/bodyweight/3d/45 y la búlgara la usa «HIIT en casa» (tests/library-balance.test.ts): ajustar el relleno a la vez.
  Pasar su barrido (scratchpad/m5/m.ts) a tests con umbrales máximos.

### serix-perf-a11y (9,6)
- Lighthouse móvil 99-100 (LCP 1,9-2,0 s); axe 0 violaciones en 17 pantallas, claro y oscuro (Amigos en oscuro sin medir esta vez); foco y zonas táctiles bien.
- Duración del detalle de rutina: resuelta y medida con el ancho real del texto (peor caso «~999»: 67 px en una celda de 85,7), también en francés.
- Pendientes menores: comprobación de recorte del texto de la banda (ancho del texto frente a la celda a 375 px, es y fr) en el e2e; dos h1 en la hoja
  «Objetivo diario»; LCP < 1,5 s y TBT estable en 0 ms para el 10.
