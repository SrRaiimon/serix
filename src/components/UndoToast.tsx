import { RotateCcw } from 'lucide-react'
import { useEffect } from 'react'
import { t } from '../lib/i18n'
import { dismissUndo, undo, UNDO_SECONDS, useUndo } from '../lib/store'
import { Overlay } from './ui'

/** Aviso tras un borrado con el botón «Deshacer». Desaparece solo o en cuanto hay otro cambio. */
export function UndoToast() {
  const offer = useUndo()
  useEffect(() => {
    if (!offer) return
    const timer = setTimeout(dismissUndo, UNDO_SECONDS * 1000 - (Date.now() - offer.at))
    return () => clearTimeout(timer)
  }, [offer])
  if (!offer) return null
  return (
    <Overlay>
      <div className="undo-toast" role="status">
        <span className="grow">{offer.label}</span>
        <button onClick={() => { undo(); navigator.vibrate?.(20) }}><RotateCcw size={16} /> {t('Deshacer', 'Undo')}</button>
      </div>
    </Overlay>
  )
}
