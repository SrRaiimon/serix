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

## Pendientes tras 0.0.73

### serix-ux (8,6)
- Generador «Solo peso corporal» con barra: una sola dominada (y es «barra V», de polea), día 3 con 4
  ejercicios, puente a una pierna en días seguidos, sentadilla 3×12-20 con 2 min de descanso.
- Lastre: el detalle de Dominadas lista «92,82 × 10» (peso corporal sumado con decimales); unificar a «tu peso
  + X kg» como el informe. En Progreso, «con tu peso» desalinea las columnas de marcas.
- Entreno: columna ÚLTIMA VEZ cortada («92,5×9 …», no se ve el RPE); en ejercicios sin peso dice «Apunta peso
  y repeticiones» y salen ±2,5 kg.
- Novedades en Inicio: la línea destacada debe ser la más útil para el usuario, no la técnica.
- Tarjeta para compartir: «34.185 kg» frente a «34,2 t»; pestañas cortadas («Mes pa…»). Informe: «Última
  medida (Jueves, …): —». Entrenador y banner «Instálala» salen a la vez. Inicio «~66 minutos» sin decir que
  es tu duración.

### serix-code (8,8)
- progression.ts bodyweightPlan: con from > cap propone menos repeticiones (to = min(cap, from + 1));
  debería ser from si ya pasa el tope. Y se aplica en progresión «Manual» (undefined) con 0 kg: limitar a
  double/linear o a ejercicios sin carga.
- guard.mjs: al quitar lo entrecomillado deja pasar `bash -c "…"`; tampoco ve `/bin/rm` ni `\rm`. Comprobar
  el comando entero y el texto sin comillas.
- newsDue: true aunque seenVersion sea más nuevo (pestaña vieja) → ocupa el aviso sin mostrar nada. Usar
  compareVersions(seen, versión) < 0.
- Store: faltan tests de escritura abortada por 'newer', guardado tras juntar y fusión de rutinas/notas;
  mergeRecord(nutrition) serializa entries/foods/meals enteras para nada; amigos por name crudo.
- Menores: RepRecords redondea antes de pasar a lb; lazy() entre imports en Home.tsx; la Biblioteca no pasa
  `strict` (kipping); fitScheme trata Natural_Glute_Ham_Raise como aislamiento («raise»); Food.tsx 1866 y
  Workout.tsx 1246 líneas.

### serix-coach (8,8)
- Estiramientos como fuerza: Split_Squats y Superman (categoría stretching) salen en las listas preferidas;
  filtrar category === 'stretching' en pick().
- Bisagra en gimnasio cae en el swing (la regla axial quita el RDL): antes RDL con mancuernas o hip thrust.
  Kettlebell Pierna B con 3 ejercicios y sin cuádriceps.
- La Biblioteca no usa fitScheme ni topes: 5×5 sin barra a 5×5 de sentadilla al aire con 180 s; Pierna B de
  upperlower4 en gimnasio 24 series.
- ISOLATION sin cross/butterfly/pull apart (Cable_Crossover a 3×6-10 con 120 s y sube 2,5 kg).
- Perfil bodyweight sin 'other': no salen Towel_Door_Row ni Backpack_Row; principiante 45 min con 8 series;
  Wall_Walk como press de hombro.

### serix-perf-a11y (9,5)
- Sheet y ActionSheet (ui.tsx) no son diálogos accesibles: sin role="dialog"/aria-modal, el foco no entra,
  Tab recorre lo de detrás, #root sin inert, Escape no cierra (axe `region` en las hojas).
- Material en Generar programa (Routines.tsx) sin aria-pressed.
- Menor: los chunks de otras pestañas se descargan ya en la bienvenida (~70 KiB gzip).
