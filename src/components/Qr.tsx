import qrcode from 'qrcode-generator'
import { useMemo } from 'react'
import { Sheet } from './ui'

// Código QR dibujado en SVG en el propio móvil (sin servicios externos). Al escanearlo con la
// cámara se abre el enlace, así que no hace falta un lector dentro de la app.

/** Módulos del QR, o `null` si el texto no cabe (el máximo ronda los 2.900 caracteres). */
function modules(text: string): boolean[][] | null {
  try {
    const qr = qrcode(0, 'L')
    qr.addData(text)
    qr.make()
    const n = qr.getModuleCount()
    return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)))
  } catch {
    return null
  }
}

export function QrCode({ text, label }: { text: string; label: string }) {
  const grid = useMemo(() => modules(text), [text])
  if (!grid) return null
  const n = grid.length
  const quiet = 4
  // Un solo trazado con todos los módulos oscuros (más ligero que un rectángulo por módulo).
  const path = grid.flatMap((row, r) => row.map((dark, c) => (dark ? `M${c + quiet},${r + quiet}h1v1h-1z` : ''))).join('')
  return (
    <svg className="qr" viewBox={`0 0 ${n + quiet * 2} ${n + quiet * 2}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width="100%" height="100%" fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  )
}

/** Hoja con el QR de un enlace y la opción de compartirlo como texto. */
export function QrSheet({ title, url, onShare, onClose }: { title: string; url: string; onShare: () => void; onClose: () => void }) {
  const fits = useMemo(() => modules(url) !== null, [url])
  return (
    <Sheet title={title} onClose={onClose} right={<button className="nav-btn bold" onClick={onClose}>Listo</button>}>
      <div className="qr-sheet">
        {fits ? (
          <>
            <QrCode text={url} label={`Código QR de ${title}`} />
            <p className="muted small" style={{ textAlign: 'center', margin: 0 }}>
              Escanéalo con la cámara de otro móvil: se abrirá Serix con la rutina lista para importar.
            </p>
          </>
        ) : (
          <p className="muted" style={{ textAlign: 'center' }}>Es demasiado larga para un código QR. Compártela con el enlace.</p>
        )}
        <button className="btn primary" onClick={onShare}>Compartir enlace</button>
      </div>
    </Sheet>
  )
}
