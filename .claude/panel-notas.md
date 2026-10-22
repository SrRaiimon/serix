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

## Pendientes tras 0.1.7 (resueltos desde 0.1.6: resumen de descarga neutro, consejos en pausa en descarga, descarga
## nunca a 1 serie, Músculos a 3:1 con estado en aria-label, chip con nombre visible, «Secundarios», bisagras seguidas
## en principiante 6 días, empuje ≤ 1,5 × tirón con ≥ 45 min, Torso B 3/3, copia secundaria, estancado en gris)
## Crítica de diseño: 31/40; detector: 2 avisos «side-tab» por los límites de zona de Músculos (border 2 px).
## Para subir: Inicio más corto, explicar RPE y descarga la primera vez, límites de zona sin bordes laterales.

### serix-ux (9,8)
- Generador: abdomen mal repartido (dos ejercicios en un día, ninguno en otro); escaladores antes de los gemelos.
- Nombres de días: «Cuerpo completo C» sin A ni B (principiante 5 y 6 días): nombrar en orden desde A.
- «Tu plan» dice «90 min / sesión» y la vista previa «51–64′»: los minutos reales cuando hay tope.
- Routines.tsx:288 «La siguiente vuelves a tus pesos» (y fr/pt): «La semana que viene».
- Tarjeta del mes: «Estrella» es el de más series (y sale en «Sin mejorar»): «Más series: …»; «0 min» frente a «<1 min».
- Extensión de cuádriceps en 3 de 5 días.

### serix-code (9,5)
- setProgress (workout.ts:190) no usa countsAsSet: por lados exige las dos y setCount no (entreno «2 de 3», resumen 3).
  Construirlo sobre countsAsSet y test que cruce setProgress con sessionSets (lados, drops, calentamiento).
- Session.tsx:204/217: con un solo ejercicio descargado (estancado) el resumen tapa el volumen de toda la sesión.
- Workout.tsx:70: el return temprano en descarga no revierte un +30 s previo; usar adjustRestForEffort con max(rpe, 8).
- Empuje/tirón blando: 37 programas de 30 min con tirón 0 (gym fuerza principiante 2d 30m); test solo a 60 min y 1,5.
- Brazos: 12 días con diferencia de 2 (gym fuerza intermedio 5d 60m Torso B); [lo, hi] coge los dos menores.
- generator.ts 936 líneas y pesos sueltos (0,5, 0,01, 0,02, pushExcess × 0,5): escala con nombre y partir el archivo.
- Tests de abdomen, máx+2 y brazos a todo el barrido; glúteo 17,5/15 en fuerza principiante 6d 90m peso corporal.
- deloadSets(2) = 2 (sin «menos series»); «Quitar la descarga de hoy» no restaura; suelo del modo gasto; swing en
  tests con countsForVolume; test de deloadWeek/weekRoutine con bloque y drops.

### serix-coach (9,7)
- 37 programas sin ninguna serie de tirón (cuerpo completo con 30 min): un tirón por sesión siempre; test sin filtrar.
- Nuevo orden de principiante 6 días: press 3 días seguidos y el mismo inclinado en días seguidos (92 programas);
  Torso A sin elevaciones laterales.
- Abdomen bajo el mínimo en fatLoss/general con ≥ 45 min (49), p. ej. gym fatLoss intermedio 2d 45/60m y mancuernas 3d 45m.
- Bíceps bajo en 75 y tríceps en 33 sin gimnasio con mancuernas/kettlebell (sí hay curls): subirlos en el ajuste.
- 53 días cortos (mancuernas fuerza principiante 6d 30m: un día de 16 min con un ejercicio).
- Hipertrofia avanzado 3 días: PPL una vez por semana; mejor cuerpo completo o superseries.

### serix-perf-a11y (9,9)
- Lighthouse y axe-core (instalar en el scratchpad con permiso del usuario).
- Mapa de calor: nivel 1-3 (--mm-l1/--mm-l2, .mm-key-light) a 3:1 o con contorno.
- Tarjeta de copia: «Más tarde» con relleno pesa más que «Guardar copia» (contorno 1,5:1): botón de texto.
- touch-area.test.ts solo lee el CSS: contenedores con overflow y position relative.
- aria-label del abdomen a 0 series («sin series, no tiene mínimo»).
