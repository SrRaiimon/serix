import { Barcode, TriangleAlert, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Sheet } from '../components/ui'
import { uid } from '../lib/format'
import { t } from '../lib/i18n'
import { doubtfulValues, fetchOffProduct, mealLabel, barcodeVariants, findAesan, validBarcode, type MealKey, type MyFood, type ScannedProduct } from '../lib/nutrition'
import { useData } from '../lib/store'
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'

// Comidas · escáner de códigos de barras: el lector del navegador o, si no hay, zxing-wasm (incluido en la app).

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'] as const

interface Detector { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> }

/** El lector del navegador si lo tiene (Chrome en Android) y, si no, el de ZXing (WebAssembly) servido desde la propia app. */
async function barcodeDetector(): Promise<Detector> {
  const Native = (window as unknown as { BarcodeDetector?: { new (o: { formats: string[] }): Detector; getSupportedFormats: () => Promise<string[]> } }).BarcodeDetector
  if (Native) {
    const supported = await Native.getSupportedFormats().catch(() => [] as string[])
    if (supported.includes('ean_13')) return new Native({ formats: FORMATS.filter((f) => supported.includes(f)) })
  }
  const { BarcodeDetector, prepareZXingModule } = await import('barcode-detector/ponyfill')
  prepareZXingModule({ overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) } })
  return new BarcodeDetector({ formats: [...FORMATS] })
}

type ScanState = { kind: 'idle' } | { kind: 'scanning' } | { kind: 'looking'; code: string } | { kind: 'error'; message: string; code?: string }

export function ScanSheet({ meal, onBack, onClose, onFound, onMissing, onBatch }: {
  meal: MealKey; onBack: () => void; onClose: () => void; onFound: (f: MyFood) => void; onMissing: (barcode: string) => void
  /** Varios seguidos: los productos encontrados y si apuntarlos (o solo guardarlos). */
  onBatch: (list: MyFood[], log: boolean) => void
}) {
  const data = useData()
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream>(null)
  const abort = useRef<AbortController>(null)
  const [state, setState] = useState<ScanState>({ kind: 'idle' })
  const [manual, setManual] = useState('')
  // Escanear varios productos seguidos (al volver de la compra): no se cierra la cámara entre uno y otro.
  const [multi, setMulti] = useState(false)
  const [batch, setBatch] = useState<MyFood[]>([])
  const [missing, setMissing] = useState<string[]>([])
  const multiRef = useRef(false)
  multiRef.current = multi
  const found = (f: MyFood) => {
    if (!multiRef.current) return onFound(f)
    setBatch((b) => (b.some((x) => x.barcode === f.barcode) ? b : [...b, f]))
    // Un momento para apartar el producto y se vuelve a escanear.
    again()
  }
  const notFound = (code: string) => {
    if (!multiRef.current) return onMissing(code)
    setMissing((m) => (m.includes(code) ? m : [...m, code]))
    again()
  }
  // Se cancela al cerrar: si no, la cámara volvía a encenderse (con su luz) después de salir.
  const restart = useRef<number | undefined>(undefined)
  const again = () => { restart.current = window.setTimeout(() => void start(), 900) }

  const stop = () => {
    stream.current?.getTracks().forEach((x) => x.stop())
    stream.current = null
  }
  useEffect(() => () => { clearTimeout(restart.current); stop(); abort.current?.abort() }, [])

  const lookup = async (code: string) => {
    stop()
    // Ya lo tienes guardado: sin conexión y sin volver a preguntar.
    const known = data.nutrition.foods.find((f) => f.barcode && barcodeVariants(code).includes(f.barcode))
    if (known) return found(known)
    setState({ kind: 'looking', code })
    // Primero la base de datos de la AESAN (productos vendidos en España; funciona sin conexión una vez cargada).
    const shop = await findAesan(code).catch(() => undefined)
    if (shop) return found({ id: uid(), name: shop.name, ...(shop.brand ? { brand: shop.brand } : {}), barcode: shop.barcode, per100: shop.per100, ...(shop.portion ? { portion: shop.portion } : {}), source: 'aesan' })
    abort.current = new AbortController()
    let product: ScannedProduct | undefined | 'offline'
    try {
      product = await fetchOffProduct(code, abort.current.signal)
    } catch {
      return
    }
    if (product === 'offline') return setState({ kind: 'error', code, message: t('No hay conexión para consultar el producto. Inténtalo de nuevo o créalo a mano.', 'No connection to look up the product. Try again or create it yourself.') })
    if (!product) return notFound(code)
    // Se guarda en «Mis alimentos» al añadirlo (así puedes corregirlo antes si no cuadra).
    found({ id: uid(), name: product.name, brand: product.brand, barcode: code, per100: product.per100, portion: product.portion, source: 'off' })
  }

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      return setState({ kind: 'error', message: t('Este navegador no permite usar la cámara. Escribe el código a mano.', 'This browser cannot use the camera. Type the code instead.') })
    }
    try {
      const [detector, media] = await Promise.all([
        barcodeDetector(),
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }),
      ])
      stream.current = media
      const v = video.current!
      v.srcObject = media
      await v.play()
      setState({ kind: 'scanning' })
      let busy = false
      const tick = async () => {
        if (!stream.current) return
        if (!busy && v.videoWidth) {
          busy = true
          const found = await detector.detect(v).catch(() => [])
          busy = false
          const code = found.map((x) => x.rawValue).find(validBarcode)
          if (code) {
            navigator.vibrate?.(30)
            return void lookup(code)
          }
        }
        setTimeout(() => requestAnimationFrame(() => void tick()), 120)
      }
      void tick()
    } catch (e) {
      stop()
      const denied = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError')
      setState({ kind: 'error', message: denied ? t('Sin permiso para la cámara. Puedes darlo en los ajustes del navegador o escribir el código a mano.', 'No camera permission. You can allow it in the browser settings or type the code.')
        : t('No se ha podido abrir la cámara. Escribe el código a mano.', 'Could not open the camera. Type the code instead.') })
    }
  }
  useEffect(() => { void start() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const typed = manual.replace(/\s/g, '')
  return (
    <Sheet title={t('Escanear', 'Scan')} onClose={onClose} left={<button className="nav-btn" onClick={() => { stop(); onBack() }}>{t('Atrás', 'Back')}</button>}>
      <div className={`transfer-camera barcode-camera ${state.kind === 'scanning' ? 'on' : ''}`}>
        <video ref={video} playsInline muted />
        {state.kind !== 'scanning' && <Barcode size={56} />}
        <div className="transfer-aim barcode-aim" />
      </div>
      {state.kind === 'scanning' && <p className="small muted" style={{ margin: 0, textAlign: 'center' }}>{t('Apunta al código de barras del envase.', 'Point at the barcode on the package.')}</p>}
      <label className="list-row card-row">
        <span className="grow">
          <span className="bold" style={{ display: 'block' }}>{t('Varios seguidos', 'Several in a row')}</span>
          <span className="small muted">{t('Al volver de la compra: escanea uno tras otro y al final los guardas o los apuntas todos.', 'After shopping: scan one after another and save or log them all at the end.')}</span>
        </span>
        <input type="checkbox" className="toggle" checked={multi} onChange={(e) => setMulti(e.target.checked)} />
      </label>
      {multi && (batch.length > 0 || missing.length > 0) && (
        <div className="card" style={{ gap: 6 }}>
          {batch.map((f) => (
            <div key={f.barcode ?? f.id} className="row between small" style={{ gap: 8 }}>
              <span className="grow" style={{ minWidth: 0 }}>
                <span className="clamp-1" style={{ display: 'block' }}>{f.name}{f.brand ? ` · ${f.brand}` : ''}</span>
                {/* El mismo aviso que al apuntarlo de uno en uno: en tanda se apuntaba sin que se viera. */}
                {doubtfulValues(f.per100) && <span className="small doubt-line"><TriangleAlert size={14} aria-hidden="true" /> {t('Las kcal no cuadran: revisa la etiqueta', 'Calories do not add up: check the label')}</span>}
              </span>
              <span className="muted">{f.portion ? `${f.portion.g} g` : '100 g'}</span>
              <button className="icon-btn" onClick={() => setBatch(batch.filter((x) => x !== f))} aria-label={t(`Quitar ${f.name}`, `Remove ${f.name}`)}><X size={15} /></button>
            </div>
          ))}
          {missing.length > 0 && <span className="small muted">{t(`Sin encontrar (créalos a mano luego): ${missing.join(', ')}`, `Not found (create them later): ${missing.join(', ')}`)}</span>}
          {batch.length > 0 && (
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button className="btn primary grow" onClick={() => { stop(); onBatch(batch, true) }}>{t(`Apuntar ${batch.length} en ${mealLabel(meal).toLowerCase()}`, `Log ${batch.length} to ${mealLabel(meal).toLowerCase()}`)}</button>
              <button className="btn secondary grow" onClick={() => { stop(); onBatch(batch, false) }}>{t('Solo guardarlos', 'Just save them')}</button>
            </div>
          )}
        </div>
      )}
      {state.kind === 'looking' && <p className="small" style={{ margin: 0, textAlign: 'center' }}>{t(`Buscando el producto ${state.code}…`, `Looking up product ${state.code}…`)}</p>}
      {state.kind === 'error' && (
        <div className="card">
          <span className="small">{state.message}</span>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {state.code ? <button className="btn secondary" onClick={() => void lookup(state.code!)}>{t('Reintentar', 'Try again')}</button>
              : <button className="btn secondary" onClick={() => void start()}>{t('Abrir la cámara', 'Open camera')}</button>}
            {state.code && <button className="btn plain" onClick={() => onMissing(state.code!)}>{t('Crearlo a mano', 'Create it yourself')}</button>}
          </div>
        </div>
      )}
      <div className="list-header">{t('O escribe el código', 'Or type the code')}</div>
      <div className="row">
        <input className="field grow" inputMode="numeric" placeholder="8410000000000" value={manual} onChange={(e) => setManual(e.target.value)} aria-label={t('Código de barras', 'Barcode')} />
        <button className="btn secondary" disabled={!validBarcode(typed)} onClick={() => void lookup(typed)}>{t('Buscar', 'Look up')}</button>
      </div>
      {typed.length >= 8 && !validBarcode(typed) && <span className="small muted">{t('Ese código no es válido: revisa los números.', 'That code is not valid: check the digits.')}</span>}
      <p className="list-footer" style={{ margin: 0 }}>
        {t('Solo se envía el código de barras a Open Food Facts, una base de datos abierta (ODbL) hecha por voluntarios; nunca tus datos. El producto se guarda en «Mis alimentos».',
          'Only the barcode is sent to Open Food Facts, an open database (ODbL) built by volunteers; never your data. The product is saved to "My foods".')}{' '}
        <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">openfoodfacts.org</a>
      </p>
    </Sheet>
  )
}

// MARK: Mis alimentos
