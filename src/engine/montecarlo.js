// ── Monte Carlo simulation — MMAR paths + percentiles ──
import { plPrice } from "./powerlaw.js";
import { generateCascade } from "./fractal.js";

export function simulatePathsPL(nPaths, nDays, H, lambda2, resStd, resMean, a, b, t0, ouRegimes, currentResidual, resReturns, resFloor, capUp, floorBreakProb = 0.03) {
  const empN = resReturns.length;
  let empVar = 0; for (let i = 0; i < empN; i++) empVar += resReturns[i] * resReturns[i];
  const empStd = Math.sqrt(empVar / empN) || 1;
  const capDn = resFloor;
  const rho = Math.pow(2, 2 * H - 1) - 1;
  const rhoClamp = Math.max(-0.5, Math.min(rho, 0.8));
  const mixAlpha = rhoClamp;
  const mixBeta = Math.sqrt(Math.max(0, 1 - rhoClamp * rhoClamp));

  const { regimes, transition, currentRegime } = ouRegimes;
  const nRegimes = regimes.length;

  const paths = [];
  let floorBreakCount = 0;

  for (let p = 0; p < nPaths; p++) {
    const tt = generateCascade(nDays, lambda2);

    // Bias correction for volScale: E[sqrt(dTheta)] > 1 by convexity of sqrt
    let sqrtSum = 0;
    for (let t = 1; t <= nDays; t++) {
      const dT = Math.max(tt[t] - tt[t-1], 1e-10) * nDays;
      sqrtSum += Math.sqrt(dT);
    }
    const sqrtMean = sqrtSum / nDays || 1;

    const prices = new Float64Array(nDays + 1);
    prices[0] = plPrice(a, b, t0) * Math.exp(currentResidual);
    let X = currentResidual, prevNorm = 0;
    let reg = currentRegime;
    let brokeFloor = false;

    for (let t = 1; t <= nDays; t++) {
      // Regime switch (Markov)
      if (nRegimes > 1) {
        const r = Math.random();
        reg = r < transition[reg][0] ? 0 : 1;
      }

      const volMult = regimes[reg].volScale;
      const baseStd = empStd * volMult;

      const plNow = plPrice(a, b, t0 + t);
      const dTheta = Math.max(tt[t] - tt[t - 1], 1e-10) * nDays;
      const volScale = Math.min(Math.max(Math.sqrt(dTheta) / sqrtMean, 0.1), 2.0);
      const rawShock = resReturns[Math.floor(Math.random() * empN)];
      const normShock = rawShock / empStd;
      const correlatedNorm = mixAlpha * prevNorm + mixBeta * normShock;
      prevNorm = correlatedNorm;
      const shock = correlatedNorm * baseStd * volScale;

      // Option B: MMAR/Hurst only — no OU mean-reversion force
      X = X + shock;

      // Reflecting barrier with empirically calibrated break probability
      if (X < capDn) {
        if (Math.random() < floorBreakProb && !brokeFloor) {
          brokeFloor = true;
        } else {
          X = capDn + (capDn - X) * 0.5;
        }
      }
      X = Math.min(capUp, X);
      prices[t] = plNow * Math.exp(X);
    }
    if (brokeFloor) floorBreakCount++;
    paths.push(prices);
  }

  paths.floorBreakPct = (floorBreakCount / nPaths) * 100;
  return paths;
}

export function computePercentiles(paths, nDays) {
  const step = 5, result = [];
  for (let t = 0; t <= nDays; t += step) {
    const vals = paths.map(p => p[t]).sort((a, b) => a - b);
    const n = vals.length;
    result.push({ t, p5: vals[Math.floor(n * 0.05)], p25: vals[Math.floor(n * 0.25)], p50: vals[Math.floor(n * 0.50)], p75: vals[Math.floor(n * 0.75)], p95: vals[Math.floor(n * 0.95)] });
  }
  return result;
}
