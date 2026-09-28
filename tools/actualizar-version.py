#!/usr/bin/env python3
"""Pone en el HTML la versión publicada más reciente de IngeTrazo.

script.js la trae en vivo desde GitHub (también la ficha de software
y la fecha del sitemap se ponen al día aquí), pero si esa consulta falla (GitHub
la limita a 60 por hora por IP) la página muestra lo que dice el HTML.
Además lleva el total histórico de descargas: GitHub borra el contador de un
archivo al borrarlo del release, así que tools/descargas.json guarda el último
valor visto de cada instalador y la web suma lo retirado a lo publicado.
Correr esto antes de cada `wrangler deploy` evita que se vea una versión vieja
(y conviene correrlo también antes de borrar instaladores viejos de GitHub):

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
reg_f = raiz / 'tools' / 'descargas.json'
reg = json.loads(reg_f.read_text(encoding='utf-8'))
vivos = {str(a['id']): {'release': x['tag_name'], 'nombre': a['name'], 'descargas': a['download_count']}
         for x in releases for a in x['assets']}
for k, dato in vivos.items():                # el contador de GitHub solo sube
    viejo = reg['archivos'].get(k, {}).get('descargas', 0)
    reg['archivos'][k] = dict(dato, descargas=max(dato['descargas'], viejo))
retiradas = reg['retiradas_antes_del_registro'] + sum(
    d['descargas'] for k, d in reg['archivos'].items() if k not in vivos)
total = retiradas + sum(d['descargas'] for d in vivos.values())
total_redondeado = total // 100 * 100
with open(reg_f, 'w', encoding='utf-8', newline='') as h:
    h.write(json.dumps(reg, ensure_ascii=False, indent=2) + '\n')
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
