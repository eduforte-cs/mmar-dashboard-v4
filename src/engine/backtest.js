// ── Walk-forward backtest — calibrates buy/sell thresholds against history ──
import { daysSinceGenesis } from "./constants.js";
import { plPrice } from "./powerlaw.js";
import { hurstDFA } from "./fractal.js";
import { simulatePathsPL, computePercentiles } from "./montecarlo.js";

export function runWalkForwardBacktest(prices, a, b, resMean, resStd, resFloor, evtCap, floorBreakProb, ouRegimes) {
  const results = [];
  const horizon = 365;
  const minTrainDays = 365 * 3;

  // Helper: interpola probabilidad en percentiles MC
  function probAbove(pcts, targetPrice) {
    const row = pcts[pcts.length - 1];
    if (!row) return 50;
    const pts = [{price:row.p5,prob:5},{price:row.p25,prob:25},{price:row.p50,prob:50},{price:row.p75,prob:75},{price:row.p95,prob:95}];
    if (targetPrice <= pts[0].price) return 97.5;
    if (targetPrice >= pts[4].price) return 2.5;
    for (let k = 0; k < pts.length - 1; k++) {
      if (targetPrice >= pts[k].price && targetPrice <= pts[k+1].price) {
        const t = (targetPrice - pts[k].price) / (pts[k+1].price - pts[k].price);
        return 100 - (pts[k].prob + t * (pts[k+1].prob - pts[k].prob));
      }
    }
    return 50;
  }

  for (let i = minTrainDays; i < prices.length - horizon; i += 30) {
    const p = prices[i];
    const t0 = daysSinceGenesis(p.date);
    if (t0 <= 0 || p.price <= 0) continue;

    const plNow = plPrice(a, b, t0);
    const residual = Math.log(p.price) - Math.log(plNow);
    const sig = (residual - resMean) / resStd;

    const futurePrice = prices[i + horizon]?.price;
    if (!futurePrice) continue;
    const realReturn = (futurePrice - p.price) / p.price * 100;
    const isGoodBuy = realReturn > 0; // "good buy" = no perder dinero (base conservadora)

    const resReturnsSlice = [];
    for (let j = Math.max(1, i - 365); j < i; j++) {
      const r0 = Math.log(prices[j-1].price) - Math.log(plPrice(a, b, daysSinceGenesis(prices[j-1].date)));
      const r1 = Math.log(prices[j].price) - Math.log(plPrice(a, b, daysSinceGenesis(prices[j].date)));
      resReturnsSlice.push(r1 - r0);
    }
    if (resReturnsSlice.length < 30) continue;

    const H = 0.65;
    const lambda2 = 0.12;
    const paths = simulatePathsPL(200, horizon, H, lambda2, resStd, resMean, a, b, t0, ouRegimes, residual, resReturnsSlice, resFloor, evtCap, floorBreakProb);
    const pcts = computePercentiles(paths, horizon);

    // P(pérdida en 12m) — fracción de paths bajo el precio de entrada
    const pLoss1y = Math.max(0, Math.min(100, 100 - probAbove(pcts, p.price)));

    // P(llega al fair value en 12m) — fair value en t0+365
    const fv1y = plPrice(a, b, t0 + horizon);
    const pFV = Math.max(0, Math.min(100, probAbove(pcts, fv1y)));

    // Régimen en ese punto histórico: calm si rolling vol < mediana, volatile si no
    const recentVols = resReturnsSlice.slice(-30).map(r => Math.abs(r));
    const medVol = [...resReturnsSlice.map(r => Math.abs(r))].sort((a,b) => a-b)[Math.floor(resReturnsSlice.length/2)];
    const avgRecentVol = recentVols.reduce((s,x) => s+x, 0) / Math.max(recentVols.length, 1);
    const regime = avgRecentVol > medVol ? "volatile" : "calm";

    results.push({
      date: p.date,
      sig: +sig.toFixed(2),
      pLoss1y: +pLoss1y.toFixed(1),
      pFV: +pFV.toFixed(1),
      pFloor: +(paths.floorBreakPct || 0).toFixed(2), // P(toca floor) del MC
      realReturn: +realReturn.toFixed(1),
      isGoodBuy,
      regime,
    });
  }

  if (results.length === 0) return {
    thresholds: { sig: -0.5, pLoss1y: 20, pFV: 40 },
    weights: null,
    precision: null, recall: null, nYes: 0, nNo: 0,
    avgReturnYes: null, avgReturnNo: null, results: [],
    regimeEffect: null,
  };

  // ── Grid search de pesos continuos (reemplaza thresholds binarios) ──
  // En lugar de 4 condiciones que se cumplen o no, buscamos la combinación lineal
  // de las 4 métricas que mejor predice retornos positivos a 12 meses.
  //
  // score = w1*(-sig) + w2*(maxLoss - pLoss1y) + w3*(pFV - minFV) + w4*(maxFloor - pFloor)
  // YES si score > 0
  //
  // Todos los candidatos están normalizados para que los pesos sean comparables.
  // El grid search calibra los pesos contra retornos históricos reales.

  const w1Candidates = [0, 0.5, 1, 2, 3];     // peso de (-sig): descuento
  const w2Candidates = [0, 0.5, 1, 2, 3];     // peso de (maxLoss - pLoss): seguridad MC
  const w3Candidates = [0, 0.5, 1, 2, 3];     // peso de (pFV - minFV): upside MC
  const w4Candidates = [0, 0.5, 1];           // peso de (maxFloor - pFloor): floor safety

  // Normalización: centrar cada variable en su rango típico
  const sigMean   = results.reduce((s,r) => s + r.sig, 0) / results.length;
  const lossMean  = results.reduce((s,r) => s + r.pLoss1y, 0) / results.length;
  const fvMean    = results.reduce((s,r) => s + r.pFV, 0) / results.length;
  const floorMean = results.reduce((s,r) => s + r.pFloor, 0) / results.length;

  // Feature normalizada por punto: contribución de cada variable al score
  const feat = results.map(r => ({
    f1: -(r.sig - sigMean),           // más negativo = mejor (descuento)
    f2: lossMean - r.pLoss1y,         // más negativo pLoss = mejor
    f3: r.pFV - fvMean,               // más alto pFV = mejor
    f4: floorMean - r.pFloor,         // más bajo pFloor = mejor
  }));

  let bestF1score = -1;
  let bestWeights = { w1: 1, w2: 2, w3: 1, w4: 1 };
  let bestThresholds = { sig: -0.5, pLoss1y: 20, pFV: 40 }; // fallback para compatibilidad UI

  for (const w1 of w1Candidates) {
    for (const w2 of w2Candidates) {
      for (const w3 of w3Candidates) {
        for (const w4 of w4Candidates) {
          if (w1 + w2 + w3 + w4 === 0) continue;
          const scores = feat.map(f => w1*f.f1 + w2*f.f2 + w3*f.f3 + w4*f.f4);
          const yesIdx = results.filter((_, i) => scores[i] > 0);
          if (yesIdx.length < 5) continue;
          const tp = yesIdx.filter(r => r.isGoodBuy).length;
          const allPos = results.filter(r => r.isGoodBuy).length;
          const prec = tp / yesIdx.length;
          const rec  = allPos > 0 ? tp / allPos : 0;
          const f1score = prec + rec > 0 ? 2 * prec * rec / (prec + rec) : 0;
          if (f1score > bestF1score) {
            bestF1score = f1score;
            bestWeights = { w1, w2, w3, w4 };
            // Para compatibilidad con la UI existente, derivar thresholds equivalentes
            // del percentil de score que separa YES de NO
            const yesScores = scores.filter(s => s > 0);
            if (yesScores.length > 0) {
              const yesR = results.filter((_, i) => scores[i] > 0);
              bestThresholds = {
                sig: +(yesR.reduce((s,r) => s + r.sig, 0) / yesR.length).toFixed(2),
                pLoss1y: +(yesR.reduce((s,r) => s + r.pLoss1y, 0) / yesR.length).toFixed(1),
                pFV: +(yesR.reduce((s,r) => s + r.pFV, 0) / yesR.length).toFixed(1),
              };
            }
          }
        }
      }
    }
  }

  // Función de decisión calibrada: YES si score > 0
  const scoreOf = (sig, pLoss1y, pFV, pFloor) => {
    const f1 = -(sig - sigMean);
    const f2 = lossMean - pLoss1y;
    const f3 = pFV - fvMean;
    const f4 = floorMean - pFloor;
    return bestWeights.w1*f1 + bestWeights.w2*f2 + bestWeights.w3*f3 + bestWeights.w4*f4;
  };

  // Umbral de Strong Buy: score en el percentil 75 de los YES históricos
  const allScores  = results.map(r => scoreOf(r.sig, r.pLoss1y, r.pFV, r.pFloor));
  const isYes      = (r, i) => allScores[i] > 0;
  const yesScores  = allScores.filter(s => s > 0).sort((a,b) => a-b);
  const strongThresh = yesScores.length > 0
    ? yesScores[Math.floor(yesScores.length * 0.60)] // top 40% de YES = Strong Buy
    : 1;

  // Clasificación por nivel — primer pass con defaults (se actualiza después)
  const isStrongBuy = (r, i) => allScores[i] >= strongThresh;

  const levelOf = (r, i, bubbleSig = 1.0, reduceSig = 0.5) => {
    if (r.sig > bubbleSig)  return "sell";
    if (r.sig > reduceSig)  return "reduce";

    // Override estructural: la tabla de calibración muestra 0% de loss rate
    // para σ < -0.5. El modelo debe disparar siempre en descuento estructural,
    // independientemente de lo que diga el MC (que en bear markets proyecta
    // caídas adicionales por H=0.65, subestimando el valor del descuento).
    if (r.sig < -1.0) return "strongBuy"; // descuento profundo — históricamente 0% pérdida
    if (r.sig < -0.5) return "buy";       // descuento estructural — históricamente 0% pérdida

    // Zona neutral: usar el score continuo calibrado
    if (isYes(r, i)) {
      if (isStrongBuy(r, i)) return "strongBuy";
      return "buy";
    }
    return "no";
  };

  results.forEach((r, i) => { r.level = levelOf(r, i); }); // primer pass con defaults

  const avgReturn = arr => arr.length > 0
    ? +(arr.reduce((s,r) => s + r.realReturn, 0) / arr.length).toFixed(1)
    : null;
  const precisionFn = arr => arr.length > 0
    ? +(arr.filter(r => r.isGoodBuy).length / arr.length * 100).toFixed(1)
    : null;

  // regimeEffect, holdBuckets y byLevel se calculan después del segundo pass (post-calibración)

  // ── Calibración de la señal PL bubble (σ solo, sin Hurst) ──
  // Busca el σ mínimo que, por sí solo, predice correcciones > 20% en 6 meses.
  const horizonSell = 182; // 6 meses
  const allSellResults = [];
  for (let i = minTrainDays; i < prices.length - horizonSell; i += 30) {
    const p = prices[i];
    const t0loc = daysSinceGenesis(p.date);
    if (t0loc <= 0) continue;
    const plLoc = plPrice(a, b, t0loc);
    const resLoc = Math.log(p.price) - Math.log(plLoc);
    const sigLoc = (resLoc - resMean) / resStd;
    const futureP = prices[i + horizonSell]?.price;
    if (!futureP) continue;
    const ret6m = (futureP - p.price) / p.price * 100;
    allSellResults.push({ date: p.date, sig: +sigLoc.toFixed(2), ret6m: +ret6m.toFixed(1) });
  }

  // ── Percentiles empíricos de correcciones históricas ──
  // Usamos solo los retornos NEGATIVOS para calibrar umbrales de corrección.
  // P25 de retornos negativos = una caída que ocurre en el 25% de los peores casos.
  // P50 de retornos negativos = la corrección mediana entre los que sí corrigieron.
  const overheatedReturns = allSellResults.map(r => r.ret6m).sort((a, b) => a - b);
  const negativeReturns   = overheatedReturns.filter(r => r < 0);
  const pctile = (arr, p) => arr.length > 0 ? arr[Math.floor(arr.length * p)] : null;

  // P25 sobre todos los retornos (incluye positivos) — primer cuartil
  const corrP25 = overheatedReturns.length >= 4
    ? +pctile(overheatedReturns, 0.25).toFixed(1)
    : -20;
  // P50 sobre retornos negativos — corrección mediana entre quienes sí perdieron
  const corrP50 = negativeReturns.length >= 4
    ? +pctile(negativeReturns, 0.50).toFixed(1)
    : -35;
  // P75 de retornos negativos — corrección severa (peor cuarto)
  const corrP75 = negativeReturns.length >= 4
    ? +pctile(negativeReturns, 0.75).toFixed(1)
    : -50;

  // Actualizar isGoodSell con umbral dinámico P25 (en lugar del -20% fijo)
  allSellResults.forEach(r => {
    r.isGoodSell       = r.ret6m < corrP25;  // caída mayor al P25 — corrección significativa
    r.isAnyLoss        = r.ret6m < 0;         // cualquier pérdida — dirección correcta
    r.isSevereSell     = r.ret6m < corrP50;   // peor que la mediana
  });

  const sigBubbleCandidates = [0.5, 0.7, 0.8, 1.0, 1.2, 1.5, 1.8, 2.0, 2.2];

  // Grid search: calibrar DOS umbrales de σ separados
  // sigReduceThr = primer punto donde corrección > 30% del tiempo → Reduce
  // sigSellThr   = primer punto donde retorno medio < 0 Y corrección > 50% → Sell
  let calibratedBubbleSig = 1.0;  // Sell (default)
  let calibratedReduceSig = 0.5;  // Reduce (default)

  if (allSellResults.length >= 10) {
    // Construir perfil por σ candidato
    const profiles = sigBubbleCandidates.map(sigT => {
      const pts = allSellResults.filter(r => r.sig > sigT);
      if (pts.length < 3) return null;
      const n = pts.length;
      const nFell = pts.filter(r => r.isGoodSell).length;
      const pct20 = nFell / n;
      const avgRet = pts.reduce((s, r) => s + r.ret6m, 0) / n;
      return { sigT, n, pct20, avgRet };
    }).filter(Boolean);

    // sigReduceThr: primer σ donde pct20 > 35% (corrección común pero no mayoritaria)
    const reduceCandidate = profiles.find(p => p.pct20 > 0.35);
    if (reduceCandidate) calibratedReduceSig = reduceCandidate.sigT;

    // sigSellThr: primer σ donde retorno medio < 0 Y pct20 > 50%
    const sellCandidate = profiles.find(p => p.avgRet < 0 && p.pct20 > 0.50);
    if (sellCandidate) calibratedBubbleSig = sellCandidate.sigT;
    else {
      // Fallback: primer σ donde pct20 > 50% aunque retorno sea positivo
      const fallback = profiles.find(p => p.pct20 > 0.50);
      if (fallback) calibratedBubbleSig = fallback.sigT;
    }

    // Asegurar que Sell > Reduce siempre
    if (calibratedBubbleSig <= calibratedReduceSig) {
      calibratedBubbleSig = Math.min(calibratedReduceSig + 0.3, 2.0);
    }
  }

  // ── Segundo pass de clasificación con umbrales calibrados ──
  results.forEach((r, i) => { r.level = levelOf(r, i, calibratedBubbleSig, calibratedReduceSig); });

  // Grupos basados en la clasificación final (post-calibración)
  const strongBuyResults = results.filter(r => r.level === "strongBuy");
  const buyResults       = results.filter(r => r.level === "buy");
  const yesResults       = results.filter(r => r.level === "strongBuy" || r.level === "buy");
  const noResults        = results.filter(r => r.level === "no");
  const truePositives    = yesResults.filter(r => r.isGoodBuy).length;
  const allPositives     = results.filter(r => r.isGoodBuy).length;

  // Segmentación por régimen
  const yesCalm     = yesResults.filter(r => r.regime === "calm");
  const yesVolatile = yesResults.filter(r => r.regime === "volatile");
  const allCalm     = results.filter(r => r.regime === "calm");
  const allVolatile = results.filter(r => r.regime === "volatile");

  const regimeEffect = {
    calm:     { n: allCalm.length,     nYes: yesCalm.length,     avgReturn: avgReturn(yesCalm),     precisionYes: precisionFn(yesCalm) },
    volatile: { n: allVolatile.length, nYes: yesVolatile.length, avgReturn: avgReturn(yesVolatile), precisionYes: precisionFn(yesVolatile) },
    delta: yesCalm.length >= 3 && yesVolatile.length >= 3
      ? +((avgReturn(yesCalm) || 0) - (avgReturn(yesVolatile) || 0)).toFixed(1)
      : null,
  };

  // Hold subdividido
  const noDiscount = noResults.filter(r => r.sig < 0);
  const noPremium  = noResults.filter(r => r.sig >= 0);

  const holdBuckets = [
    { label: "σ < 0",     pts: noResults.filter(r => r.sig < 0)                    },
    { label: "0 – 0.3",   pts: noResults.filter(r => r.sig >= 0   && r.sig < 0.3)  },
    { label: "0.3 – 0.5", pts: noResults.filter(r => r.sig >= 0.3 && r.sig < 0.5)  },
    { label: "0.5 – 0.8", pts: noResults.filter(r => r.sig >= 0.5 && r.sig < 0.8)  },
    { label: "0.8+",      pts: noResults.filter(r => r.sig >= 0.8)                  },
  ].map(b => ({
    label: b.label,
    n: b.pts.length,
    avgReturn: avgReturn(b.pts),
    minReturn: b.pts.length > 0 ? +Math.min(...b.pts.map(r => r.realReturn)).toFixed(1) : null,
    precision: precisionFn(b.pts),
    nBad: b.pts.filter(r => r.realReturn < -30).length,
  }));

  const byLevel = {
    strongBuy: {
      n:         strongBuyResults.length,
      precision: precisionFn(strongBuyResults),
      avgReturn: avgReturn(strongBuyResults),
      minReturn: strongBuyResults.length > 0 ? +Math.min(...strongBuyResults.map(r => r.realReturn)).toFixed(1) : null,
    },
    buy: {
      n:         buyResults.length,
      precision: precisionFn(buyResults),
      avgReturn: avgReturn(buyResults),
      minReturn: buyResults.length > 0 ? +Math.min(...buyResults.map(r => r.realReturn)).toFixed(1) : null,
    },
    no: {
      n:         noResults.length,
      precision: precisionFn(noResults),
      avgReturn: avgReturn(noResults),
      minReturn: noResults.length > 0 ? +Math.min(...noResults.map(r => r.realReturn)).toFixed(1) : null,
    },
    holdDiscount: {
      n:         noDiscount.length,
      precision: precisionFn(noDiscount),
      avgReturn: avgReturn(noDiscount),
      minReturn: noDiscount.length > 0 ? +Math.min(...noDiscount.map(r => r.realReturn)).toFixed(1) : null,
    },
    holdPremium: {
      n:         noPremium.length,
      precision: precisionFn(noPremium),
      avgReturn: avgReturn(noPremium),
      minReturn: noPremium.length > 0 ? +Math.min(...noPremium.map(r => r.realReturn)).toFixed(1) : null,
    },
  };

  // Métricas PL bubble — con percentiles dinámicos
  const bubblePoints  = allSellResults.filter(r => r.sig > calibratedBubbleSig);
  const reducePoints  = allSellResults.filter(r => r.sig > calibratedReduceSig && r.sig <= calibratedBubbleSig);
  const avgRetFn  = arr => arr.length > 0 ? +(arr.reduce((s,r)=>s+r.ret6m,0)/arr.length).toFixed(1) : null;
  const pct20Fn   = arr => arr.length > 0 ? +(arr.filter(r=>r.isGoodSell).length/arr.length*100).toFixed(1) : null;
  const pctAnyFn  = arr => arr.length > 0 ? +(arr.filter(r=>r.isAnyLoss).length/arr.length*100).toFixed(1) : null;
  const pctSevFn  = arr => arr.length > 0 ? +(arr.filter(r=>r.isSevereSell).length/arr.length*100).toFixed(1) : null;

  const mkPlRow = arr => ({
    n: arr.length,
    avgRet6m:    avgRetFn(arr),
    pct20:       pct20Fn(arr),
    pctAnyLoss:  pctAnyFn(arr),
    pctSevere:   pctSevFn(arr),
    maxDrawdown: arr.length > 0 ? +Math.min(...arr.map(r=>r.ret6m)).toFixed(1) : null,
  });

  const plBubbleMetrics = {
    sell:   { ...mkPlRow(bubblePoints),  sigThreshold: calibratedBubbleSig },
    reduce: { ...mkPlRow(reducePoints),  sigThreshold: calibratedReduceSig },
  };

  // ── Calibración de thresholds de divergencias Hurst por grid search ──
  // Variable dependiente: precio cae > 20% en los siguientes 6 meses
  const sellResults = [];

  // Candidatos para grid search de divergencias
  const sigmaDeltaCandidates = [0.05, 0.10, 0.15, 0.20];
  const hDeltaCandidates     = [-0.02, -0.03, -0.05];
  const volRatioCandidates   = [1.10, 1.15, 1.20, 1.25];

  // Computar datos de divergencia por punto histórico en sobrecompra
  for (let i = minTrainDays; i < prices.length - horizonSell; i += 30) {
    const p = prices[i];
    const t0loc = daysSinceGenesis(p.date);
    if (t0loc <= 0) continue;
    const plLoc = plPrice(a, b, t0loc);
    const resLoc = Math.log(p.price) - Math.log(plLoc);
    const sigLoc = (resLoc - resMean) / resStd;
    if (sigLoc <= 0.5) continue;

    const futureP = prices[i + horizonSell]?.price;
    if (!futureP) continue;
    const ret6m = (futureP - p.price) / p.price * 100;
    const isGoodSell = ret6m < -20;

    const sliceCur  = [];
    const slicePrev = [];
    for (let j = Math.max(1, i - 90); j < i; j++) {
      const r0 = Math.log(prices[j-1].price) - Math.log(plPrice(a, b, daysSinceGenesis(prices[j-1].date)));
      const r1 = Math.log(prices[j].price)   - Math.log(plPrice(a, b, daysSinceGenesis(prices[j].date)));
      sliceCur.push(r1 - r0);
    }
    for (let j = Math.max(1, i - 120); j < i - 30; j++) {
      const r0 = Math.log(prices[j-1].price) - Math.log(plPrice(a, b, daysSinceGenesis(prices[j-1].date)));
      const r1 = Math.log(prices[j].price)   - Math.log(plPrice(a, b, daysSinceGenesis(prices[j].date)));
      slicePrev.push(r1 - r0);
    }
    if (sliceCur.length < 30 || slicePrev.length < 30) continue;

    const { H: h90cur  } = hurstDFA(sliceCur.slice(-90));
    const { H: h30cur  } = hurstDFA(sliceCur.slice(-30));
    const { H: h90prev } = hurstDFA(slicePrev.slice(-90));

    const volFn = arr => { const m = arr.reduce((s,x)=>s+x,0)/arr.length; return Math.sqrt(arr.reduce((s,x)=>s+(x-m)**2,0)/arr.length); };
    const vol30 = volFn(sliceCur.slice(-30));
    const vol90 = volFn(sliceCur.slice(-90));
    const volRatioLoc = vol90 > 0 ? vol30 / vol90 : 1;

    const pPrev = prices[Math.max(0, i - 30)];
    const sigPrev = pPrev ? (Math.log(pPrev.price) - Math.log(plPrice(a, b, daysSinceGenesis(pPrev.date))) - resMean) / resStd : sigLoc;
    const sigmaDelta = sigLoc - sigPrev;

    sellResults.push({
      date: p.date, sig: +sigLoc.toFixed(2), ret6m: +ret6m.toFixed(1), isGoodSell,
      sigmaDelta: +sigmaDelta.toFixed(3),
      h90delta: +(h90cur - h90prev).toFixed(3),
      h30h90delta: +(h30cur - h90cur).toFixed(3),
      volRatio: +volRatioLoc.toFixed(3),
      h90cur: +h90cur.toFixed(3),
    });
  }

  // Grid search para umbrales de divergencias Hurst
  let bestSellF1 = -1;
  let bestSellThresholds = { sigmaDelta: 0.10, hDelta: -0.03, volRatio: 1.15 };
  let bestSellMetrics = null;

  if (sellResults.length >= 5) {
    for (const sdT of sigmaDeltaCandidates) {
      for (const hdT of hDeltaCandidates) {
        for (const vrT of volRatioCandidates) {
          const d1 = r => r.sigmaDelta > sdT && r.h90delta < hdT;
          const d2 = r => r.h30h90delta < hdT && r.h90cur > 0.55;
          const d3 = r => r.h90delta < hdT && r.volRatio > vrT;
          const scoreOf = r => [d1(r), d2(r), d3(r)].filter(Boolean).length;
          const sellSignals = sellResults.filter(r => scoreOf(r) >= 2);
          if (sellSignals.length < 3) continue;
          const tp = sellSignals.filter(r => r.isGoodSell).length;
          const allSellPos = sellResults.filter(r => r.isGoodSell).length;
          const prec = tp / sellSignals.length;
          const rec  = allSellPos > 0 ? tp / allSellPos : 0;
          const f1   = prec + rec > 0 ? 2 * prec * rec / (prec + rec) : 0;
          if (f1 > bestSellF1) {
            bestSellF1 = f1;
            bestSellThresholds = { sigmaDelta: sdT, hDelta: hdT, volRatio: vrT };
          }
        }
      }
    }
  }

  const sellBacktest = sellResults.length >= 3 ? {
    thresholds: bestSellThresholds,
    metrics: (() => {
      // Usar los mejores thresholds encontrados, o los defaults si el grid search no convergió
      const sdT = bestSellThresholds.sigmaDelta;
      const hdT = bestSellThresholds.hDelta;
      const vrT = bestSellThresholds.volRatio;
      const d1f = r => r.sigmaDelta > sdT && r.h90delta < hdT;
      const d2f = r => r.h30h90delta < hdT && r.h90cur > 0.55;
      const d3f = r => r.h90delta < hdT && r.volRatio > vrT;
      const scoreF = r => [d1f(r), d2f(r), d3f(r)].filter(Boolean).length;

      const sell3    = sellResults.filter(r => scoreF(r) === 3);
      const sell2    = sellResults.filter(r => scoreF(r) === 2);
      const noSignal = sellResults.filter(r => scoreF(r) <= 1);

      const maxDrawdown = arr => arr.length > 0 ? +Math.min(...arr.map(r => r.ret6m)).toFixed(1) : null;
      const avgRet      = arr => arr.length > 0 ? +(arr.reduce((s,r)=>s+r.ret6m,0)/arr.length).toFixed(1) : null;
      // Tres métricas dinámicas — umbrales basados en percentiles históricos
      const pctAnyLoss   = arr => arr.length > 0 ? +(arr.filter(r=>r.isAnyLoss).length/arr.length*100).toFixed(1)    : null;
      const pctSig       = arr => arr.length > 0 ? +(arr.filter(r=>r.isGoodSell).length/arr.length*100).toFixed(1)   : null; // P25
      const pctSevere    = arr => arr.length > 0 ? +(arr.filter(r=>r.isSevereSell).length/arr.length*100).toFixed(1) : null; // P50
      const precFn       = pctSig; // compatibilidad

      const sellAvg  = avgRet(sell3);
      const baseAvg  = avgRet(sellResults);
      const signalDelta = (sellAvg != null && baseAvg != null)
        ? +(baseAvg - sellAvg).toFixed(1)
        : null;

      const mkRow = arr => ({
        n: arr.length,
        precision: precFn(arr),
        avgRet6m:  avgRet(arr),
        maxDrawdown: maxDrawdown(arr),
        pct20:     pctSig(arr),      // renombrado internamente, ahora = P25 dinámico
        pctAnyLoss: pctAnyLoss(arr),
        pctSevere:  pctSevere(arr),
      });

      return {
        sell:       mkRow(sell3),
        reduce:     mkRow(sell2),
        noSignal:   mkRow(noSignal),
        allOverheat: mkRow(sellResults),
        signalDelta,
      };
    })(),
    nOverheat: sellResults.length,
    note: sellResults.length < 10 ? "Small sample — interpret with caution." : null,
  } : null;

  // ── Validación cruzada por períodos ──
  // Responde: ¿son los thresholds estables entre ciclos o sobreajustados al último?
  const periods = [
    { label: "2013–2017", start: "2013-01-01", end: "2017-12-31" },
    { label: "2018–2021", start: "2018-01-01", end: "2021-12-31" },
    { label: "2022–present", start: "2022-01-01", end: "2099-12-31" },
  ];

  const crossValidation = periods.map(period => {
    const periodResults = results.filter(r => r.date >= period.start && r.date <= period.end);
    if (periodResults.length < 3) return { label: period.label, n: 0, precision: null, avgReturn: null };

    // Usar r.level (clasificación final del score continuo) en lugar de
    // thresholds conjuntivos — el cross-val debe reflejar el mismo modelo
    // que muestra el veredicto al usuario.
    const yesP = periodResults.filter(r => r.level === "strongBuy" || r.level === "buy");
    const tpP = yesP.filter(r => r.isGoodBuy).length;

    return {
      label: period.label,
      n: periodResults.length,
      nYes: yesP.length,
      precision: yesP.length > 0 ? +(tpP / yesP.length * 100).toFixed(1) : null,
      avgReturn: avgReturn(yesP),
    };
  }).filter(p => p.n > 0);

  // Estabilidad: ¿cuánto varían las precisiones entre períodos?
  const precisions = crossValidation.map(p => p.precision).filter(p => p != null);
  const stabilityDelta = precisions.length >= 2
    ? +(Math.max(...precisions) - Math.min(...precisions)).toFixed(1)
    : null;

  // Base rate histórico
  const baseRate = results.length > 0
    ? +(results.filter(r => r.realReturn > 0).length / results.length * 100).toFixed(1)
    : null;

  // ── Tabla de buckets de σ ──
  // Para cada rango de sobrecompra: % que cayó >20% en 6m, retorno medio
  // Esta es la evidencia empírica directa de si σ predice correcciones
  const sigmaBuckets = [
    { label: "σ < 0",      min: -99, max: 0   },
    { label: "0 – 0.5",   min: 0,   max: 0.5  },
    { label: "0.5 – 1.0", min: 0.5, max: 1.0  },
    { label: "1.0 – 1.5", min: 1.0, max: 1.5  },
    { label: "1.5 – 2.0", min: 1.5, max: 2.0  },
    { label: "2.0+",       min: 2.0, max: 99   },
  ].map(bucket => {
    const pts = allSellResults.filter(r => r.sig > bucket.min && r.sig <= bucket.max);
    const n = pts.length;
    if (n === 0) return { ...bucket, n: 0, pct20: null, avgRet: null, nFell: 0 };
    const nFell = pts.filter(r => r.isGoodSell).length;
    const pct20 = +(nFell / n * 100).toFixed(1);
    const avgRet = +(pts.reduce((s, r) => s + r.ret6m, 0) / n).toFixed(1);
    return { ...bucket, n, nFell, pct20, avgRet };
  });

  return {
    thresholds: bestThresholds,
    weights: bestWeights,
    scoringParams: { sigMean, lossMean, fvMean, floorMean, strongThresh },
    precision: yesResults.length > 0 ? +(truePositives / yesResults.length * 100).toFixed(1) : null,
    recall: allPositives > 0 ? +(truePositives / allPositives * 100).toFixed(1) : null,
    nYes: yesResults.length,
    nNo: noResults.length,
    avgReturnYes: avgReturn(yesResults),
    avgReturnNo:  avgReturn(noResults),
    avgReturnHold: avgReturn(noResults),
    avgReturnSell: (() => {
      const sellPts = results.filter(r => r.level === "sell" || r.level === "reduce");
      return avgReturn(sellPts);
    })(),
    baseRate,
    regimeEffect,
    byLevel,
    holdBuckets,
    sellBacktest,
    sellThresholds: bestSellThresholds,
    plBubbleMetrics,
    calibratedBubbleSig,
    calibratedReduceSig,
    correctionPercentiles: { p25: corrP25, p50: corrP50, p75: corrP75, n: overheatedReturns.length },
    sigmaBuckets,
    crossValidation,
    stabilityDelta,
    // Retorno medio incondicional — contexto informativo
    unconditionalMean: results.length > 0
      ? +(results.reduce((s, r) => s + r.realReturn, 0) / results.length).toFixed(1)
      : 0,
    // Calibración probabilística: ¿cuando el modelo dice "alto riesgo",
    // efectivamente pierde más gente? Agrupamos por σ y comparamos
    // loss rate real vs P(pérdida) predicho por el MC.
    calibrationBuckets: [
      { label: "Deep value (σ < -1)",      min: -99,  max: -1.0 },
      { label: "Discount (σ -1 to -0.5)",  min: -1.0, max: -0.5 },
      { label: "Neutral (σ ±0.5)",         min: -0.5, max:  0.5 },
      { label: "Elevated (σ 0.5 to 1)",    min:  0.5, max:  1.0 },
      { label: "Overheated (σ > 1)",       min:  1.0, max: 99   },
    ].map(b => {
      const pts = results.filter(r => r.sig > b.min && r.sig <= b.max);
      if (pts.length === 0) return { ...b, n: 0, lossRate: null, avgReturn: null, pLossAvg: null };
      const n = pts.length;
      const nLoss   = pts.filter(r => r.realReturn < 0).length;
      const lossRate = +(nLoss / n * 100).toFixed(1);
      const ar       = +(pts.reduce((s, r) => s + r.realReturn, 0) / n).toFixed(1);
      const pLossAvg = +(pts.reduce((s, r) => s + r.pLoss1y, 0) / n).toFixed(1);
      return { ...b, n, lossRate, avgReturn: ar, pLossAvg };
    }),
    results,
  };
}
