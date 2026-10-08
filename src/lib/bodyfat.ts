// Grasa corporal estimada con perímetros: fórmula de la Marina de EE. UU. (Hodgdon y Beckett, 1984),
// en centímetros. Hombres: cintura y cuello; mujeres: además, cadera. Error típico de unos ±3-4 puntos.

export function navyBodyFat(input: { sex: 'm' | 'f'; heightCm: number; waist: number; neck: number; hip?: number }): number | undefined {
  const { sex, heightCm, waist, neck, hip } = input
  if (heightCm < 120 || heightCm > 230 || neck <= 0) return undefined
  const value = sex === 'm'
    ? waist > neck ? 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(heightCm)) - 450 : undefined
    : hip !== undefined && waist + hip > neck ? 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.221 * Math.log10(heightCm)) - 450 : undefined
  return value !== undefined && value >= 2 && value <= 60 ? Math.round(value * 10) / 10 : undefined
}
