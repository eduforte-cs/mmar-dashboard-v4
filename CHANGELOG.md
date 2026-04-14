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
