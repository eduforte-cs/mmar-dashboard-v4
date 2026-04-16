// FAQs 1-9: core questions about buying, selling, price direction
import { fmtPrice, fmtPct } from "./helpers.js";

export function faqShouldIBuy(d) {
  const { answer } = d.signal;
  const pct = fmtPct(d.devPct);
  if (answer === "yes") return {
    answer: "yes",
    en: `Yes, according to CommonSense's analysis. Bitcoin at ${fmtPrice(d.spot, "en")} is ${pct} below its fair value of ${fmtPrice(d.plToday, "en")}. That's a significant discount. Every time in history that Bitcoin has been this cheap relative to its trend, the price was higher a year later.`,
    es: `Si, segun el analisis de CommonSense. Bitcoin a ${fmtPrice(d.spot, "es")} esta ${pct} por debajo de su valor justo de ${fmtPrice(d.plToday, "es")}. Es un descuento significativo. Cada vez en la historia que Bitcoin ha estado asi de barato respecto a su tendencia, el precio fue mas alto un ano despues.`,
  };
  if (answer === "hold") return {
    answer: "hold",
    en: `Not right now. According to CommonSense, Bitcoin at ${fmtPrice(d.spot, "en")} is close to its fair value of ${fmtPrice(d.plToday, "en")}. It's not cheap, but it's not expensive either. If you already own Bitcoin, hold. If you want to buy, consider waiting for a better discount.`,
    es: `Ahora mismo no. Segun CommonSense, Bitcoin a ${fmtPrice(d.spot, "es")} esta cerca de su valor justo de ${fmtPrice(d.plToday, "es")}. No esta barato, pero tampoco caro. Si ya tienes Bitcoin, manten. Si quieres comprar, considera esperar un mejor descuento.`,
  };
  return {
    answer: "no",
    en: `No. According to CommonSense, Bitcoin at ${fmtPrice(d.spot, "en")} is ${pct} above its fair value of ${fmtPrice(d.plToday, "en")}. That's expensive by historical standards. When Bitcoin has been this far above its trend, the risk of a significant correction is high.`,
    es: `No. Segun CommonSense, Bitcoin a ${fmtPrice(d.spot, "es")} esta ${pct} por encima de su valor justo de ${fmtPrice(d.plToday, "es")}. Eso es caro segun los estandares historicos. Cuando Bitcoin ha estado tan por encima de su tendencia, el riesgo de correccion fuerte es alto.`,
  };
}

export function faqWillKeepFalling(d) {
  const halfLife = Math.round(d.halfLife);
  const p5 = fmtPrice(d.p5_1y, "en");
  const p5Es = fmtPrice(d.p5_1y, "es");
  const vol = fmtVol(d.annualVol);
  if (d.devPct < 0) return {
    en: `Nobody knows the short term. But CommonSense's model shows Bitcoin tends to correct back to its fair value within about ${halfLife} days. Right now it's well below that line, which historically means the worst of the drop is likely behind us. A fall below ${p5} is possible but unlikely according to our simulations.`,
    es: `El corto plazo nadie lo sabe. Pero el modelo de CommonSense muestra que Bitcoin tiende a corregir hacia su valor justo en unos ${halfLife} dias. Ahora esta muy por debajo de esa linea, lo que historicamente significa que lo peor de la caida probablemente ya paso. Una caida por debajo de ${p5Es} es posible pero poco probable segun nuestras simulaciones.`,
  };
  return {
    en: `Bitcoin isn't falling — it's surging. But according to CommonSense, prices this far above fair value don't tend to last. The model suggests a pullback toward ${fmtPrice(d.plToday, "en")} is likely over the coming months. Current volatility is ${vol}.`,
    es: `Bitcoin no esta cayendo — esta subiendo fuerte. Pero segun CommonSense, precios tan por encima del valor justo no suelen sostenerse. El modelo sugiere un retroceso hacia ${fmtPrice(d.plToday, "es")} en los proximos meses. La volatilidad actual es ${vol}.`,
  };
}

export function faqWillGoUp(d) {
  const med = fmtPrice(d.med_1y, "en");
  const medEs = fmtPrice(d.med_1y, "es");
  const p5 = fmtPrice(d.p5_1y, "en");
  const p95 = fmtPrice(d.p95_1y, "en");
  const p5Es = fmtPrice(d.p5_1y, "es");
  const p95Es = fmtPrice(d.p95_1y, "es");
  if (d.devPct < 0) return {
    en: `CommonSense's model points to yes. The most likely scenario puts Bitcoin around ${med} in 12 months (range: ${p5} to ${p95}). Bitcoin is currently well below its fair value, which creates natural upward pressure — like a spring being compressed.`,
    es: `El modelo de CommonSense apunta a que si. El escenario mas probable situa a Bitcoin alrededor de ${medEs} en 12 meses (rango: ${p5Es} a ${p95Es}). Bitcoin esta actualmente muy por debajo de su valor justo, lo que crea presion alcista natural — como un resorte comprimido.`,
  };
  return {
    en: `Short term, possibly — momentum is strong. But CommonSense's model shows Bitcoin is already ${fmtPct(d.devPct)} above where it should be. The upside from here is limited compared to the downside risk. Projected range in 12 months: ${p5} to ${p95}.`,
    es: `A corto plazo, posiblemente — el impulso es fuerte. Pero el modelo de CommonSense muestra que Bitcoin ya esta ${fmtPct(d.devPct)} por encima de donde deberia estar. El potencial de subida desde aqui es limitado comparado con el riesgo de caida. Rango proyectado en 12 meses: ${p5Es} a ${p95Es}.`,
  };
}

export function faqHowMuch(d) {
  return {
    en: `According to CommonSense's projections: Bitcoin's fair value today is ${fmtPrice(d.plToday, "en")}, rising to ${fmtPrice(d.pl1y, "en")} in 1 year and ${fmtPrice(d.pl3y, "en")} in 3 years. Our most likely price estimate is ~${fmtPrice(d.med_1y, "en")} in 1 year and ~${fmtPrice(d.med_3y, "en")} in 3 years — with a wide range of outcomes possible.`,
    es: `Segun las proyecciones de CommonSense: el valor justo de Bitcoin hoy es ${fmtPrice(d.plToday, "es")}, subiendo a ${fmtPrice(d.pl1y, "es")} en 1 ano y ${fmtPrice(d.pl3y, "es")} en 3 anos. Nuestra estimacion mas probable es ~${fmtPrice(d.med_1y, "es")} en 1 ano y ~${fmtPrice(d.med_3y, "es")} en 3 anos — con un amplio rango de resultados posibles.`,
  };
}

export function faqOvervalued(d) {
  const pct = fmtPct(d.devPct);
  if (d.devPct < 0) return {
    answer: "no",
    en: `No. Right now Bitcoin is ${pct} below its fair value according to CommonSense. It's in clear discount territory. We'd start flagging overvaluation when Bitcoin trades significantly above its historical trend — we're nowhere near that today.`,
    es: `No. Ahora mismo Bitcoin esta ${pct} por debajo de su valor justo segun CommonSense. Esta en zona clara de descuento. Empezariamos a senalar sobrevaluacion cuando Bitcoin cotice significativamente por encima de su tendencia historica — hoy estamos lejos de eso.`,
  };
  if (d.devPct < 30) return {
    answer: "no",
    en: `Not yet. Bitcoin is ${pct} above fair value, which is within normal range. CommonSense would flag overvaluation when the premium exceeds 50% or more above trend.`,
    es: `Todavia no. Bitcoin esta ${pct} por encima de su valor justo, dentro del rango normal. CommonSense senalaria sobrevaluacion cuando el premium supere el 50% por encima de la tendencia.`,
  };
  return {
    answer: "yes",
    en: `Yes. Bitcoin is ${pct} above its fair value according to CommonSense. This is historically expensive territory. Past cycles show similar overextensions before major corrections.`,
    es: `Si. Bitcoin esta ${pct} por encima de su valor justo segun CommonSense. Esto es territorio historicamente caro. Ciclos anteriores muestran sobreextensiones similares antes de correcciones mayores.`,
  };
}

export function faqTooLate(d) {
  if (d.devPct < 0) return {
    en: `No, it's actually a good time. According to CommonSense, Bitcoin is ${fmtPct(d.devPct)} below its fair value. Fair value grows every day: it's ${fmtPrice(d.plToday, "en")} today, ${fmtPrice(d.pl1y, "en")} in a year, and ${fmtPrice(d.pl3y, "en")} in three years. You're buying at a discount to a rising trend.`,
    es: `No, de hecho es buen momento. Segun CommonSense, Bitcoin esta ${fmtPct(d.devPct)} por debajo de su valor justo. El valor justo crece cada dia: es ${fmtPrice(d.plToday, "es")} hoy, ${fmtPrice(d.pl1y, "es")} en un ano, y ${fmtPrice(d.pl3y, "es")} en tres anos. Estas comprando con descuento sobre una tendencia creciente.`,
  };
  return {
    en: `For now, yes. Bitcoin is above its fair value, so you'd be paying a premium. But long-term, fair value keeps rising: ${fmtPrice(d.pl1y, "en")} in a year, ${fmtPrice(d.pl3y, "en")} in three years. It's not too late to own Bitcoin, but wait for a better entry.`,
    es: `Por ahora, si. Bitcoin esta por encima de su valor justo, estarias pagando un premium. Pero a largo plazo, el valor justo sigue subiendo: ${fmtPrice(d.pl1y, "es")} en un ano, ${fmtPrice(d.pl3y, "es")} en tres anos. No es tarde para tener Bitcoin, pero espera una mejor entrada.`,
  };
}

export function faqShouldSell(d) {
  const { answer } = d.signal;
  if (answer === "yes") return {
    en: `No, definitely not. According to CommonSense, Bitcoin is in Buy territory — ${fmtPct(d.devPct)} below fair value. Selling now means selling at a discount. If anything, this is a moment to accumulate, not to sell.`,
    es: `No, definitivamente no. Segun CommonSense, Bitcoin esta en zona de Compra — ${fmtPct(d.devPct)} por debajo del valor justo. Vender ahora significa vender con descuento. Si acaso, es momento de acumular, no de vender.`,
  };
  if (answer === "hold") return {
    en: `Not yet. Bitcoin is near fair value according to CommonSense. There's no urgency to sell, but keep an eye on it. If it rises significantly above trend, we'll signal when it's time to take profits.`,
    es: `Todavia no. Bitcoin esta cerca del valor justo segun CommonSense. No hay urgencia para vender, pero estate atento. Si sube significativamente por encima de la tendencia, senalaremos cuando sea momento de tomar ganancias.`,
  };
  return {
    en: `CommonSense's model says consider it. Bitcoin is ${fmtPct(d.devPct)} above fair value — deep in overvaluation territory. This doesn't mean it crashes tomorrow, but historically taking profits at these levels has been the right call. You don't have to sell everything, but locking in some gains is smart.`,
    es: `El modelo de CommonSense dice que lo consideres. Bitcoin esta ${fmtPct(d.devPct)} por encima del valor justo — bien dentro de zona de sobrevaluacion. No significa que se desplome manana, pero historicamente tomar ganancias en estos niveles ha sido la decision correcta. No tienes que vender todo, pero asegurar parte de las ganancias es inteligente.`,
  };
}

export function faqBubble(d) {
  if (d.sigma < 0.3) return {
    en: `No. Bitcoin is ${d.sigma < 0 ? "below" : "near"} its fair value according to CommonSense. Bubble territory starts when Bitcoin is more than 80% above its trend. We're nowhere near that right now.`,
    es: `No. Bitcoin esta ${d.sigma < 0 ? "por debajo de" : "cerca de"} su valor justo segun CommonSense. La zona de burbuja empieza cuando Bitcoin esta mas de 80% por encima de su tendencia. Ahora estamos lejos de eso.`,
  };
  if (d.sigma < 0.8) return {
    en: `Not yet, but getting warm. Bitcoin is ${fmtPct(d.devPct)} above fair value. CommonSense flags bubble risk when the premium exceeds 80%. We're approaching that zone — worth watching.`,
    es: `Todavia no, pero calentandose. Bitcoin esta ${fmtPct(d.devPct)} por encima del valor justo. CommonSense senala riesgo de burbuja cuando el premium supera el 80%. Nos estamos acercando a esa zona — vale la pena estar atentos.`,
  };
  return {
    en: `It's showing bubble characteristics. According to CommonSense, Bitcoin at ${fmtPct(d.devPct)} above fair value is in the danger zone. Past cycles show similar overextensions before major corrections. Caution is warranted.`,
    es: `Esta mostrando caracteristicas de burbuja. Segun CommonSense, Bitcoin a ${fmtPct(d.devPct)} por encima del valor justo esta en zona de peligro. Ciclos anteriores muestran sobreextensiones similares antes de correcciones mayores. La precaucion esta justificada.`,
  };
}

export function faqWorstCase(d) {
  const floor = d.supportFloor ? fmtPrice(d.supportFloor, "en") : null;
  const floorEs = d.supportFloor ? fmtPrice(d.supportFloor, "es") : null;
  const p5 = fmtPrice(d.p5_1y, "en");
  const p5Es = fmtPrice(d.p5_1y, "es");
  const floorPart = floor
    ? ` The Power Law support floor sits at ${floor}. While a crash to that level is unlikely, it represents the historical minimum.`
    : "";
  const floorPartEs = floorEs
    ? ` El suelo de soporte Power Law esta en ${floorEs}. Una caida a ese nivel es poco probable, pero representa el minimo historico.`
    : "";
  return {
    en: `In a severe correction, CommonSense's simulations show Bitcoin could fall to around ${p5} in the worst 5% of scenarios over 12 months.${floorPart} The probability of breaking below the long-term floor is ${Math.round(d.floorBreakProb || 0)}%.`,
    es: `En una correccion severa, las simulaciones de CommonSense muestran que Bitcoin podria caer hasta ${p5Es} en el peor 5% de escenarios a 12 meses.${floorPartEs} La probabilidad de romper el suelo a largo plazo es del ${Math.round(d.floorBreakProb || 0)}%.`,
  };
}
