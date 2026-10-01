import { ChevronLeft, ChevronRight, Minus, Plus, type LucideIcon } from 'lucide-react'
import { createContext, useContext, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import type { Catalog } from '../lib/catalog'
import { createPortal } from 'react-dom'
import { back } from '../lib/router'
import { MuscleThumb } from './MuscleMap'
import { t } from '../lib/i18n'

// Bloqueo de desplazamiento compartido por hojas y entrenamiento, con contador para que cerrar una
// hoja dentro del entrenamiento no lo libere. Solo overflow:hidden en html y body: fijar el body con
// position:fixed y top negativo descuadra en iPhone dónde caen los toques en las capas superpuestas
// (se toca un botón y responde otro elemento de más arriba).
let locks = 0
export function useScrollLock() {
  useEffect(() => {
    if (locks++ === 0) document.documentElement.classList.add('scroll-locked')
    return () => {
      if (--locks === 0) document.documentElement.classList.remove('scroll-locked')
    }
  }, [])
}

/**
 * Dibuja una capa fija (hoja, menú, barra) directamente en <body>. En iPhone, un elemento
 * position:fixed dentro de un contenedor con desplazamiento propio (la pantalla del entrenamiento)
 * recibe los toques desplazados tanto como se haya bajado en ese contenedor.
 */
export function Overlay({ children }: { children: ReactNode }) {
  return createPortal(children, document.body)
}

export const CatalogContext = createContext<Catalog | null>(null)

export function useCatalog(): Catalog {
  const catalog = useContext(CatalogContext)
  if (!catalog) throw new Error(t('Catálogo no cargado', 'Catalog not loaded'))
  return catalog
}

export function LargeTitle({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="large-title">
      <div className="grow">
        {subtitle && <p className="subtitle">{subtitle}</p>}
        <h1>{title}</h1>
      </div>
      {actions && <div className="row">{actions}</div>}
    </header>
  )
}

/** Barra superior de pantallas secundarias y hojas. */
export function NavBar({ title, left, right, showBack }: { title?: string; left?: ReactNode; right?: ReactNode; showBack?: boolean }) {
  return (
    <div className="nav-bar">
      <div className="left">
        {showBack && (
          <button className="nav-btn" onClick={back}>
            <ChevronLeft size={24} strokeWidth={2.4} /> {t('Atrás', 'Back')}
          </button>
        )}
        {left}
      </div>
      <div className="title">{title}</div>
      <div className="right">{right}</div>
    </div>
  )
}

export function Card({ title, icon: Icon, children, className = '' }: { title?: ReactNode; icon?: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <h3>
          {Icon && <Icon size={19} color="var(--accent)" />} {title}
        </h3>
      )}
      {children}
    </section>
  )
}

export function Tile({ value, label, icon: Icon, tint = 'var(--accent)', alt }: { value: ReactNode; label: string; icon?: LucideIcon; tint?: string; alt?: boolean }) {
  return (
    <div className={`tile ${alt ? 'alt' : ''}`}>
      {Icon && <Icon size={18} color={tint} />}
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  )
}

export function Chip({ label, icon: Icon, active, onClick }: { label: string; icon?: LucideIcon; active?: boolean; onClick: (e: MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <button className={`chip ${active ? 'active' : ''}`} onClick={onClick}>
      {Icon && <Icon size={15} />} {label}
    </button>
  )
}

export function Tag({ children, accent }: { children: ReactNode; accent?: boolean }) {
  return <span className={`tag ${accent ? 'accent' : ''}`}>{children}</span>
}

export function Empty({ icon: Icon, title, message, action }: { icon: LucideIcon; title: string; message: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <Icon size={44} />
      <h2>{title}</h2>
      <p className="muted" style={{ margin: 0 }}>{message}</p>
      {action}
    </div>
  )
}

export function Row({ icon: Icon, label, detail, onClick, chevron = true, className = '', children }: {
  icon?: LucideIcon
  label?: ReactNode
  detail?: ReactNode
  onClick?: () => void
  chevron?: boolean
  className?: string
  children?: ReactNode
}) {
  const content = (
    <>
      {Icon && <Icon size={20} color={className.includes('danger') ? 'var(--red)' : 'var(--accent)'} />}
      {children ?? <span className="grow">{label}</span>}
      {detail !== undefined && <span className="muted">{detail}</span>}
      {onClick && chevron && <ChevronRight size={18} className="chevron" />}
    </>
  )
  return onClick ? (
    <button className={`list-row ${className}`} onClick={onClick}>{content}</button>
  ) : (
    <div className={`list-row ${className}`}>{content}</div>
  )
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={o.value} className={o.value === value ? 'active' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="stepper">
      <span className="tiny muted">{label}</span>
      <div className="control">
        <button disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`${t('Menos', 'Less')} ${label}`}><Minus size={15} strokeWidth={3} /></button>
        <span>{value}</span>
        <button disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`${t('Más', 'More')} ${label}`}><Plus size={15} strokeWidth={3} /></button>
      </div>
    </div>
  )
}

export function Thumb({ exerciseId, size = 56 }: { exerciseId: string; size?: number }) {
  const catalog = useCatalog()
  const exercise = catalog.get(exerciseId)
  if (!exercise) return <div className="thumb" style={{ width: size, height: size }} />
  return <MuscleThumb exercise={exercise} size={size} />
}

/** Hoja modal a pantalla casi completa, como las de iOS. */
export function Sheet({ title, left, right, footer, children, onClose, scrollKey }: {
  title: string
  left?: ReactNode
  right?: ReactNode
  footer?: ReactNode
  children: ReactNode
  onClose: () => void
  /** Al cambiar (p. ej. un filtro), el contenido vuelve arriba. */
  scrollKey?: string
}) {
  const body = useRef<HTMLDivElement>(null)
  useEffect(() => {
    body.current?.scrollTo({ top: 0 })
  }, [scrollKey])
  useScrollLock()
  return (
    <Overlay>
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <NavBar title={title} left={left} right={right} />
        <div className="sheet-body" ref={body}>{children}</div>
        {footer && <div className="sheet-footer">{footer}</div>}
      </div>
    </div>
    </Overlay>
  )
}

export interface DialogOption {
  label: string
  destructive?: boolean
  onSelect: () => void
}

/** Hoja de acciones (confirmaciones). */
export function ActionSheet({ title, message, options, onClose }: { title?: string; message?: string; options: DialogOption[]; onClose: () => void }) {
  return (
    <Overlay>
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="group">
          {(title || message) && (
            <div className="head">
              {title && <strong>{title}</strong>}
              {message && <span className="small muted">{message}</span>}
            </div>
          )}
          {options.map((o) => (
            <button key={o.label} className={`option ${o.destructive ? 'destructive' : ''}`} onClick={() => { onClose(); o.onSelect() }}>
              {o.label}
            </button>
          ))}
        </div>
        <div className="group">
          <button className="option cancel" onClick={onClose}>{t('Cancelar', 'Cancel')}</button>
        </div>
      </div>
    </div>
    </Overlay>
  )
}

export function useToast(): [ReactNode, (text: string) => void] {
  const [text, setText] = useState<string>()
  useEffect(() => {
    if (!text) return
    const t = setTimeout(() => setText(undefined), 2000)
    return () => clearTimeout(t)
  }, [text])
  return [text ? <Overlay><div className="toast">{text}</div></Overlay> : null, setText]
}

export function Progress({ value, total, green }: { value: number; total: number; green?: boolean }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0
  return (
    <div className={`progress ${green ? 'green' : ''}`}>
      <div style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Refresca el componente cada `ms` (relojes y cuentas atrás). */
export function useTick(ms = 1000): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}
