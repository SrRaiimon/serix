// Protección contra el doble toque. Con el dedo es fácil tocar dos veces seguidas: el segundo toque o
// repetía la acción (programa, alimento o medida guardados dos veces) o caía en el botón que acababa de
// aparecer en el mismo sitio («Generar programa» → «Guardar programa», sin ver la vista previa).
// Se descarta el segundo toque cuando, en menos de DOUBLE_MS:
//  - cae casi en el mismo punto pero sobre otro botón (la pantalla cambió debajo del dedo), o
//  - repite sobre el mismo botón de guardar o de marcar serie (los de sumar y restar sí se repiten).
// Solo con toques de verdad: los click() de las pruebas y de las propias pantallas pasan siempre.

const DOUBLE_MS = 450
const NEAR_PX = 32
const ONCE = '.btn.primary, .nav-btn.bold, .set-check, [data-once]'

let last: { at: number; x: number; y: number; el: Element } | undefined

function onClick(e: MouseEvent) {
  if (!e.isTrusted) return
  const el = (e.target as Element | null)?.closest('button, a, [role=button]')
  if (!el) return
  const now = e.timeStamp
  const prev = last
  last = { at: now, x: e.clientX, y: e.clientY, el }
  if (!prev || now - prev.at > DOUBLE_MS || el.closest('[data-repeat]')) return
  const near = Math.abs(e.clientX - prev.x) < NEAR_PX && Math.abs(e.clientY - prev.y) < NEAR_PX
  const repeat = el === prev.el && el.matches(ONCE)
  if ((near && el !== prev.el) || repeat) {
    e.preventDefault()
    e.stopImmediatePropagation()
  }
}

export function installTapGuard() {
  window.addEventListener('click', onClick, true)
}
