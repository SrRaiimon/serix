import { parseNutritionLabel, type Per100 } from './nutrition'

// Lectura de la tabla nutricional de un envase con una foto. Todo ocurre en el móvil con Tesseract.js
// (Apache 2.0) y los datos de español de tessdata (Apache 2.0): la foto no sale del teléfono. El motor
// (~4 MB) y el idioma (~2 MB) se sirven desde la propia web (carpeta ocr/, ver vite.config.ts) y solo
// se descargan la primera vez que alguien lee una etiqueta.

/** Reduce la foto (las de móvil pasan de 4000 px) y la pasa a grises con más contraste: lee mejor y antes. */
async function prepare(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.filter = 'grayscale(1) contrast(1.4)'
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas'))), 'image/png'))
}

/** Lee la foto y devuelve los valores por 100 g que encuentre (pueden faltar algunos) y el peso de la ración. */
export async function readNutritionLabel(file: Blob, onProgress?: (fraction: number) => void): Promise<Partial<Per100> & { portion?: number }> {
  const [{ createWorker }, image] = await Promise.all([import('tesseract.js'), prepare(file)])
  const base = new URL('ocr/', document.baseURI).href
  const worker = await createWorker('spa', 1 /* solo LSTM: el modelo más ligero */, {
    workerPath: `${base}worker.min.js`,
    corePath: `${base}core`,
    langPath: `${base}lang`,
    // Sin blob: el worker se carga de la propia web (la política de seguridad no admite workers blob:).
    workerBlobURL: false,
    // El service worker ya guarda los archivos de ocr/ (sw-template.js): sin una segunda copia en IndexedDB.
    cacheMethod: 'none',
    logger: (m) => { if (m.status === 'recognizing text') onProgress?.(m.progress) },
  })
  try {
    const { data } = await worker.recognize(image)
    return parseNutritionLabel(data.text)
  } finally {
    await worker.terminate()
  }
}
