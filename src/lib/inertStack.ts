// Hojas apiladas: lo que queda inerte detrás de cada una. Se cuenta por elemento cuántas hojas abiertas lo tienen
// inerte: si se cierra antes la de debajo (fuera de orden), lo de detrás sigue inerte mientras quede alguna. Sin el
// recuento, la primera en cerrarse se lo quitaba aunque la otra siguiera abierta. Aparte de ui.tsx (useDialog)
// para probarlo sin navegador.

/** Lo justo de un elemento del DOM. */
export interface InertTarget {
  hasAttribute(name: string): boolean
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
}

const inertBy = new Map<InertTarget, number>()

/**
 * Deja inertes los elementos de `children` salvo los de `keep` (la hoja que se abre, la zona de avisos). Lo que ya
 * estaba inerte por otra hoja también cuenta; lo que lo estaba por otra cosa, no se toca. Devuelve lo silenciado,
 * para `release`.
 */
export function silence<T extends InertTarget>(children: Iterable<T>, keep: (el: T) => boolean): T[] {
  const silenced = [...children].filter((el) => !keep(el) && (inertBy.has(el) || !el.hasAttribute('inert')))
  for (const el of silenced) {
    inertBy.set(el, (inertBy.get(el) ?? 0) + 1)
    el.setAttribute('inert', '')
  }
  return silenced
}

/** Al cerrar la hoja: cada elemento vuelve a estar activo solo si ya no lo silencia ninguna otra. */
export function release(silenced: InertTarget[]) {
  for (const el of silenced) {
    const n = (inertBy.get(el) ?? 1) - 1
    if (n > 0) inertBy.set(el, n)
    else {
      inertBy.delete(el)
      el.removeAttribute('inert')
    }
  }
}
