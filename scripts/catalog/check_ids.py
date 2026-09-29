"""Comprueba que todos los identificadores de ejercicio escritos en el código existen en el catálogo.

Uso: python3 scripts/catalog/check_ids.py   (desde la raíz del proyecto)
"""
import json, re, sys

ids = {e['id'] for e in json.load(open('public/exercises_es.json'))['exercises']}
bad = []
for path in ['src/lib/generator.ts', 'src/lib/tracking.ts']:
    src = open(path).read()
    # Identificadores: palabras con guiones bajos o guiones y mayúscula inicial dentro de comillas.
    for found in re.findall(r"'([A-Z0-9][A-Za-z0-9_\-\\']*?)'(?=[,\]\s])", src):
        found = found.replace("\\'", "'")
        if ('_' in found or '-' in found) and found not in ids:
            bad.append(f'{path}: {found}')
print('\n'.join(bad) or 'Todos los identificadores existen.')
sys.exit(1 if bad else 0)
