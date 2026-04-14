# Changelog

Registro humano-legible de cambios significativos en mmar-dashboard-v4.
Convención inspirada en [Keep a Changelog](https://keepachangelog.com/).

Cada entrada agrupa el trabajo por sesión bajo:

- **Added** — funcionalidad nueva
- **Changed** — modificaciones a comportamiento existente
- **Fixed** — bugs corregidos
- **Refactored** — reorganización interna sin cambio visible

Los detalles técnicos completos viven en los mensajes de cada commit.
Acá quedan las cosas en lenguaje humano para que el dueño del proyecto
pueda escanear rápido qué cambió y cuándo.

---

## 2026-04-14 (4) — Auto-updating lastmod dates

Close out the SEO sprint pendings by automating what used to be
manual date-bumps in the three crawler-facing text assets.

### Added

- **`lastModPlugin`** in `vite.config.js` — a small build-time Vite
  plugin (runs only on `vite build`, not `dev`) that walks the
  output `dist/` directory after the main bundle is written and
  rewrites every `{{LAST_MOD}}` token in `sitemap.xml`, `llms.txt`
  and `llms-full.txt` with the current ISO date (`YYYY-MM-DD`).
  Source files in `public/` keep the placeholder verbatim so the
  git history doesn't churn on every build; only the shipped copy
  in `dist/` gets the real date baked in.

### Changed

- **`public/sitemap.xml`** — replace hardcoded `<lastmod>2026-03-26</lastmod>`
  with `<lastmod>{{LAST_MOD}}</lastmod>`. Google Search Console
  will now see a fresh `lastmod` on every deploy, which helps
  re-crawling priority after the meta-description and OG image
  updates from today's earlier commits.
- **`public/llms.txt`** and **`public/llms-full.txt`** — same
  treatment for the `> Last updated: YYYY-MM-DD` header line.

### Still manual (pending user action, no code change possible)

- **Google Search Console sitemap re-submit.** The user needs to
  visit https://search.google.com/search-console, select the
  `shouldibuybitcointoday.com` property, go to Sitemaps, remove
  the old entry (if any), re-submit `https://shouldibuybitcointoday.com/sitemap.xml`,
  and trigger a fresh URL inspection + "Request indexing" on the
  root URL so Google picks up the new title / meta description
  / OG image within 24–48 hours instead of the usual weeks.
- **Facebook Debugger re-scrape.** Still pending from the OG
  image commit earlier today. Link:
  https://developers.facebook.com/tools/debug/ → paste URL →
  "Scrape Again". Also clears WhatsApp / iMessage / LinkedIn
  caches indirectly because they all consume the Facebook OpenGraph
  scrape results.

---

## 2026-04-14 (3) — OG image + favicon set

Ship the first real Open Graph image and a proper multi-size favicon
set. Both were blockers on the SEO sprint: without them, link previews
on WhatsApp/Twitter/LinkedIn showed no image and the browser tab
fell back to a minimalist data-URI `₿` character.

### Added

- **`public/og-image.png`** (1200 × 630, 47 KB) — the "Variant B2"
  design picked out of five concepts the user reviewed from a
  preview HTML. Design is a header strip with a prominent
  `CommonSense` brand cell (Switzer Extrabold 56 px, cream, with a
  right-border separator matching the live app header), a compact
  `● LIVE` indicator, and a large green `FREE` label at 92 px. The
  main content area has the sentence-case question "Should I buy /
  Bitcoin today?" at 134 px with the question mark deliberately kept
  in cream (not green) per the user's request. Footer in DM Mono
  reads `real-time · updates every 60s · backtested daily since 2017 ·
  shouldibuybitcointoday.com`.
- **Favicon set** generated from the "Variant C" design the user
  picked after reviewing five favicon concepts on a preview grid:
  - `public/favicon.ico` — multi-size (16 + 32 + 48) for legacy
  - `public/favicon-16.png`, `favicon-32.png`, `favicon-48.png` —
    explicit PNG fallbacks
  - `public/apple-touch-icon.png` (180 × 180) — iOS home screen
  - `public/android-chrome-192.png` / `android-chrome-512.png` —
    Android / PWA

  The design is a dark rounded square (`#1A1B18`, 28 px corner
  radius) with a big cream `₿` centered and a small green circular
  badge in the top-right corner containing a `?`. Renders cleanly
  down to 16 × 16 and pops in a crowded browser tab bar.

- **`scripts/generate-og.mjs`** — builds the OG image from JSX via
  satori + `@resvg/resvg-js`. Reusable whenever the design needs to
  change; run with `node scripts/generate-og.mjs`.

- **`scripts/generate-favicon.mjs`** — builds the complete favicon
  set from a single SVG template. Rasterises to each size via resvg,
  then packs 16 + 32 + 48 PNGs into a multi-size `.ico` file via
  `png-to-ico`. Run with `node scripts/generate-favicon.mjs`.

- **`scripts/Switzer-Bold.otf` + `Switzer-Extrabold.otf`** — the
  live site's brand font, bundled in the repo because Fontshare's
  CDN is blocked from the build sandbox. Used by `generate-og.mjs`.

### Changed

- **`index.html` head** now links to the real favicon set instead of
  the inline data-URI `₿` character. Six `<link rel="icon">` tags
  cover every browser + iOS home screen + Android PWA case. The
  stale `og:image` / `twitter:image` tags are uncommented and point
  to the new `og-image.png`, with explicit width/height metadata.

### Fonts

Two font families ship in the build pipeline now (none of them
shipped to the runtime bundle — only used during OG / favicon
generation):

- **Switzer** (brand font): loaded from `scripts/*.otf` for the OG
  image headline and brand cell.
- **Noto Sans** (Unicode coverage): loaded from
  `@fontsource/noto-sans/files/noto-sans-latin-ext-800-normal.woff`
  for the favicon. Switzer doesn't ship U+20BF (₿) — the user's
  original approach of faking it with a capital B plus two floating
  vertical stems read as a broken B rather than a Bitcoin symbol,
  so the favicon script switched to Noto Sans Extrabold which does
  have the real ₿ glyph.

### Removed (cleanup)

- All `public/og-previews*.html` and `public/favicon-previews*` —
  the temporary picker files that lived on production during the
  OG and favicon selection sessions. They weren't linked from
  anywhere and were only discoverable by URL.
- `public/favicon.svg` and `public/icons.svg` — two orphan SVG
  files from an old template, never referenced in the codebase.

### Not yet done (explicit)

- **No `favicon.svg`** ships. A vector favicon would be ideal for
  crisp rendering on high-DPI displays, but the design depends on
  the Noto Sans ₿ glyph which most browsers don't ship. An SVG
  favicon would either render broken in browsers without Noto (no
  ₿) or would need the entire Noto Sans font embedded as base64
  (~50 KB bloat for a favicon). Skipped in favour of the PNG + ICO
  set, which is universally supported.
- **No `site.webmanifest`** for PWA "Add to Home Screen" — the
  apple-touch-icon alone covers the iOS case, which is 95% of the
  mobile share link use.
- **Facebook Debugger re-scrape not triggered**. Once this commit
  ships to production the user needs to paste the site URL into
  https://developers.facebook.com/tools/debug/ and click "Scrape
  Again" to force Facebook / WhatsApp / iMessage to pick up the
  new OG image. Same for Twitter Card Validator.

---

## 2026-04-14 (2) — SEO meta copy refresh + hreflang scaffold

Revisión del copy que Google y las redes sociales muestran cuando
alguien busca o comparte el sitio. El copy anterior lideraba con "100%
buy accuracy since 2017", un claim defendible pero agresivo para
queries financieras (YMYL — Your Money Your Life). Lo reemplazamos
por un gancho dual "Free + Backtested" que mantiene la credibilidad
sin activar filtros de promesas exageradas.

### Changed

- **`<title>` (el que se ve en la pestaña del navegador y en Google):**
  `Should I Buy Bitcoin Today? — Live Signal & Probability Model`
  → `Should I Buy Bitcoin Today? Free, Backtested`
- **`<meta name="description">` (snippet de Google):**
  `Should I buy Bitcoin today? A live quantitative model with 100% buy accuracy since 2017. Your real odds of losing money at 1 and 3 years.`
  → `Free Bitcoin signal, backtested daily since 2017. Get a plain-English answer and your real odds of losing money over 1 and 3 years.`
- **`og:description` (preview en Facebook / WhatsApp / iMessage /
  Telegram / LinkedIn):** arranca ahora con "Free." y usa "Backtested
  against every day since 2017" en lugar del "100% buy accuracy".
- **`twitter:description`:** mismo tratamiento, más corto.
- **`WebApplication.description` en el JSON-LD** se reformula para
  coincidir con el tono del meta description.
- **`<noscript>` block** (lo que ven los crawlers sin JS y que sirve
  también como fallback accesible) reescrito para alinear con el nuevo
  tono.

### Added

- **Scaffolding de `hreflang`.** Tres tags `<link rel="alternate">`
  comentados en `index.html` apuntando a `/`, `/es/` y `x-default`.
  Están inactivos hasta que implementemos React Router + pre-render
  (SEO Layer 3) con rutas reales por idioma. Hoy el sitio tiene una
  sola URL que sirve un único HTML en inglés; el toggle EN/ES es
  client-side y no afecta lo que Google ve. Al activar los tags más
  adelante, Google indexará la versión en español como entrada
  separada en los resultados.

### Unchanged (decisiones explícitas)

- **Los "100%" dentro del `FAQPage` JSON-LD se quedan.** El JSON-LD
  es terreno de datos estructurados con claims verificables — Google
  lo entiende distinto al snippet promocional y lo usa para generar
  rich snippets ("People also ask") en los resultados de búsqueda.
  Removerlos rompería ese canal sin ganancia clara.
- **`og:image` y `twitter:image` siguen comentadas** porque el
  archivo `public/og-image.png` todavía no existe. Cuando alguien
  comparte el link, aparece sin imagen. Este es el siguiente punto
  del sprint SEO cuando tengamos la imagen (1200×630 PNG).
- **No se actualizó `sitemap.xml` ni la fecha de `llms.txt` en este
  commit** para mantener el cambio enfocado solo en el copy. Eso va
  en una pasada separada.

### Referencia — los 3 packs propuestos

El usuario eligió Pack 3 ("Free + backtested, credibilidad sutil")
entre tres opciones presentadas:

1. **Pack 1 — "La pregunta directa"**: lidera con "plain English",
   tono accesible.
2. **Pack 2 — "Free first"**: "Free" como protagonista absoluto,
   posicionamiento combativo contra herramientas de pago.
3. **Pack 3 — "Free + backtested" (elegido)**: balance entre gancho
   comercial ("Free") y ancla de credibilidad ("Backtested since 2017")
   sin los riesgos YMYL de "100% accuracy".

---

## 2026-04-14 — Bilingüe EN/ES + estabilidad mobile

Sesión grande de internacionalización completa al español rioplatense
y arreglos del header móvil que estaban bloqueando el uso desde iPhone.

### Added

- **Soporte completo de español** en toda la app. 594 keys i18n con
  paridad EN/ES. Todo el texto visible — Lite, Pro (con sus 5
  sub-paneles), Backtest, Power Law full-screen, Monte Carlo
  full-screen, Whitepaper, FAQ, Header, Footer, About — pasa por la
  capa de traducción y respeta el toggle de idioma. Términos técnicos
  como Power Law, RANSAC, MMAR, Hurst, Sortino, Monte Carlo, etc. se
  preservan sin traducir por convención.
- **Helper compartido `renderMd`** (`src/i18n/renderMd.jsx`) que
  parsea `**negrita**` y `[d]texto tenue[/d]` dentro de un string
  i18n y los convierte a componentes React. Permite mantener
  paragraphs como una sola key i18n aunque mezclen énfasis y partes
  en gris. Lo usan Whitepaper y Backtest.
- **`ErrorBoundary` global** (`src/components/ErrorBoundary.jsx`)
  que captura cualquier error de render y muestra el mensaje +
  stack trace en pantalla en lugar de dejar la app en blanco.
  Red de seguridad para todo lo que venga.
- **Logo CommonSense clickeable** — clickeando el logo en el header
  (desktop o mobile) navegás a Lite desde cualquier sección. En la
  versión móvil además cierra el menú hamburger si estaba abierto.
- **`.gitignore`** del proyecto (no existía) + `package-lock.json`
  para builds reproducibles.

### Changed

- **Engine — `episodeCalloutData` estructurado.** El callout largo
  del Time-to-Fair-Value en Pro era 8 ramas de templates en inglés
  hardcoded en `verdict.js`. Ahora el engine emite ADEMÁS una
  estructura `{ key, params, modKey, tailKey, sampleKey }` que la
  capa React resuelve via i18n. El componente tiene un helper
  `renderEpisodeCallout` que ensambla el texto final desde la
  estructura. El campo viejo `episodeCallout` (string en inglés) se
  mantiene como fallback para payloads cacheados de Supabase de
  antes del cambio.
- **`episodeHistory.labelKey`** — el engine ahora emite también un
  identificador estable ("discount", "bubble", "overheated", etc.)
  además del label en inglés, para que el header "EPISODIOS X
  PREVIOS" se traduzca correctamente.
- **Reset CSS global de botones** — eliminamos los estilos por
  defecto que iOS Safari le pone a los `<button>` (highlight azul al
  tocar, fondo redondeado nativo, focus interno). Aplica a todos
  los botones de la app.
- **Zone labels promovidos a top-level** — los nombres de las 7
  zonas (Strong Buy, Buy, Accumulate, Neutral, Caution, Reduce,
  Sell) eran `wp.zone.*` específicos del Whitepaper pero también los
  usaba Backtest. Movidos a `zone.*` como única fuente de verdad.

### Fixed

- **Pantalla blanca al abrir el menú hamburger en mobile.**
  `Header.jsx` línea 289 llamaba a `tr("nav.signOut")` pero `tr`
  nunca había sido destructurado de `useI18n()`. La consecuencia
  era un `ReferenceError` que desmontaba todo el árbol React y
  dejaba la pantalla en blanco. Una línea de fix: aliasar `t` del
  i18n como `tr` en el destructuring de `useI18n()`.
- **X del hamburger asimétrica.** Los `transform` de las dos líneas
  que cierran el icono en X no llevaban los extremos al centro del
  stack, así que la X quedaba visiblemente chueca. Cambiado a
  `translateY(±5.5px) rotate(±45deg)` para que ambas líneas se
  crucen en el mismo punto.
- **Login OAuth en Vercel previews redirigía a producción.**
  No fue cambio de código sino de configuración: añadir wildcards
  de las URLs de preview a la lista blanca de Redirect URLs en
  Supabase (`Authentication → URL Configuration`) para que Google
  OAuth + magic link respeten la URL del preview en lugar de
  caer al Site URL por defecto.

### Refactored

- **`renderMd` extraído de Whitepaper.jsx** a `src/i18n/renderMd.jsx`
  como helper compartido. Acepta `accentColor` opcional para que el
  bold pueda tener color distinto del párrafo padre — útil en
  Backtest, donde los párrafos narrativos son `t.faint` (apagados) y
  los valores enfatizados deben pasar a `t.cream` para destacar.
- **`MarketRegime.jsx`** — los `MOM_LABELS`, `SIG_ZONE_LABELS` y
  `MATRIX` (15 strings de regímenes) reescritos como tablas de keys
  i18n. La señal `domRegime.zone` (que el engine emite en inglés) se
  mapea a un id estable para que el color del badge siga funcionando
  en cualquier idioma.
- **`HurstRegime.jsx`** — las funciones `getComboSignal` y
  `getVolSignal` ahora retornan identificadores cortos en vez de
  objetos `{label, desc}` en inglés. La 9 + 8 combinaciones se
  resuelven via `tr(\`pro.hurst.combo.${id}\`)` al renderizar.
- **Spectrum array de Backtest + Smart DCA rules** convertidos a
  estructuras con `labelKey`/`zoneKey`/`actionKey` que se resuelven
  con `tr()` al render time. Misma forma del array funciona para
  ambos idiomas sin branching.

### Stats

- **23 archivos modificados** + 3 nuevos (`renderMd.jsx`,
  `ErrorBoundary.jsx`, `.gitignore`)
- **+1.470 / −445 líneas** netas
- **594 claves i18n** en cada idioma (paridad EN/ES)
- **11 commits** (`bc0f9c7` → `63d67f0`)

---

## Convenciones de traducción al español

Para mantener consistencia en futuras pasadas:

- **Voseo rioplatense** — "podés", "tenés", "graficás", "obtenés",
  "corrés", etc. en lugar de "puedes", "tienes", etc.
- **Decimales con coma** — "0,95", "5,36", "1,2k" en lugar de "0.95"
- **Miles con punto** — "70.000", "2.000 caminos" en lugar de "70,000"
- **Términos técnicos preservados** sin traducir: Bitcoin, Power Law,
  RANSAC, MMAR, OLS, WLS, Hurst, DFA, EVT, Monte Carlo, Sortino,
  Pareto, Ornstein-Uhlenbeck, war chest, walk-forward
- **Términos cuantitativos traducidos**: "Weighted Least Squares" →
  "Mínimos Cuadrados Ponderados", "Multifractal Model of Asset
  Returns" → "Modelo Multifractal de Retornos de Activos", "Extreme
  Value Theory" → "Teoría de Valores Extremos"
- **Símbolos no se tocan**: σ, R², λ², κ, Δ, %, $, →, ·

---

*Este changelog se actualiza al final de cada sesión grande de
trabajo. Para detalles técnicos a nivel de archivo o función, ver
los mensajes de commit individuales en `git log` o en GitHub.*
