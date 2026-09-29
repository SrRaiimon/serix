import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Sheet, Thumb, useCatalog } from '../components/ui'
import { alternatives } from '../lib/alternatives'
import type { Exercise } from '../lib/catalog'
import { equipmentInfo } from '../lib/generator'
import { equipmentLabel, muscleLabel } from '../lib/labels'
import { useData } from '../lib/store'

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
    <Sheet title="Sustituir ejercicio" onClose={onClose} left={<button className="nav-btn" onClick={onClose}>Cancelar</button>}>
      <p className="small muted" style={{ margin: 0 }}>
        Alternativas para <strong style={{ color: 'var(--text)' }}>{current.name}</strong> que trabajan {muscleLabel(current.muscle).toLowerCase()}.
        Si buscas, verás ejercicios de cualquier músculo.
      </p>
      <label className="search">
        <Search size={18} />
        <input type="search" placeholder="Buscar otro ejercicio" value={query} onChange={(e) => setQuery(e.target.value)} />
        {query && <button onClick={() => setQuery('')} aria-label="Borrar"><X size={18} /></button>}
      </label>
      <div className="list">
        <label className="list-row">
          <span className="grow">
            Solo con mi material
            <span className="small muted" style={{ display: 'block' }}>{equipmentInfo(settings.equipment).label}</span>
          </span>
          <input type="checkbox" className="toggle" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
        </label>
      </div>
      {list.length === 0 ? (
        <p className="muted" style={{ textAlign: 'center' }}>No hay alternativas con estos filtros.</p>
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
      {list.length > LIMIT && <p className="list-footer">Mostrando {LIMIT} de {list.length}. Busca para afinar.</p>}
    </Sheet>
  )
}
