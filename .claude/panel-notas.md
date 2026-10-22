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

## Pendientes tras 0.1.10 (la 0.1.9 sin panel; la 0.1.11 arregla el fallo del resumen al guardar como rutina y el
## mismo patrón en Progreso › Calorías y peso, con tests/hooks-order.test.ts). Resueltos desde 0.1.8: tirón en cada
## cuerpo completo, días de un ejercicio, abdomen uno por día, por lados con cualquier lado, «Última vez», «Tu plan»,
## mapa 1-3, avanzado 3 días, nombres de la biblioteca, quitar la descarga, Inicio más corto, RPE explicado, axe.
## Crítica de diseño: 32/40; detector limpio; Lighthouse publicado 98-99/100/100/100; axe 0 en 16 pantallas × 2 temas.

### serix-ux (9,8)
- Bandas intermedio 3d/45 hipertrofia: 0 series de bíceps y tríceps (el changelog promete brazos con bandas); remo
  invertido o con toalla cuando solo se han declarado bandas.
- Empuje/tirón por día contando accesorios (Torso A principiante 6d/60: 9 de empuje frente a 3).
- Variantes del mismo aislamiento en días seguidos (extensión de cuádriceps y a una pierna; curl martillo y en polea).
- Kettlebell principiante 4d/45: Torso B de 3 ejercicios y ~36 min; Torso A con dos remos y sin hombro.
- RPE la primera vez dice lo mismo dos veces; abdomen con 4 series sin naranja sin explicar; 4-9 del mapa en oscuro.

### serix-code (9,4)
- (Arreglado en 0.1.11) hook después del return en ComparisonCard.
- undoDeload pierde series añadidas después de la descarga y mezcla ids si se pasa a por lados; tests de ambos.
- beforeDeload se queda guardado al terminar (IndexedDB y copias): borrarlo en finishSession y no copiarlo al repetir.
- La decisión de descarga del resumen, a una función pura en lib con tests (plancha, 5/3/1, uno solo, sesión libre).
- Empuje/tirón con 30 min y 4 días o más (4 casos a 1,6); weekly() duplicado en dos tests; generator.ts:595 quita
  compuestos con TIE.dropAccessory; deloadSets(2); seguir partiendo generator.ts (976).

### serix-coach (9,8)
- Cuerpo completo sin empuje (192 días; gym hipertrofia principiante 3d 45m: día B sin press, pecho 6/sem).
- Mismo músculo principal en días seguidos: 329 (también en casa y en básicos; negativas, zancadas). Objetivo < 100.
- Días por debajo del 60 % del tiempo elegido: 83 (PPL general intermedio 6d 60m: Empuje A 33 min sin hombro).
- Abdomen bajo el mínimo en fatLoss/general ≥ 45 min: 46; regla en el barrido. «Perder grasa» en el test de bisagras.
- Brazos sin gimnasio: 61 (tríceps bajo en 121).
- Catálogo nuevo: agarre del curl martillo con kettlebell (por el centro del asa), seguridad del anclaje en face pull
  y jalón con banda (puerta cerrada, anclaje, revisar la banda), remo con banda a 12-20.

### serix-perf-a11y (9,7)
- WCAG 2.4.11: la barra de pestañas tapa el foco en Comidas, Progreso y Perfil: html { scroll-padding-bottom } con
  el alto de la barra; prueba por CDP.
- Test de orden de luminancia del mapa; campos de peso/reps/marcar sin número de serie para el lector; semana de
  Inicio legible con lector; 51 KiB de JS y 15 KiB de CSS sin usar; anillo del h1 sobre la fecha; ✓ a 320 px.
