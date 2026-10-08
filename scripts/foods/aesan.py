# Genera public/aesan.json (productos de supermercado de Comidas) a partir de la base de datos de la AESAN
# «Datos de composición de alimentos y bebidas comercializados en España en 2022».
#
# Fuente: https://www.aesan.gob.es/datos-abiertos/alimentos-y-bebidas (BasedatosWeb.xlsx). Aviso legal de
# la AESAN: la información es reutilizable para usos comerciales y no comerciales citando la fuente y la
# fecha de la última actualización, sin desnaturalizar su contenido. Los datos los recogió Kantar
# Worldpanel en 2022 de las etiquetas y pueden haber cambiado después.
# El archivo no se guarda en el repositorio. Uso (sin dependencias: un .xlsx es un zip con XML):
#   python3 scripts/foods/aesan.py BasedatosWeb.xlsx "29/09/2026"
#
# Se toma la hoja «Tabla1». Los valores por 100 g (o 100 ml) se copian tal cual; solo se ordenan los
# productos por cuota de mercado y se pasa el nombre de MAYÚSCULAS a minúsculas, quitando la marca del
# principio (va aparte).
import json, re, sys, zipfile
import xml.etree.ElementTree as ET

NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'


def read_rows(path, sheet='xl/worksheets/sheet1.xml'):
    z = zipfile.ZipFile(path)
    strings = [''.join(t.text or '' for t in si.iter(NS + 't')) for si in ET.fromstring(z.read('xl/sharedStrings.xml')).iter(NS + 'si')]

    def col(ref):
        n = 0
        for ch in re.match(r'[A-Z]+', ref).group():
            n = n * 26 + ord(ch) - 64
        return n - 1

    for r in ET.fromstring(z.read(sheet)).iter(NS + 'row'):
        cells = {}
        for c in r.iter(NS + 'c'):
            v = c.find(NS + 'v')
            if v is None:
                continue
            cells[col(c.get('r'))] = strings[int(v.text)] if c.get('t') == 's' else v.text
        if cells:
            yield [cells.get(i, '') for i in range(max(cells) + 1)]


def num(x):
    try:
        v = float(str(x).replace(',', '.'))
    except ValueError:
        return None
    return round(v, 1) if v >= 0 else None


# Palabras que se quedan en mayúsculas al pasar el nombre a minúsculas.
KEEP = {'UHT', 'BIO', 'XL', 'XXL', 'IGP', 'DOP', 'BCAA', 'ECO', 'PVP'}


# Restos de la codificación interna de Kantar en los nombres (no son parte del producto).
NOISE = re.compile(r'\((?:SC|CC)\)|\bVALOR INDIS\b|\bEXCLUIR BASE\b|\bFFP-\S*', re.I)


def clean(text):
    words = NOISE.sub(' ', text).split()
    # Palabras repetidas seguidas («NATURAL NATURAL»).
    return ' '.join(w for i, w in enumerate(words) if i == 0 or w.upper() != words[i - 1].upper())


def sentence(text):
    words = clean(text).split()
    out = []
    for i, w in enumerate(words):
        if w in KEEP or re.fullmatch(r'[0-9]+[A-Z]*', w):
            out.append(w)
        else:
            out.append(w.lower())
    s = ' '.join(out)
    return s[:1].upper() + s[1:]


def title(text):
    return ' '.join(w if w in KEEP else w[:1] + w[1:].lower() for w in text.split())


# Los 500 más vendidos, revisados a mano (aesan-top.tsv: EAN, nombre, ración, gramos): nombre con tildes y
# sin abreviaturas, y una ración orientativa propia. Los valores nutricionales no se tocan.
top = {}
for line in open('scripts/foods/aesan-top.tsv', encoding='utf8'):
    if line.strip():
        ean, name, label, grams = line.rstrip('\n').split('\t')
        top[ean] = (name, label, int(grams))

rows = read_rows(sys.argv[1])
head = next(rows)
ix = {h: i for i, h in enumerate(head)}
get = lambda r, k: r[ix[k]] if ix[k] < len(r) else ''
products = []
subs = []
for r in rows:
    ean = get(r, 'EAN').strip()
    kcal, p, c, f = (num(get(r, k)) for k in ('EnergiaKC', 'Proteínas', 'Carbohidratos', 'Grasas'))
    if not re.fullmatch(r'\d{8,14}', ean) or None in (kcal, p, c, f) or kcal > 1000 or max(p, c, f) > 100:
        continue
    brand = get(r, 'Marca').strip()
    name = get(r, 'Nombrecomercial').strip()
    # El nombre empieza casi siempre por la marca: se quita (la marca va aparte).
    if brand and name.upper().startswith(brand.upper() + ' '):
        name = name[len(brand) + 1:]
    # Sin nombre propio (solo la marca): la denominación legal o, si no, la subcategoría.
    if not clean(name):
        name = get(r, 'DenominacionLegal').strip()[:80] or get(r, 'Subcategoria').strip()
    fiber = num(get(r, 'Fibra'))
    share = num(get(r, 'CuotaMercadoTotalEan')) or 0
    # Subcategoría oficial (bien escrita y con tildes): sirve para buscar cuando el nombre va abreviado.
    sub = get(r, 'Subcategoria').strip()
    if sub not in subs:
        subs.append(sub)
    fixed = top.get(ean)
    sugar, salt = num(get(r, 'Azúcares')), num(get(r, 'Sal'))
    item = [ean, fixed[0] if fixed else sentence(name), title(brand), round(kcal), p, c, f, subs.index(sub),
            fiber if fiber is not None and fiber <= 100 else None,
            sugar if sugar is not None and sugar <= 100 else None,
            round(salt, 2) if salt is not None and salt <= 100 else None]
    if fixed:
        item += [fixed[1], fixed[2]]
    # Sin los null del final (ahorra espacio).
    while item[-1] is None:
        item.pop()
    products.append((float(get(r, 'CuotaMercadoTotalEan') or 0), item))

products.sort(key=lambda x: -x[0])
json.dump({
    'version': 2,
    'source': 'AESAN, Base de datos de alimentos y bebidas comercializados en España en 2022 (datos de Kantar Worldpanel), '
              f'última actualización {sys.argv[2]}. Valores por 100 g o 100 ml.',
    'subcategories': subs,
    # [EAN, nombre, marca, kcal, proteína, hidratos, grasa, subcategoría, fibra?, azúcares?, sal?, ración?,
    # gramos?], de más a menos vendido (null si no se sabe; los null del final se quitan).
    'products': [p for _, p in products],
}, open('public/aesan.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(products), 'productos')
