#!/usr/bin/env python3
"""Pone en el HTML la versión publicada más reciente de IngeTrazo.

script.js la trae en vivo desde GitHub (también la ficha de software
y la fecha del sitemap se ponen al día aquí), pero si esa consulta falla (GitHub
la limita a 60 por hora por IP) la página muestra lo que dice el HTML.
También deja al día la cifra de respaldo del total histórico de descargas,
que lleva el workflow horario .github/workflows/descargas.yml (rama
datos-descargas). Correr esto antes de cada `wrangler deploy` evita que se
vea una versión vieja:

    python3 tools/actualizar-version.py
"""
import json
import re
import urllib.request
from pathlib import Path

API = 'https://api.github.com/repos/ingelibre/ingetrazo/releases?per_page=100'
MESES = {
    'index.html': ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
                   'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'],
    'en/index.html': ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                      'August', 'September', 'October', 'November', 'December'],
    'pt/index.html': ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
                      'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
}

raiz = Path(__file__).resolve().parent.parent
releases, pagina = [], 1
while True:                                   # todas las páginas, no solo 100 releases
    with urllib.request.urlopen(f'{API}&page={pagina}', timeout=20) as r:
        lote = json.load(r)
    if not lote:
        break
    releases += lote
    pagina += 1
rel = next(x for x in releases if not x['draft'] and not x['prerelease'])
v = rel['tag_name'].lstrip('v')
anio, mes = int(rel['published_at'][:4]), int(rel['published_at'][5:7])

# ── total histórico de descargas ─────────────────────────────────────────
# El registro vivo lo lleva el workflow horario en la rama datos-descargas;
# aquí solo se lee para dejar la cifra de respaldo al día. Si esa rama aún
# no existe (antes del primer registro), se calcula desde la semilla.
REGISTRO = ('https://api.github.com/repos/ingelibre/ingetrazo-web/contents/'
            'descargas.json?ref=datos-descargas')
try:
    req = urllib.request.Request(REGISTRO, headers={'Accept': 'application/vnd.github.raw+json'})
    with urllib.request.urlopen(req, timeout=20) as r:
        reg = json.load(r)
except Exception:
    import importlib.util, tempfile
    spec = importlib.util.spec_from_file_location('registrar', raiz / 'tools' / 'registrar-descargas.py')
    registrar = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(registrar)
    reg = registrar.registrar(Path(tempfile.mkdtemp()) / 'descargas.json')
retiradas, total = reg['retiradas'], reg['total']
total_redondeado = total // 100 * 100
js_f = raiz / 'script.js'
with open(js_f, encoding='utf-8', newline='') as h:
    js = h.read()
js = re.sub(r'var DESCARGAS_RETIRADAS = \d+;', f'var DESCARGAS_RETIRADAS = {retiradas};', js)
with open(js_f, 'w', encoding='utf-8', newline='') as h:
    h.write(js)
print(f'descargas: {total} en total ({retiradas} ya retiradas de GitHub)')

for nombre, meses in MESES.items():
    f = raiz / nombre
    with open(f, encoding='utf-8', newline='') as h:   # respeta LF/CRLF
        s = h.read()
    fecha = f'{meses[mes - 1]} de {anio}' if nombre == 'pt/index.html' else f'{meses[mes - 1]} {anio}'
    s = re.sub(r'(<span id="latest-version">)v[^<]*', rf'\g<1>v{v}', s)
    s = re.sub(r'(<span id="announce-version">)v[^<]*', rf'\g<1>v{v}', s)
    s = re.sub(r'(<span id="dl-version">)[^<]*', rf'\g<1>{v}', s)
    s = re.sub(r'(<span id="dl-date">)[^<]*', rf'\g<1>{fecha}', s)
    s = re.sub(r'("softwareVersion": ")[^"]*', rf'\g<1>{v}', s)
    # cifra de respaldo del total histórico de descargas (7.300+ / 7,300+)
    txt = f'{total_redondeado:,}'.replace(',', ',' if nombre.startswith('en/') else '.') + '+'
    s = re.sub(r'(data-stat="downloads">)[^<]*', rf'\g<1>{txt}', s)
    # nombres de archivo en los comandos copiables de AppImage y tar.gz
    s = re.sub(r'IngeTrazo-\d+(?:\.\d+)+(-x86_64\.AppImage|-linux-x86_64\.tar\.gz|/ingetrazo)',
               rf'IngeTrazo-{v}\1', s)
    with open(f, 'w', encoding='utf-8', newline='') as h:
        h.write(s)
    print(f'{nombre}: v{v} · {fecha}')

# sitemap: la página cambió hoy
import datetime
f = raiz / 'sitemap.xml'
with open(f, encoding='utf-8', newline='') as h:
    s = h.read()
s = re.sub(r'<lastmod>[^<]*</lastmod>', f'<lastmod>{datetime.date.today().isoformat()}</lastmod>', s)
with open(f, 'w', encoding='utf-8', newline='') as h:
    h.write(s)
print('sitemap.xml: lastmod al día')
