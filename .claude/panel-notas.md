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
| 0.1.54 | 9,6 | 9,5 | 9,2 | 9,6 | 9,5 (9,475) |
| 0.1.55 | 9,6 | 9,3 | 9,4 | 9,8 | 9,5 (9,525) |

## Rotación de zonas (serix-code)

En cada panel, `serix-code` revisa entera, además del diff, la zona revisada hace más tiempo («nunca» primero; a igual,
la de más arriba). El diff solo enseña lo cambiado: los fallos de la 0.1.14 y la 0.1.15 estaban en código que no se
volvía a leer. Al acabar el panel se apunta aquí la versión.

| Zona | Archivos | Revisada a fondo |
|---|---|---|
| Comidas | lib/nutrition.ts, lib/mealPlan.ts, screens/Food*.tsx | 0.1.48 |
| Amigos y retos | lib/friends.ts, lib/league.ts, screens/Friends.tsx | 0.1.55 |
| Temporizadores, avisos y PWA | lib/timer.ts, lib/lockScreen.ts, lib/intervals.ts, lib/voice.ts, lib/reminders.ts, lib/pwa.ts, sw-template.js | 0.1.54 |
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

## Pendientes tras 0.1.54 (global 9,5; coach 9,2 por el generador)

### Fallos míos de la 0.1.54
- **Test de la bomba de compresión (migrate-share) no prueba nada** (code): `transform` lanza un `Error` genérico y `decodePlan` lo convierte en «incompleto o dañado»; el test acepta ese mensaje y pasaría con el código viejo. Lanzar `ShareError` con el mensaje «demasiado grandes» y comprobarlo exacto.
- **«Guarda una copia» con el entreno en curso** (ux, `Home.tsx:101`): la tarjeta sale siempre con `active`; respetar `trainedTodayHome` también ahí. Además, en quien siempre se está recuperando el aviso de copia no sale nunca (con 77 entrenos y «Copia: Nunca»).
- **Modo foco** (perf, `WorkoutFocus.tsx` ~95 y ~108): dos h1 visibles («Entrenamiento: …» y `.focus-name`) y axe `region` en `.focus-mode`: `.focus-name` a h2 y envolver en landmark.
- **Campos Edad/Altura/Peso del objetivo** a 80×40: subir a 44 de alto. «0 años / 0 cm» en gris como si fueran valores.
- `loadSuggestion` con barra ligera: −4 % de 20 kg baja a 17,5 (−12,5 %) y con mancuernas ligeras la subida de un escalón (>15 %) no se propone; kettlebell en lb con pesos guardados en kg (16 kg = 35,27 lb) compara con tolerancia 0,01 en vez de redondear; `exerciseHints.ts` redeclara `Unit` y `stallOffered` recibe `unknown`; el test de `restoreData` lee el código fuente con regex.
- `lowerWeight` con barra de 20 kg / 45 lb baja por debajo de la barra vacía; `autoreg.ts:106` pasa `used=[]` (mancuernas de 20/30 siempre en la serie de 2 kg); ruido de coma flotante (309,99999999999994 lb).

### serix-ux (9,6)
- Músculos: mapa a 7 días y series/equilibrio a 4 semanas (rotulado, no unificado); Gemelos sin mínimo sin explicarlo (como el abdomen); «Calorías y peso» solo pinta peso sin comidas; racha de 27 en Home frente a 26 en Logros (puede ser siembra); Importar de Strong repite «4 mar – 4 mar» con un solo día; calculadora de discos ambigua («Salto mínimo 2,5 kg»); «Tu entrenador» el día de entreno, mapa oscuro y «+10 kcal sobre tus 1210» sin verificar.

### serix-code (9,5)
- Zona Temporizadores, avisos y PWA leída entera (0.1.54), sin fallos altos ni medios. Bajos: `effortApplied` vuelve a 0 al recargar a mitad de descanso (el ajuste se aplica dos veces); sin sincronía entre pestañas en el descanso; `adjustRestForEffort` puede cortar el descanso sin aviso (`timer.ts:241`); peso con fecha futura retrasa `weighDue`; `vite:preloadError` recarga sin red; `lockScreen.ts:72` si `setPositionState` lanza no registra manejadores; el service worker solo conserva una versión anterior.
- Siguen: `plates.ts` `loadBar`, `bodyweight.ts` `fillBodyweights`, `plannedSets`, partir generator/figures/nutrition/Food, `dropped` sin tope de km, TM del 5/3/1 y tempo sin tope, sustituir ejercicio pierde progression/tempo/percent, «Bajar un 10 %» en asistidas.
- Zona más antigua ahora: Amigos y retos (0.1.42).

### serix-coach (9,2)
- Barrido propio de pesos limpio (sube y baja siempre, escalones reales). Solo saltos grandes con pesos raros: mancuerna de 3,5 a 7,5 kg baja −33 % a −71 %, kettlebell > 48 kg, barra de 20 kg.
- Generador (el motivo de la nota): perder grasa en gimnasio 4 d/45 min con cuádriceps 19, isquios 5, pecho 6, espalda 4+3; mancuernas en casa intermedio con `Floor_Glute-Ham_Raise` (avanzado) y bíceps 4 / tríceps 6 frente a cuádriceps 18 / isquios 11; peso corporal principiante con búlgara y peso muerto a una pierna y bíceps 2; principiante en gimnasio con RDL 4×8-12, tríceps 2 y dorsal 4; asistidas sin progresión de ayuda reducida (`plan()` las salta); `weightAdvice` con ventanas que se solapan en 14 de 21 días; `restDayKcal`.
- Cada retoque aislado al generador rompe el barrido (empuje/tirón): hace falta un segundo `homePull`, retocar `balanceWeek` y subir tren superior e isquios en perder grasa y mancuernas, con el barrido abierto.

### serix-perf-a11y (9,6)
- Lighthouse móvil 99-100 (FCP 0,9-1,0 s, LCP 1,8-1,9 s, TBT 0-10 ms, CLS 0-0,003); axe 0 violaciones en todas las pantallas y hojas, claro y oscuro; solo el entreno en modo foco da 1 `region`. Abiertos: chunk de entrada de ~312 kB (Home dentro), recorte de texto en el e2e.

## Pendientes tras 0.1.55 (global 9,5; perf 9,8, ux 9,6, coach 9,4, code 9,3)

### Fallos míos de la 0.1.55
- **«Modo foco» sin traducir en fr y pt** (code): las dos entradas nuevas son copia del español (`missing.mjs` no lo ve porque la clave tiene valor). fr «Mode focus», pt «Modo foco» ya vale; revisar también otros textos nuevos de la 0.1.52-0.1.55 que sean copia del español.
- Tests: el de la copia atrasada no cubre la condición inline de Home; la aserción de subida de la kettlebell en lb ya pasaba con el código viejo.

### serix-code (9,3): zona Amigos y retos leída entera
- **Media, descompresión sin tope** en `friends.ts:442` (`decodeSnapshot`) y `foodShare.ts:18`: un enlace de 389 KB (300 MB de espacios) se descomprime entero (1,1 s, 1,3 GB). Pasar `maxBytes` (~64 KB) y mensaje «demasiado grande», con test.
- Media-baja: «Salir del reto» no sale de verdad (`invitations` solo excluye ids que ya tienes; vuelve como «X te reta»); guardar los retos dejados. Baja-media: `create` sin guarda de «ocupado» (dos retos con dos toques).
- Baja: quitar un amigo no asienta antes los retos terminados (`remove` no pasa por `saveFriend`); `cleanChallenge` admite `final` con `me:true` (trofeos falsos, `join` lo guarda tal cual); `FriendImportScreen` sin cancelación; `useMine` desfasado de un día a otro; efecto de `FriendsScreen` sustituye `d.challenges` con datos viejos entre pestañas. Partir `friends.ts` (534) y `Friends.tsx` (722).
- Siguen: `autoreg.ts:106` `used=[]`, test de `restoreData` con regex, `lowerWeight` por debajo de la barra vacía, `plates.ts`, `bodyweight.ts`, `plannedSets`, TM/tempo sin tope, sustituir ejercicio, «Bajar un 10 %» en asistidas, `dropped`, temporizadores bajos.

### serix-coach (9,4)
- Generador mejor (perder grasa 4d/45: cuádriceps 11,5, isquios 12, empuje 26, tirón 22,5; mancuernas en casa 5d/60: bíceps 17, tríceps 16,5; principiante en gimnasio con brazos). Siguen: `homeLegs` por nivel (búlgara y peso muerto a una pierna a principiantes), `Floor_Glute-Ham_Raise` 3×3-6 en intermedio con mancuernas, segundo `homePull`, pecho 7,5 en perder grasa 4d/45 con `Freehand_Jump_Squat` tras el press en Torso B, asistidas sin progresión de ayuda reducida, ventanas de `weightAdvice` que se solapan, `restDayKcal`.
- **Suelo de la barra:** `lowerWeight` y `loadSuggestion` bajan 20 kg a 17,5 y 45 lb a 40 (no se monta); kettlebell desde 48 kg sube a 50,5 y desde 60 a 62,5; `loadSuggestion` admite −14 % con RPE 10 (tope relativo flojo) y no propone subir con mancuernas ligeras.

### serix-ux (9,6)
- «Tu entrenador» el día de entreno sigue saliendo bajo «Hoy ya has entrenado»; mapa de Músculos a 7 días frente a 4 semanas; racha 27/26 entre Inicio y Logros; «4 mar – 4 mar» al importar de Strong; calculadora de discos ambigua; «Calorías y peso» sin comidas; «+10 kcal sobre tus 1210» sin ver; con el foco abierto el texto de Inicio sigue en el DOM (el h1 de Inicio va `aria-hidden`).

### serix-perf-a11y (9,8)
- Lighthouse 99-100 (LCP 1,9-2,0 s), axe 0 en todo, incluido el modo foco (sin `region`). Abiertos: toggles a 41×41 efectivos (65×45 con `::after` recortado), chunk de entrada de ~312 kB, entreno en curso probado solo en claro.
- Hecho en la 0.1.56: «Modo foco» en francés, tope de descompresión en amigos y comida, retos dejados (`settings.leftChallenges`), guarda de doble toque, asentar retos al quitar amigo, `final` ignorado en enlaces, suelo de barra vacía, `backupNotice` con test. Siguen: generador, chunk de entrada, mapa de Músculos 7 d/4 sem, «Tu entrenador» el día de entreno, toggles 41×41, `used=[]` en autoreg.
- Hecho en la 0.1.57: «Tu entrenador» fuera el día de entreno, «4 mar – 4 mar», «Peso» sin comidas, texto del salto de discos, `used` en `loadSuggestion`, kettlebell > 48 kg/106 lb, «Aumentar ayuda» en la molestia de asistidas, reposo (finish al bajar el esfuerzo, `effortApplied` guardado al recargar, `setPositionState` con try), `weighDue` ignora fechas futuras, `fillBodyweights` solo con pesos medidos, sustituir ejercicio conserva progression/tempo, TM ≤ 1.000 kg y campos inválidos en rojo, `weightAdvice` con 3+3 semanas sin solape y solo pesos tras el último ajuste, `FriendImportScreen` sin carrera.
- No son fallos (explicado): racha 27/26 (Logros enseña el hito «26 semanas», Home la racha actual, ambos con `streakWeeks`); toggles 41×41 (el input mide 65×45 y su `::after` es el pomo, el toque lo cubre la fila entera).
- Siguen sin hacer: generador (homeLegs por nivel, segundo homePull, `Floor_Glute-Ham_Raise` en intermedio, pecho 7,5 en perder grasa), chunk de entrada, mapa de Músculos a 7 días, asistidas sin progresión de ayuda reducida, `restDayKcal`, partir ficheros grandes, `loadBar` con discos no canónicos, sincronía entre pestañas del descanso, `vite:preloadError` sin red, service worker con una sola versión anterior, `useMine` de un día a otro, `plannedSets` ambiguo.
- Hecho en la 0.1.58: `Glute-Ham_Raise` solo en nivel avanzado (con barrido), `loadBar` con discos no canónicos (voraz, y si se queda corto, la combinación que llega).
- Intentado y revertido de nuevo (5.º intento): excluir búlgara y peso muerto a una pierna a principiantes. Con la exclusión, fatLoss/beginner/bodyweight/3d/45 queda en empuje 24 / tirón 15: los press están ya al mínimo (2 series) y el tríceps y el bíceps mínimos los cubren los ejercicios de empuje; un bucle semanal que añada tirón no cabe (tiempo, rango de espalda). Hace falta rediseñar cómo cubre `balanceWeek` los mínimos de brazos en casa.
- No se toca (decisión o no merece la pena): asistidas con ayuda reducida automática (hoy se decide a mano, y la UI de `down` no cuadra con «menos ayuda»), chunk de entrada (299 kB = React DOM casi entero; Home son ~10 kB), mapa de Músculos a 7 días (pregunta distinta a las series), `restDayKcal` (sin criterio), sincronía entre pestañas, service worker con una sola versión, partir ficheros grandes.

## Hecho en la 0.1.59 (lo que la 0.1.58 dejaba sin arreglar)
- **Generador principiante en casa (5.º intento, bien):** `suits` excluye búlgara y peso muerto a una pierna a principiantes, y un bucle semanal en `balanceWeek` añade una serie de tirón (quitando una de acondicionamiento del día si no cabe) cuando el empuje pasa de 1,5 × el tirón; barrido nuevo que lo vigila. HIIT en casa de la biblioteca (principiante): sentadilla o pared en vez de la búlgara.
- **Asistidas:** `planAssisted` (un escalón menos de ayuda al completar todas las series, doble o lineal); `AutoProgress.up` con `assist`, nota «Menos ayuda», «↓ −2,5 kg de ayuda».
- **Músculos:** el mapa tiene selector 7 días / 4 semanas.
- **Descanso:** sincronía entre pestañas (evento `storage`); service worker conserva las dos versiones anteriores.
- No se toca (nada que arreglar o refactor sin cambio de comportamiento): `restDayKcal` (no se encontró un defecto concreto: resta el gasto medio con suelo en el BMR), chunk de entrada (es React DOM), partir ficheros grandes (generator.ts, figures.ts, nutrition.ts, Food.tsx, friends.ts, Friends.tsx).

## Hecho en la 0.1.60 (verificado en el navegador a 375 px, oscuro y claro)
- `plannedBeforeDeload` (series previstas guardadas al aplicar la descarga; adiós a la cuenta al revés ambigua), `vite:preloadError` como mucho una vez por minuto, aviso de CSV con el tope de km, efecto de Retos con datos del momento de escribir, `useMine` con el día en las dependencias.
- Tests de comportamiento: `RecoveryCard` renderizado a HTML (`tests/dom-stub.ts`), `plannedSets`. El test de `restoreData` en Profile/Transfer sigue siendo de lectura de código (las pantallas no se montan en los tests).
- Probado y descartado (se queda como está): pecho a 7,5 de 8 en «perder grasa» 4 d/45 min (para subirlo hace falta tirón y el empuje/tirón ya está al límite; subirlo rompe el barrido), ruido de coma flotante (no se ve en pantalla), saltos grandes de pesos raros (3,5 kg, 4 kg kettlebell): no existen en gimnasios.
- Siguen: partir ficheros grandes, chunk de entrada (React), `restDayKcal`.
- Partidos en la 0.1.60 sin cambiar comportamiento (478 tests, build y e2e iguales): `nutrition.ts` (1029 → 784; los productos escaneados y las etiquetas, en `nutritionScan.ts`, reexportado), `Food.tsx` (817 → 529; tarjetas y hojas en `FoodCards.tsx`), `Friends.tsx` (740 → 472; retos en `FriendsChallenges.tsx`). Quedan `generator.ts` (1137, acoplado), `friends.ts` (539) y `figures.ts` (5028, datos).
- Verificado en el navegador: sincronía del descanso entre dos pestañas (adopta y para), Comidas y Retos con los componentes movidos.
