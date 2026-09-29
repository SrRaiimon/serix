"""Genera public/exercises_es.json y public/exercise_ids_v1.json.

Solo se usan datos de hecho de cada ejercicio (nombre, músculos, material, nivel y tipo), tomados
de la lista de Free Exercise DB (https://github.com/yuhonas/free-exercise-db, dist/exercises.json).
Sus fotos e instrucciones NO se usan: proceden de webs con derechos de autor (bodybuilding.com y
otras), aunque el repositorio diga ser de dominio público. Las imágenes de la app son propias
(src/components/MuscleMap.tsx).

Entradas:
  - dist/exercises.json de Free Exercise DB (solo metadatos)
  - names_es.txt: nombres en español, traducidos a mano ("nombre en inglés|nombre en español")
  - old_to_new.json: equivalencias del catálogo anterior (map_old_ids.py)
  - instrucciones/*.json: pasos de ejecución escritos para este proyecto (texto original, sin
    partir de ninguna fuente de terceros), por identificador de ejercicio

Uso: python3 build_catalog.py <fedb>/dist/exercises.json old_to_new.json
"""
import glob, json, os, sys

HERE = os.path.dirname(__file__)
ROOT = os.path.join(HERE, '..', '..')

MUSCLE = {'abdominals': 'abs', 'abductors': 'abductors', 'adductors': 'adductors', 'biceps': 'biceps', 'calves': 'calves',
          'chest': 'pectorals', 'forearms': 'forearms', 'glutes': 'glutes', 'hamstrings': 'hamstrings', 'lats': 'lats',
          'lower back': 'spine', 'middle back': 'upper-back', 'neck': 'neck', 'quadriceps': 'quads', 'shoulders': 'delts',
          'traps': 'traps', 'triceps': 'triceps'}
BODY_PART = {'abs': 'core', 'abductors': 'legs', 'adductors': 'legs', 'biceps': 'arms', 'calves': 'legs', 'pectorals': 'chest',
             'forearms': 'arms', 'glutes': 'legs', 'hamstrings': 'legs', 'lats': 'back', 'spine': 'back', 'upper-back': 'back',
             'neck': 'shoulders', 'quads': 'legs', 'delts': 'shoulders', 'traps': 'back', 'triceps': 'arms'}
# Sin material indicado = sin material (flexiones, zancadas, estiramientos…).
EQUIPMENT = {'body only': 'bodyweight', None: 'bodyweight', 'kettlebells': 'kettlebell', 'bands': 'band', 'e-z curl bar': 'ez-bar',
             'medicine ball': 'medicine-ball', 'exercise ball': 'exercise-ball', 'foam roll': 'foam-roll'}
CATEGORY = {'powerlifting': 'strength', 'olympic weightlifting': 'strength', 'strongman': 'strength'}


def main(src, mapping_path):
    data = json.load(open(src))
    names = dict(l.rstrip('\n').split('|', 1) for l in open(os.path.join(HERE, 'names_es.txt'), encoding='utf-8') if l.strip())
    steps = {}
    for path in sorted(glob.glob(os.path.join(HERE, 'instrucciones', '*.json'))):
        for key, value in json.load(open(path, encoding='utf-8')).items():
            assert key not in steps, f'{key} repetido'
            assert value and all(isinstance(v, str) and v.strip() for v in value), key
            steps[key] = value
    assert not set(steps) - {e['id'] for e in data}, sorted(set(steps) - {e['id'] for e in data})
    out = []
    for e in data:
        muscle = MUSCLE[e['primaryMuscles'][0]]
        category = CATEGORY.get(e['category'], e['category'])
        out.append({
            'id': e['id'],
            'name': names[e['name']],
            'nameEn': e['name'],
            'muscle': muscle,
            'bodyPart': 'cardio' if category == 'cardio' else BODY_PART[muscle],
            'equipment': EQUIPMENT.get(e['equipment'], e['equipment']),
            'category': category,
            'level': e['level'],
            'secondaryMuscles': [MUSCLE[m] for m in e['secondaryMuscles'] if m in MUSCLE],
            'instructions': steps.get(e['id'], []),
        })
    catalog = {'version': 2, 'source': 'Datos de ejercicios: lista de Free Exercise DB (solo nombres y clasificación)',
               'count': len(out), 'exercises': out}
    json.dump(catalog, open(os.path.join(ROOT, 'public', 'exercises_es.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    mapping = json.load(open(mapping_path))
    ids = {x['id'] for x in out}
    assert all(v in ids for v in mapping.values())
    json.dump(mapping, open(os.path.join(ROOT, 'public', 'exercise_ids_v1.json'), 'w'), separators=(',', ':'), sort_keys=True)
    print(f'{len(out)} ejercicios, {len(steps)} con instrucciones, {len(mapping)} equivalencias')


if __name__ == '__main__':
    main(*sys.argv[1:3])
