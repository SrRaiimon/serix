// Para renderizar componentes a HTML en los tests (react-dom/server): lo que ui.tsx toca al cargarse (la zona de avisos).
import './browser-stubs'
const doc = (globalThis as unknown as { document: Record<string, unknown> }).document
doc.createElement ??= () => ({ className: '', setAttribute: () => {}, append: () => {}, style: {} })
doc.body ??= { append: () => {} }
