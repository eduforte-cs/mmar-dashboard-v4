/**
 * GTM DataLayer tracking — all events defined here.
 * 
 * Events fire to window.dataLayer. GTM picks them up
 * and routes to GA4 (or any other tool configured in GTM).
 * 
 * To configure in GTM:
 * 1. Create a GA4 Configuration tag with your Measurement ID
 * 2. For each event below, create a GA4 Event tag:
 *    - Trigger: Custom Event → event name (e.g. "tab_view")
 *    - Parameters: map dataLayer variables (e.g. tab → {{dlv - tab}})
 */

function push(event, params = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

// ── Level 1: Navigation ──
export function trackTabView(tab) {
  push("tab_view", { tab }); // lite, pro, pl, mc, backtest, faq, whitepaper, about
}

export function trackPageView(page) {
  push("page_view", { page }); // landing, dashboard
}

// ── Level 2: Engagement ──
export function trackToggleOpen(section, label) {
  push("toggle_open", { section, toggle_label: label });
}

export function trackScrollDepth(section, depth) {
  push("scroll_depth", { section, depth }); // 25, 50, 75, 100
}

export function trackChartInteraction(chart, action) {
  push("chart_interaction", { chart, action }); // hover, zoom, fullscreen
}

// ── Level 3: Intent ──
export function trackCtaClick(cta, location) {
  push("cta_click", { cta, location }); // "see_backtest" from "landing_hero"
}

export function trackHorizonView(horizon) {
  push("horizon_view", { horizon }); // "1y", "3y"
}

export function trackSignalView(signal, sigma) {
  push("signal_view", { signal, sigma }); // "Buy", -0.70
}

export function trackThemeToggle(theme) {
  push("theme_toggle", { theme }); // "dark", "light"
}

// ── Level 4: Conversion (landing) ──
export function trackAuthStart(method) {
  push("auth_start", { method }); // "google", "apple", "magic_link"
}

export function trackAuthComplete(method) {
  push("auth_complete", { method });
}

// ── Level 5: Content depth ──
export function trackWhitepaperSection(section) {
  push("whitepaper_section", { section }); // "power_law", "fractals", etc
}

export function trackFaqOpen(question) {
  push("faq_open", { question });
}

export function trackBacktestDetail(detail) {
  push("backtest_detail", { detail }); // "spectrum", "cross_validation", "smart_dca"
}

export function trackProSection(section) {
  push("pro_section", { section }); // "drivers", "power_law", "monte_carlo", "regime"
}
