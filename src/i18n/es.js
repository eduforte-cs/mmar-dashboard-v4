import { fmtK } from "../../engine/constants.js";

export const answerSubs = {
  sell: (d) => `Bitcoin está ${d.devPct}% por encima de su valor justo (σ ${d.sig}). Históricamente, cada vez que Bitcoin estuvo tan estirado, el retorno a 12 meses fue negativo. El resultado promedio desde acá es −34%.`,
  reduce: (d) => `Bitcoin está ${d.devPct}% por encima de su valor justo (σ ${d.sig}). Solo el 33% de las veces el precio fue más alto 12 meses después desde esta zona. Las correcciones pasan más seguido de lo que no — reducí exposición o esperá.`,
  strongBuy: (d) => `Bitcoin está ${d.devPct}% por debajo de su valor justo (σ ${d.sig}). Gran descuento — la configuración más fuerte del modelo. Históricamente, el 100% de las veces el precio fue más alto 12 meses después, con un peor caso de +30%.`,
  buy: (d) => `Bitcoin está ${d.devPct}% por debajo de su valor justo (σ ${d.sig}). Descuento estructural — 100% de precisión histórica, peor caso +22%. Las probabilidades están claramente a tu favor.`,
  accumulate: (d) => `Bitcoin está ${d.devPct}% ${d.aboveBelow === "above" ? "por encima de" : "por debajo de"} su valor justo (σ ${d.sig}). No está técnicamente en descuento, pero cada vez que Bitcoin estuvo en esta zona, fue más alto 12 meses después. Buena entrada si estás construyendo posición.`,
  caution: (d) => `Bitcoin está ${d.devPct}% por encima de su valor justo (σ ${d.sig}). Se calienta. Desde esta zona, es casi un 50/50 si el precio será más alto en 12 meses. Si ya estás adentro, mantené. Si no, esperá.`,
  neutral: (d) => `Bitcoin está ${d.devPct}% ${d.aboveBelow === "above" ? "por encima de" : "por debajo de"} su valor justo (σ ${d.sig}). Zona de valor justo — las probabilidades aún te favorecen (83% históricamente) pero aparece riesgo a la baja. Paciencia.`,
};

export const answerSubsLite = {
  strongBuy: (d) => `Si comprás Bitcoin hoy a ${fmtK(d.S0)}, según el backtest de nuestro modelo, cada vez que Bitcoin estuvo tan barato, el precio fue más alto después de 1 año. Incluso la peor entrada rindió +30%. Después de 3 años, tu probabilidad de estar en pérdida: menos del 5%. Esta es la mejor oportunidad de compra que el modelo puede identificar.`,
  buy: (d) => `Si comprás Bitcoin hoy a ${fmtK(d.S0)}, según el backtest de nuestro modelo, el 100% de las veces el precio fue más alto después de 1 año desde este nivel. La peor entrada aún rindió +22%. Después de 3 años, tu probabilidad de estar en pérdida: menos del 5%.`,
  accumulate: (d) => `Si comprás Bitcoin hoy a ${fmtK(d.S0)}, según el backtest de nuestro modelo, el 100% de las veces el precio fue más alto después de 1 año. No es técnicamente un descuento, pero nunca falló desde acá. Después de 3 años, tu probabilidad de estar en pérdida: menos del 10%.`,
  neutral: (d) => `Si comprás Bitcoin hoy a ${fmtK(d.S0)}, según el backtest de nuestro modelo, el precio fue más alto después de 1 año el 83% de las veces. Después de 3 años, el 88%. Las probabilidades te favorecen, pero no es una señal clara.`,
  caution: (d) => `Si comprás Bitcoin hoy a ${fmtK(d.S0)}, según el backtest de nuestro modelo, el precio fue más alto después de 1 año solo el 56% de las veces. Después de 3 años, el 72%. Es casi un 50/50. No es momento de entrar.`,
  reduce: (d) => `Si mantenés Bitcoin hoy a ${fmtK(d.S0)}, según el backtest de nuestro modelo, el precio fue más bajo después de 1 año el 67% de las veces. Después de 3 años, el 45% aún en pérdida. Considerá reducir tu posición.`,
  sell: (d) => `Si mantenés Bitcoin hoy a ${fmtK(d.S0)}, según el backtest de nuestro modelo, el precio fue más bajo después de 1 año en todos los casos. El resultado promedio: −34%. Salí.`,
};

export const signals = {
  strongBuy: "Compra fuerte",
  buy: "Comprar",
  hold: "Mantener",
  sell: "Vender",
  reduce: "Reducir",
  accumulate: "Acumular",
  neutral: "Neutral",
  caution: "Precaución",
};

export const answers = { yes: "SÍ", no: "NO" };
