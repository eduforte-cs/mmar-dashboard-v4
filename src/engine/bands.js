/**
 * bands.js — Single source of truth for Power Law price bands.
 *
 * Every component that needs a support floor, fair value, bubble zone,
 * or any σ-band price MUST import from here. No inline calculations.
 *
 * Band structure (from top to bottom):
 *   bubble   = fair value + 2σ      (WLS slope)
 *   ceiling  = fair value + 1σ      (WLS slope)
 *   warm     = fair value + 0.5σ    (WLS slope)
 *   fair     = plPrice(a, b, t)     (WLS regression)
 *   discount = fair value − 0.5σ    (WLS slope)
 *   support  = RANSAC floor         (own slope, NOT parallel to fair value)
 */

import { plPrice } from "./powerlaw.js";

// ── Individual band prices at a given day ──

export function fairValue(a, b, t) {
  return plPrice(a, b, t);
}

export function bubbleZone(a, b, t, resMean, resStd) {
  return Math.exp(Math.log(plPrice(a, b, t)) + resMean + 2 * resStd);
}

export function cycleCeiling(a, b, t, resMean, resStd) {
  return Math.exp(Math.log(plPrice(a, b, t)) + resMean + resStd);
}

export function warmZone(a, b, t, resMean, resStd) {
  return Math.exp(Math.log(plPrice(a, b, t)) + resMean + 0.5 * resStd);
}

export function mildDiscount(a, b, t, resMean, resStd) {
  return Math.exp(Math.log(plPrice(a, b, t)) + resMean - 0.5 * resStd);
}

/**
 * Support floor — uses RANSAC (own slope) when available, falls back to resFloor offset.
 * RANSAC is robust to bubble outliers and has a different slope than WLS.
 */
export function supportFloor(t, { a, b, resFloor, ransac }) {
  if (ransac) {
    return Math.exp(ransac.a + ransac.b * Math.log(Math.max(t, 1)) + ransac.floor);
  }
  return Math.exp(Math.log(plPrice(a, b, Math.max(t, 1))) + resFloor);
}

// ── Log10 versions for Recharts (Pro chart) ──

export function bandsLog10(a, b, t, resMean, resStd, ransac, resFloor) {
  const plV = plPrice(a, b, t);
  const lpl = Math.log10(plV);
  const supParams = { a, b, resFloor, ransac };
  return {
    lPl:    +lpl.toFixed(4),
    lR2up:  +(lpl + (resMean + 2 * resStd) / Math.LN10).toFixed(4),
    lR1up:  +(lpl + (resMean + resStd) / Math.LN10).toFixed(4),
    lR05up: +(lpl + (resMean + 0.5 * resStd) / Math.LN10).toFixed(4),
    lR05dn: +(lpl + (resMean - 0.5 * resStd) / Math.LN10).toFixed(4),
    lSup:   +Math.log10(supportFloor(t, supParams)).toFixed(4),
  };
}

// ── All bands at a given day (price-space) ──

export function allBands(t, { a, b, resMean, resStd, resFloor, ransac }) {
  const plV = plPrice(a, b, t);
  return {
    bubble:   Math.exp(Math.log(plV) + resMean + 2 * resStd),
    ceiling:  Math.exp(Math.log(plV) + resMean + resStd),
    warm:     Math.exp(Math.log(plV) + resMean + 0.5 * resStd),
    fair:     plV,
    discount: Math.exp(Math.log(plV) + resMean - 0.5 * resStd),
    support:  supportFloor(t, { a, b, resFloor, ransac }),
  };
}

// ── Key levels for current time ──

export function keyLevels(t, S0, params) {
  const b = allBands(t, params);
  const pct = (price) => ((price - S0) / S0 * 100);
  return [
    { label: "Bubble zone",   sigma: "+2σ",    price: b.bubble,   pct: pct(b.bubble) },
    { label: "Cycle ceiling", sigma: "+1σ",    price: b.ceiling,  pct: pct(b.ceiling) },
    { label: "Mild premium",  sigma: "+0.5σ",  price: b.warm,     pct: pct(b.warm) },
    { label: "Fair value",    sigma: "0σ",     price: b.fair,     pct: pct(b.fair) },
    { label: "Mild discount", sigma: "−0.5σ",  price: b.discount, pct: pct(b.discount) },
    { label: "Support floor", sigma: "RANSAC", price: b.support,  pct: pct(b.support) },
  ];
}
