"""Añade los ejercicios propios de Serix (extra_exercises.json) al catálogo y marca con etiquetas
(«functional», «home») los que ya estaban. Se puede repetir: reemplaza lo que añadió la vez anterior.

Uso: python3 scripts/catalog/add_extra.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FULL = ROOT / 'public/exercises_es.json'
INDEX = ROOT / 'public/exercises_index.json'
EXTRA = json.loads((Path(__file__).parent / 'extra_exercises.json').read_text())

BODY = {'abs': 'core', 'abductors': 'legs', 'adductors': 'legs', 'calves': 'legs', 'glutes': 'legs', 'hamstrings': 'legs',
        'quads': 'legs', 'biceps': 'arms', 'forearms': 'arms', 'triceps': 'arms', 'pectorals': 'chest', 'lats': 'back',
        'spine': 'back', 'upper-back': 'back', 'traps': 'back', 'delts': 'shoulders', 'neck': 'shoulders'}
ORDER = ['id', 'name', 'nameEn', 'muscle', 'bodyPart', 'equipment', 'category', 'level', 'secondaryMuscles', 'tags', 'extra',
         'tracking', 'instructions', 'instructionsEn']

full = json.loads(FULL.read_text())
mine = {e['id'] for e in EXTRA['exercises']}
base = [e for e in full['exercises'] if not e.get('extra')]
for e in base:
    e.pop('tags', None)
    # Las reclasificaciones sobreviven a regenerar el catálogo base; nunca cambian un id.
    if e['id'] in EXTRA.get('equipmentOverrides', {}):
        e['equipment'] = EXTRA['equipmentOverrides'][e['id']]
ids = {e['id'] for e in base}
OVERRIDES = EXTRA.get('muscleOverrides', {})
assert set(OVERRIDES) <= ids | mine, 'Músculo de un id inexistente'
clash = mine & ids
assert not clash, f'Ya existen en el catálogo: {clash}'
assert len(mine) == len(EXTRA['exercises']), 'Ids propios repetidos'
assert set(EXTRA.get('equipmentOverrides', {})) <= ids, 'Reclasificación de un id inexistente'

tagged = {}
for tag, lst in EXTRA['tags'].items():
    for i in lst:
        assert i in ids, f'No existe {i}'
        tagged.setdefault(i, []).append(tag)
for e in base:
    if e['id'] in tagged:
        e['tags'] = tagged[e['id']]

added = []
for x in EXTRA['exercises']:
    assert len(x['instructions']) == len(x['instructionsEn'])
    e = dict(x)
    e['bodyPart'] = 'cardio' if x['category'] == 'cardio' else BODY[x['muscle']]
    e['extra'] = True
    added.append({k: e[k] for k in ORDER if k in e})

exercises = sorted(base + added, key=lambda e: e['id'])
# Músculos revisados a mano contra lo que hace cada ejercicio; la zona del cuerpo se deduce del músculo.
for e in exercises:
    if e['id'] in OVERRIDES:
        e.update(OVERRIDES[e['id']])
        if e['category'] != 'cardio':
            e['bodyPart'] = BODY[e['muscle']]
    e['secondaryMuscles'] = [m for m in dict.fromkeys(e['secondaryMuscles']) if m != e['muscle']]
full.update(exercises=exercises, count=len(exercises),
            source='Datos de ejercicios: Free Exercise DB y openGym (solo nombres y clasificación); textos y figuras propios de Serix')
FULL.write_text(json.dumps(full, ensure_ascii=False, separators=(',', ':')))
index = dict(full, exercises=[{k: v for k, v in e.items() if k not in ('instructions', 'instructionsEn')} for e in exercises])
INDEX.write_text(json.dumps(index, ensure_ascii=False, separators=(',', ':')))
print(f'{len(added)} propios, {len(tagged)} etiquetados, {len(exercises)} en total')
