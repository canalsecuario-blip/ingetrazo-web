/* IngeTrazo — landing interactions (espejo del patrón de ingepresupuestos.com):
   versión desde GitHub Releases, menú móvil, scroll reveal, lightbox, copiar. */
(function () {
  'use strict';

  /* ── Idioma de la página (es/en/pt) ────────────────────────────────── */
  var LANG = (document.documentElement.lang || 'es').slice(0, 2);
  var STRINGS = {
    es: { locale: 'es-PE', copied: '¡Copiado!', copy: 'Copiar',
          flatpak: 'doble clic instala', appimage: 'no instala nada', tarball: 'sin FUSE',
          dlWin: 'Descargar para Windows', dlMac: 'Descargar para Mac', dlLinux: 'Descargar para Linux (Flatpak)',
          dlWinSub: 'Instalador para Windows 10/11 · 64 bits. Otras versiones y sistemas, abajo.',
          dlMacSub: 'Para Mac con Apple Silicon (M1 o posterior). Otras opciones, abajo.',
          dlLinuxSub: 'Se instala con doble clic. AppImage, tar.gz y los demás sistemas, abajo.',
          thanks: '¡Gracias por descargar IngeTrazo!',
          thanksSub: 'Es libre y lo hace una persona. Si te ahorra horas, puedes apoyarlo.',
          thanksBtn: 'Apoyar', support: '/apoyar', close: 'Cerrar' },
    en: { locale: 'en-US', copied: 'Copied!', copy: 'Copy',
          flatpak: 'double-click installs', appimage: 'installs nothing', tarball: 'no FUSE needed',
          dlWin: 'Download for Windows', dlMac: 'Download for Mac', dlLinux: 'Download for Linux (Flatpak)',
          dlWinSub: 'Installer for Windows 10/11 · 64-bit. Other versions and systems below.',
          dlMacSub: 'For Macs with Apple Silicon (M1 or later). Other options below.',
          dlLinuxSub: 'Installs with a double-click. AppImage, tar.gz and other systems below.',
          thanks: 'Thanks for downloading IngeTrazo!',
          thanksSub: 'It is free and made by one person. If it saves you hours, you can support it.',
          thanksBtn: 'Support', support: '/en/apoyar', close: 'Close' },
    pt: { locale: 'pt-BR', copied: 'Copiado!', copy: 'Copiar',
          flatpak: 'clique duplo instala', appimage: 'não instala nada', tarball: 'sem FUSE',
          dlWin: 'Baixar para Windows', dlMac: 'Baixar para Mac', dlLinux: 'Baixar para Linux (Flatpak)',
          dlWinSub: 'Instalador para Windows 10/11 · 64 bits. Outras versões e sistemas, abaixo.',
          dlMacSub: 'Para Mac com Apple Silicon (M1 ou posterior). Outras opções, abaixo.',
          dlLinuxSub: 'Instala com clique duplo. AppImage, tar.gz e outros sistemas, abaixo.',
          thanks: 'Obrigado por baixar o IngeTrazo!',
          thanksSub: 'É livre e feito por uma pessoa. Se ele te poupa horas, você pode apoiá-lo.',
          thanksBtn: 'Apoiar', support: '/pt/apoyar', close: 'Fechar' }
  };
  var T = STRINGS[LANG] || STRINGS.es;

  /* Elegir idioma a mano gana a la detección automática del Worker
     (worker.js): la cookie dura un año. */
  document.querySelectorAll('.lang-switch a[data-lang]').forEach(function (a) {
    a.addEventListener('click', function () {
      document.cookie = 'lang=' + a.getAttribute('data-lang') +
        '; path=/; max-age=31536000; SameSite=Lax; Secure';
    });
  });

  /* ── Cifras en vivo (franja bajo la portada) ────────────────────────── */
  function setStat(name, n, round) {
    var el = document.querySelector('[data-stat="' + name + '"]');
    if (!el || !n) return;
    if (round) n = Math.floor(n / round) * round;
    /* miles como en el resto de la página: 7.000 (es/pt), 7,000 (en) */
    var sep = LANG === 'en' ? ',' : '.';
    el.textContent = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep) + (round ? '+' : '');
  }
  fetch('https://api.github.com/repos/ingelibre/ingetrazo')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (repo) { if (repo) setStat('stars', repo.stargazers_count); })
    .catch(function () {});

  /* Descargas de instaladores que ya no están en GitHub: al borrar un archivo
     de un release, GitHub borra también su contador. La cifra la mantiene
     tools/actualizar-version.py (tools/descargas.json); no editar a mano. */
  var DESCARGAS_RETIRADAS = 6852;
  /* Registro vivo (workflow horario, rama datos-descargas): lo retirado y el
     último total visto. Si falla, queda la cifra de arriba. */
  var registro = fetch('https://api.github.com/repos/ingelibre/ingetrazo-web/contents/descargas.json?ref=datos-descargas',
                       { headers: { Accept: 'application/vnd.github.raw+json' } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .catch(function () { return null; })
    .then(function (j) {
      return (j && typeof j.retiradas === 'number') ? j : { retiradas: DESCARGAS_RETIRADAS, total: 0 };
    });

  /* ── Versión + fecha desde GitHub Releases ─────────────────────────── */
  /* Una sola consulta trae la última versión y las descargas de todas. */
  fetch('https://api.github.com/repos/ingelibre/ingetrazo/releases?per_page=100')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (list) {
      if (!list || !list.length) return;
      var total = 0;
      list.forEach(function (x) {
        (x.assets || []).forEach(function (a) { total += a.download_count || 0; });
      });
      /* total histórico: lo publicado hoy + lo retirado; si algo se borró
         después del último registro, nunca menos que el último total visto */
      registro.then(function (reg) {
        var n = Math.max(total + reg.retiradas, reg.total || 0);
        setStat('downloads', n, n >= 1000 ? 100 : 0);
      });
      var rel = list.filter(function (x) { return !x.draft && !x.prerelease; })[0];
      if (!rel || !rel.tag_name) return;
      var v = rel.tag_name.replace(/^v/, '');
      var el = document.getElementById('latest-version');
      if (el) el.textContent = 'v' + v;
      var dv = document.getElementById('dl-version');
      if (dv) dv.textContent = v;
      if (rel.published_at) {
        var d = new Date(rel.published_at);
        var dd = document.getElementById('dl-date');
        if (dd) dd.textContent = d.toLocaleDateString(T.locale,
          { year: 'numeric', month: 'long' });
      }
      /* URL exacta de cada artefacto del release, su tamaño real, y el
         comando copiable con el nombre exacto del archivo. */
      function updateCard(cardId, label, a, codeId, lines, copyCmd) {
        var btn = document.getElementById(cardId);
        if (btn) {
          btn.href = a.browser_download_url;
          var size = btn.querySelector('span');
          if (size && a.size) {
            size.textContent = label + ' · ' +
              Math.round(a.size / 1048576) + ' MB';
          }
        }
        var box = codeId ? document.getElementById(codeId) : null;
        if (box) {
          var code = box.querySelector('code');
          var copy = box.querySelector('.dl-code-copy');
          if (code) code.textContent = lines;
          if (copy) copy.setAttribute('data-copy', copyCmd);
        }
      }
      (rel.assets || []).forEach(function (a) {
        if (/-setup-.*\.exe$/.test(a.name)) {
          var btn = document.getElementById('dl-win-btn');
          if (btn) btn.href = a.browser_download_url;
        } else if (/-windows\.zip$/.test(a.name)) {
          var zip = document.getElementById('dl-win-zip');
          if (zip) zip.href = a.browser_download_url;
        } else if (/-macos-[^-]+\.dmg$/.test(a.name)) {
          updateCard('dl-mac', 'Apple Silicon · macOS', a, null, null, null);
        } else if (/\.flatpak$/.test(a.name)) {
          // Solo la tarjeta (enlace y peso). El bloque de comandos NO se
          // toca: instala desde el repositorio, que es lo que hace que
          // `flatpak update` funcione, y no depende de cada release.
          updateCard('dl-flatpak', T.flatpak, a, null, null, null);
        } else if (/\.AppImage$/.test(a.name)) {
          updateCard('dl-appimage', T.appimage, a, 'dl-code-appimage',
            'chmod +x ' + a.name + '\n./' + a.name,
            'chmod +x ' + a.name + ' && ./' + a.name);
        } else if (/\.tar\.gz$/.test(a.name)) {
          var dir = a.name.replace(/-linux-[^-]+\.tar\.gz$/, '');
          updateCard('dl-tarball', T.tarball, a, 'dl-code-tarball',
            'tar -xzf ' + a.name + '\n' + dir + '/ingetrazo',
            'tar -xzf ' + a.name + ' && ' + dir + '/ingetrazo');
        }
      });
    })
    .catch(function () { /* fallback: valores estáticos del HTML */ });

  /* ── Descarga: botón principal para el sistema del visitante ───────── */
  var primary = document.getElementById('dl-primary');
  if (primary) {
    var ua = navigator.userAgent;
    var pick = /Windows/.test(ua) ? ['dl-win-btn', T.dlWin, T.dlWinSub]
      : /Macintosh|Mac OS X/.test(ua) && !/iPhone|iPad/.test(ua) ? ['dl-mac', T.dlMac, T.dlMacSub]
      : /Linux|X11/.test(ua) && !/Android/.test(ua) ? ['dl-flatpak', T.dlLinux, T.dlLinuxSub]
      : null;                              // celulares: se ven todas las opciones
    var card = pick && document.getElementById(pick[0]);
    if (card) {
      var pbtn = document.getElementById('dl-primary-btn');
      pbtn.textContent = pick[1];
      document.getElementById('dl-primary-sub').textContent = pick[2];
      /* El enlace se lee al hacer clic: la API de GitHub lo actualiza después. */
      pbtn.addEventListener('click', function (e) {
        e.preventDefault();
        window.location.href = card.href;
        thanks();
      });
      primary.hidden = false;
    }
  }

  /* ── Tras descargar: gracias y una invitación a apoyar ─────────────── */
  var thanksShown = false;
  function thanks() {
    if (thanksShown) return;
    thanksShown = true;
    var box = document.createElement('div');
    box.className = 'dl-thanks';
    box.setAttribute('role', 'status');
    var txt = document.createElement('div');
    var h = document.createElement('strong'); h.textContent = T.thanks;
    var p = document.createElement('span'); p.textContent = T.thanksSub;
    txt.appendChild(h); txt.appendChild(p);
    var a = document.createElement('a');
    a.className = 'btn btn-heart btn-sm'; a.href = T.support; a.textContent = T.thanksBtn;
    var x = document.createElement('button');
    x.type = 'button'; x.className = 'dl-thanks-close'; x.setAttribute('aria-label', T.close);
    x.textContent = '\u00d7';
    x.addEventListener('click', function () { box.classList.remove('show'); });
    box.appendChild(txt); box.appendChild(a); box.appendChild(x);
    document.body.appendChild(box);
    setTimeout(function () { box.classList.add('show'); }, 600);
  }
  document.querySelectorAll('a.dl-card').forEach(function (c) {
    c.addEventListener('click', thanks);
  });

  /* ── Menú móvil ─────────────────────────────────────────────────────── */
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') links.classList.remove('open');
    });
  }

  /* ── Scroll reveal ──────────────────────────────────────────────────── */
  var revealed = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealed.forEach(function (el) { io.observe(el); });
  } else {
    revealed.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ── Lightbox ───────────────────────────────────────────────────────── */
  var lightbox = document.getElementById('lightbox');
  if (lightbox) {
    var lbImg = lightbox.querySelector('img');
    /* Leyenda de la captura: el texto largo vive aquí, no junto a la imagen */
    var lbCap = document.createElement('p');
    lbCap.className = 'lightbox-caption';
    lightbox.appendChild(lbCap);
    var close = function () {
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden', 'true');
    };
    document.querySelectorAll('img.zoomable').forEach(function (img) {
      img.addEventListener('click', function () {
        lbImg.src = img.src;
        lbImg.alt = img.alt || '';
        lbCap.textContent = img.getAttribute('data-caption') || '';
        lbCap.hidden = !lbCap.textContent;
        lightbox.classList.add('open');
        lightbox.setAttribute('aria-hidden', 'false');
      });
    });
    lightbox.addEventListener('click', function (e) {
      if (e.target !== lbImg) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  }

  /* ── Copiar comandos de instalación ─────────────────────────────────── */
  document.querySelectorAll('.dl-code-copy, .aporte-copiar').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy') || '';
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = T.copied;
        btn.classList.add('copied');
        setTimeout(function () {
          btn.textContent = T.copy;
          btn.classList.remove('copied');
        }, 2200);
      });
    });
  });
})();

/* «Cómo instalar» de Linux: cerrado de entrada; cada pestaña despliega
   su panel y un segundo clic en la misma lo vuelve a plegar. */
document.querySelectorAll('.dl-howto').forEach(function (box) {
  var tabs = box.querySelectorAll('.dl-tab');
  var foot = box.querySelector('.dl-howto-foot');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var name = tab.classList.contains('is-active') ? null : tab.getAttribute('data-tab');
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-tab') === name;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      box.querySelectorAll('.dl-panel').forEach(function (p) {
        p.hidden = p.getAttribute('data-panel') !== name;
      });
      if (foot) foot.hidden = !name;
      box.classList.toggle('is-open', !!name);
    });
  });
});
