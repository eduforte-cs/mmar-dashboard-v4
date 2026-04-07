/**
 * Generates localized parasLite paragraphs.
 * Same logic as verdict.js but with language templates.
 */
import { fmtK } from "../engine/constants.js";

const templates = {
  en: {
    position: {
      buy: (d) => `Bitcoin is trading at ${fmtK(d.S0)}. Our model says it should be worth ${fmtK(d.plToday)} — that means it's ${d.devPct}% cheaper than where it should be. That's a discount.`,
      sell: (d) => `Bitcoin is trading at ${fmtK(d.S0)}. Our model says it should be worth ${fmtK(d.plToday)} — that means it's ${d.devPct}% more expensive than where it should be. That's historically dangerous.`,
      neutral: (d) => `Bitcoin is trading at ${fmtK(d.S0)}. Our model says it should be worth ${fmtK(d.plToday)} — that means it's ${d.devPct}% ${d.aboveBelow} than where it should be. That's close to fair value.`,
    },
    projection: {
      sell: (d) => `Looking forward, the model's fair value in 1 year is ${fmtK(d.pl1y)} — that's ${d.pl1yReturn >= 0 ? d.pl1yReturn + "% above" : Math.abs(d.pl1yReturn) + "% below"} where you are now. In 3 years, ${fmtK(d.pl3y)}. ${d.pl1yReturn < 0 ? "The structural trajectory is below your entry price." : "Even the fair value target barely justifies the risk."}`,
      buy: (d) => `Looking forward, the model's fair value target in 1 year is ${fmtK(d.pl1y)} (${d.pl1yReturn >= 0 ? "+" : ""}${d.pl1yReturn}% from today). In 3 years, ${fmtK(d.pl3y)} (${d.pl3yReturn >= 0 ? "+" : ""}${d.pl3yReturn}%). These aren't predictions — they're where the structural growth trajectory points.`,
    },
    worstCase: {
      sell: (d) => `In the worst 5% of the model's simulations, Bitcoin is at ${fmtK(d.worst1y)} after 1 year (${d.worst1yPct > 0 ? "+" : ""}${d.worst1yPct}% from here) and ${fmtK(d.worst3y)} after 3 years (${d.worst3yPct > 0 ? "+" : ""}${d.worst3yPct}%).${d.worst1yPct < 0 && d.worst3yPct < 0 ? " Even the optimistic scenarios barely recover your entry price." : ""}`,
      buy: (d) => `In the worst 5% of the model's simulations, Bitcoin is at ${fmtK(d.worst1y)} after 1 year (${d.worst1yPct > 0 ? "+" : ""}${d.worst1yPct}% from here) and ${fmtK(d.worst3y)} after 3 years (${d.worst3yPct > 0 ? "+" : ""}${d.worst3yPct}%).${d.worst3yPct > 0 ? " Even the pessimistic path ends in profit." : ""}`,
    },
    lossCurve: {
      sell: (d) => `Your risk of being at a loss: ${d.lcStr}. Time does not help enough from this level.`,
      buy: (d) => `Your risk of being at a loss: ${d.lcStr}.${d.l3y < 5 ? " Time is on your side." : d.l3y < 15 ? " The longer you hold, the better the odds." : ""}`,
    },
    disclaimer: {
      buy: "Important: this model is calibrated for 1-year and 3-year horizons. In the short term, Bitcoin can drop 20-30% even during a bull market — that's normal. A buy signal does not mean the price goes up tomorrow. It means that if you buy today and hold for at least 12 months, history is on your side.",
      sell: "Important: this model is calibrated for 1-year and 3-year horizons. In the short term, Bitcoin can rally 20-30% even in overheated territory — that's normal. A sell signal does not mean the price drops tomorrow. It means that holding from this level for 12 months has historically resulted in losses.",
      neutral: "Important: this model is calibrated for 1-year and 3-year horizons. In the short term, anything can happen — Bitcoin routinely moves 10-20% in either direction within weeks. The model has no opinion about short-term moves.",
    },
  },
  es: {
    position: {
      buy: (d) => `Bitcoin cotiza a ${fmtK(d.S0)}. Nuestro modelo dice que debería valer ${fmtK(d.plToday)} — eso significa que está ${d.devPct}% más barato de lo que debería. Es un descuento.`,
      sell: (d) => `Bitcoin cotiza a ${fmtK(d.S0)}. Nuestro modelo dice que debería valer ${fmtK(d.plToday)} — eso significa que está ${d.devPct}% más caro de lo que debería. Históricamente eso es peligroso.`,
      neutral: (d) => `Bitcoin cotiza a ${fmtK(d.S0)}. Nuestro modelo dice que debería valer ${fmtK(d.plToday)} — eso significa que está ${d.devPct}% ${d.aboveBelow === "above" ? "por encima" : "por debajo"} de donde debería. Está cerca de su valor justo.`,
    },
    projection: {
      sell: (d) => `Mirando hacia adelante, el valor justo del modelo en 1 año es ${fmtK(d.pl1y)} — eso es ${d.pl1yReturn >= 0 ? d.pl1yReturn + "% por encima" : Math.abs(d.pl1yReturn) + "% por debajo"} de donde estás ahora. En 3 años, ${fmtK(d.pl3y)}. ${d.pl1yReturn < 0 ? "La trayectoria estructural está por debajo de tu precio de entrada." : "Incluso el objetivo de valor justo apenas justifica el riesgo."}`,
      buy: (d) => `Mirando hacia adelante, el objetivo de valor justo del modelo en 1 año es ${fmtK(d.pl1y)} (${d.pl1yReturn >= 0 ? "+" : ""}${d.pl1yReturn}% desde hoy). En 3 años, ${fmtK(d.pl3y)} (${d.pl3yReturn >= 0 ? "+" : ""}${d.pl3yReturn}%). No son predicciones — son hacia donde apunta la trayectoria de crecimiento estructural.`,
    },
    worstCase: {
      sell: (d) => `En el peor 5% de las simulaciones del modelo, Bitcoin está a ${fmtK(d.worst1y)} después de 1 año (${d.worst1yPct > 0 ? "+" : ""}${d.worst1yPct}% desde acá) y ${fmtK(d.worst3y)} después de 3 años (${d.worst3yPct > 0 ? "+" : ""}${d.worst3yPct}%).${d.worst1yPct < 0 && d.worst3yPct < 0 ? " Incluso los escenarios optimistas apenas recuperan tu precio de entrada." : ""}`,
      buy: (d) => `En el peor 5% de las simulaciones del modelo, Bitcoin está a ${fmtK(d.worst1y)} después de 1 año (${d.worst1yPct > 0 ? "+" : ""}${d.worst1yPct}% desde acá) y ${fmtK(d.worst3y)} después de 3 años (${d.worst3yPct > 0 ? "+" : ""}${d.worst3yPct}%).${d.worst3yPct > 0 ? " Incluso el camino pesimista termina en ganancia." : ""}`,
    },
    lossCurve: {
      sell: (d) => `Tu riesgo de estar en pérdida: ${d.lcStr}. El tiempo no ayuda lo suficiente desde este nivel.`,
      buy: (d) => `Tu riesgo de estar en pérdida: ${d.lcStr}.${d.l3y < 5 ? " El tiempo está de tu lado." : d.l3y < 15 ? " Cuanto más tiempo mantenés, mejores las probabilidades." : ""}`,
    },
    disclaimer: {
      buy: "Importante: este modelo está calibrado para horizontes de 1 y 3 años. En el corto plazo, Bitcoin puede caer 20-30% incluso durante un mercado alcista — eso es normal. Una señal de compra no significa que el precio suba mañana. Significa que si comprás hoy y mantenés al menos 12 meses, la historia está de tu lado.",
      sell: "Importante: este modelo está calibrado para horizontes de 1 y 3 años. En el corto plazo, Bitcoin puede subir 20-30% incluso en territorio sobrecalentado — eso es normal. Una señal de venta no significa que el precio caiga mañana. Significa que mantener desde este nivel por 12 meses históricamente resultó en pérdidas.",
      neutral: "Importante: este modelo está calibrado para horizontes de 1 y 3 años. En el corto plazo, cualquier cosa puede pasar — Bitcoin rutinariamente se mueve 10-20% en cualquier dirección en semanas. El modelo no opina sobre movimientos de corto plazo.",
    },
  },
};

export function localizeParasLite(verdict, d, lang) {
  if (!verdict || !d || lang === "en") return verdict.parasLite;

  const tpl = templates[lang];
  if (!tpl) return verdict.parasLite;

  const sig = d.sigmaFromPL || 0;
  const isBuyZone = verdict.level === "strongBuy" || verdict.level === "buy" || (verdict.level === "hold" && verdict.internalLevel === "accumulate");
  const isSellZone = verdict.level === "sell" || verdict.level === "reduce";
  const zone = isSellZone ? "sell" : isBuyZone ? "buy" : "neutral";

  const devPct = Math.abs(d.deviationPct || 0).toFixed(0);
  const aboveBelow = (d.deviationPct || 0) >= 0 ? "above" : "below";

  const data = {
    S0: d.S0, plToday: d.plToday, devPct, aboveBelow,
    pl1y: verdict.horizonCards?.[0]?.plTarget,
    pl3y: verdict.horizonCards?.[1]?.plTarget,
    pl1yReturn: verdict.horizonCards?.[0]?.plReturn?.toFixed(0),
    pl3yReturn: verdict.horizonCards?.[1]?.plReturn?.toFixed(0),
    worst1y: d.percentiles?.[d.percentiles.length - 1]?.p5,
    worst3y: d.percentiles3y?.[d.percentiles3y.length - 1]?.p5,
    l3y: verdict.l3y,
  };

  data.worst1yPct = data.worst1y ? ((data.worst1y - d.S0) / d.S0 * 100).toFixed(0) : "0";
  data.worst3yPct = data.worst3y ? ((data.worst3y - d.S0) / d.S0 * 100).toFixed(0) : "0";

  const lc = (verdict.parasLite || []).find(p => p.includes("loss:") || p.includes("pérdida:"));
  const lcMatch = lc?.match(/loss: (.+?)\./) || lc?.match(/pérdida: (.+?)\./);
  data.lcStr = lcMatch?.[1] || "";

  const paras = [];

  // 1. Position
  paras.push(tpl.position[zone](data));

  // 2. Projection
  if (data.pl1y) paras.push(tpl.projection[isSellZone ? "sell" : "buy"](data));

  // 3. Worst case
  if (data.worst1y && data.worst3y) paras.push(tpl.worstCase[isSellZone ? "sell" : "buy"](data));

  // 4. Episode (keep original if exists — too complex to template)
  const origParas = verdict.parasLite || [];
  const epPara = origParas.find(p => p.includes("days") && (p.includes("below fair") || p.includes("above fair")));
  if (epPara) paras.push(epPara);

  // 5. Loss curve
  if (data.lcStr) paras.push(tpl.lossCurve[isSellZone ? "sell" : "buy"](data));

  // 6. Disclaimer
  paras.push(tpl.disclaimer[zone]);

  return paras;
}
