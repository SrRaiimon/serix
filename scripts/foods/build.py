# Genera public/foods.json (lista básica de Comidas) a partir de la tabla ANSES-CIQUAL 2020 en inglés.
#
# Fuente: https://www.data.gouv.fr/fr/datasets/table-de-composition-nutritionnelle-des-aliments-ciqual/
# («ANSES-CIQUAL 2020 Table in English in Excel format»), Licence Ouverte / Open Licence 2.0.
# El archivo no se guarda en el repositorio. Uso:
#   python3 -m venv /tmp/v && /tmp/v/bin/pip install xlrd==2.0.1
#   /tmp/v/bin/python scripts/foods/build.py "Table Ciqual 2020_ENG_2020 07 07.xls"
#
# foods.tsv: id, nombre en español, en inglés, código CIQUAL, ración (es, en) y gramos de la ración.
# Los nombres y las raciones son propios; los valores salen tal cual de CIQUAL.
import json, sys, xlrd

def value(x):
    x = str(x).strip().replace(',', '.')
    if x in ('', '-'):
        return None
    if x.lower().startswith('traces'):
        return 0.0
    try:
        return float(x.replace('<', '').strip())
    except ValueError:
        return None

sheet = xlrd.open_workbook(sys.argv[1]).sheet_by_index(0)
rows = {}
for r in range(1, sheet.nrows):
    row = [sheet.cell_value(r, c) for c in range(sheet.ncols)]
    # 10: energía UE 1169/2011 (kcal), 14: proteína, 16: carbohidratos, 17: grasa, 26: fibra, 29: alcohol
    rows[int(row[6])] = dict(name=str(row[7]).replace(' -> ARCHIVE', '').strip(), kcal=value(row[10]), p=value(row[14]), c=value(row[16]), f=value(row[17]), fiber=value(row[26]), alc=value(row[29]), sugar=value(row[18]), salt=value(row[49]))

foods = []
for line in open('scripts/foods/foods.tsv', encoding='utf8'):
    if not line.strip():
        continue
    key, es, en, code, portion_es, portion_en, grams = line.rstrip('\n').split('\t')
    d = rows[int(code)]
    p, c, f = d['p'], d['c'], d['f']
    assert None not in (p, c, f), key
    # Si CIQUAL no da la energía, se calcula con los factores del Reglamento (UE) 1169/2011.
    kcal = d['kcal'] if d['kcal'] is not None else 4 * p + 4 * c + 9 * f + 2 * (d['fiber'] or 0) + 7 * (d['alc'] or 0)
    food = {'id': key, 'es': es, 'en': en, 'ciqual': int(code), 'kcal': round(kcal), 'p': round(p, 1), 'c': round(c, 1), 'f': round(f, 1)}
    if d['fiber'] is not None:
        food['fiber'] = round(d['fiber'], 1)
    if d['sugar'] is not None:
        food['sugar'] = round(d['sugar'], 1)
    if d['salt'] is not None:
        food['salt'] = round(d['salt'], 2)
    food['portion'] = {'es': portion_es, 'en': portion_en, 'g': int(grams)}
    foods.append(food)

# Lista ampliada (extra.tsv: código CIQUAL, nombre en español, ración en español e inglés, gramos): el
# resto de la tabla sin comida infantil, aguas, especias ni platos muy locales. Nombres en español y
# raciones orientativas propios; el nombre en inglés es el de CIQUAL. Solo sale al buscar ("more": 1).
for line in open('scripts/foods/extra.tsv', encoding='utf8'):
    code, es, portion_es, portion_en, grams = line.rstrip('\n').split('\t')
    d = rows[int(code)]
    p, c, f = d['p'], d['c'], d['f']
    if None in (p, c, f):
        continue
    kcal = d['kcal'] if d['kcal'] is not None else 4 * p + 4 * c + 9 * f + 2 * (d['fiber'] or 0) + 7 * (d['alc'] or 0)
    food = {'id': f'c{code}', 'es': es, 'en': d['name'], 'ciqual': int(code), 'kcal': round(kcal), 'p': round(p, 1), 'c': round(c, 1), 'f': round(f, 1)}
    if d['fiber'] is not None:
        food['fiber'] = round(d['fiber'], 1)
    if d['sugar'] is not None:
        food['sugar'] = round(d['sugar'], 1)
    if d['salt'] is not None:
        food['salt'] = round(d['salt'], 2)
    food['portion'] = {'es': portion_es, 'en': portion_en, 'g': int(grams)}
    food['more'] = 1
    foods.append(food)

source = ('ANSES-CIQUAL 2020 (Francia), Licence Ouverte / Open Licence 2.0. Valores por 100 g; energía según el '
          'Reglamento (UE) 1169/2011 (si falta, calculada con sus factores: 4 kcal/g proteína y carbohidratos, 9 grasa, '
          '2 fibra, 7 alcohol). Cada alimento lleva su código CIQUAL para comprobarlo en ciqual.anses.fr.')
json.dump({'version': 4, 'source': source, 'foods': foods}, open('public/foods.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(f'foods.json: {len(foods)} alimentos')
