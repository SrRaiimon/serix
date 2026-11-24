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

## Pendientes tras 0.1.51 (el evaluador de rendimiento se detuvo una vez y se relanzó; su informe aprovecha salidas parciales del anterior)

### Fallos míos de la 0.1.51 (progression.ts, lowerWeight y rama lineal; Recovery.tsx; tests)
- **Rama lineal `down` sin bajar** (`const lower = Math.max(0, round(weight * 0.9, unit))`): lineal 5 kg → 5, 12,5 → 12,5, mancuerna de 24 → 22,5; marca «down» sin bajar,
  `TodayTarget` pone «↓ −0 kg» y `stallShown` oculta la oferta de descarga porque `auto.kind === 'down'`: el usuario se queda sin ayuda. Usar `lowerWeight` también en lineal,
  con la comprobación `lower < weight` y test.
- **`lowerWeight` con pesos que no existen:** mancuernas con la serie de 2,5 kg (`used = [12.5, 15]`): 20 → 18 (17,5) y 30 → 28 (27,5) porque `w % 2 === 0` va antes de
  `dumbbellSeries(used)` (usar la misma condición que `dumbbellStep`); mancuernas < 10 kg usan siempre paso 1 (2,5 → 1,5; 7,5 → 6,5: respetar `only25`); barra de aislamiento baja de 0,5 en 0,5 kg
  (`Barbell_Curl` 12,5 → 11,5, 20 → 18, 5 → 4,5; un test mío lo fija en `tests/progression.test.ts`: 0,5 kg solo para polea y máquina, 2,5 kg para barra o EZ); mancuernas en libras caen en el
  paso genérico de 5 lb (10 lb → 5 lb, −50 %); si el catálogo no está cargado `lowerWeight` cae al paso de barra (`rememberEquipment`).
- **Resumen de recuperación** solo agrupa si todas las horas coinciden exactamente (con 47 h y 59 h, lo normal tras cuerpo completo, vuelven las 8 filas): agrupar por tramos o «~47–59 h»;
  la barra del resumen usa `recovering[0].ready` (solo el valor mayor).
- **Mi test de restaurar con deshacer no prueba el cambio:** pasa también con el código viejo (llama a `replaceData` suelto y `withUndo` ya existía; no prueba Profile.tsx ni Transfer.tsx).
  Sin test: `exportBackup` con `lastBackupAt` dentro, `RecoveryCard`, `TodayTarget`, `stallShown`, `balanceTip`, `isAssisted` en pantalla y el aviso de series omitidas.
- Menores: `trainedTodayHome` (Home.tsx:50) duplica `trainedToday` (:209): sacar una función; el aviso de `dropped` no menciona el tope de 1.000 km; `withUndo` frágil (cualquier `update` posterior
  invalida la oferta; un `relabelExercises` tras cambiar de idioma la mata).

### serix-ux (9,6)
- Importar de Strong: el título del panel sigue alineado a la izquierda, a unos 20 px de «Cancelar», sin centrar (mirar también otras hojas con botón a la izquierda).
- Progreso › Músculos con ventanas distintas: título «4 semanas», nota «Media de las últimas 2 semanas» y equilibrio «4 semanas» (Bíceps 8,5 arriba frente a Empuje 4,5 abajo con poco
  historial): una sola ventana o decirlo; «Gemelos» entrenados no aparecen en la lista de recuperación; «Por debajo:» enumera todos los grupos con 0 series.
- Inicio el día de entreno: siguen «Hoy ya has entrenado» + «Empezar igualmente» + «Guarda una copia» + «Tu entrenador»; la copia podría esperar al día siguiente como el aviso de recuperación.
- Separador de miles: «1000 toneladas» (logros) frente a «190,9 toneladas» (Inicio) y «2.000» en el aviso del CSV. Mapa en oscuro con tonos 1-3 y 4-9 casi iguales.
- Sin verificar: la bajada automática de peso en pantalla (su dato no la provocaba) y «↓ −5 kg»; cifra de pecho de Inicio › Tu entrenador (60 series) frente a Progreso (7,5);
  «+10 kcal sobre tus 1210» / «1200/1500 sin punto».
- Resueltos esta vez: aviso duplicado del estancamiento, «Igual que antes», series omitidas del CSV, título del entreno entero, logros en presente, racha unificada, equilibrio con proporción.

### serix-code (9,6)
- Zona Progresión y autorregulación (leída entera, sin fallos altos) — media-baja: `autoreg.ts:~85` `loadSuggestion` redondea al paso de la barra: mancuerna de 24 con RPE 10 → 22,5 (no existe en 2 kg)
  y pesos ligeros de 10 y 12,5 kg no reciben ajuste (−8 % redondea al mismo peso): reutilizar `lowerWeight` y `progressionStep`.
- Baja: `plates.ts` `loadBar` con barra más pesada que el objetivo (20 con barra de 45) devuelve 45 y `missing: 0` sin avisar, y voraz con discos no canónicos ([20, 15], lado de 30);
  `warmup.ts`/`progressionStep` en libras con mancuernas y kettlebells sin escalón propio; `bodyweight.ts` `fillBodyweights` rellena sesiones antiguas con el peso del objetivo de Comidas
  (`settings.nutrition.weightKg`) y lo deja guardado para siempre.
- Abiertos: RPE ≥ 9,5 no baja antes; sesión mala por enfermedad cuenta igual; peso corporal, asistidas y tiempo sin regla de estancamiento; `MAX_REPS` (Jump Rope de 1500) sin subir y Strong
  con distancia en metros sin confirmar con un CSV real; `FoodGoals.tsx:~134` con `computed &&`; `share.ts` `decode` sin topes de rutinas/ejercicios y `repsMin > repsMax`; baja de backup.ts
  (sesión con fecha imposible recortada, EPOCH_MAX al cargar, trainingTime «99:99», ids duplicados, la copia sin fotos sin avisar), transfer.ts sin tope de QR ni de descompresión.
- De antes (baja): sin sexo no hay suelo; `weightAdvice` sin 2 evaluaciones seguidas; texto de «Más calorías los días de entreno» con «Lo que gastas»; parseDate en portugués, `num("1.234,5")`;
  `catch` de share.ts; `restDayKcal`, `recoveryHint`, fotos (`importPhotos` con la caché, importación a medias, AddSheet.save, Viewer con void), SessionEdit.save, `lastPhotoAt` en la copia,
  guardado y varias pestañas (flush, mergeRecord, runMigrations, migrateData, mergeList, aviso de deshacer), Comidas (recordatorios, FoodScan, `dayText`, AmountSheet con 0 g, `key={n}`),
  compareWithLast con «Free workout», repRecords, exerciseHistory, periodStats, embeddedFont, addRest(-15), pwa.ts register, rollingAverage, weighDue, SW, speechSynthesis, foodStep,
  plannedSets/deloadSets(2), retos y liga; partir generator.ts (1111), figures.ts, nutrition.ts (1001) y Food.tsx (812); setUnits.

### serix-coach (9,8)
- Resuelto: la descarga en doble progresión (15 casos: press 60 → 55, sentadilla 100 → 90, mancuerna 24 → 22, curl 12,5 → 11,5 con barra y 10 con mancuerna, 10 → 9; RPE 10 baja y RPE 6 mantiene; 3 → 4
  series mantiene; sesión cortada se salta; libras 135 → 120, 45 → 40, 225 → 205) y `weightAdvice` proporcional (1300 kcal con suelo 1209 → −90).
- Generador (3600 programas, idéntico): Bulgarian_Split_Squat (200), Single_Leg_Deadlift (283), Negative_Pull-Up (165) en principiante sin material; abdomen < 4 series 322 de 1440; sin elevación
  lateral 88 de 150 de hipertrofia en gimnasio y 56 de 600 de gimnasio sin hombro; RDL a 2 series 10 de 240; asistidas 58; `pressBn` sin material 24.
  Propuesta concreta para el caso que rompió el test de empuje/tirón (fatLoss/beginner/bodyweight/3d/45): ranura `homeLegs` por nivel (`generatorSlots.ts:53`; principiante con
  `['Bodyweight_Squat','Split_Squats','Wall_Sit', …]` y la búlgara y el peso muerto a una pierna solo desde intermedio), `homeLegsEasy` para los días de fuerza y dejar `homeLegs` solo para HIIT
  (`library-balance:35`), un segundo `homePull` (Towel_Door_Row o Backpack_Row) en los días de cuerpo completo sin material; Negative_Pull-Up solo con barra de dominadas.
- Nutrición abiertos: 2 evaluaciones seguidas en `weightAdvice`; `restDayKcal` en perder grasa; 5/3/1 por semana de calendario y AMRAP; silencio en el límite del BMR; ocultar «Más calorías los
  días de entreno» si `up < 60`. Pasar el barrido (scratchpad/m7) a tests con umbrales máximos.

### serix-perf-a11y (9,6)
- Lighthouse móvil 99-100 (FCP 0,9 s, LCP 2,0 s, TBT 0 ms, CLS 0,001-0,003, SI 0,9 s); LCP de primera visita con 3G rápido simulado (150 ms, 1,6 Mbps, CPU x4) 1.896 / 1.852 / 1.844 ms; entrada
  312.295 B (100.046 gzip), +1.500 B (+0,5 %) frente a la 0.1.50. axe 0 violaciones en 15 pantallas por tema, también Progreso › Músculos e Inicio con 0, 1 y 5 grupos recuperándose, con y sin el
  resumen, y el entreno en curso. Cabecera del entreno: input de 343×44 (80 caracteres se cortan con puntos suspensivos dentro del input), «N de M series» a 6,78:1 claro y 8,26:1 oscuro.
- Pendientes: partir o diferir el chunk de entrada (312 kB) para bajar el LCP a < 1,5 s; dos h1 en la hoja «Objetivo diario» (sin re-verificar); campos de edad, altura y peso del objetivo a
  80×25 en una fila táctil; comprobación de recorte de texto de la banda en el e2e. No se midió el peso de Inicio (~398 kB / ~134 kB gzip en la 0.1.50).
