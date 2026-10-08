import { ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { CONTACT, feedbackTitle, sendTo, type FeedbackKind } from '../lib/feedback'
import { t } from '../lib/i18n'
import { Sheet } from './ui'

/**
 * Contar un fallo o proponer una idea: se escribe y se elige por qué red mandarlo al creador.
 * El mensaje dice arriba si es un FALLO o una IDEA.
 */
export function FeedbackSheet({ kind, initial = '', onClose }: { kind: FeedbackKind; initial?: string; onClose: () => void }) {
  const [text, setText] = useState(initial)
  const [sent, setSent] = useState<string>()
  const bug = kind === 'bug'
  return (
    <Sheet title={bug ? t('Contar un fallo', 'Report a bug') : t('Proponer una idea', 'Suggest an idea')} onClose={onClose}
      left={<button className="nav-btn" onClick={onClose}>{sent ? t('Cerrar', 'Close') : t('Cancelar', 'Cancel')}</button>}>
      <span className="feedback-kind">{feedbackTitle(kind)}</span>
      <textarea rows={5} autoFocus value={text} onChange={(e) => setText(e.target.value)} aria-label={bug ? t('Qué ha pasado', 'What happened') : t('Tu idea', 'Your idea')}
        placeholder={bug ? t('¿Qué estabas haciendo y qué ha pasado?', 'What were you doing and what happened?') : t('¿Qué te gustaría que hiciera Serix?', 'What would you like Serix to do?')} />
      <div className="list-header">{t('Mándamelo por', 'Send it to me on')}</div>
      <div className="list">
        {CONTACT.map((c) => (
          <button key={c.id} className="list-row" disabled={!text.trim()} onClick={() => {
            const r = sendTo(c.id, kind, text)
            setSent(r === 'copied'
              ? t(`Mensaje copiado: pégalo en el chat de ${c.name} y envíalo.`, `Message copied: paste it into the ${c.name} chat and send it.`)
              : t('Se ha abierto GitHub con el mensaje escrito: pulsa «Submit new issue» para enviarlo.', 'GitHub opened with the message filled in: tap "Submit new issue" to send it.'))
          }}>
            <ExternalLink size={20} color="var(--text-2)" aria-hidden="true" />
            <span className="grow">{c.name}</span>
            <span className="muted">{c.handle}</span>
          </button>
        ))}
      </div>
      {sent ? <span className="small" style={{ color: 'var(--green-text)' }} role="status">{sent}</span>
        : <span className="small muted">{t('El mensaje lleva arriba si es un fallo o una idea, y abajo la versión y el tipo de móvil (nada de tus datos).', 'The message says at the top whether it is a bug or an idea, and at the bottom the version and phone type (none of your data).')}</span>}
    </Sheet>
  )
}
