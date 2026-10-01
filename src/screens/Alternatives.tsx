import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Sheet, Thumb, useCatalog } from '../components/ui'
import { alternatives } from '../lib/alternatives'
import type { Exercise } from '../lib/catalog'
import { equipmentInfo } from '../lib/generator'
import { equipmentLabel, muscleLabel } from '../lib/labels'
import { useData } from '../lib/store'
import { t } from '../lib/i18n'

const LIMIT = 40

/** Sustituir un ejercicio: alternativas del mismo músculo, o cualquier ejercicio si se busca. */
export function AlternativesSheet({ current, onPick, onClose }: {
  current: { exerciseId: string; name: string; muscle: string }
  onPick: (exercise: Exercise) => void
  onClose: () => void
}) {
  const catalog = useCatalog()
  const { settings } = useData()
  const [onlyMine, setOnlyMine] = useState(settings.equipment !== 'gym')
  const [query, setQuery] = useState('')

  const list = useMemo(() => {
    if (query.trim()) {
      const allowed = onlyMine ? new Set(equipmentInfo(settings.equipment).allowed) : null
      return catalog.filter({ query, favoritesOnly: false }, [])
        .filter((e) => e.id !== current.exerciseId && (!allowed || allowed.has(e.equipment)))
    }
    return alternatives(catalog, current, onlyMine ? settings.equipment : null, new Set())
  }, [catalog, current, onlyMine, query, settings.equipment])

  return (
    <Sheet title={t('Sustituir ejercicio', 'Replace exercise')} onClose={onClose} left={<button className="nav-btn" onClick={onClose}>{t('Cancelar', 'Cancel')}</button>}>
      <p className="small muted" style={{ margin: 0 }}>
        {t('Alternativas para', 'Alternatives to')} <strong style={{ color: 'var(--text)' }}>{current.name}</strong> {t('que trabajan', 'that work')} {muscleLabel(current.muscle).toLowerCase()}.
        {' '}{t('Si buscas, verás ejercicios de cualquier músculo.', 'If you search, you will see exercises for any muscle.')}
      </p>
      <label className="search">
        <Search size={18} />
        <input type="search" placeholder={t('Buscar otro ejercicio', 'Search another exercise')} value={query} onChange={(e) => setQuery(e.target.value)} />
        {query && <button onClick={() => setQuery('')} aria-label={t('Borrar', 'Clear')}><X size={18} /></button>}
      </label>
      <div className="list">
        <label className="list-row">
          <span className="grow">
            {t('Solo con mi material', 'Only my equipment')}
            <span className="small muted" style={{ display: 'block' }}>{equipmentInfo(settings.equipment).label}</span>
          </span>
          <input type="checkbox" className="toggle" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
        </label>
      </div>
      {list.length === 0 ? (
        <p className="muted" style={{ textAlign: 'center' }}>{t('No hay alternativas con estos filtros.', 'No alternatives with these filters.')}</p>
      ) : (
        <div className="list">
          {list.slice(0, LIMIT).map((e) => (
            <button key={e.id} className="list-row" onClick={() => { onPick(e); onClose() }}>
              <Thumb exerciseId={e.id} size={50} />
              <span className="grow">
                <span className="bold clamp-2" style={{ fontSize: 15 }}>{e.name}</span>
                <span className="small muted">{muscleLabel(e.muscle)} · {equipmentLabel(e.equipment)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {list.length > LIMIT && <p className="list-footer">{t(`Mostrando ${LIMIT} de ${list.length}. Busca para afinar.`, `Showing ${LIMIT} of ${list.length}. Search to narrow it down.`)}</p>}
    </Sheet>
  )
}
