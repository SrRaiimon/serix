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

## Pendientes tras 0.1.47 (ux no vio el fallo de los interruptores que midieron code, perf y yo: su «mismo óvalo» no vale)

### URGENTE (fallo de la 0.1.47, confirmado con getComputedStyle: backgroundClip border-box, píldora de 65×45 en vez de 51×31)
- `.toggle` (styles.css:799-815): `background-clip: padding-box` va antes de `background: var(--fill)` y la abreviatura lo restablece;
  `.toggle:checked { background: var(--green) }` igual. Poner `background-clip: padding-box` después de `background` (o usar
  `background-color`) y comprobarlo con captura a escala completa en claro y oscuro.
- `.list-row input:focus-visible { border-radius: 8px }` (styles.css:~2659) deforma el interruptor mientras tiene foco: usar
  `input:not(.toggle)`.

### serix-ux (9,6)
- Progreso › Músculos: «Recuperándose · ~48 h» repetido 8 veces (una línea resumen y el detalle plegado); «Equilibrio muscular»
  dice «Bien equilibrado» con cuádriceps 9 e isquios 4,5 (2:1) mientras más arriba marca los isquios «por debajo».
- Mapa en oscuro: tonos 1-3 y 4-9 casi iguales.
- Rutinas › detalle de Torso A: «Aún sin estrenar» con objetivos «Igual que antes»; la tercera cifra de la cabecera cortada
  («~28 …», «Duración aprox.» partida) y dice 28 min cuando los entrenos reales duran 50.
- Inicio el día de entreno: «Tu semana pasada» + «Entendido» siguen quitando espacio; las cifras grandes de «Tus mejores
  marcas» sin «estimado» (el texto de debajo sí lo explica); «+10 kg × 8» sin peso corporal en el detalle del entreno.
- Bienvenida: pasos 1 y 2 dicen «Al elegir, pasas a la siguiente pregunta» y además hay botón «Continuar»; en «Tu plan» el
  botón «Crear mi programa» fijo tapa parte de «Material» y «Nombre» al hacer scroll. «Tu plan» y «Vista previa»: bien.
- Sin recorrer: «@8», «77,5…» cortado, aviso de bíceps, logros en pasado, «sesión»/«semana», figuras (disco del remo, lumbar de la hack).

### serix-code (9,4)
- Diff 0.1.47: fotos — `importPhotos` usa la caché `photos ?? []`: si se importa antes de cargar la galería se duplican; sin tests
  de la lógica de repetidas ni de la postura inicial de la cámara.
- Baja (diff 0.1.46): `recoveryHint` (Home.tsx) no mira `active`; regla de «cansado» duplicada en NextCard y recoveryHint; sin tope de
  espera para el aviso de copia.
- Fotos: importación a medias por cuota sin `reload()` (usar finally) y aviso engañoso «No es un archivo de fotos de Serix»;
  AddSheet.save con mensaje único; Viewer con `void`; SessionEdit.save resucita un entreno borrado y `end` en el futuro; medidas sin
  editar; `lastPhotoAt` en la copia.
- Zona Generador y programas (leída entera, sin fallos altos ni medios; barrido de 11.400 programas sin casos malos), baja:
  generator.ts 1111 líneas (partirlo en elección, tiempo y equilibrio semanal); `choose` repetido por hueco (932-958); constantes
  TIE afinadas a mano (463-489); `catalog.get(id)!` en RoutinesPrograms.tsx:201; GeneratorSheet guarda la configuración al
  pulsar «Generar» (:80).
- De antes (baja): zona Guardado y varias pestañas (flush con knownRev desfasado, mergeRecord por valores enteros, runMigrations
  copia superficial, migrateData sin saneado, mergeList sin clave, aviso de deshacer); compareWithLast con «Free workout» frente a
  «Entrenamiento libre»; repRecords, exerciseHistory con drop sets, periodStats O(m·n), embeddedFont, navigator.share, moreSets,
  meta bajo el 1RM, logro de récords duplicado; addRest(-15), pwa.ts register sin catch, rollingAverage O(n²), weighDue con
  pesada futura, SW segundo aviso, speechSynthesis en iOS, foodStep, plannedSets/deloadSets(2), retos y liga;
  One-Arm_Flat_Bench_Dumbbell_Flye; tests de armLen y TIE.directArm; partir figures.ts; setUnits.

### serix-coach (9,6)
- **Nutrición (zona revisada por primera vez):**
  1. `goalsForDay` (nutrition.ts:265-275) resta `carried` (hasta el 15 %) sin volver a aplicar `dayFloor`: mujer de 55 kg a 1200 kcal que
     se pasa el día antes → 1020; mujer de 60 kg a 1460 en día de descanso → 1130. Arreglo: `Math.max(base.kcal - carried,
     dayFloor(goals))` y no compensar con objetivo de ganar músculo.
  2. `adjustGoals`/`weightAdvice` (nutrition.ts:237-239, 418-437; Food.tsx:585): −150 kcal cada vez que no pierdes peso, sin suelo ni
     BMR (1200 → 1050 → 900); tendencia de solo 21 días, banda ±0,3 %/semana: exigir 2 evaluaciones seguidas.
  3. `restDayKcal` (:237): en perder grasa con «calorías gastadas», los descansos quedan 100-150 kcal por debajo de lo coherente.
  4. progression.ts:196-199: doble progresión sin descarga tras estancamiento (hold indefinido): aviso a 3-4 sesiones o −5-10 %.
  5. 5/3/1: ciclo por cada 4 sesiones, no por semana de calendario; sin ajuste con muchas más repeticiones de las mínimas en el AMRAP.
  Bien: computeGoals en siete casos (proteína 1,8-2,2 g/kg, grasa 25 % con mínimo 0,8 g/kg, déficit 20 %, superávit 10 %).
- Generador (sin cambios, 3600 programas): principiante sin material con Bulgarian_Split_Squat (200), Single_Leg_Deadlift (283),
  Negative_Pull-Up (165); abdomen < 4 series en 322 de 1440; sin elevación lateral 88 de 150 de hipertrofia en gimnasio y 56 de
  600 de gimnasio sin hombro; RDL a 2 series en 10 de 240 días B; asistidas sin sugerencia de bajar la ayuda (sin verificar);
  Mountain_Climbers y Freehand_Jump_Squat con muscle=quads. Filtrar Single_Leg_Deadlift rompió el test de empuje/tirón de
  fatLoss/beginner/bodyweight/3d/45 y la búlgara la usa «HIIT en casa» (tests/library-balance.test.ts): ajustar el relleno a la vez.
- Su barrido (scratchpad/m3/m.ts) debería pasar a tests/generator-sweep.test.ts con umbrales máximos.

### serix-perf-a11y (9,6)
- Lighthouse móvil 99-100 (LCP 1,8-2,0 s); axe 0 violaciones en 15 pantallas, claro y oscuro; borde de .recovery-bar a 7,6:1
  (resuelto); buscador de Ejercicios y «Tu nombre» de Amigos a 44 px (resueltos).
- Los dos fallos de los interruptores de arriba (tamaño visual y foco deformado).
- Precarga de nutrition en la bienvenida (LCP < 1,8 s).
