#!/usr/bin/env python3
"""Pone en el HTML la versión publicada más reciente de IngeTrazo.

script.js la trae en vivo desde GitHub (también la ficha de software
y la fecha del sitemap se ponen al día aquí), pero si esa consulta falla (GitHub
la limita a 60 por hora por IP) la página muestra lo que dice el HTML.
Correr esto antes de cada `wrangler deploy` evita que se vea una versión vieja:

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
with urllib.request.urlopen(API, timeout=20) as r:
    releases = json.load(r)
rel = next(x for x in releases if not x['draft'] and not x['prerelease'])
v = rel['tag_name'].lstrip('v')
anio, mes = int(rel['published_at'][:4]), int(rel['published_at'][5:7])

for nombre, meses in MESES.items():
    f = raiz / nombre
    with open(f, encoding='utf-8', newline='') as h:   # respeta LF/CRLF
        s = h.read()
    fecha = f'{meses[mes - 1]} de {anio}' if nombre == 'pt/index.html' else f'{meses[mes - 1]} {anio}'
    s = re.sub(r'(<span id="latest-version">)v[^<]*', rf'\g<1>v{v}', s)
    s = re.sub(r'(<span id="dl-version">)[^<]*', rf'\g<1>{v}', s)
    s = re.sub(r'(<span id="dl-date">)[^<]*', rf'\g<1>{fecha}', s)
    s = re.sub(r'("softwareVersion": ")[^"]*', rf'\g<1>{v}', s)
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
