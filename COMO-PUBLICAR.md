# Cómo publicar ingetrazo.com

El sitio es estático (HTML/CSS/JS, sin build) y está **publicado como
Cloudflare Worker con assets estáticos** (mismo esquema que
ingepresupuestos.com). La configuración vive en `wrangler.jsonc`
(incluye los custom domains `ingetrazo.com` y `www.ingetrazo.com`) y
`.assetsignore` excluye los archivos que no deben subirse (docs internas,
`.cover-build/`, etc.).

**Publicado por primera vez el 2026-07-16.** URLs en vivo:

- https://ingetrazo.com (+ www)
- https://ingetrazo-web.ing-sumari.workers.dev (URL técnica del Worker)

## Cada cambio

```bash
cd ~/ingetrazo-web
python3 tools/actualizar-version.py   # versión de respaldo en el HTML
npx wrangler deploy    # sube solo los assets que cambiaron, ~5 s y queda live
git add . && git commit -m "..."
```

Requiere wrangler autenticado (`npx wrangler whoami` — cuenta
ing.sumari@gmail.com). Si la sesión expiró: `npx wrangler login`.

## Repo GitHub

**https://github.com/tuxiasumari/ingetrazo-web** (público, rama `main`,
creado 2026-07-16). Recordar pushear después de cada cambio:
`git push`.

Opcional a futuro (deploy automático con git push): en el dashboard de
Cloudflare → Workers → ingetrazo-web → Settings → **Builds** conectar el
repo. Con eso cada `git push` publica solo. Mientras tanto el flujo es
`wrangler deploy` + `git push` manuales.

## Checklist post-publicación

- [x] `https://ingetrazo.com/robots.txt` y `/sitemap.xml` responden (verificado 2026-07-16).
- [x] Headers de seguridad activos (`_headers`: CSP, HSTS, X-Frame-Options).
- [ ] Verificar OG banner: compartir la URL en WhatsApp/Facebook
      (si sale caché vieja: Facebook Sharing Debugger → Scrape Again).
- [ ] Registrar en Google Search Console.
- [ ] Activar Cloudflare Web Analytics (sin cookies) si se desea.
