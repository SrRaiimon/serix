"""Equivalencias del catálogo antiguo (Exercise Gym GIFs DB) al nuevo (Free Exercise DB).

Compara las palabras del identificador antiguo con el nombre en inglés del nuevo, más material y
parte del cuerpo. Solo acepta coincidencias con una puntuación mínima; el resto se queda sin
equivalencia (la app conserva el nombre guardado y muestra el ejercicio sin foto).
"""
import json, re, sys

old = json.load(open(sys.argv[1]))['exercises']
new = json.load(open(sys.argv[2]))

EQUIP_NEW = {'body only': 'bodyweight', 'kettlebells': 'kettlebell', 'bands': 'band', 'e-z curl bar': 'ez-bar',
             'medicine ball': 'medicine-ball', 'exercise ball': 'exercise-ball', 'foam roll': 'foam-roll', None: 'other'}
PART_OLD = {'arms': 'arms', 'legs': 'legs', 'back': 'back', 'core': 'core', 'chest': 'chest', 'shoulders': 'shoulders', 'cardio': 'cardio'}
PART_NEW = {'abdominals': 'core', 'abductors': 'legs', 'adductors': 'legs', 'biceps': 'arms', 'calves': 'legs', 'chest': 'chest',
            'forearms': 'arms', 'glutes': 'legs', 'hamstrings': 'legs', 'lats': 'back', 'lower back': 'back', 'middle back': 'back',
            'neck': 'shoulders', 'quadriceps': 'legs', 'shoulders': 'shoulders', 'traps': 'back', 'triceps': 'arms'}
SYN = {'pushup': 'push', 'pushups': 'push', 'pullups': 'pull', 'pullup': 'pull', 'situp': 'sit', 'curls': 'curl', 'rows': 'row',
       'raises': 'raise', 'squats': 'squat', 'lunges': 'lunge', 'flyes': 'fly', 'flye': 'fly', 'flys': 'fly', 'dips': 'dip',
       'crunches': 'crunch', 'extensions': 'extension', 'presses': 'press', 'shrugs': 'shrug', 'deadlifts': 'deadlift',
       'lever': 'machine', 'leverage': 'machine', 'sled': 'machine', 'db': 'dumbbell', 'triceps': 'tricep', 'biceps': 'bicep',
       'pulldowns': 'pulldown', 'kickbacks': 'kickback', 'chins': 'chin', 'swings': 'swing', 'twists': 'twist', 'crossover': 'cross',
       'climbers': 'climber', 'kicks': 'kick', 'bands': 'band', 'chains': 'chain', 'resistance': 'band', 'ez': 'ez-bar', 'skullcrusher': 'skull'}
STOP = {'with', 'the', 'on', 'a', 'of', 'to', 'and', 'v', '2', 'male', 'female', 'pov', 'side', 'medium', 'grip', 'version', 'attachment'}
# Palabras que cambian el ejercicio: si una está en un lado y no en el otro, se penaliza.
KEY = {'incline', 'decline', 'front', 'reverse', 'hammer', 'seated', 'lying', 'one', 'single', 'close', 'wide', 'romanian',
       'sumo', 'stiff', 'hack', 'split', 'jump', 'smith', 'cable', 'machine', 'band', 'kettlebell', 'barbell', 'dumbbell',
       'ez-bar', 'rear', 'lateral', 'upright', 'preacher', 'concentration', 'overhead', 'standing',
       'chain', 'inner', 'neutral', 'palms', 'behind', 'deficit', 'blocks', 'kneeling', 'weighted'}

def words(text):
    out = set()
    for w in re.split(r'[^a-z0-9]+', text.lower().replace('push-up', 'pushup').replace('pull-up', 'pullup').replace('sit-up', 'situp').replace('chin-up', 'chin')):
        if not w or w in STOP: continue
        out.add(SYN.get(w, w))
    return out

new_items = []
for e in new:
    eq = EQUIP_NEW.get(e['equipment'], e['equipment'])
    w = words(e['name']) | ({eq} if eq in KEY else set())
    part = 'cardio' if e['category'] == 'cardio' else PART_NEW[e['primaryMuscles'][0]]
    new_items.append((e['id'], w, eq, part))

THRESHOLD = 0.8
# Revisadas a mano (incluye todos los ejercicios que usaba el generador de rutinas).
MANUAL = {
    'glutes/dumbbell-romanian-deadlift': 'Stiff-Legged_Dumbbell_Deadlift',
    'glutes/kettlebell-swing': 'One-Arm_Kettlebell_Swings',
    'quads/dumbbell-goblet-squat': 'Goblet_Squat',
    'glutes/jump-squat': 'Freehand_Jump_Squat',
    'glutes/sled-45-leg-press': 'Leg_Press',
    'glutes/walking-lunge': 'Bodyweight_Walking_Lunge',
    'glutes/band-pull-through': 'Band_Good_Morning_Pull_Through',
    'quads/band-single-leg-split-squat': 'Split_Squats',
    'hamstrings/inverse-leg-curl-bench-support': 'Floor_Glute-Ham_Raise',
    'hamstrings/glute-ham-raise': 'Glute_Ham_Raise',
    'quads/sissy-squat': 'Weighted_Sissy_Squat',
    'calves/bodyweight-standing-calf-raise': 'Standing_Calf_Raises',
    'calves/band-single-leg-calf-raise': 'Calf_Raises_-_With_Bands',
    'pectorals/band-bench-press': 'Bench_Press_-_With_Bands',
    'pectorals/dumbbell-incline-bench-press': 'Incline_Dumbbell_Press',
    'pectorals/deep-push-up': 'Pushups',
    'pectorals/cable-cross-over-variation': 'Cable_Crossover',
    'pectorals/lever-seated-fly': 'Butterfly',
    'lats/cable-pulldown': 'Wide-Grip_Lat_Pulldown',
    'upper-back/dumbbell-bent-over-row': 'Bent_Over_Two-Dumbbell_Row',
    'delts/barbell-seated-overhead-press': 'Seated_Barbell_Military_Press',
    'delts/dumbbell-seated-shoulder-press': 'Seated_Dumbbell_Press',
    'delts/band-shoulder-press': 'Shoulder_Press_-_With_Bands',
    'delts/dumbbell-standing-overhead-press': 'Standing_Dumbbell_Press',
    'delts/cable-lateral-raise': 'Cable_Seated_Lateral_Raise',
    'delts/band-front-lateral-raise': 'Lateral_Raise_-_With_Bands',
    'delts/dumbbell-rear-fly': 'Seated_Bent-Over_Rear_Delt_Raise',
    'delts/band-reverse-fly': 'Back_Flyes_-_With_Bands',
    'delts/band-standing-rear-delt-row': 'Back_Flyes_-_With_Bands',
    'biceps/ez-barbell-curl': 'EZ-Bar_Curl',
    'biceps/cable-curl': 'Standing_Biceps_Cable_Curl',
    'biceps/biceps-pull-up': 'Chin-Up',
    'triceps/cable-pushdown': 'Triceps_Pushdown',
    'triceps/barbell-lying-triceps-extension': 'Lying_Triceps_Press',
    'triceps/dumbbell-seated-triceps-extension': 'Seated_Triceps_Press',
    'triceps/band-side-triceps-extension': 'Speed_Band_Overhead_Triceps',
    'triceps/diamond-push-up': 'Push-Ups_-_Close_Triceps_Position',
    'abs/crunch-floor': 'Crunches',
    'cardio/mountain-climber': 'Mountain_Climbers',
    'cardio/jump-rope': 'Rope_Jumping',
    'cardio/run': 'Trail_Running_Walking',
    'cardio/run-equipment': 'Running_Treadmill',
    'cardio/short-stride-run': 'Running_Treadmill',
    'cardio/stationary-bike-run-v-3': 'Bicycling_Stationary',
    'cardio/stationary-bike-walk': 'Bicycling_Stationary',
    'cardio/walk-elliptical-cross-trainer': 'Elliptical_Trainer',
    'cardio/cycle-cross-trainer': 'Elliptical_Trainer',
    'cardio/walking-on-incline-treadmill': 'Walking_Treadmill',
    'cardio/walking-on-stepmill': 'Step_Mill',
    'abs/weighted-front-plank': 'Plank',
    'abs/power-point-plank': 'Plank',
    'abs/bodyweight-incline-side-plank': 'Side_Bridge',
    'pectorals/isometric-chest-squeeze': 'Isometric_Chest_Squeezes',
}
mapping, scores = {}, {}
for o in old:
    ow = words(o['slug']) | ({o['equipment']} if o['equipment'] in KEY else set())
    best = None
    for nid, nw, neq, npart in new_items:
        inter = len(ow & nw)
        if not inter: continue
        score = inter / len(ow | nw)
        score -= 0.15 * len((ow ^ nw) & KEY)
        if neq == o['equipment']: score += 0.1
        if npart == PART_OLD[o['bodyPart']]: score += 0.1
        if not best or score > best[0]: best = (score, nid)
    if best and best[0] >= THRESHOLD:
        mapping[o['id']] = best[1]; scores[o['id']] = round(best[0], 2)

new_ids = {e['id'] for e in new}
for k, v in MANUAL.items():
    assert v in new_ids, v
    mapping[k] = v; scores[k] = 'manual'
json.dump(mapping, open(sys.argv[3], 'w'), indent=0, sort_keys=True)
print(f'{len(mapping)} de {len(old)} con equivalencia', file=sys.stderr)
if len(sys.argv) > 4:
    for oid in sys.argv[4].split(','):
        print(f'{oid:55} -> {mapping.get(oid, "—"):45} {scores.get(oid, "")}', file=sys.stderr)
