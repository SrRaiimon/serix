---
name: serix-release
description: Cierra y publica una versión de Serix - sube la versión, escribe las novedades, completa traducciones, pasa la prueba ligera (tipos, tests, build, e2e), hace el commit, pregunta «¿Lo publico?», sube a main y comprueba que la web publicada sirve la versión nueva.
disable-model-invocation: true
---

# Publicar una versión de Serix

Las reglas de CLAUDE.md mandan; esto es el orden de trabajo.

1. **Qué entra.** `git status` y `git diff --stat`: resume en dos líneas qué cambia para el usuario. Si no
   hay cambios de la app (`src/`, `public/`, `index.html`, `vite.config.ts`), no es una versión: haz solo el
   commit y pregunta antes del push.
2. **Versión.** Sube el último número de `version` en `package.json` (0.0.69 → 0.0.70) salvo que el usuario
   diga otra.
3. **Novedades.** Nueva entrada al principio de `CHANGELOG` en `src/lib/changelog.ts`: 3-6 frases cortas de
   lo que se nota al usar la app, cada una `['español', 'English']`, sin detalles técnicos.
4. **Traducciones.** `node scripts/i18n/missing.mjs`; añade cada texto que falte a `src/i18n/fr.json` y
   `pt.json` (francés de Francia, portugués de Portugal, tuteo), manteniendo el formato de una entrada por
   línea. Repite hasta «Todo traducido».
5. **Prueba ligera**, con `export PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH`:
   `npx tsc --noEmit && npx tsc --noEmit -p tests`, `npm run build` (incluye los tests) y `npm run e2e`.
   Si algo falla, arréglalo y repite; no sigas con fallos. Si `e2e` falla por un cambio de pantallas
   intencionado, adapta `scripts/e2e.mjs` y dilo.
6. **Lo cambiado, visto.** Capturas a 375×812 de las pantallas tocadas (claro y oscuro si cambian colores),
   con `npx vite preview --port 4190 --strictPort` y puppeteer desde el scratchpad; para el servidor al acabar.
7. **Commit** en `main` con el email del repo: `0.0.X: resumen en una línea` y la línea
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
8. **Pregunta «¿Lo publico?»** con el resumen de lo que entra y el resultado de las pruebas. Sin un sí expreso
   no hay push (si el usuario ya dijo «súbelo cuando termines» en esta tarea, ese es el sí).
9. **Push y comprobación.** `git push`; espera a que termine el despliegue
   (`gh run list --commit <sha> --json status,conclusion`) y comprueba que el `assets/index-*.js` de
   https://srraiimon.github.io/serix/ contiene la versión nueva.
10. **Informe** al usuario en español: qué cambia (por apartados), qué se probó y qué queda pendiente.
