import { Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { CHANGELOG, compareVersions, unseenReleases } from '../lib/changelog'
import { t } from '../lib/i18n'
import { updateSettings, useData } from '../lib/store'
import { Card, Sheet } from './ui'

/** Tras actualizar: lo nuevo, una sola vez (se cierra con «Entendido»). */
export function NewsCard() {
  const { settings } = useData()
  const [all, setAll] = useState(false)
  if (settings.seenVersion === __APP_VERSION__) return null
  const list = unseenReleases(settings.seenVersion, __APP_VERSION__)
  if (!list.length) return null
  // Una línea con lo más destacado; todo, a un toque («Ver»). Tres puntos largos ocupaban media pantalla.
  const [es, en] = list[0].items[0]
  const seen = () => updateSettings({ seenVersion: __APP_VERSION__ })
  return (
    <div className="card news-line">
      <Sparkles size={20} color="var(--accent-text)" aria-hidden="true" style={{ flexShrink: 0 }} />
      <span className="grow small">
        <strong style={{ display: 'block' }}>{t(`Novedades de la versión ${__APP_VERSION__}`, `What's new in version ${__APP_VERSION__}`)}</strong>
        <span className="muted news-line-text">{t(es, en)}</span>
      </span>
      <button className="btn secondary btn-sm" onClick={() => setAll(true)}>{t('Ver', 'View')}</button>
      <button className="hit" onClick={seen} aria-label={t('Entendido', 'Got it')} style={{ color: 'var(--text-2)' }}><X size={18} /></button>
      {all && <NewsSheet onClose={() => { setAll(false); seen() }} />}
    </div>
  )
}

/** Todas las novedades (Perfil → Novedades). */
export function NewsSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title={t('Novedades', "What's new")} onClose={onClose} right={<button className="nav-btn" onClick={onClose}>{t('Cerrar', 'Close')}</button>}>
      {CHANGELOG.filter((r) => compareVersions(r.version, __APP_VERSION__) <= 0).map((r) => (
        <Card key={r.version} title={`${t('Versión', 'Version')} ${r.version}`}>
          <ul className="recap-list">{r.items.map(([es, en]) => <li key={es}>{t(es, en)}</li>)}</ul>
        </Card>
      ))}
    </Sheet>
  )
}
