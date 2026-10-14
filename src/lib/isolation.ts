/**
 * Ejercicios de aislamiento (por su identificador del catálogo): suben poco de peso (2,5 kg en elevaciones
 * laterales es mucho) y piden más repeticiones y menos descanso que los básicos. Aparte para que lo usen
 * la progresión y el generador sin importarse entre sí.
 */
const ISOLATION = /raise|fly|flye|curl|extension|kickback|pushdown|lateral|calf|shrug|crunch|pullover|wrist|reverse_fly|face_pull/i
export const isIsolation = (exerciseId: string) => ISOLATION.test(exerciseId)
