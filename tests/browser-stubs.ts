// Lo mínimo del navegador que algunos módulos tocan al cargarse (p. ej. timer.ts escucha
// visibilitychange). Se importa antes que ellos.
const g = globalThis as { document?: unknown; navigator?: { vibrate?: unknown } }
g.document ??= { addEventListener: () => {}, visibilityState: 'visible' }
