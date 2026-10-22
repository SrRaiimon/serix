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

## Pendientes tras 0.1.12 (la 0.1.13 arregla el caracol de la figura con letra grande en Safari, con test).
## Crítica de diseño: 32/40; detector limpio; Lighthouse 99/100/100/100; axe 0; foco tapado 0 (Tab y ⇧Tab).

### serix-ux (9,8)
- Guardar como rutina: desaparece «Frente a la última vez», la sesión libre antigua no se une a la rutina, la opción
  sigue en sesiones ya guardadas (duplicados) y el nombre queda «Entrenamiento libre» sin pedirlo.
- Torso A principiante 6d/60: 9 series de empuje frente a 3 de tirón (contar accesorios); variantes del mismo
  aislamiento en días seguidos (extensión de cuádriceps y a una pierna, tríceps, jalón).
- Kettlebell principiante 4d/45: Torso B de 3 ejercicios (~36 min), Torso A sin hombro.
- RPE explicado dos veces la primera vez; changelog «bandas a 12-20» no se cumple en aislamientos; «Hacer sesión de
  descarga» escondido en un segundo menú; escala 4-9 del mapa en oscuro.

### serix-code (9,5)
- repeatSession y saveAsRoutine copian las series recortadas por la descarga (5 → 3 → 2 al repetir en descarga; la
  rutina guardada queda al 60 %): usar beforeDeload o la rutina de origen; tests.
- hooks-order.test.ts solo ve `if (…) return` de una línea; no `if {` + `return (`, export default ni flechas.
- undoDeload tras pasar a por lados con una serie hecha: solo quita la marca; test.
- beforeDeload en sesiones antiguas (migrateData y backup.ts:110 lo conservan); test de finishSession.
- Brazos: fits con y sin margen en balanceWeek; brazos fijos a 2 series; TIE.directArm sin test; generator.ts:599
  dropAccessory en compuestos; weekly() repetido en los tests; deloadSets(2); partir generator.ts (1014).

### serix-coach (9,8)
- Bandas a 12-20 también en aislamientos (la regla isIsolation va antes): curl, laterales, gemelos a 8-12/10-15.
- Seguridad en Band_Skull_Crusher (anclado detrás de la cabeza), Cross_Over_-_With_Bands, Hip_Extension_with_Bands.
- Remo invertido: la barra de dominadas de puerta no sirve (pide barra a la altura de la cadera): alternativa bajo
  una mesa robusta o no proponerlo solo por tener barra.
- Cuerpo completo sin empuje (188), mismo ejercicio en días seguidos (335; objetivo < 100), días < 60 % del tiempo
  en PPL (89), abdomen bajo en fatLoss/general (46), brazos sin gimnasio (57).

### serix-perf-a11y (9,8)
- Peso, repeticiones y «Marcar serie» sin el número de serie para el lector.
- La semana de Inicio sin significado para el lector (✓ y números sueltos).
- Anillo de foco del h1 de Inicio pisa la fecha (outline-offset); ✓ de la cabecera del entreno a 320 px.
- Test del orden de luminancia del mapa; 52 KiB de JS y 15 KiB de CSS sin usar.
