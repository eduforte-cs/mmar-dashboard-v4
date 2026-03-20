// ── Power Law model — WLS fair value + RANSAC support ──
import { daysSinceGenesis } from "./constants.js";

export function plPrice(a, b, t) {
  return Math.exp(a + b * Math.log(t));
}

export function fitPowerLaw(prices) {
  const pts = prices.map(p => ({ t: daysSinceGenesis(p.date), price: p.price })).filter(p => p.t > 0 && p.price > 0);
  const logT = pts.map(p => Math.log(p.t));
  const logP = pts.map(p => Math.log(p.price));
  const n = pts.length;

  // ── Weighted Least Squares (fair value + σ bands) ──
  const tMax = logT[n - 1];
  const halfLife = Math.log(daysSinceGenesis("2020-01-01")) - Math.log(daysSinceGenesis("2016-01-01"));
  const decay = Math.LN2 / halfLife;
  const rawW = logT.map(lt => Math.exp(-decay * (tMax - lt)));
  const wSum = rawW.reduce((s, w) => s + w, 0);
  const w = rawW.map(wi => wi / wSum);
  const mT = logT.reduce((s, x, i) => s + w[i] * x, 0);
  const mP = logP.reduce((s, y, i) => s + w[i] * y, 0);
  const b = logT.reduce((s, x, i) => s + w[i] * (x - mT) * (logP[i] - mP), 0) /
            logT.reduce((s, x, i) => s + w[i] * (x - mT) ** 2, 0);
  const a = mP - b * mT;

  // Residuals from WLS (unweighted — for σ-band purposes)
  const residuals = pts.map(p => Math.log(p.price) - (a + b * Math.log(p.t)));
  const resMean = residuals.reduce((s, r) => s + r, 0) / n;
  const resStd = Math.sqrt(residuals.reduce((s, r) => s + (r - resMean) ** 2, 0) / n);

  // Weighted R²
  const ssTot = logP.reduce((s, y, i) => s + w[i] * (y - mP) ** 2, 0);
  const ssRes = logP.reduce((s, y, i) => s + w[i] * (y - (a + b * logT[i])) ** 2, 0);
  const r2 = 1 - ssRes / ssTot;

  // ── RANSAC (robust support line, Burger-style) ──
  let rA = a, rB = b;
  const ransacThreshold = 0.5;
  let bestInliers = 0;
  const seed = 42;
  let rng = seed;
  const nextRng = () => { rng = (rng * 1664525 + 1013904223) & 0x7fffffff; return rng / 0x7fffffff; };
  for (let iter = 0; iter < 200; iter++) {
    const i1 = Math.floor(nextRng() * n);
    const i2 = Math.floor(nextRng() * n);
    if (i1 === i2 || Math.abs(logT[i1] - logT[i2]) < 0.01) continue;
    const bTry = (logP[i2] - logP[i1]) / (logT[i2] - logT[i1]);
    const aTry = logP[i1] - bTry * logT[i1];
    if (bTry < 3 || bTry > 8) continue;
    const inliers = [];
    for (let j = 0; j < n; j++) {
      if (Math.abs(logP[j] - (aTry + bTry * logT[j])) < ransacThreshold) inliers.push(j);
    }
    if (inliers.length > bestInliers) {
      bestInliers = inliers.length;
      const mTi = inliers.reduce((s, j) => s + logT[j], 0) / inliers.length;
      const mPi = inliers.reduce((s, j) => s + logP[j], 0) / inliers.length;
      const num = inliers.reduce((s, j) => s + (logT[j] - mTi) * (logP[j] - mPi), 0);
      const den = inliers.reduce((s, j) => s + (logT[j] - mTi) ** 2, 0);
      if (den > 0) { rB = num / den; rA = mPi - rB * mTi; }
    }
  }

  // RANSAC support floor
  const liquidStart = daysSinceGenesis("2013-04-01");
  const ransacResiduals = pts.filter(p => p.t > liquidStart).map(p => Math.log(p.price) - (rA + rB * Math.log(p.t)));
  const ransacFloor = ransacResiduals.length > 100 ? Math.min(...ransacResiduals) : -0.5;

  // resFloor: RANSAC support converted to WLS-compatible offset at today's point.
  // This keeps resFloor calibrated by RANSAC while being usable as a parallel offset.
  const tToday = pts[pts.length - 1].t;
  const supportPriceToday = Math.exp(rA + rB * Math.log(tToday) + ransacFloor);
  const wlsPriceToday = Math.exp(a + b * Math.log(tToday));
  const resFloor = Math.log(supportPriceToday) - Math.log(wlsPriceToday);

  const resFloorSigma = ((resFloor - resMean) / resStd);

  const supportPriceFn = t => Math.exp(rA + rB * Math.log(t) + ransacFloor);

  return { a, b, residuals, resMean, resStd, resFloor, resFloorSigma, r2, pts, ransacResiduals, ransac: { a: rA, b: rB, floor: ransacFloor }, supportPriceFn };
}
