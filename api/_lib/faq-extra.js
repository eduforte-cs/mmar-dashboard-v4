// FAQs 10-18: DCA, fair price, support, Power Law, predictions, milestones
import { fmtPrice, fmtPct, fmtVol, fmtDateFromDays, dateWhenPriceReaches } from "./helpers.js";

export function faqDCA(d) {
  const ret = Math.round(d.smartDCAReturn || 0);
  const sortino = (d.smartDCASortino || 0).toFixed(1);
  if (d.signal.answer === "yes") return {
    en: `Yes, now is a great time for DCA according to CommonSense. Bitcoin is below fair value, which is exactly when smart DCA works best. Our backtest shows that buying only when the model says 'buy' has returned ${ret}% with a risk-adjusted score (Sortino) of ${sortino}. That crushes regular DCA.`,
    es: `Si, ahora es un gran momento para DCA segun CommonSense. Bitcoin esta por debajo del valor justo, que es exactamente cuando el DCA inteligente funciona mejor. Nuestro backtest muestra que comprar solo cuando el modelo dice 'comprar' ha rendido ${ret}% con un score ajustado por riesgo (Sortino) de ${sortino}. Eso aplasta al DCA regular.`,
  };
  if (d.signal.answer === "hold") return {
    en: `You can continue your DCA, but this isn't the best entry according to CommonSense. Bitcoin is near fair value. Smart DCA — buying only at a discount — has returned ${ret}% historically. Consider reducing your weekly amount until a better discount appears.`,
    es: `Puedes continuar tu DCA, pero no es la mejor entrada segun CommonSense. Bitcoin esta cerca del valor justo. El DCA inteligente — comprar solo con descuento — ha rendido ${ret}% historicamente. Considera reducir tu cantidad semanal hasta que aparezca un mejor descuento.`,
  };
  return {
    en: `Pause your DCA. CommonSense's model says Bitcoin is overvalued right now. Smart DCA means NOT buying when prices are above fair value. Our backtest of ${ret}% return was achieved precisely by skipping moments like this. Wait for a pullback.`,
    es: `Pausa tu DCA. El modelo de CommonSense dice que Bitcoin esta sobrevaluado ahora. DCA inteligente significa NO comprar cuando los precios estan por encima del valor justo. Nuestro backtest de ${ret}% de retorno se logro precisamente saltandose momentos como este. Espera un retroceso.`,
  };
}

export function faqFairPrice(d) {
  return {
    en: `According to CommonSense, Bitcoin's fair price today is ${fmtPrice(d.plToday, "en")}. This is calculated using the Power Law model fitted over 14+ years of daily data with 91% accuracy. Fair value rises every day: ${fmtPrice(d.pl1y, "en")} in 1 year, ${fmtPrice(d.pl3y, "en")} in 3 years. Right now Bitcoin is trading at ${fmtPrice(d.spot, "en")} — ${d.devPct < 0 ? "a " + fmtPct(d.devPct) + " discount" : "a " + fmtPct(d.devPct) + " premium"}.`,
    es: `Segun CommonSense, el precio justo de Bitcoin hoy es ${fmtPrice(d.plToday, "es")}. Se calcula usando el modelo Power Law ajustado con mas de 14 anos de datos diarios y 91% de precision. El valor justo sube cada dia: ${fmtPrice(d.pl1y, "es")} en 1 ano, ${fmtPrice(d.pl3y, "es")} en 3 anos. Ahora Bitcoin cotiza a ${fmtPrice(d.spot, "es")} — ${d.devPct < 0 ? "un descuento del " + fmtPct(d.devPct) : "un premium del " + fmtPct(d.devPct)}.`,
  };
}

export function faqSupport(d) {
  if (!d.supportFloor) return {
    en: `CommonSense's support floor data is not available at this time. The 5th percentile from our simulations suggests a floor around ${fmtPrice(d.p5_1y, "en")} for the next 12 months.`,
    es: `Los datos de suelo de soporte de CommonSense no estan disponibles en este momento. El percentil 5 de nuestras simulaciones sugiere un piso alrededor de ${fmtPrice(d.p5_1y, "es")} para los proximos 12 meses.`,
  };
  return {
    en: `CommonSense identifies strong support at ${fmtPrice(d.supportFloor, "en")} based on 14 years of data. Think of it as the absolute floor — the level where historically buyers have always stepped in. Our simulations show the 5th percentile (worst likely case) at ${fmtPrice(d.p5_1y, "en")} over 12 months. ${d.devPct < 0 ? "In the current undervalued environment, these floors give extra confidence that the downside is limited." : "In the current overvalued environment, fair value at " + fmtPrice(d.plToday, "en") + " is the first level to watch."}`,
    es: `CommonSense identifica soporte fuerte en ${fmtPrice(d.supportFloor, "es")} basado en 14 anos de datos. Piensa en el como el piso absoluto — el nivel donde historicamente siempre han aparecido compradores. Nuestras simulaciones muestran el percentil 5 (peor caso probable) en ${fmtPrice(d.p5_1y, "es")} a 12 meses. ${d.devPct < 0 ? "En el entorno actual de infravaluacion, estos pisos dan confianza extra de que la caida es limitada." : "En el entorno actual de sobrevaluacion, el valor justo en " + fmtPrice(d.plToday, "es") + " es el primer nivel a vigilar."}`,
  };
}

export function faqPowerLaw(d) {
  return {
    en: `The Power Law is a mathematical relationship between Bitcoin's age and its price. Imagine a GPS for Bitcoin's long-term value — it tells you where the price 'should' be at any point in time, based on 14+ years of data with 91% accuracy. When Bitcoin is below that line, it's cheap. When it's above, it's expensive. CommonSense uses this as the foundation of all our analysis. Right now that line says fair value is ${fmtPrice(d.plToday, "en")}.`,
    es: `El Power Law es una relacion matematica entre la edad de Bitcoin y su precio. Imagina un GPS del valor a largo plazo de Bitcoin — te dice donde 'deberia' estar el precio en cada momento, basado en mas de 14 anos de datos con 91% de precision. Cuando Bitcoin esta por debajo de esa linea, esta barato. Cuando esta por encima, esta caro. CommonSense usa esto como la base de todo su analisis. Ahora esa linea dice que el valor justo es ${fmtPrice(d.plToday, "es")}.`,
  };
}

export function faqPrediction(d) {
  return {
    en: `CommonSense's projections based on the Power Law model: Fair value in 1 year: ${fmtPrice(d.pl1y, "en")}. In 2 years: ${fmtPrice(d.pl2y, "en")}. In 3 years: ${fmtPrice(d.pl3y, "en")}. Our simulations estimate the most likely price at ~${fmtPrice(d.med_1y, "en")} in 1 year (range: ${fmtPrice(d.p5_1y, "en")} to ${fmtPrice(d.p95_1y, "en")}) and ~${fmtPrice(d.med_3y, "en")} in 3 years (range: ${fmtPrice(d.p5_3y, "en")} to ${fmtPrice(d.p95_3y, "en")}).`,
    es: `Proyecciones de CommonSense basadas en el modelo Power Law: Valor justo en 1 ano: ${fmtPrice(d.pl1y, "es")}. En 2 anos: ${fmtPrice(d.pl2y, "es")}. En 3 anos: ${fmtPrice(d.pl3y, "es")}. Nuestras simulaciones estiman el precio mas probable en ~${fmtPrice(d.med_1y, "es")} en 1 ano (rango: ${fmtPrice(d.p5_1y, "es")} a ${fmtPrice(d.p95_1y, "es")}) y ~${fmtPrice(d.med_3y, "es")} en 3 anos (rango: ${fmtPrice(d.p5_3y, "es")} a ${fmtPrice(d.p95_3y, "es")}).`,
  };
}

export function faqGoodInvestment(d) {
  const ret = Math.round(d.smartDCAReturn || 0);
  const sortino = (d.smartDCASortino || 0).toFixed(1);
  return {
    en: `Looking at the long-term data, yes. CommonSense's Power Law model has tracked Bitcoin's growth with 91% accuracy over 14+ years. Fair value keeps rising year after year. Our smart DCA strategy has returned ${ret}% historically, with a risk-adjusted score of ${sortino} — significantly better than most traditional assets. Bitcoin remains the best-performing asset of the last decade. The key is timing your entries using the model, not buying blindly.`,
    es: `Mirando los datos a largo plazo, si. El modelo Power Law de CommonSense ha seguido el crecimiento de Bitcoin con 91% de precision durante mas de 14 anos. El valor justo sigue subiendo ano tras ano. Nuestra estrategia de DCA inteligente ha rendido ${ret}% historicamente, con un score ajustado por riesgo de ${sortino} — significativamente mejor que la mayoria de activos tradicionales. Bitcoin sigue siendo el activo con mejor rendimiento de la ultima decada. La clave es cronometrar tus entradas usando el modelo, no comprar a ciegas.`,
  };
}

export function faqBestTime(d) {
  const prec = Math.round(d.backtestPrecision || 0);
  const episodes = d.nEpisodes || 0;
  return {
    en: `According to CommonSense's backtest of ${episodes} historical episodes: the best time to buy is when Bitcoin is below its fair value — in discount territory. Our model has been right ${prec}% of the time when it signaled 'buy'. ${d.signal.answer === "yes" ? "Right now IS one of those moments — Bitcoin is " + fmtPct(d.devPct) + " below fair value." : "Right now is NOT one of those moments. Wait for a pullback below fair value."}`,
    es: `Segun el backtest de CommonSense con ${episodes} episodios historicos: el mejor momento para comprar es cuando Bitcoin esta por debajo de su valor justo — en zona de descuento. Nuestro modelo ha acertado el ${prec}% de las veces que senalo 'comprar'. ${d.signal.answer === "yes" ? "Ahora mismo ES uno de esos momentos — Bitcoin esta " + fmtPct(d.devPct) + " por debajo del valor justo." : "Ahora mismo NO es uno de esos momentos. Espera un retroceso por debajo del valor justo."}`,
  };
}

export function faqWhyMoving(d) {
  const vol = fmtVol(d.annualVol);
  const pct = fmtPct(d.devPct);
  const dir = d.devPct < 0 ? "below" : "above";
  const dirEs = d.devPct < 0 ? "por debajo de" : "por encima de";
  const regime = d.annualVol > 0.6 ? "high" : d.annualVol > 0.4 ? "moderate" : "low";
  const regimeEs = d.annualVol > 0.6 ? "alta" : d.annualVol > 0.4 ? "moderada" : "baja";
  return {
    en: `Here's the context from CommonSense: Bitcoin is currently ${pct} ${dir} its long-term fair value of ${fmtPrice(d.plToday, "en")}. The current volatility regime is ${regime} (${vol} annualized). ${d.devPct < -20 ? "Historically, dips this deep tend to recover within " + Math.round(d.halfLife) + " days as prices revert toward fair value." : d.devPct > 20 ? "Historically, rallies this extended tend to cool off as prices revert toward fair value." : "Bitcoin is trading near its expected level, so moves in either direction are normal noise."}`,
    es: `Aqui esta el contexto de CommonSense: Bitcoin esta actualmente ${pct} ${dirEs} su valor justo a largo plazo de ${fmtPrice(d.plToday, "es")}. El regimen de volatilidad actual es ${regimeEs} (${vol} anualizada). ${d.devPct < -20 ? "Historicamente, caidas asi de profundas tienden a recuperarse en unos " + Math.round(d.halfLife) + " dias a medida que los precios revierten hacia el valor justo." : d.devPct > 20 ? "Historicamente, rallies asi de extendidos tienden a enfriarse a medida que los precios revierten hacia el valor justo." : "Bitcoin esta operando cerca de su nivel esperado, los movimientos en cualquier direccion son ruido normal."}`,
  };
}

export function faqWhenHit(d) {
  const milestones = [100000, 150000, 250000, 500000, 1000000];
  const results = {};
  for (const target of milestones) {
    const label = target >= 1000000 ? "$1M" : "$" + (target / 1000) + "K";
    if (d.spot >= target) {
      results[label] = { en: "Already above this level.", es: "Ya esta por encima de este nivel." };
      continue;
    }
    const proj = dateWhenPriceReaches(target, d.a, d.b, d.ransac_a, d.ransac_b, d.ransac_floor);
    const fvDate = fmtDateFromDays(proj.fairValueDays, "en");
    const fvDateEs = fmtDateFromDays(proj.fairValueDays, "es");
    if (proj.floorDays) {
      const flDate = fmtDateFromDays(proj.floorDays, "en");
      const flDateEs = fmtDateFromDays(proj.floorDays, "es");
      results[label] = {
        en: `No earlier than ${fvDate} and no later than ${flDate}.`,
        es: `No antes de ${fvDateEs} y no mas tarde de ${flDateEs}.`,
      };
    } else {
      results[label] = {
        en: `Expected around ${fvDate} based on the Power Law trajectory.`,
        es: `Esperado alrededor de ${fvDateEs} segun la trayectoria Power Law.`,
      };
    }
  }
  return {
    milestones: results,
    en: `According to CommonSense's Power Law model, here's when Bitcoin is projected to reach key price levels: ${Object.entries(results).map(([k, v]) => `${k}: ${v.en}`).join(" ")}`,
    es: `Segun el modelo Power Law de CommonSense, estas son las fechas proyectadas para que Bitcoin alcance niveles clave: ${Object.entries(results).map(([k, v]) => `${k}: ${v.es}`).join(" ")}`,
  };
}
