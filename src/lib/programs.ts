// Guarda los programas generados como rutinas y activa el programa nuevo.
import { uid } from './format'
import { update } from './store'
import { defaultTracking, PROGRAM_TARGET_SECONDS } from './tracking'
import type { GeneratedProgram } from './generator'

export function saveProgram(program: GeneratedProgram) {
  update((d) => {
    // Otro programa con el mismo nombre se guarda aparte («… (2)»): antes se mezclaban sus días en un grupo.
    const taken = new Set(d.routines.map((r) => r.programName).filter(Boolean))
    let name = program.name
    for (let n = 2; taken.has(name); n++) name = `${program.name} (${n})`
    program.days.forEach((dayPlan, index) => {
      d.routines.push({
        id: uid(),
        name: dayPlan.name,
        notes: program.summary,
        programName: name,
        order: index,
        createdAt: Date.now(),
        exercises: dayPlan.exercises.map((g) => {
          const tracking = defaultTracking(g.exercise)
          return {
            exerciseId: g.exercise.id, name: g.exercise.name, muscle: g.exercise.muscle,
            sets: g.sets, repsMin: g.repsMin, repsMax: g.repsMax, rest: g.rest, tracking,
            ...(tracking === 'time' ? { targetSeconds: PROGRAM_TARGET_SECONDS } : {}),
            // Los programas generados suben el peso solos (doble progresión salvo que se indique otra).
            ...(tracking === 'weight_reps' ? { progression: g.progression ?? 'double' } : {}),
            ...(g.trainingMax ? { trainingMax: g.trainingMax, tmSince: Date.now() } : {}),
          }
        }),
      })
    })
    d.settings.activeProgram = name
  })
}
