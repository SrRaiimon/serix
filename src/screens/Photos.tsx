import { Camera, Download, ImagePlus, Lock, Trash2, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ActionSheet, Card, Empty, NavBar, Overlay, Segmented, Sheet, useScrollLock, useToast } from '../components/ui'
import { day, shortDay, startOfDay, weight, type Unit } from '../lib/format'
import { t } from '../lib/i18n'
import { addPhoto, deleteAllPhotos, deletePhoto, exportPhotos, importPhotos, photosSize, POSES, updatePhoto, usePhotos, type Photo, type Pose } from '../lib/photos'
import { useData, type Measurement } from '../lib/store'

// Fotos de progreso: galería, comparación antes/después con deslizador y exportación (lib/photos.ts).

const poseLabel = (p: Pose) => (p === 'front' ? t('Frente', 'Front') : p === 'side' ? t('Perfil', 'Side') : t('Espalda', 'Back'))

/** URL temporal de un Blob (se libera al desmontar o al cambiar). */
function useObjectUrl(blob?: Blob): string | undefined {
  // Se crea dentro del efecto (y no en el render) para que cada URL liberada sea la de ese montaje:
  // si React vuelve a montar el componente, se crea otra.
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) return setUrl(undefined)
    const created = URL.createObjectURL(blob)
    setUrl(created)
    return () => URL.revokeObjectURL(created)
  }, [blob])
  return url
}

/** Peso registrado más cercano a la fecha (como mucho 10 días antes o después). */
function weightNear(measurements: Measurement[], date: number): number | undefined {
  let best: Measurement | undefined
  for (const m of measurements) {
    if (m.weight === undefined || Math.abs(m.date - date) > 10 * 86400000) continue
    if (!best || Math.abs(m.date - date) < Math.abs(best.date - date)) best = m
  }
  return best?.weight
}

const sizeText = (bytes: number) => (bytes < 1e6 ? `${Math.max(1, Math.round(bytes / 1e3))} KB` : `${(bytes / 1e6).toLocaleString(t('es-ES', 'en-GB'), { maximumFractionDigits: 1 })} MB`)

function Thumb({ photo, onClick }: { photo: Photo; onClick: () => void }) {
  const url = useObjectUrl(photo.thumb)
  return (
    <button className="photo-thumb" onClick={onClick} aria-label={`${poseLabel(photo.pose)}, ${day(photo.date)}`}>
      {url && <img src={url} alt="" />}
      <span className="photo-tag">{poseLabel(photo.pose)}</span>
    </button>
  )
}

/** Antes y después superpuestas: se arrastra la línea para ver una u otra. */
function Compare({ before, after, unit, measurements }: { before: Photo; after: Photo; unit: Unit; measurements: Measurement[] }) {
  const a = useObjectUrl(before.image)
  const b = useObjectUrl(after.image)
  const [pos, setPos] = useState(50)
  const days = Math.round((startOfDay(after.date).getTime() - startOfDay(before.date).getTime()) / 86400000)
  const wa = weightNear(measurements, before.date)
  const wb = weightNear(measurements, after.date)
  return (
    <>
      <div className="compare-photos">
        {b && <img src={b} alt={t(`Después: ${day(after.date)}`, `After: ${day(after.date)}`)} />}
        {a && <img src={a} alt={t(`Antes: ${day(before.date)}`, `Before: ${day(before.date)}`)} style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />}
        <span className="compare-line" style={{ left: `${pos}%` }} aria-hidden="true" />
        <span className="photo-tag left">{shortDay(before.date)}</span>
        <span className="photo-tag right">{shortDay(after.date)}</span>
        <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label={t('Deslizar entre antes y después', 'Slide between before and after')} />
      </div>
      <span className="small muted">
        {t(`${days} días entre las dos fotos`, `${days} days between the two photos`)}
        {wa !== undefined && wb !== undefined && ` · ${weight(wa, unit)} → ${weight(wb, unit)} (${wb - wa >= 0 ? '+' : ''}${weight(wb - wa, unit)})`}
      </span>
    </>
  )
}

function PhotoSelect({ label, list, value, onChange }: { label: string; list: Photo[]; value: string; onChange: (id: string) => void }) {
  return (
    <label className="list-row" style={{ padding: 0 }}>
      <span className="grow small">{label}</span>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {list.map((p) => <option key={p.id} value={p.id}>{day(p.date)}</option>)}
      </select>
    </label>
  )
}

function CompareCard({ photos, pose, unit, measurements }: { photos: Photo[]; pose: Pose; unit: Unit; measurements: Measurement[] }) {
  // De la más antigua a la más reciente.
  const list = useMemo(() => photos.filter((p) => p.pose === pose).sort((a, b) => a.date - b.date), [photos, pose])
  const [beforeId, setBeforeId] = useState<string>()
  const [afterId, setAfterId] = useState<string>()
  if (list.length < 2) return null
  const before = list.find((p) => p.id === beforeId) ?? list[0]
  const after = list.find((p) => p.id === afterId) ?? list[list.length - 1]
  return (
    <Card title={t(`Antes y después · ${poseLabel(pose).toLowerCase()}`, `Before and after · ${poseLabel(pose).toLowerCase()}`)} icon={Camera}>
      <Compare key={`${before.id}-${after.id}`} before={before} after={after} unit={unit} measurements={measurements} />
      <PhotoSelect label={t('Antes', 'Before')} list={list} value={before.id} onChange={setBeforeId} />
      <PhotoSelect label={t('Después', 'After')} list={list} value={after.id} onChange={setAfterId} />
    </Card>
  )
}

/** Foto a pantalla completa: fecha, peso de ese día, cambiar postura y borrar. */
function Viewer({ photo, unit, measurements, onClose }: { photo: Photo; unit: Unit; measurements: Measurement[]; onClose: () => void }) {
  useScrollLock()
  const url = useObjectUrl(photo.image)
  const [confirm, setConfirm] = useState(false)
  const w = weightNear(measurements, photo.date)
  return (
    <Overlay>
      <div className="photo-viewer" role="dialog" aria-label={day(photo.date)}>
        <NavBar title={day(photo.date)} left={<button className="nav-btn" onClick={onClose}>{t('Cerrar', 'Close')}</button>}
          right={<button className="nav-btn" style={{ color: "var(--red-text)" }} onClick={() => setConfirm(true)} aria-label={t('Borrar foto', 'Delete photo')}><Trash2 size={20} /></button>} />
        <div className="photo-viewer-img">{url && <img src={url} alt={`${poseLabel(photo.pose)}, ${day(photo.date)}`} />}</div>
        <div className="photo-viewer-bar">
          <Segmented value={photo.pose} onChange={(pose) => void updatePhoto(photo.id, { pose })} options={POSES.map((p) => ({ value: p, label: poseLabel(p) }))} />
          {w !== undefined && <span className="small muted">{t(`Peso por esas fechas: ${weight(w, unit)}`, `Weight around then: ${weight(w, unit)}`)}</span>}
        </div>
      </div>
      {confirm && (
        <ActionSheet title={t('¿Borrar esta foto?', 'Delete this photo?')} message={t('No se puede deshacer.', 'This cannot be undone.')} onClose={() => setConfirm(false)}
          options={[{ label: t('Borrar foto', 'Delete photo'), destructive: true, onSelect: () => { void deletePhoto(photo.id); onClose() } }]} />
      )}
    </Overlay>
  )
}

const toInputDate = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Nueva foto: elegir (cámara o galería), fecha y postura. */
function AddSheet({ file, onClose }: { file: File; onClose: () => void }) {
  const preview = useObjectUrl(file)
  // La fecha de la foto si el archivo la trae; si no, hoy.
  const [date, setDate] = useState(toInputDate(file.lastModified && file.lastModified < Date.now() ? file.lastModified : Date.now()))
  const [pose, setPose] = useState<Pose>('front')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const save = async () => {
    setSaving(true)
    try {
      const [y, m, d] = date.split('-').map(Number)
      await addPhoto(file, new Date(y, m - 1, d, 12).getTime(), pose)
      onClose()
    } catch {
      setSaving(false)
      setError(t('No se ha podido leer la imagen. Prueba con una foto JPEG o PNG.', 'The image could not be read. Try a JPEG or PNG photo.'))
    }
  }
  return (
    <Sheet title={t('Nueva foto', 'New photo')} onClose={onClose} left={<button className="nav-btn" onClick={onClose}>{t('Cancelar', 'Cancel')}</button>}
      footer={<button className="btn primary block" disabled={saving || !date} onClick={() => void save()}>{saving ? t('Guardando…', 'Saving…') : t('Guardar', 'Save')}</button>}>
      {preview && <img className="photo-preview" src={preview} alt={t('Vista previa', 'Preview')} />}
      <Segmented value={pose} onChange={setPose} options={POSES.map((p) => ({ value: p, label: poseLabel(p) }))} />
      <div className="list">
        <label className="list-row">
          <span className="grow">{t('Fecha', 'Date')}</span>
          <input type="date" className="field" style={{ width: 170, flex: "none" }} value={date} max={toInputDate(Date.now())} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      {error && <p className="small" style={{ color: 'var(--red-text)', margin: 0 }}>{error}</p>}
      <p className="small muted" style={{ margin: 0 }}>{t('Consejo: misma luz, mismo sitio y misma postura cada vez; así la comparación es justa.', 'Tip: same light, same place and same pose every time, so the comparison is fair.')}</p>
    </Sheet>
  )
}

export function PhotosScreen() {
  const data = useData()
  const photos = usePhotos()
  const [filter, setFilter] = useState<Pose | 'all'>('all')
  const [file, setFile] = useState<File>()
  const [open, setOpen] = useState<Photo>()
  const [confirmAll, setConfirmAll] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, showToast] = useToast()
  const picker = useRef<HTMLInputElement>(null)
  const zipInput = useRef<HTMLInputElement>(null)
  const unit = data.settings.unit
  const list = (photos ?? []).filter((p) => filter === 'all' || p.pose === filter)
  // Para comparar: la postura elegida, o la de la foto más reciente.
  const comparePose = filter !== 'all' ? filter : photos?.[0]?.pose

  const exportZip = async () => {
    if (!photos?.length) return
    setBusy(true)
    try {
      const blob = await exportPhotos(photos)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `serix-fotos-${toInputDate(Date.now())}.zip`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } finally {
      setBusy(false)
    }
  }
  const importZip = async (f: File) => {
    setBusy(true)
    try {
      const added = await importPhotos(f)
      showToast(added ? t(`${added} fotos importadas`, `${added} photos imported`) : t('No había fotos nuevas', 'There were no new photos'))
    } catch {
      showToast(t('No es un archivo de fotos de Serix', 'This is not a Serix photo file'))
    } finally {
      setBusy(false)
    }
  }

  // Al volver de una foto borrada o cambiada, el visor muestra la versión actual.
  const current = open && photos?.find((p) => p.id === open.id)

  return (
    <>
      <NavBar showBack title={t('Fotos de progreso', 'Progress photos')} right={<button className="nav-btn bold" onClick={() => picker.current?.click()}>{t('Añadir', 'Add')}</button>} />
      <div className="screen with-nav">
        <p className="small muted row" style={{ margin: 0, gap: 6 }}><Lock size={14} /> {t('Las fotos solo se guardan en este móvil. No van en la copia de seguridad ni se comparten.', 'Photos are only stored on this phone. They are not in the backup and are never shared.')}</p>
        {photos === undefined ? null : photos.length === 0 ? (
          <Empty icon={ImagePlus} title={t('Sin fotos todavía', 'No photos yet')}
            message={t('Hazte una foto de frente, de perfil y de espalda cada pocas semanas y compara cómo cambias.', 'Take a front, side and back photo every few weeks and compare how you change.')}
            action={<button className="btn primary" onClick={() => picker.current?.click()}><Camera size={18} /> {t('Añadir foto', 'Add photo')}</button>} />
        ) : (
          <>
            <Segmented value={filter} onChange={setFilter} options={[{ value: 'all' as const, label: t('Todas', 'All') }, ...POSES.map((p) => ({ value: p, label: poseLabel(p) }))]} />
            {comparePose && <CompareCard key={comparePose} photos={photos} pose={comparePose} unit={unit} measurements={data.measurements} />}
            {list.length === 0
              ? <p className="muted small">{t('No hay fotos con esta postura.', 'No photos with this pose.')}</p>
              : <div className="photo-grid">{list.map((p) => <Thumb key={p.id} photo={p} onClick={() => setOpen(p)} />)}</div>}
            <div className="list">
              <button className="list-row" disabled={busy} onClick={() => void exportZip()}><Download size={20} /><span className="grow" style={{ textAlign: 'left' }}>{t('Exportar fotos (.zip)', 'Export photos (.zip)')}</span><span className="muted small">{sizeText(photosSize(photos))}</span></button>
              <button className="list-row" disabled={busy} onClick={() => zipInput.current?.click()}><Upload size={20} /><span className="grow" style={{ textAlign: 'left' }}>{t('Importar fotos (.zip)', 'Import photos (.zip)')}</span></button>
              <button className="list-row danger" onClick={() => setConfirmAll(true)}><Trash2 size={20} /><span className="grow" style={{ textAlign: 'left' }}>{t('Borrar todas las fotos', 'Delete all photos')}</span></button>
            </div>
          </>
        )}
        {photos?.length === 0 && (
          <button className="btn plain" onClick={() => zipInput.current?.click()}><Upload size={18} /> {t('Importar fotos (.zip)', 'Import photos (.zip)')}</button>
        )}
      </div>
      <input ref={picker} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setFile(f) }} />
      <input ref={zipInput} type="file" accept=".zip,application/zip" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void importZip(f) }} />
      {file && <AddSheet file={file} onClose={() => setFile(undefined)} />}
      {current && <Viewer photo={current} unit={unit} measurements={data.measurements} onClose={() => setOpen(undefined)} />}
      {confirmAll && (
        <ActionSheet title={t('¿Borrar todas las fotos?', 'Delete all photos?')} message={t('Se borran de este móvil y no se puede deshacer. Si quieres conservarlas, expórtalas antes.', 'They are deleted from this phone and this cannot be undone. Export them first if you want to keep them.')}
          onClose={() => setConfirmAll(false)} options={[{ label: t('Borrar todas', 'Delete all'), destructive: true, onSelect: () => void deleteAllPhotos() }]} />
      )}
      {toast}
    </>
  )
}
