// ── Fractal dynamics — DFA Hurst, partition function, λ², cascade ──
import { randn } from "./constants.js";

export function hurstDFA(returns) {
  const n = returns.length;

  // Step 1: Cumulative profile (integrated demeaned series)
  const mean = returns.reduce((a, b) => a + b, 0) / n;
  const profile = new Float64Array(n);
  profile[0] = returns[0] - mean;
  for (let i = 1; i < n; i++) profile[i] = profile[i - 1] + (returns[i] - mean);

  // Step 2: Window sizes (log-spaced from 10 to n/4)
  const scales = [];
  for (let s = 10; s <= Math.floor(n / 4); s = Math.max(s + 1, Math.floor(s * 1.5))) scales.push(s);

  const logS = [], logF = [];

  for (const s of scales) {
    const nSegs = Math.floor(n / s);
    if (nSegs < 2) continue;

    let totalVar = 0;
    let segCount = 0;

    // Forward segments
    for (let seg = 0; seg < nSegs; seg++) {
      const start = seg * s;
      let sx = 0, sy = 0, sxx = 0, sxy = 0;
      for (let i = 0; i < s; i++) {
        sx += i; sy += profile[start + i];
        sxx += i * i; sxy += i * profile[start + i];
      }
      const det = s * sxx - sx * sx;
      if (Math.abs(det) < 1e-20) continue;
      const slope = (s * sxy - sx * sy) / det;
      const intercept = (sy - slope * sx) / s;
      let rms = 0;
      for (let i = 0; i < s; i++) {
        const trend = intercept + slope * i;
        const diff = profile[start + i] - trend;
        rms += diff * diff;
      }
      totalVar += rms / s;
      segCount++;
    }

    // Backward segments
    for (let seg = 0; seg < nSegs; seg++) {
      const start = n - (seg + 1) * s;
      if (start < 0) break;
      let sx = 0, sy = 0, sxx = 0, sxy = 0;
      for (let i = 0; i < s; i++) {
        sx += i; sy += profile[start + i];
        sxx += i * i; sxy += i * profile[start + i];
      }
      const det = s * sxx - sx * sx;
      if (Math.abs(det) < 1e-20) continue;
      const slope = (s * sxy - sx * sy) / det;
      const intercept = (sy - slope * sx) / s;
      let rms = 0;
      for (let i = 0; i < s; i++) {
        const trend = intercept + slope * i;
        const diff = profile[start + i] - trend;
        rms += diff * diff;
      }
      totalVar += rms / s;
      segCount++;
    }

    if (segCount > 0) {
      const F = Math.sqrt(totalVar / segCount);
      if (F > 0 && isFinite(F)) {
        logS.push(Math.log(s));
        logF.push(Math.log(F));
      }
    }
  }

  // Step 3: Linear fit log(F) vs log(s) — slope = α ≈ H
  const nx = logS.length;
  if (nx < 3) return { H: 0.6, points: [] };

  const mx = logS.reduce((a, b) => a + b, 0) / nx;
  const my = logF.reduce((a, b) => a + b, 0) / nx;
  const num = logS.reduce((s, x, i) => s + (x - mx) * (logF[i] - my), 0);
  const den = logS.reduce((s, x) => s + (x - mx) ** 2, 0);
  const alpha = den > 0 ? num / den : 0.6;

  return {
    H: Math.max(0.45, Math.min(alpha, 0.92)),
    points: logS.map((ls, i) => ({ logScale: +ls.toFixed(3), logF: +logF[i].toFixed(3) }))
  };
}

export function partitionFunction(returns) {
  const abs = returns.map(r => Math.abs(r) + 1e-12);
  const n = abs.length;
  const qs = [-2, -1, 1, 2, 3, 4, 5];
  const scales = [8, 16, 32, 64, 128];
  const result = [];
  for (const q of qs) {
    const pts = [];
    for (const sc of scales) {
      if (sc * 3 > n) continue;
      let Z = 0, cnt = 0;
      for (let i = 0; i + sc <= n; i += sc) {
        let s = 0; for (let j = i; j < i + sc; j++) s += abs[j];
        if (s > 0) { Z += Math.pow(s, q); cnt++; }
      }
      if (cnt > 0 && isFinite(Z) && Z > 0) pts.push([Math.log(sc), Math.log(Z / cnt)]);
    }
    if (pts.length >= 3) {
      const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      const slope = pts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0) / pts.reduce((s, p) => s + (p[0] - mx) ** 2, 0);
      if (isFinite(slope)) result.push({ q, tau: +slope.toFixed(4) });
    }
  }
  return result;
}

export function fitLambda2(tauData) {
  // Fit τ(q) = α·q + β·q² via OLS. λ² = -2β.
  // Normal equations: [Σq² Σq³; Σq³ Σq⁴] · [α; β] = [Σ(τq); Σ(τq²)]
  const pts = tauData.filter(t => t.q > 0 && t.q <= 4);
  if (pts.length < 3) return 0.08;
  let sQ2 = 0, sQ3 = 0, sQ4 = 0, sTQ = 0, sTQ2 = 0;
  pts.forEach(({ q, tau }) => { sQ2 += q * q; sQ3 += q ** 3; sQ4 += q ** 4; sTQ += tau * q; sTQ2 += tau * q * q; });
  const det = sQ2 * sQ4 - sQ3 * sQ3;
  if (Math.abs(det) < 1e-10) return 0.08;
  const beta = (sQ2 * sTQ2 - sQ3 * sTQ) / det;
  return Math.max(0.02, Math.min(-2 * beta, 0.45));
}

export function generateCascade(nSteps, lambda2) {
  const levels = 10, size = 1 << levels;
  const m = new Float64Array(size).fill(1.0);
  const sigma = Math.sqrt(lambda2 * Math.LN2);
  for (let lv = 0; lv < levels; lv++) {
    const blocks = 1 << lv, bsz = size / blocks;
    for (let b = 0; b < blocks; b++) {
      const mult = Math.exp(sigma * randn() - sigma * sigma / 2);
      for (let i = b * bsz; i < (b + 1) * bsz; i++) m[i] *= mult;
    }
  }
  let total = 0; for (let i = 0; i < size; i++) total += m[i];
  const tt = new Float64Array(nSteps + 1); let cum = 0;
  for (let t = 0; t <= nSteps; t++) { tt[t] = cum; const idx = Math.min(Math.floor((t / nSteps) * size), size - 1); cum += m[idx] / total; }
  tt[nSteps] = 1.0;
  return tt;
}
