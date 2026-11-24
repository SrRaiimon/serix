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

## Rotación de zonas (serix-code)

En cada panel, `serix-code` revisa entera, además del diff, la zona revisada hace más tiempo («nunca» primero; a igual,
la de más arriba). El diff solo enseña lo cambiado: los fallos de la 0.1.14 y la 0.1.15 estaban en código que no se
volvía a leer. Al acabar el panel se apunta aquí la versión.

| Zona | Archivos | Revisada a fondo |
|---|---|---|
| Comidas | lib/nutrition.ts, lib/mealPlan.ts, screens/Food*.tsx | 0.1.15 |
| Amigos y retos | lib/friends.ts, lib/league.ts, screens/Friends.tsx | 0.1.42 |
| Temporizadores, avisos y PWA | lib/timer.ts, lib/lockScreen.ts, lib/intervals.ts, lib/voice.ts, lib/reminders.ts, lib/pwa.ts, sw-template.js | 0.1.43 |
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

## Pendientes tras 0.1.43 (perf midió de verdad con Lighthouse y axe, instalados en el scratchpad; ux no pudo
## abrir la web: nota por lectura del diff, sin capturas)

### serix-ux (9,6)
- **Compartir, QR y «Crear e invitar» desactivados sin decir por qué** (falta el nombre): línea de ayuda junto al botón.
- Programa por defecto: día B de cuerpo completo con `Alternating_Floor_Press` a 2 series como primer press; torso A
  principiante 6d/60 con 9 de empuje frente a 3 de tirón; kettlebell 4d/45 con Torso B de 3 ejercicios y dos zancadas.
- Mapa en oscuro: tonos 4-9 y 1-3 casi iguales (styles.css:1869-1870).
- «77,5…» cortado en «Última vez» (Exercises.tsx:335); dominadas con tu peso en «Tus mejores marcas»; «sesión» de
  descarga en Progreso y «semana» en el entrenador; aviso de bíceps olvidado (Home.tsx:238); logros pendientes en
  pasado; «Frente a la última vez» sin los saltados; título de rutina cortado; «Más de 900» (son 1081, Onboarding.tsx:280);
  «@8» sin explicar; «Hacer sesión de descarga» en ajustes.
- Figuras: disco del remo con barra; lumbar de la hack arriba (no verificado).

### serix-code (9,3)
- **Media:** tras recargar durante un descanso no suena el pitido del final hasta tocar la pantalla (timer.ts:311-320,
  `audio` sin crear). **Media-baja:** DEFAULT_NAMES sin «Entraînement libre»/«Treino livre» (workout.ts), sin test.
- Baja: `addRest(-15)` con < 15 s termina sin aviso; pwa.ts:70 `register` sin catch; rollingAverage O(n²) en cada
  render (Profile.tsx:454); weighDue con pesada futura; segundo aviso del SW si lo mata Chrome; speechSynthesis.cancel
  en iOS; foodStep no deja rehacer el cuestionario con rutinas de programa.
- De antes: plannedSets sin rutina y deloadSets(2); salir de un reto vuelve como invitación; reto de repeticiones con
  ejercicios por tiempo; tope de récords y reloj adelantado en la liga; cambio de nombre que duplica; resúmenes viejos
  sin nombre se pisan; One-Arm_Flat_Bench_Dumbbell_Flye con dos mancuernas; test de armLen y de TIE.directArm;
  migrateData en cada refreshFromDisk; partir generator.ts (1080) y figures.ts (5028); setUnits.

### serix-coach (9,7)
- Remo invertido con barra de puerta: 1076 de 1500 programas. Abdomen en fatLoss/general ≥45 min: 59 con < 4 series.
- Asistidas sin progresión (workout.ts:100).
- Día B principiante con Floor_Press como primer press; 28 programas de gimnasio sin hombro directo y 18 de
  hipertrofia sin elevación lateral; TIE.directArm=3 afinada con un solo caso; pierna al mínimo en fatLoss sin material.
- Mismo ejercicio en días seguidos: 227 (criterio nuevo, no comparable con 976).

### serix-perf-a11y (9,8)
- Lighthouse móvil 99-100 en las cuatro categorías (LCP 1,8-2,0 s, CLS 0); axe 0 violaciones en 13 pantallas, claro y
  oscuro; foco y h1/h2 bien.
- **Marcador «Tu nombre» en oscuro a 4,0:1:** regla `::placeholder` con --text-2 (Profile.tsx:82, Friends.tsx:88).
- Precarga de nutrition en la bienvenida; no precarga Onboarding.
- Interruptores .toggle de 51×31 (dentro de filas de 81 px); input del buscador de Ejercicios 243×25 sin medir.
