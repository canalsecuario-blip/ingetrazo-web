// Idioma automático de ingetrazo.com.
//
// El sitio es estático (assets); este Worker solo corre para «/», «/apoyar» y «/firma»
// (run_worker_first en wrangler.jsonc) y decide si ese visitante se queda en
// español o va a /en/ o /pt/. Orden:
//   1. la cookie `lang` — elegir en el selector de la cabecera gana siempre;
//   2. el idioma preferido del navegador si es español o portugués;
//   3. el país (Cloudflare): Hispanoamérica y España → español,
//      Brasil y lusófonos → portugués;
//   4. todo lo demás (Alemania, China, EE. UU.…) → inglés.
// Los buscadores no se redirigen: ven el español y siguen los hreflang.

const SPANISH = new Set([
  'AR', 'BO', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'ES', 'GQ', 'GT', 'HN',
  'MX', 'NI', 'PA', 'PE', 'PR', 'PY', 'SV', 'UY', 'VE',
]);
const PORTUGUESE = new Set(['AO', 'BR', 'CV', 'GW', 'MZ', 'PT', 'ST', 'TL']);
const SUPPORTED = new Set(['es', 'en', 'pt']);
const LANG_PAGES = new Set(['/', '/apoyar', '/firma']);
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|whatsapp|telegram|discord|lighthouse/i;

export function firstLanguage(acceptLanguage) {
  const tags = (acceptLanguage || '')
    .split(',')
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.find((p) => p.trim().startsWith('q='));
      return { tag: tag.trim().toLowerCase(), q: q ? parseFloat(q.trim().slice(2)) || 0 : 1, i };
    })
    .filter((t) => t.tag && t.tag !== '*' && t.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  return tags.length ? tags[0].tag.slice(0, 2) : '';
}

export function pickLang({ cookie, acceptLanguage, country }) {
  const m = /(?:^|;\s*)lang=(es|en|pt)\b/.exec(cookie || '');
  if (m) return m[1];
  const browser = firstLanguage(acceptLanguage);
  if (browser === 'es' || browser === 'pt') return browser;
  if (SPANISH.has(country)) return 'es';
  if (PORTUGUESE.has(country)) return 'pt';
  return 'en';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const ua = request.headers.get('User-Agent') || '';
    // Renamed images: store listings already published (the Flatpak's
    // AppStream of 0.5.6) still point at the old names.
    const MOVED = { '/images/screenshots/import-sketchup.jpeg': '/images/screenshots/importar.jpeg' };
    if (MOVED[url.pathname]) {
      return Response.redirect(new URL(MOVED[url.pathname], url.origin).toString(), 301);
    }
    // Only the pages this Worker is for pick a language. A path the
    // assets do not have also reaches the Worker (Cloudflare's not-found
    // fallback): redirecting it to /en/<path> found nothing again and came
    // back here -- /en/en/en/..., the loop that broke Flatpak installs
    // outside Hispanoamerica (issue #167: optional delta-indexes files).
    if (LANG_PAGES.has(url.pathname) && !BOT.test(ua)) {
      const lang = pickLang({
        cookie: request.headers.get('Cookie'),
        acceptLanguage: request.headers.get('Accept-Language'),
        country: (request.cf && request.cf.country) || '',
      });
      if (SUPPORTED.has(lang) && lang !== 'es') {
        const path = url.pathname === '/' ? '/' : url.pathname;
        return new Response(null, {
          status: 302,
          headers: {
            Location: `/${lang}${path}${url.search}${url.hash}`,
            'Cache-Control': 'private, no-store',
            Vary: 'Accept-Language, Cookie',
          },
        });
      }
    }
    const res = await env.ASSETS.fetch(request);
    const out = new Response(res.body, res);
    out.headers.set('Vary', 'Accept-Language, Cookie');
    return out;
  },
};
