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

## Pendientes tras 0.1.6 (resueltos desde 0.1.5: calentamiento de 2 en descarga, «Movilidad 5 min», Comidas en Inicio,
## sin aviso de recuperación en descarga, un mensaje por ejercicio, asistidas en descarga, recuento del entreno,
## deloadWeek con la fecha de la sesión, span vacío, excesos de volumen, kettlebell descompensado, rumano a 6-8, RPE)
## Crítica de diseño: 30/40; detector limpio. Para subir: Inicio más corto (copia sin segundo botón naranja,
## entrenador y comidas plegables), aviso de estancado en tinta, explicar RPE y descarga la primera vez.

### serix-ux (9,7)
- Resumen tras un entreno de descarga: «−5 kg» en rojo y «6,1 t menos movidos»; comparar con lo previsto, en neutro.
  Y sin «Descanso −15 s: te sobraba fuerza» con RPE bajo en descarga.
- Descarga activa y el entrenador sigue con «Cambia Jalón…»/«Cambia Curl martillo…» en «Ver más consejos».
- Torso B: curl martillo 4× y press francés 2× (en descarga, 1 serie); la descarga nunca debería dejar 1 serie.
- Generador: principiante 5 días 90 min (51-64 min sin explicar el tope; «Unos 6 ejercicios» con días de 7; abdomen
  en medio del día y dos de abdomen; extensión de cuádriceps 3 de 5 días). Principiante 3 días 45 min: piernas ~6.
- Músculos: «por debajo» más apagado (debería llamar la atención), banda de zona casi invisible, «Listo» es lo que más pesa.
- Menores: «La siguiente vuelves a tus pesos» (falta «semana»); Rutina › «Músculos que trabaja» sin «Secundarios».

### serix-code (9,6)
- Dos setCount con reglas distintas: stats.ts:38 cuenta drops y workout.ts:187 no (entreno «3 de 3», resumen «5 series»).
  Una sola regla con nombre claro y test que cruce entreno y resumen.
- Abdomen 0 en 64 configuraciones de ≥45 min (contradice el changelog); test solo en 1 configuración.
- Tests de equilibrio entre días y de máx+2 en pocas configuraciones (fuerza principiante 6d 90m peso corporal: glúteo 17,5/15).
- Pesos de desempate de balanceWeek sin escala con nombre (fullness hasta 0,09 > 0,05 del básico); partir generator.ts (856).
- Drop pendiente no entra en «series que no se guardarán»; suelo del modo gasto sin aviso; patrón de swing propio en
  tests; test de descarga sin bloque ni drops.

### serix-coach (9,7)
- Principiante 6 días: bisagra en días seguidos (Pierna B y Cuerpo completo B; 48 programas). Reordenar y test.
- Perder grasa 3 días 45 min por debajo en su análisis (saltos comen el tiempo): abdomen 0, bíceps/tríceps bajos.
- Empuje > 1,5 × tirón en 307 programas: tirón ≥ 0,8-1 × empuje en balanceWeek.
- Bíceps < 8 sin gimnasio (97); sin curl con bandas en el catálogo (comprobar licencia).
- 47 programas con un día < 60 % del más largo (kettlebell 6 días: Empuje B 21 min).
- Hipertrofia 3 días 45 min: superseries antagonistas; Progreso «suficiente para tu tiempo» también con 30 min.

### serix-perf-a11y (9,8)
- Músculos: barras de estado < 3:1 en claro (recuperándose y por debajo 1,98 con --text-3; zona 1,21; naranja 2,79):
  tinta al 50 %, límites de zona con rayas, naranja de gráfico más oscuro en claro.
- aria-label de .volume-track con el estado («por debajo de 10–20»).
- Chip «Movilidad 5 min»: el aria-label no contiene el texto visible (2.5.3).
- Test del ::after de 44 px; Lighthouse y axe cuando estén instalados; leyenda «1-3» del mapa poco visible en claro.
