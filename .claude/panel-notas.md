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

## Pendientes tras 0.1.50 (la descarga en doble progresión funciona en pantalla, pero con huecos de redondeo)

### Fallos míos de la 0.1.50 (progression.ts ~218-222, `stalledDouble`)
- **Con pesos pequeños nunca baja:** `round(weight * 0.9)` al paso de 2,5 kg deja `lower == weight` y `if (lower < weight)` lo descarta (curl de 12,5 kg:
  11,25 → 12,5; de 10 kg: 9 → 10): «hold» para siempre, justo en el aislamiento ligero. Redondear hacia abajo y bajar como mínimo un escalón (`weight − increment`).
- **Mancuernas con el paso de la barra:** 24 kg → 22,5 (no existe en series de 2 kg); `dumbbellStep` existe para subir, no para bajar.
- Estancado con RPE ≤ 7 también baja (`easy` solo exime si todas llegan a repsMax−1); con RPE ≥ 9,5 conviene bajar antes de la 4.ª sesión.
- Una sesión cortada (1 serie) cuenta como mala y pasar de 3 a 4 series oculta el estancamiento: contar solo sesiones con `main.length >= count` o comparar repeticiones medias por serie.
- Una sesión mala por enfermedad cuenta igual; peso corporal, asistidas y tiempo no tienen regla de estancamiento (workout.ts:100 solo llama a `plan` con weight_reps sin assisted).
- `importCsv.ts:~187`: los topes saltan filas válidas en silencio («Jump Rope» de 1500 repeticiones, press de piernas de 11.000 lb en lb); contar las filas
  saltadas y decirlo en el resumen del import («N series omitidas por valores imposibles»), subir `MAX_REPS`; confirmar con un CSV real si Strong exporta la distancia en
  metros (21000): se descartaría toda la carrera.
- `importCsv.ts:431`: `assisted` se marca para todo el ejercicio (un «Pull Up» con −10 y +10: la serie de +10 kg de lastre pasa a ser 10 kg de ayuda) y `/assist/i` marca cualquier
  nombre con «assist»: decidir por la mayoría de las series o solo por el nombre.
- `FoodGoals.tsx:~134`: con `computed` indefinido (peso borrado) `fitted` vale 0 y sale «ya estás en tu mínimo»: añadir `computed &&`. Sin test del texto de FoodGoals.
- `share.ts` `decode`: sin tope de rutinas ni de ejercicios por rutina, y `repsMin > repsMax` no se corrige.

### serix-ux (9,6)
- **Dos avisos del mismo estancamiento en el entreno:** «Tres sesiones sin mejorar…» y la banda «3 sesiones sin superar tu mejor marca» con «Opciones» (que propone una descarga que
  la app ya aplicó): dejar solo uno. En Rutinas › detalle el mismo press muestra «55 kg × 6 · Igual que antes» cuando antes eran 60 kg; «Igual que antes» repetido en cada fila.
- Importar CSV: el título del panel queda pegado a «Cancelar», sin centrar; las filas descartadas no se avisan.
- Inicio › Tu entrenador: «Mucho volumen de pecho: unas 60 series a la semana» (63) frente a 7,5 de Progreso › Músculos (¿volumen planificado de la rutina de 72 series?; si es así,
  decirlo).
- Los de siempre, sin cambios: Progreso › Músculos con «Recuperándose · ~47 h» 8 veces y pantalla muy larga, mapa en oscuro con tonos 1-3 y 4-9 casi iguales, equilibrio «normal»
  con cuádriceps 7,5 / isquios 4 (casi 2:1) y los isquios «por debajo» más arriba; Inicio el día de entreno con «Hoy ya has entrenado» + recuperación + «Empezar igualmente» +
  «Tu semana pasada/Entendido»; título cortado en la cabecera del entreno («Día 1 · Cuerpo com…» con «0 de 54 series»); logros en pasado (también los pendientes);
  «sesión»/«semana»/«entrenos» y «28 sem. de racha» frente a «Racha de 26 semanas»; «Día de entreno: +10 kcal sobre tus 1210» con el suelo en 1200; separador de miles.
- Resueltos: «28 min» frente a 50 reales (ahora «~50 min · tu media»). Aviso de bíceps: no se encuentra, ya no se busca.

### serix-code (9,5)
- Zona Copia de seguridad (leída entera, sin fallos altos) — media: `Profile.tsx:61-66` y `Transfer.tsx:170` restaurar una copia (archivo o QR) sustituye todos los datos sin
  `withUndo` y sin guardar antes una copia de lo actual (si el archivo es viejo, se pierde lo posterior): `withUndo` o exportar antes. Media-baja: `protect.ts:19-32` serializa
  antes de `updateSettings({lastBackupAt})`: el archivo lleva el `lastBackupAt` anterior y al restaurar la tarjeta «Guardar copia» vuelve a salir al instante.
- Baja: `backup.ts:146` una sesión con `start` fuera de rango se recorta (1 → 2000-01-01; 4e12 → hoy + 1 año) en vez de descartarse; `EPOCH_MAX` (:64) se calcula una vez al cargar el
  módulo; `trainingTime` acepta «99:99»; sin deduplicación de `id` en sesiones, rutinas ni comidas; la copia no incluye las fotos (almacén aparte) y la interfaz no lo avisa.
- De antes (baja): sin sexo no hay suelo; `weightAdvice` todo o nada (mejor `Math.min(150, margen)`); texto de «Más calorías los días de entreno» con «Lo que gastas»; parseDate en
  portugués («22 de dez. de 2025»), `num("1.234,5")`; transfer.ts sin tope de QR ni de descompresión; `catch` de share.ts; `restDayKcal`, `recoveryHint`, fotos (`importPhotos`
  con la caché, importación a medias, AddSheet.save, Viewer con void), SessionEdit.save, `lastPhotoAt` en la copia, guardado y varias pestañas (flush, mergeRecord, runMigrations,
  migrateData, mergeList, aviso de deshacer), Comidas (recordatorios, FoodScan, `dayText`, AmountSheet con 0 g, `key={n}`), compareWithLast con «Free workout», repRecords,
  exerciseHistory, periodStats, embeddedFont, addRest(-15), pwa.ts register, rollingAverage, weighDue, SW, speechSynthesis, foodStep, plannedSets/deloadSets(2), retos y liga;
  partir generator.ts (1111), figures.ts, nutrition.ts (1001) y Food.tsx (812); setUnits.

### serix-coach (9,8)
- La descarga en doble progresión está bien planteada (repeticiones totales como criterio; no repite la bajada porque el historial se corta al cambiar el peso); 15 casos reproducidos.
  Pendiente su redondeo (ver arriba): lo que más sube (~+0,05).
- Nutrición abiertos: exigir 2 evaluaciones seguidas en `weightAdvice`; `restDayKcal` en perder grasa; 5/3/1 por semana de calendario y AMRAP; silencio en el límite del BMR; ocultar
  «Más calorías los días de entreno» si `up < 60` (~+0,1 entre ellos).
- Generador (3600 programas, idéntico): principiante sin material con Bulgarian_Split_Squat (200), Single_Leg_Deadlift (283), Negative_Pull-Up (165); abdomen < 4 series 322 de
  1440; sin elevación lateral 88 de 150 de hipertrofia en gimnasio y 56 de 600 de gimnasio sin hombro; RDL a 2 series 10 de 240; asistidas sin sugerencia de bajar la ayuda;
  Mountain_Climbers y Freehand_Jump_Squat como quads. Filtrar Single_Leg_Deadlift rompió el test de empuje/tirón de fatLoss/beginner/bodyweight/3d/45 y la búlgara la usa
  «HIIT en casa» (tests/library-balance.test.ts): ajustar el relleno a la vez. Pasar su barrido (scratchpad/m6/m.ts) a tests con umbrales máximos.

### serix-perf-a11y (9,6)
- Lighthouse móvil 99-100 (LCP 1,8-2,0 s, TBT 30-50 ms); axe 0 violaciones en 15 pantallas por tema (ya con Amigos en oscuro y Perfil › Datos); aviso nuevo del ajuste y su botón
  «Quitarlo» bien en es/fr, claro/oscuro (sin probar un ajuste negativo que sí cabe, con botón). Entrada 310.795 B (99.456 gzip); Inicio ~398 kB en bruto / ~134 kB gzip.
- Menores: dos h1 en la hoja «Objetivo diario»; comprobación de recorte del texto de la banda en el e2e (ancho del texto frente a la celda a 375 px, es y fr); campos de edad,
  altura y peso del objetivo a 80×25 dentro de una fila táctil; LCP < 1,5 s y TBT 0 ms para el 10 (partir o diferir el chunk de entrada).
