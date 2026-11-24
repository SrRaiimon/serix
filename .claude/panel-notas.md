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

## Pendientes tras 0.1.48 (interruptores ya a 51×31 visibles y zona 65×45, comprobado por ux, perf, code y yo)

### Duración cortada en el detalle de rutina (perf la ve cortada en la web publicada, ux no con «~50 min»: comprobarlo con captura propia)
- `.stat-band.three strong` (styles.css:2485-2489): `nowrap` + `ellipsis`; en 375 px la celda mide 86 px (58 de contenido) y «~62 min»
  (cifra 26 px + `small` 14,3 px) sale «~62 …». scrollWidth = clientWidth, así que ningún test de desbordamiento lo detecta: hace falta
  captura o comparar el ancho del texto con la celda. Opciones: «min» en la etiqueta, cifra grande y «min» debajo, cifra a 22 px o
  quitar el ellipsis. Añadir una comprobación de recorte al e2e (375 px, español y francés).
- El aviso de ux «dice 28 min cuando los entrenos reales duran 50» sigue sin tocarse.

### serix-ux (9,7)
- Anillo de foco del interruptor (65×45) deja ~7 px de hueco respecto al verde: `outline-offset` negativo.
- Progreso › Músculos: «Recuperándose · ~48 h» repetido 8 veces (una línea resumen con el detalle plegado); pantalla muy larga.
  Mapa en oscuro: tonos 1-3 y 4-9 casi iguales.
- «La proporción entre los dos es normal» idéntico en las dos barras, sin razón ni umbral (2:1 cuádriceps/isquios sigue «normal» mientras
  más arriba los isquios están «por debajo»).
- Comidas con día de entreno y recorte a la vez: dos líneas («+130 sobre tus 1300», «200 kcal menos») sin cuenta fácil de «1230».
- Inicio el día de entreno: «Tu semana pasada» + «Entendido» empujan «Esta semana»; demasiado aviso en una sola tarjeta («Hoy ya has
  entrenado» + recuperación + «Empezar igualmente»).
- Sin recorrer esta vez: bienvenida, «Aún sin estrenar» + «Igual que antes», «@8», «77,5…» cortado, aviso de bíceps, logros en pasado.

### serix-code (9,5)
- Diff 0.1.48 — media: `FoodGoals.tsx` `trainingShift(result.kcal, perWeek)` sin `maxDown`: «Más calorías los días de entreno» enseña
  +up/−down sin aplicar el suelo (mujer a 1200 que entrena 4 días lee «+120 / −160» y el objetivo real es 1200). Media-baja: el texto de
  «Compensar al día siguiente» sigue prometiendo «hasta el 15 %» y no avisa de que con «Ganar músculo» no actúa ni del suelo.
  Baja: si `kcal − 150` queda bajo el suelo no propone nada (mejor `Math.min(150, margen)`); sin sexo no hay suelo ni `aim`.
  El test del ajuste por peso se cumple por el BMR, no por `MIN_KCAL`: la rama del suelo queda sin probar.
- Zona Comidas (leída entera, sin fallos altos) — media: «Día de entreno: +-200 kcal» en el modo «Lo que gastas» cuando el entreno gasta
  menos que `burnedDaily` (Food.tsx pinta `+${shift}` con shift negativo); el ajuste por peso se conserva al recalcular y puede dejar el
  objetivo bajo el suelo y el BMR (base 1210 con −150 = 1060; `adjustGoals(computed, adjust)` en FoodGoals.tsx; no se descarta al pasar de
  perder a ganar).
- Baja: `useFoodReminders` solo programa la siguiente comida (no avisa de las posteriores ni tras medianoche con la app en segundo plano);
  FoodScan.tsx con «Atrás» durante `findAesan` lleva igualmente a cantidad, y `lookup`/`again` con `data` del primer render (dos
  getUserMedia); `dayText` cambia «Whey 2.0» por «2,0»; ShoppingSheet/shareDay tragan el error de `navigator.share`; `key={n}` en
  SavedMealSheet/RecipeSheet pierde el foco al quitar una fila; AmountSheet guarda 0 g con 0,04 g; RecipeSheet con `portion.g = 0`;
  backup.ts acepta desde 500 kcal y la pantalla desde 800; partir nutrition.ts (1001 líneas) y Food.tsx (812).
- De antes (baja): fotos (importPhotos con la caché `photos ?? []`, importación a medias por cuota, AddSheet.save, Viewer con void);
  SessionEdit.save; `lastPhotoAt` en la copia; `recoveryHint`; guardado y varias pestañas (flush, mergeRecord, runMigrations, migrateData,
  mergeList, aviso de deshacer); compareWithLast con «Free workout»; repRecords, exerciseHistory, periodStats, embeddedFont,
  navigator.share; addRest(-15), pwa.ts register, rollingAverage, weighDue, SW, speechSynthesis; plannedSets/deloadSets(2); retos y
  liga; partir generator.ts (1111) y figures.ts; setUnits.

### serix-coach (9,7)
- Nutrición resuelta: compensación y ajuste con suelo (mujer 55 kg y 60 kg, hombres, quien gana); sigue pendiente exigir 2 evaluaciones
  seguidas en `weightAdvice` (tendencia de 21 días).
- Nuevo (menor): objetivo manual sin sexo sin suelo (1100 + exceso de 600 → 930); silencio en el límite (en el BMR y estancada, ningún
  aviso: «revisa si apuntas todo, sube la actividad o haz una pausa de dieta»); si no se puede compensar el usuario no lo sabe.
- Abiertos: `restDayKcal` en perder grasa («quemadas», −100-150 kcal); doble progresión sin descarga tras estancamiento
  (progression.ts:196-199, lo que más sube, ~0,1); 5/3/1 por semana de calendario y AMRAP.
- Generador (3600 programas, idéntico): principiante sin material con Bulgarian_Split_Squat (200), Single_Leg_Deadlift (283),
  Negative_Pull-Up (165); abdomen < 4 series 322 de 1440; sin elevación lateral 88 de 150 de hipertrofia en gimnasio; gimnasio sin hombro
  56 de 600; RDL a 2 series 10 de 240; asistidas sin sugerencia de bajar la ayuda; Mountain_Climbers y Freehand_Jump_Squat como quads.
  Filtrar Single_Leg_Deadlift rompió el test de empuje/tirón de fatLoss/beginner/bodyweight/3d/45 y la búlgara la usa «HIIT en casa»
  (tests/library-balance.test.ts): ajustar el relleno a la vez. Pasar su barrido (scratchpad/m4/m.ts) a tests con umbrales máximos.

### serix-perf-a11y (9,5)
- Lighthouse móvil 99-100 (LCP 2,0 s); axe 0 violaciones en 17 pantallas por esquema; foco, encabezados y zonas táctiles bien.
- La duración cortada de arriba (la única que baja la nota).
- h1 del detalle de rutina con recuadro negro de foco al abrirlo con toque (foco programático; mejor solo con teclado).
- Precarga de nutrition en la bienvenida (LCP < 1,8 s; lo único que impide el 100 en rendimiento).
