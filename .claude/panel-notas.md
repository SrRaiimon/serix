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

## Pendientes tras 0.0.96 (resueltos desde 0.0.94: semana cumplida coherente, peso corporal completo con
## negativas y gemelos, menú del ejercicio en tres, «descarga», biblioteca por niveles, un botón de programa,
## nórdico y una bisagra por día, fuerza con un pesado por día, inert por recuento, avisos y foco, iconos SW)
## Sin Lighthouse ni axe instalados: perf-a11y mide con Chrome por CDP (scripts en el scratchpad, panel3-perf/).

### serix-ux (9,2)
- Detalle de rutina y entreno no proponen lo mismo: «57,5 × 10» en todas frente a 10/9/8 de la última vez;
  el detalle enseña calentamiento que el entreno no trae; «× 10» y «Meta: 10 reps» repetidos.
- Progreso › Músculos: «Series por grupo (7 días)» y «Equilibrio muscular (4 semanas)» cuentan distinto;
  56:24 cuádriceps/isquios sale como «Bien equilibrado».
- Descarga escondida en Ajustes del ejercicio aunque Progreso promete proponerla; 13 «sin mejorar» y el
  entrenador solo propone 2 cambios; «una suave al final» en la tarjeta de Bloque.
- Volumen con dos verbos («movido» / «levantados»); «Instalar en el móvil» dentro de PROGRAMA en Perfil.
- Calorías de Inicio saltan 2340 → 2970 al empezar un entreno opcional; botones del entrenador en 2 líneas.

### serix-code (9,3)
- `generator.ts` BACKPACK_LOAD excluye la mochila también con bandas: Torso B con tres remos y sin brazos.
- `warmup.ts:33` repite la serie de mancuernas sin `used` (juego de 2,5 → calentamiento de 16 kg).
- «Perder grasa» a 45 min: torso sin brazos (acondicionamiento protegido) sin test que lo fije.
- `PULLUP` acepta asistidas y negativas pese al comentario: una asistida bloquea la supina.
- `mergeList` `{...out[i], ...x}` resucita campos quitados a propósito; zona role=status inerte con hoja abierta.
- Test de propiedades de los 6000 días (todos los materiales); tests de useDialog y foco; ExerciseBlock a su archivo.

### serix-coach (9,2)
- «Perder grasa»: principiante 90 min ~62 min reales; intermedio = avanzado; avanzado 6 series/sem de
  grupos grandes; peso corporal 45 min sin femoral ni tirón vertical.
- HINGE sin swing: con kettlebell swing + peso muerto a una pierna (el de Pierna B sin carga).
- Proteína fija 2,2 g/kg en dietas muy bajas (1160 kcal → 70 g H); sin suelo ~1200 kcal.
- Gimnasio 45 min: 6 series/sem pecho y espalda, sin laterales, 39 min; «General» con peso muerto a 8-12.
- Fuerza avanzado: sentadilla pesada 1×/sem; prensa + hack tras el peso muerto; sesiones 65/79 min con 60/75.
- Variantes con carga a medias: puente sin peso con mancuernas; zancada y peso muerto sin carga con kettlebell.

### serix-perf-a11y (9,5)
- Pantalla del entreno (`.fullscreen`, App.tsx:204-218) sin inert sobre main/TabBar/ActiveBar: 21 de 120 Tab
  caen en Inicio tapado; el entreno no tiene encabezado propio.
- `WorkoutSet.tsx:115/130` blur() al marcar serie: el foco cae en BODY (solo si está en un input).
- `UndoToast.tsx` crea su role=status con el texto.
- Cabeceras de nivel de la biblioteca como div (usar h2.list-header); al elegir programa el foco cae en BODY.
- Campos del entreno a 40 px (`.set-label`, `.set-input`), nombre del entreno 33 px.
