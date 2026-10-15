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

## Pendientes tras 0.0.84 (ya resueltos en 0.0.85: hojas apiladas inertes, menú de opciones con scroll, días
## sugeridos/fijados, guardián con tests, setsFor solo con barra, temporizador único del cuestionario, iconos sin
## conexión, amigos sin tildes, pierna en casa desde intermedio, prensa/hack, hip thrust 6-10, mancuernas de 2 kg)

### serix-ux (8,8)
- Lastre aún con el peso corporal sumado en «Peso máximo por repeticiones» y en la gráfica del detalle.
- Novedades: elegir la línea más útil (hoy es la primera del changelog: escribirla siempre útil).
- Entrenador y banner «Instálala» a la vez en Inicio.
- El objetivo de kcal salta al pulsar Empezar (2400 → 2860) sin explicarlo.
- Menú de opciones del ejercicio: muestra opciones que no aplican (máquina asistida, por lados en peso muerto);
  el foco vuelve a BODY al cerrarlo con Escape.
- Peso corporal + barra principiante: «Dominada con barra V» / «tras nuca»; Pierna A y B iguales; días cortos.

### serix-code (8,9)
- Food.tsx 1866 y Workout.tsx 1251 líneas; claves i18n = texto en español.
- tests/service-worker.test.ts comprueba el código con regex (no ejecuta el SW).
- mergeList no deduplica la lista propia.
- Biblioteca sin tope por duración (ppl3/upperlower4 en gimnasio a 24 series).

### serix-coach (9,0)
- Tirón en casa sin barra: sin bíceps (no hay ejercicio de bíceps sin material en el catálogo).
- Pierna A y B en casa iguales; Kettlebell_Arnold_Press como elevación lateral; legCurl con mancuernas sin peso.
- Biblioteca upperlower4: peso muerto + sentadilla frontal (experto) el mismo día para intermedio.

### serix-perf-a11y (9,6)
- La fuente Archivo (88 KiB) se descarga ya en la bienvenida: LCP 2,6-2,7 s, Rendimiento 95-96.
- Foco a BODY tras «Crear mi programa», «Guardar programa» y «Solo quiero entrenar».
- Al intentar quitar un día por debajo de 2 no se anuncia nada; avance automático con Espacio (WCAG 3.2.2).
- Onboarding importa HealthNotice de Legal de forma estática (7 KiB); serix-192.png más grande de lo mostrado.
