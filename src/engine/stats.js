// ── Statistical helpers — zero external deps ──

export function normInv(p) {
  const a = [2.50662823884, -18.61500062529, 41.39119773534, -25.44106049637];
  const b = [-8.47351093090, 23.08336743743, -21.06224101826, 3.13082909833];
  const c = [0.3374754822726147, 0.9761690190917186, 0.1607979714918209, 0.0276438810333863, 0.0038405729373609, 0.0003951896511349, 0.0000321767881768, 0.0000002888167364, 0.0000003960315187];
  const u = p - 0.5;
  if (Math.abs(u) <= 0.42) { const r = u * u; return u * (((a[3] * r + a[2]) * r + a[1]) * r + a[0]) / ((((b[3] * r + b[2]) * r + b[1]) * r + b[0]) * r + 1); }
  const r0 = u > 0 ? Math.log(-Math.log(1 - p)) : Math.log(-Math.log(p));
  let r = c[0] + r0 * (c[1] + r0 * (c[2] + r0 * (c[3] + r0 * (c[4] + r0 * (c[5] + r0 * (c[6] + r0 * (c[7] + r0 * c[8])))))));
  return u < 0 ? -r : r;
}

export function normCDF(z) {
  const t = 1 / (1 + 0.2315419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))));
  return z > 0 ? 1 - p : p;
}

// ── Augmented Dickey-Fuller test (ADF) ──
// Verifica si los residuos son estacionarios (supuesto fundamental del modelo).
// H0: raíz unitaria (no estacionario). Si tStat < cv5, rechazamos H0 → estacionario.
export function adfTest(series) {
  const n = series.length;
  if (n < 20) return { statistic: null, pValue: null, isStationary: null };
  const dy = [], y_lag = [], dy_lag = [];
  for (let i = 1; i < n; i++) { dy.push(series[i] - series[i-1]); y_lag.push(series[i-1]); }
  for (let i = 1; i < dy.length; i++) dy_lag.push(dy[i-1]);
  const m = dy_lag.length;
  if (m < 10) return { statistic: null, pValue: null, isStationary: null };
  const mDY = dy.slice(1).reduce((s,x)=>s+x,0)/m;
  const mDL = dy_lag.reduce((s,x)=>s+x,0)/m;
  const gamma = dy_lag.reduce((s,x,i)=>s+(x-mDL)*(dy[i+1]-mDY),0) /
                Math.max(dy_lag.reduce((s,x)=>s+(x-mDL)**2,0), 1e-12);
  const dy_adj  = dy.slice(1).map((y,i) => y - gamma*dy_lag[i]);
  const ylg_adj = y_lag.slice(1);
  const mYA = dy_adj.reduce((s,x)=>s+x,0)/m;
  const mXA = ylg_adj.reduce((s,x)=>s+x,0)/m;
  const num = ylg_adj.reduce((s,x,i)=>s+(x-mXA)*(dy_adj[i]-mYA),0);
  const den = ylg_adj.reduce((s,x)=>s+(x-mXA)**2,0);
  if (Math.abs(den) < 1e-12) return { statistic: null, pValue: null, isStationary: null };
  const beta = num/den;
  const resid = dy_adj.map((y,i) => y - mYA - beta*(ylg_adj[i]-mXA));
  const s2 = resid.reduce((s,e)=>s+e*e,0) / Math.max(m-2,1);
  const se = Math.sqrt(s2 / Math.max(den,1e-12));
  if (se < 1e-12) return { statistic: null, pValue: null, isStationary: null };
  const tStat = beta/se;
  const cv5 = -2.89;
  const pValue = tStat < -3.51 ? 0.01 : tStat < cv5 ? 0.05 : tStat < -2.58 ? 0.10 : 0.15;
  return { statistic: +tStat.toFixed(3), pValue, isStationary: tStat < cv5, cv5 };
}

// ── EVT/GPD cap — replaces arbitrary +2.5σ ──
// Fits a Generalized Pareto Distribution over positive residuals above the threshold
// percentile, extracting the given quantile as empirical cap.
export function computeEVTcap(ransacResiduals, threshold = 0.85, quantile = 0.995) {
  const pos = ransacResiduals.filter(r => isFinite(r));
  if (pos.length < 20) return 3.0;
  const sorted = [...pos].sort((a, b) => a - b);
  const u = sorted[Math.floor(sorted.length * threshold)];
  const excesses = sorted.filter(r => r > u).map(r => r - u);
  if (excesses.length < 8) return Math.max(sorted[sorted.length - 1] * 1.1, 3.0);
  const n = excesses.length;
  const meanE = excesses.reduce((s, x) => s + x, 0) / n;
  const varE = excesses.reduce((s, x) => s + (x - meanE) ** 2, 0) / Math.max(n - 1, 1);
  const xi = 0.5 * (1 - (meanE * meanE) / varE);
  const beta = 0.5 * meanE * (1 + (meanE * meanE) / varE);
  const pExceed = (1 - quantile) * pos.length / n;
  let capRaw;
  if (Math.abs(xi) < 0.01) {
    capRaw = u + beta * (-Math.log(Math.max(pExceed, 1e-6)));
  } else {
    capRaw = u + (beta / xi) * (Math.pow(Math.max(pExceed, 1e-6), -xi) - 1);
  }
  const historicalMax = sorted[sorted.length - 1];
  return Math.max(historicalMax * 1.05, Math.min(capRaw, 5.0));
}
