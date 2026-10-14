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

## Pendientes tras 0.0.70

### serix-ux (8,4)
- Inicio sigue apilando Novedades (3 puntos largos), Entrenador y el banner «Instálala»: Novedades plegada a
  una línea con «Ver»; el banner de instalar solo sin otro aviso. Inicio mide 3,1 pantallas con historial.
- Objetivo de kcal distinto según pantalla: Comidas 2400/2860 (según lo quemado), Informe del mes 2600.
- Duración estimada incoherente (~49 min para 16 series en el programa nuevo frente a ~66 min para 12).
- Peso corporal sin explicar: «124 kg Dominadas» en Progreso, «92,82 kg» con decimales en el detalle,
  «+22,36 kg»; «430.845 kg levantados» en Perfil (mejor «430,8 t»).
- «Hoy entreno» en Comidas no parece un botón; «−200 kcal» sin base; «12 veces» bajo «6-10 reps»;
  «Hoy» suelto en Tus datos → Guardar copia; informe «Última medida (fecha): —»; columna «Última vez» cortada.

### serix-code (8,5)
- store.ts mergeList compara por identidad (===): con `theirs` leído de IndexedDB nunca coincide con `base`,
  así que lo borrado aquí reaparece. Comparar por contenido; el test usa theirs = base y no lo detecta
  (probar con structuredClone).
- No es una fusión a tres bandas: si un elemento (o settings/rutinas/notas) solo cambió en la otra pestaña,
  gana el de esta. Regla: si ours[k] igual a base[k], quedarse con theirs.
- Si los datos guardados son 'newer', se escriben encima igualmente: abortar y marcar `newer`. Una pestaña
  en 0.0.69 escribe sin subir rev y la de 0.0.70 no la ve.
- Tras juntar con dirty = true no se programa guardado (scheduleSave).
- progression.ts: tras pausa larga usa el mejor 1RM de siempre ×0,9 (puede dar más peso que el reciente);
  usar el mejor de los 90 días antes de la última sesión ×0,9. El test da 72,5 por bueno.
- nutrition.ts: sin entrenos en 8 semanas ni weightKg, burnedDaily = 0 y se cuentan dos veces.
- generator.ts: `bar` solo con gimnasio (quien tiene barra en casa nunca recibe dominadas).
- Hooks: guard.mjs no cubre rm -Rf / -rfv / --recursive --force; bloquea comandos que solo contienen el
  texto; «push» en un mensaje de commit dispara la comprobación; versionAt undefined === undefined.
- Food.tsx 2053 líneas, Workout.tsx 1242; tests con nombres vagos; 5/3/1 «semana» = sesión.

### serix-coach (8,5)
- NEEDS_BAR no reconoce «Kipping_Pull_Up» (guion bajo): usar pull[-_]?up; quitar kipping fuera del bloque
  funcional (salen kipping sin barra con kettlebell, mancuernas y peso corporal).
- buildLibraryProgram llama a pick() sin reglas: la Biblioteca da pino, elevaciones colgado y dominadas sin
  barra a principiantes.
- HARD_START incompleto: Natural_Glute_Ham_Raise (nórdico) y Wall_Walk salen a principiantes.
- Huecos descartados sin sustituto: días con 3 ejercicios y sin tirón (tirón vertical sin barra → remo,
  toalla o mochila, `homePull`).
- La pauta va por tipo de hueco, no por ejercicio: goblet, prensa y swing a 4×3-5; laterales con 120 s;
  bisagra de puente a una pierna habiendo RDL con mancuernas; Pierna B sigue en 23+ series.
- Sin progresión en ejercicios de peso corporal.

### serix-perf-a11y (9,4)
- 63 KiB de JS sin usar al arrancar y CSS bloqueante (~150 ms): dividir el arranque y CSS crítico inline.
- Chips de idioma con 6 px entre filas (Français 89×42) y botón ⋯ de Rutinas 44×43.
