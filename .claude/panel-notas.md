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

## Rotación de zonas (serix-code)

En cada panel, `serix-code` revisa entera, además del diff, la zona revisada hace más tiempo («nunca» primero; a igual,
la de más arriba). El diff solo enseña lo cambiado: los fallos de la 0.1.14 y la 0.1.15 estaban en código que no se
volvía a leer. Al acabar el panel se apunta aquí la versión.

| Zona | Archivos | Revisada a fondo |
|---|---|---|
| Comidas | lib/nutrition.ts, lib/mealPlan.ts, screens/Food*.tsx | 0.1.15 |
| Amigos y retos | lib/friends.ts, lib/league.ts, screens/Friends.tsx | nunca |
| Temporizadores, avisos y PWA | lib/timer.ts, lib/lockScreen.ts, lib/intervals.ts, lib/voice.ts, lib/reminders.ts, lib/pwa.ts, sw-template.js | nunca |
| Estadísticas, metas y logros | lib/stats.ts, lib/goals.ts, lib/achievements.ts, lib/coach.ts, lib/insights.ts, lib/periodCard.ts, lib/shareCard.ts | nunca |
| Guardado y varias pestañas | lib/store.ts (migraciones, mergeData, deshacer), lib/customExercises.ts | nunca |
| Pantallas de edición | screens/SessionEdit.tsx, screens/Profile.tsx (medidas), screens/Photos.tsx, lib/photos.ts | nunca |
| Generador y programas | lib/generator.ts, lib/generatorSlots.ts, lib/balance.ts, screens/RoutinesPrograms.tsx | 0.1.9 |
| Importar y exportar | lib/importCsv.ts, lib/exportCsv.ts, lib/share.ts, lib/foodShare.ts, lib/transfer.ts, lib/zip.ts | 0.1.15 |
| Copia de seguridad | lib/backup.ts, lib/protect.ts | 0.1.15 |
| Progresión y autorregulación | lib/progression.ts, lib/autoreg.ts, lib/warmup.ts, lib/plates.ts, lib/bodyweight.ts | 0.1.15 |
| Entreno | lib/workout.ts, screens/Workout*.tsx, screens/Routines.tsx (editor) | 0.1.15 |
| Fechas y semanas | lib/format.ts, lib/recap.ts, lib/block.ts, lib/wod.ts, router | 0.1.15 |

## Pendientes tras 0.1.15 (0.1.13-0.1.15: caracol con letra grande, 10 fallos de un informe externo y la auditoría).
## Crítica de diseño: 32/40; detector limpio; Lighthouse 98-99/100/100/100; axe 0; foco tapado 0 (Tab y ⇧Tab).
## Nuevo de la crítica: `.group-head` (styles.css:1735) sin wrap: a 375 px la cabecera de superserie en tres columnas.

### serix-ux (9,8)
- Guardar como rutina: pedir el nombre, mantener «Frente a la última vez», unir las sesiones anteriores a la rutina y
  no ofrecerlo en sesiones ya guardadas (duplicados).
- Torso A principiante 6d/60: 9 series de empuje frente a 3 de tirón (contar accesorios); variantes del mismo
  aislamiento en días seguidos (extensión de cuádriceps y a una pierna, tríceps en polea y press francés, jalón).
- Kettlebell principiante 4d/45: Torso B de 3 ejercicios (~36 min), Torso A sin hombro; Pierna B con dos zancadas.
- RPE explicado dos veces la primera vez; bandas a 12-20 (changelog 0.1.12) no se cumple en curl, martillo, gemelos,
  subida al banco ni flexión declinada; «Hacer sesión de descarga» en un segundo menú; tono 4-9 del mapa en oscuro.

### serix-code (9,1)
- **Alta (Comidas):** valores por 100 g sin límites al crearlos (nutrition.ts:94-107 recetas, :743-766 Open Food
  Facts, FoodMine.tsx): la copia (backup.ts:264-280) los descarta y al restaurar se pierden el alimento y todos sus
  apuntes. Una validPer100/clampPer100 común, y que el saneado recorte en vez de descartar.
- Media: Open Food Facts acepta negativos en texto («-40», nutrition.ts:743); el menú propuesto usa las 4 comidas
  fijas y no activeMeals() (Food.tsx:52/97, mealPlan.ts:263); «Corregir valores» borra fibra, azúcares y sal
  (FoodMine.tsx:191).
- Baja (Comidas): claves repetidas con el mismo alimento dos veces en un plato (mealPlan.ts:130, Food.tsx:653) y en
  la lista de la compra (Food.tsx:712); fitDish redondea los fijos; setTimeout de la cámara tras cerrar
  (FoodScan.tsx:51); sin aviso de valores dudosos al apuntar varios escaneados; «de las cuales» pierde la grasa
  (nutrition.ts:930); dayGoalOptions memoizado sin medidas ni día (Food.tsx:37); abrir dos veces un enlace de
  alimento lo duplica (FoodImport.tsx:30).
- repeatSession y saveAsRoutine copian las series recortadas por la descarga (workout.ts:341, :446); test.
- hooks-order.test.ts solo ve `if (…) return` de una línea; undoDeload tras pasar a por lados solo quita la marca;
  beforeDeload en sesiones antiguas (migrateData y backup.ts:110) y test de finishSession.
- Brazos: TIE.directArm sin test, generator.ts:599 dropAccessory, deloadSets(2), partir generator.ts (1014).
- Decidir: setUnits da la pareja por hecha con un solo lado marcado (la ronda de superserie avanza tras la izquierda).

### serix-coach (9,8)
- Empuje garantizado: 17 programas de 30 min sin ningún empuje en la semana (Fuerza 2d en los tres niveles) y días de
  cuerpo completo con dos remos y sin empuje; test de barrido «cada programa lleva empuje».
- Bandas a 12-20 también en aislamientos (generator.ts:293 isIsolation antes que la regla de bandas; 852 casos).
- Seguridad de anclaje en Band_Skull_Crusher, Cross_Over_-_With_Bands, Hip_Extension_with_Bands.
- Remo invertido fuera del gimnasio solo por la barra de puerta (generator.ts:141, 1065 casos): variante bajo una mesa
  o no proponerlo.
- Mismo ejercicio en días seguidos (335; objetivo < 100), días < 60 % en PPL, abdomen bajo en fatLoss/general (46),
  brazos sin gimnasio en 2 días; las asistidas nunca proponen quitar ayuda al completar.

### serix-perf-a11y (9,8)
- Peso, repeticiones y «Marcar serie» sin el número de serie para el lector (WorkoutSet.tsx:170/176/195).
- La semana de Inicio sin significado para el lector (✓ y números sueltos; «3» de .week-count sin contexto).
- Anillo de foco del h1 de Inicio y de «General» en Perfil pisa 4 px; ✓ de .set-head a 320 px se sale 3 px.
- Test del orden de luminancia del mapa; 52 KiB de JS y 15 KiB de CSS sin usar.
