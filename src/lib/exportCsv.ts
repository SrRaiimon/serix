import { fromKg, type Unit } from './format'
import { lang, t } from './i18n'
import type { Session } from './store'
import { trackingOf } from './tracking'

// Historial en CSV (una fila por serie) para abrirlo en Excel, Numbers o Google Sheets.
// En español: separador «;» y coma decimal, que es lo que espera Excel con la configuración
// española; en inglés, «,» y punto. Empieza con BOM para que Excel lea bien las tildes.

const pad = (n: number) => String(n).padStart(2, '0')
const dateText = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function sessionsToCsv(sessions: Session[], unit: Unit): string {
  const es = lang() === 'es'
  const sep = es ? ';' : ','
  const number = (v: number | undefined) => (v === undefined ? '' : es ? String(Math.round(v * 100) / 100).replace('.', ',') : String(Math.round(v * 100) / 100))
  const cell = (v: string) => (/["\n\r;,]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const header = [
    t('Fecha', 'Date'), t('Entrenamiento', 'Workout'), t('Duración (min)', 'Duration (min)'), t('Ejercicio', 'Exercise'),
    t('Serie', 'Set'), t('Tipo', 'Type'), `${t('Peso', 'Weight')} (${unit})`, t('Repeticiones', 'Reps'),
    t('Tiempo (s)', 'Time (s)'), t('Distancia (km)', 'Distance (km)'), 'RPE', t('Notas', 'Notes'),
  ]
  const typeText = (warmup: boolean, kind?: string) =>
    warmup ? t('Calentamiento', 'Warm-up') : kind === 'drop' ? 'Drop set' : kind === 'amrap' ? 'AMRAP' : kind === 'failure' ? t('Al fallo', 'To failure') : t('Normal', 'Normal')
  const rows = [header]
  for (const s of [...sessions].sort((a, b) => a.start - b.start)) {
    const minutes = s.end ? Math.round((s.end - s.start) / 60000) : undefined
    for (const e of s.exercises) {
      const weighted = trackingOf(e) === 'weight_reps'
      let n = 0
      for (const x of e.sets.filter((x) => x.done)) {
        rows.push([
          dateText(s.start), s.name, number(minutes), e.name,
          // Por lados, la pareja comparte número y el lado va en el tipo. La ayuda de las máquinas
          // asistidas va en negativo (el convenio habitual: −20 = 20 kg de ayuda), nunca como carga.
          x.warmup ? '' : String(x.side === 'R' ? n : ++n),
          [typeText(x.warmup, x.kind), x.side === 'L' ? t('Izquierda', 'Left') : x.side === 'R' ? t('Derecha', 'Right') : ''].filter(Boolean).join(' · '),
          weighted || x.weight ? number(fromKg(e.assisted && x.weight > 0 ? -x.weight : x.weight, unit)) : '', weighted || x.reps ? String(x.reps) : '',
          number(x.duration), number(x.distance), number(x.rpe), n === 1 && e === s.exercises[0] ? s.notes : '',
        ])
      }
    }
  }
  return '﻿' + rows.map((r) => r.map(cell).join(sep)).join('\r\n') + '\r\n'
}

/** Descarga el CSV (en el móvil se guarda en Archivos o Descargas). */
export function downloadCsv(sessions: Session[], unit: Unit) {
  const blob = new Blob([sessionsToCsv(sessions, unit)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `serix-${t('historial', 'history')}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
