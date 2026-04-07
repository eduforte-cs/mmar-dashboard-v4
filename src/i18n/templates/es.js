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
};

export const paras = {
  sell: (d) => `Bitcoin a ${fmtK(d.S0)} está ${d.devPct}% por encima de donde el modelo dice que debería estar (${fmtK(d.plToday)}). Es caro — cada vez que BTC se estiró tanto en el pasado, siguió una corrección.`,
  reduce: (d) => `Bitcoin a ${fmtK(d.S0)} está ${d.devPct}% por encima de su valor justo de ${fmtK(d.plToday)}. Estás pagando una prima. Históricamente, desde esta zona el retorno a 12 meses fue negativo en promedio.`,
  caution: (d) => `Bitcoin a ${fmtK(d.S0)} está ${d.devPct}% por encima de su valor justo de ${fmtK(d.plToday)}. Se calienta — la relación riesgo/retorno empieza a jugar en tu contra desde acá.`,
  neutral: (d) => `Bitcoin a ${fmtK(d.S0)} está ${d.devPct}% ${d.aboveBelow === "above" ? "por encima de" : "por debajo de"} su valor justo de ${fmtK(d.plToday)}. Es un precio justo — justo en el medio del rango normal.`,
  buy: (d) => `Bitcoin a ${fmtK(d.S0)} está ${d.devPct}% por debajo de su valor justo de ${fmtK(d.plToday)}. Está en oferta. Estas son las entradas que la gente mira para atrás y desea haber aprovechado más.`,
  outlook: (d) => `Si comprás hoy y mantenés 1 año, hay un ${d.pFV}% de probabilidad de que el precio alcance su valor justo de ${fmtK(d.pl1y)}. El piso del peor caso — el nivel más bajo que Bitcoin respetó históricamente — es ${fmtK(d.supportPrice)} (−${d.maxDownside}% desde hoy). A 3 años, el objetivo de valor justo es ${fmtK(d.pl3y)} (${d.pl3yReturn >= 0 ? "+" : ""}${d.pl3yReturn}%).${d.mcWorst3yProfit ? " Incluso en el peor 5% de las simulaciones, estás en ganancia a 3 años." : ""}`,
  duration: (d) => `Basado en cuánto duraron episodios anteriores, el modelo estima unos ${d.monthsRemaining} meses más antes de que Bitcoin vuelva a su valor justo. ${d.sigImproving ? "La tendencia ya está mejorando — podría ser más rápido." : d.sigWorsening ? "La tendencia sigue empeorando — podría tardar más." : "La tendencia está plana — se requiere paciencia."}`,
  lossProbability: (d) => `Tu probabilidad de estar en pérdida después de 1 año: ~${d.l1y}%. Después de 3 años: ~${d.l3y}%.${d.l3y < 5 ? " El tiempo está de tu lado." : d.l3y < 15 ? " Cuanto más tiempo mantenés, mejores las probabilidades." : ""}`,
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
