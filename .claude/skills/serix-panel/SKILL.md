---
name: serix-panel
description: Pasa el panel de cuatro evaluadores de Serix (diseño, código, entrenador, rendimiento y accesibilidad) sobre la versión publicada y devuelve la tabla de notas frente a la anterior. Úsalo cuando el usuario pida la nota, la valoración o que se junten los evaluadores.
disable-model-invocation: true
---

# Panel de evaluadores de Serix

1. Lee `.claude/panel-notas.md`: la última fila de la tabla y los pendientes de cada evaluador.
2. Comprueba qué versión está publicada (`version` de `package.json` en `main` y que la web la sirva:
   `curl -s https://srraiimon.github.io/serix/` → el `assets/index-*.js` contiene la versión). Si lo
   publicado no es lo último, dilo antes de seguir.
3. Lanza en paralelo y en segundo plano los cuatro agentes `serix-ux`, `serix-code`, `serix-coach` y
   `serix-perf-a11y`. A cada uno pásale: la versión, su nota anterior y sus pendientes (copiados de
   `panel-notas.md`), el rango de commits desde la versión evaluada antes (para `serix-code`) y la ruta del
   scratchpad de esta sesión para sus archivos temporales. Recuérdales que son de solo lectura.
4. Según llegue cada informe, resúmelo al usuario en pocas líneas (nota, lo resuelto, lo nuevo más grave).
   Si alguno se corta (límite de uso, error), reanúdalo con un mensaje en vez de lanzar otro.
5. Con los cuatro: tabla «anterior → actual» por evaluador y global (media de los cuatro, con un decimal y la
   cifra exacta entre paréntesis si redondea), y la lista priorizada de lo que más subiría la nota.
6. Actualiza `.claude/panel-notas.md`: añade la fila y sustituye los pendientes por los nuevos. Este archivo
   es del repo: se sube en el siguiente commit, sin push aparte.
7. Ofrece hacer la versión siguiente con esa lista. No cambies nada de la app sin un sí del usuario.
