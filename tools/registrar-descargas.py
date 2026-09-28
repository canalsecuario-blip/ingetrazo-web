#!/usr/bin/env python3
"""Anota el contador de descargas de cada archivo de los releases de IngeTrazo.

GitHub borra el contador de un archivo cuando se borra del release, así que
el total de la web bajaría cada vez que se retiran instaladores viejos. Este
script guarda el último valor visto de cada archivo; los que ya no están
siguen sumando como «retiradas». Lo corre cada hora el workflow
.github/workflows/descargas.yml sobre la rama `datos-descargas`, y la web lee
ese registro en vivo.

    python3 tools/registrar-descargas.py RUTA/descargas.json
"""
import datetime
import json
import os
import sys
import urllib.request
from pathlib import Path

API = 'https://api.github.com/repos/ingelibre/ingetrazo/releases?per_page=100'
SEMILLA = Path(__file__).resolve().parent / 'descargas-semilla.json'


def releases():
    cab = {'Accept': 'application/vnd.github+json'}
    if os.environ.get('GITHUB_TOKEN'):          # en Actions: sin el límite de 60/h
        cab['Authorization'] = 'Bearer ' + os.environ['GITHUB_TOKEN']
    todos, pagina = [], 1
    while True:
        req = urllib.request.Request(f'{API}&page={pagina}', headers=cab)
        with urllib.request.urlopen(req, timeout=30) as r:
            lote = json.load(r)
        if not lote:
            return todos
        todos += lote
        pagina += 1


def registrar(ruta):
    ruta = Path(ruta)
    reg = json.loads((ruta if ruta.exists() else SEMILLA).read_text(encoding='utf-8'))
    vivos = {str(a['id']): {'release': x['tag_name'], 'nombre': a['name'],
                            'descargas': a['download_count']}
             for x in releases() for a in x['assets']}
    for k, dato in vivos.items():               # el contador de GitHub solo sube
        viejo = reg['archivos'].get(k, {}).get('descargas', 0)
        reg['archivos'][k] = dict(dato, descargas=max(dato['descargas'], viejo))
    reg['retiradas'] = reg['retiradas_antes_del_registro'] + sum(
        d['descargas'] for k, d in reg['archivos'].items() if k not in vivos)
    reg['publicadas'] = sum(d['descargas'] for d in vivos.values())
    reg['total'] = reg['retiradas'] + reg['publicadas']
    reg['actualizado'] = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ')
    ruta.write_text(json.dumps(reg, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return reg


if __name__ == '__main__':
    r = registrar(sys.argv[1] if len(sys.argv) > 1 else 'descargas.json')
    print(f"descargas: {r['total']} en total ({r['retiradas']} ya retiradas de GitHub)")
