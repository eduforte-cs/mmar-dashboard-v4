// ── Regime-switching OU + Hurst divergences ──

export function estimateKappa(residuals) {
  const n = residuals.length;
  let sXX = 0, sXY = 0, sX = 0, sY = 0;
  for (let i = 1; i < n; i++) { const x = residuals[i - 1], y = residuals[i]; sXX += x * x; sXY += x * y; sX += x; sY += y; }
  const m = n - 1;
  const phi = (m * sXY - sX * sY) / (m * sXX - sX * sX);
  const phiClamped = Math.max(0.90, Math.min(phi, 0.9995));
  return -Math.log(phiClamped);
}

export function estimateRegimeSwitchingOU(residuals, resReturns) {
  const n = resReturns.length;
  if (n < 60) {
    const k = estimateKappa(residuals);
    return {
      regimes: [{ kappa: k, volScale: 1.0, label: "single" }],
      transition: [[1]], currentRegime: 0,
      globalKappa: k, halfLife: Math.round(Math.log(2) / k),
    };
  }

  // Step 1: Classify each day into high-vol or low-vol regime
  const window = 30;
  const rollingVol = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0, cnt = 0;
    for (let j = Math.max(0, i - window + 1); j <= i; j++) { sum += Math.abs(resReturns[j]); cnt++; }
    rollingVol[i] = sum / cnt;
  }

  const sorted = Array.from(rollingVol).sort((a, b) => a - b);
  const medianVol = sorted[Math.floor(n / 2)];
  const regime = new Uint8Array(n);
  for (let i = 0; i < n; i++) regime[i] = rollingVol[i] > medianVol ? 1 : 0;

  // Step 2: Estimate kappa for each regime
  function kappaForRegime(regimeId) {
    let sXX = 0, sXY = 0, sX = 0, sY = 0, cnt = 0;
    for (let i = 1; i < n; i++) {
      if (regime[i] !== regimeId) continue;
      const x = residuals[i];
      const y = residuals[i + 1];
      if (y === undefined) continue;
      sXX += x * x; sXY += x * y; sX += x; sY += y; cnt++;
    }
    if (cnt < 20) return null;
    const phi = (cnt * sXY - sX * sY) / (cnt * sXX - sX * sX);
    const phiClamped = Math.max(0.85, Math.min(phi, 0.9998));
    return -Math.log(phiClamped);
  }

  const kCalm = kappaForRegime(0);
  const kVol = kappaForRegime(1);

  // Step 3: Volatility scale per regime
  let volCalm = 0, cntCalm = 0, volVol = 0, cntVol = 0;
  for (let i = 0; i < n; i++) {
    const v = resReturns[i] * resReturns[i];
    if (regime[i] === 0) { volCalm += v; cntCalm++; }
    else { volVol += v; cntVol++; }
  }
  const stdCalm = Math.sqrt(cntCalm > 0 ? volCalm / cntCalm : 1);
  const stdVol = Math.sqrt(cntVol > 0 ? volVol / cntVol : 1);
  const globalStd = Math.sqrt((volCalm + volVol) / n);
  const scaleCalm = globalStd > 0 ? stdCalm / globalStd : 0.7;
  const scaleVol = globalStd > 0 ? stdVol / globalStd : 1.4;

  // Step 4: Transition matrix
  let t00 = 0, t01 = 0, t10 = 0, t11 = 0;
  for (let i = 1; i < n; i++) {
    if (regime[i - 1] === 0 && regime[i] === 0) t00++;
    else if (regime[i - 1] === 0 && regime[i] === 1) t01++;
    else if (regime[i - 1] === 1 && regime[i] === 0) t10++;
    else t11++;
  }
  const s0 = t00 + t01 || 1;
  const s1 = t10 + t11 || 1;
  const transition = [
    [t00 / s0, t01 / s0],
    [t10 / s1, t11 / s1],
  ];

  // Current regime (last 20 days majority)
  let recent0 = 0, recent1 = 0;
  for (let i = Math.max(0, n - 20); i < n; i++) {
    if (regime[i] === 0) recent0++; else recent1++;
  }
  const currentRegime = recent1 > recent0 ? 1 : 0;

  const regimes = [
    { kappa: kCalm || 0.002, volScale: scaleCalm, label: "calm" },
    { kappa: kVol || 0.0005, volScale: scaleVol, label: "volatile" },
  ];

  const pCalm = cntCalm / n;
  const globalKappa = pCalm * regimes[0].kappa + (1 - pCalm) * regimes[1].kappa;

  return {
    regimes, transition, currentRegime,
    globalKappa, halfLife: Math.round(Math.log(2) / globalKappa),
    halfLifeCalm: Math.round(Math.log(2) / regimes[0].kappa),
    halfLifeVol: Math.round(Math.log(2) / regimes[1].kappa),
    pCalm: +(pCalm * 100).toFixed(0),
  };
}

// ── Hurst divergence index — sell signal ──
// Measures three divergences between fractal momentum and price/volatility.
// Each active divergence = 1 point (0-3). Only relevant when σ > threshold.
export function computeHurstDivergences(rollingHurst, sigmaFromPL, lookback = 6, thresholds = {}) {
  const n = rollingHurst.length;
  if (n < lookback + 2) return { score: 0, d1: false, d2: false, d3: false, detail: {} };

  const cur  = rollingHurst[n - 1];
  const prev = rollingHurst[n - 1 - lookback];

  if (!cur || !prev) return { score: 0, d1: false, d2: false, d3: false, detail: {} };

  const h90cur  = cur.h90  || cur.H  || 0.5;
  const h90prev = prev.h90 || prev.H || 0.5;
  const h30cur  = cur.h30  || cur.H  || 0.5;
  const sigmaCur  = cur.sigma  ?? sigmaFromPL;
  const sigmaPrev = prev.sigma ?? sigmaFromPL;

  const sdT  = thresholds.sigmaDelta ?? 0.10;
  const hdT  = thresholds.hDelta    ?? -0.03;
  const vrT  = thresholds.volRatio  ?? 1.15;

  // D1: σ sube pero H90 baja
  const d1 = (sigmaCur - sigmaPrev) > sdT && (h90cur - h90prev) < hdT;
  // D2: H30 cae por debajo de H90
  const d2 = (h30cur - h90cur) < hdT && h90cur > 0.55;
  // D3: H90 baja mientras vol ratio sube
  const volRatioCur  = cur.volRatio  || 1;
  const volRatioPrev = prev.volRatio || 1;
  const d3 = (h90cur - h90prev) < hdT && volRatioCur > vrT && volRatioCur > volRatioPrev;

  const score = [d1, d2, d3].filter(Boolean).length;

  return {
    score,
    d1, d2, d3,
    detail: {
      h90: +h90cur.toFixed(3),
      h90prev: +h90prev.toFixed(3),
      h30: +h30cur.toFixed(3),
      volRatio: +volRatioCur.toFixed(2),
      sigmaDelta: +(sigmaCur - sigmaPrev).toFixed(2),
    },
  };
}
