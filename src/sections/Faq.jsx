import React, { useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { useI18n } from "../i18n/I18nContext";
import { bd, mn } from "../theme/tokens";
import CatLabel from "../components/CatLabel";
import FaqToggle from "../components/FaqToggle";

const FAQS_EN = {
  Model: [
    { q: "What is the Bitcoin Power Law model?", a: "A log-log linear regression on Bitcoin's entire price history showing BTC follows a power-law growth trajectory similar to network effects. R² > 0.91 across 16 years — one of the most persistent statistical regularities in financial assets." },
    { q: "What does it mean that Bitcoin is fractal?", a: "Bitcoin's returns exhibit self-similar patterns across time scales. The statistical structure of daily moves resembles monthly and yearly moves. This multifractality (measured by λ²) means volatility clusters and extreme moves are more common than Gaussian models predict." },
    { q: "How does the calculation work?", a: "Three layers: (1) Power Law gives fair value + σ bands via WLS, and support floor via RANSAC, (2) MMAR provides fractal dynamics — Hurst exponent, intermittency λ², regime-switching volatility, (3) Monte Carlo simulates 2,000 price paths combining both. The verdict scores four factors with backtest-calibrated weights." },
    { q: "What is Monte Carlo and how is it used here?", a: "Running thousands of random simulations using estimated parameters. Each path uses fractal cascades, regime-switching volatility, and MMAR dynamics — not simple random walks. The fan charts show the probability distribution of outcomes, not a single prediction." },
  ],
  Signal: [
    { q: "How does the buy/sell signal work?", a: "Pure sigma thresholds: buy at σ < -0.5, sell at σ > 0.8. These were not optimized — they come from the structural properties of the sigma distribution. The 100% accuracy is a feature of the underlying Power Law relationship, not threshold tuning." },
    { q: "What is the Sortino ratio?", a: "A risk-adjusted return metric that only penalizes downside volatility (unlike Sharpe which penalizes all volatility). Smart DCA scores 6.58 vs 3.34 for blind DCA — the signal avoids crashes while allowing upside." },
  ],
  Data: [
    { q: "Where does the data come from?", a: "Monthly prices 2010–2013 (~33 points from early records), daily CoinGecko from April 2013 (~4,700 points), and live Binance spot refreshing every 60 seconds. Everything recalculates on every page load." },
    { q: "How accurate is this?", a: "The Power Law fit has R² above 0.91 over 16 years. The buy signal has been 100% accurate since 2017 (755 days, 30 episodes). The sell signal is 72% accurate. Past consistency doesn't guarantee the future." },
  ],
  General: [
    { q: "Is this financial advice?", a: "No. This is a quantitative research tool. Past accuracy does not guarantee future results. Bitcoin is volatile and the model has known limitations. Always do your own research and consult a financial advisor." },
    { q: "Who built this?", a: "Built by Edu Forte and CommonSense, a digital asset manager based in Barcelona. The approach combines Santostasi/Burger Power Law, Mandelbrot's MMAR, DFA-based Hurst estimation, regime-switching volatility, EVT/GPD, and probabilistic verdict validated through walk-forward backtesting." },
  ],
};

const FAQS_ES = {
  Modelo: [
    { q: "¿Qué es el modelo Power Law de Bitcoin?", a: "Una regresión log-log sobre toda la historia del precio de Bitcoin que muestra que BTC sigue una trayectoria de crecimiento tipo ley de potencia similar a los efectos de red. R² > 0.91 a lo largo de 16 años — una de las regularidades estadísticas más persistentes en activos financieros." },
    { q: "¿Qué significa que Bitcoin es fractal?", a: "Los retornos de Bitcoin exhiben patrones auto-similares a través de escalas temporales. La estructura estadística de los movimientos diarios se parece a los mensuales y anuales. Esta multifractalidad (medida por λ²) significa que la volatilidad se agrupa y los movimientos extremos son más comunes de lo que predicen los modelos gaussianos." },
    { q: "¿Cómo funciona el cálculo?", a: "Tres capas: (1) Power Law da el valor justo + bandas σ vía WLS, y piso de soporte vía RANSAC, (2) MMAR provee dinámica fractal — exponente de Hurst, intermitencia λ², volatilidad con cambio de régimen, (3) Monte Carlo simula 2.000 trayectorias de precio combinando ambos." },
    { q: "¿Qué es Monte Carlo y cómo se usa acá?", a: "Ejecutar miles de simulaciones aleatorias usando parámetros estimados. Cada trayectoria usa cascadas fractales, volatilidad con cambio de régimen, y dinámica MMAR — no caminatas aleatorias simples. Los gráficos de abanico muestran la distribución de probabilidad de resultados, no una predicción única." },
  ],
  Señal: [
    { q: "¿Cómo funciona la señal de compra/venta?", a: "Umbrales puros de sigma: compra en σ < -0.5, venta en σ > 0.8. No fueron optimizados — provienen de las propiedades estructurales de la distribución de sigma. La precisión del 100% es una característica de la relación Power Law subyacente, no del ajuste de umbrales." },
    { q: "¿Qué es el ratio Sortino?", a: "Una métrica de retorno ajustado por riesgo que solo penaliza la volatilidad a la baja (a diferencia de Sharpe que penaliza toda la volatilidad). Smart DCA tiene 6.58 vs 3.34 para DCA ciego — la señal evita las caídas mientras permite el alza." },
  ],
  Datos: [
    { q: "¿De dónde vienen los datos?", a: "Precios mensuales 2010–2013 (~33 puntos de registros tempranos), diarios de CoinGecko desde abril 2013 (~4.700 puntos), y precio spot en vivo de Binance actualizándose cada 60 segundos. Todo se recalcula en cada carga de página." },
    { q: "¿Qué tan preciso es?", a: "El ajuste Power Law tiene R² superior a 0.91 en 16 años. La señal de compra ha sido 100% precisa desde 2017 (755 días, 30 episodios). La señal de venta es 72% precisa. La consistencia pasada no garantiza el futuro." },
  ],
  General: [
    { q: "¿Es esto asesoramiento financiero?", a: "No. Es una herramienta de investigación cuantitativa. La precisión pasada no garantiza resultados futuros. Bitcoin es volátil y el modelo tiene limitaciones conocidas. Siempre hacé tu propia investigación y consultá a un asesor financiero." },
    { q: "¿Quién construyó esto?", a: "Construido por Edu Forte y CommonSense, un gestor de activos digitales con sede en Barcelona. El enfoque combina Power Law de Santostasi/Burger, MMAR de Mandelbrot, estimación de Hurst vía DFA, volatilidad con cambio de régimen, EVT/GPD, y veredicto probabilístico validado mediante backtesting walk-forward." },
  ],
};

const ALL_FAQS = { en: FAQS_EN, es: FAQS_ES };
const CATS_EN = ["Model", "Signal", "Data", "General"];
const CATS_ES = ["Modelo", "Señal", "Datos", "General"];
const ALL_CATS = { en: CATS_EN, es: CATS_ES };

export default function Faq() {
  const { t } = useTheme();
  const { t: tr, lang } = useI18n();
  const faqs = ALL_FAQS[lang] || FAQS_EN;
  const cats = ALL_CATS[lang] || CATS_EN;
  const [activeCat, setActiveCat] = useState(cats[0]);
  const total = Object.values(faqs).reduce((s, arr) => s + arr.length, 0);

  return (
    <div style={{ animation: "fi 0.3s ease" }}>
      <div style={{ padding: "48px 0 36px", borderBottom: `1px solid ${t.border}` }}>
        <h2 className="hero-title" style={{
          fontFamily: bd, fontSize: 56, fontWeight: 800,
          color: t.cream, letterSpacing: "-0.04em",
          lineHeight: 0.95, margin: 0,
        }}>
          FAQs
        </h2>
      </div>

      <div style={{
        display: "flex", alignItems: "center",
        borderBottom: `1px solid ${t.border}`, gap: 0,
      }}>
        <span style={{
          fontFamily: mn, fontSize: 10, color: t.ghost,
          padding: "14px 0", marginRight: "auto",
        }}>
          {total} {lang === "es" ? "preguntas" : "questions"}
        </span>
        {cats.map(cat => (
          <span
            key={cat}
            onClick={() => setActiveCat(cat)}
            style={{
              fontFamily: bd, fontSize: 13, fontWeight: 500,
              color: activeCat === cat ? t.cream : t.faint,
              padding: "14px 24px", cursor: "pointer",
              borderBottom: activeCat === cat ? `2px solid ${t.cream}` : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {cat}
          </span>
        ))}
        <span style={{
          fontFamily: bd, fontSize: 11, color: t.dim,
          padding: "14px 24px", marginLeft: "auto",
          borderLeft: `1px solid ${t.border}`,
        }}>
          commonsense.finance
        </span>
      </div>

      {cats.map(cat => (
        <div key={cat}>
          <CatLabel label={cat} />
          {faqs[cat].map(f => (
            <FaqToggle key={f.q} question={f.q} answer={f.a} category={cat} />
          ))}
        </div>
      ))}
    </div>
  );
}
