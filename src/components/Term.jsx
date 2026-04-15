import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../theme/ThemeContext";
import { useI18n } from "../i18n/I18nContext";
import { bd, mn } from "../theme/tokens";

// ─────────────────────────────────────────────────────────────────
// Glossary — inline dictionary of quant terms + <Term /> component.
//
// Usage:
//   <Term id="sigma" />               → info icon only
//   <Term id="sigma">σ</Term>          → children + info icon
//
// Clicking the icon opens a popover (portaled to document.body)
// with the term's title and short definition. Closes on click
// outside, Escape, or scroll.
//
// The dictionary is kept inline rather than in en.json / es.json
// because the content is specialised and lives alongside the
// component that consumes it. Adding a new term is one block
// below; no i18n JSON churn.
// ─────────────────────────────────────────────────────────────────

const GLOSSARY = {
  sigma: {
    en: {
      title: "Sigma (σ)",
      body: "How many standard deviations Bitcoin's price is from its Power Law fair value. Negative means undervalued (buy zone). Positive means overvalued (caution zone). The buy signal triggers at σ < −0.5.",
    },
    es: {
      title: "Sigma (σ)",
      body: "Cuántas desviaciones estándar está el precio de Bitcoin respecto a su valor justo del Power Law. Negativo = infravalorado (zona de compra). Positivo = sobrevalorado (zona de precaución). La señal de compra se activa en σ < −0,5.",
    },
  },

  hurst: {
    en: {
      title: "Hurst exponent (H)",
      body: "Measures trend persistence. H > 0.5 means trending (the direction tends to continue). H < 0.5 means mean-reverting (prices oscillate around a central value). H = 0.5 is a random walk. Bitcoin typically sits around 0.55–0.60.",
    },
    es: {
      title: "Exponente de Hurst (H)",
      body: "Mide la persistencia de tendencia. H > 0,5 significa con tendencia (la dirección tiende a continuar). H < 0,5 significa reversión a la media (los precios oscilan alrededor de un valor central). H = 0,5 es una caminata aleatoria. Bitcoin típicamente se sitúa en 0,55–0,60.",
    },
  },

  sortino: {
    en: {
      title: "Sortino ratio",
      body: "A risk-adjusted return metric similar to Sharpe, but it only penalises downside volatility. A high Sortino means returns come with few painful drawdowns. Smart DCA scores 6.58 vs 3.34 for blind DCA.",
    },
    es: {
      title: "Ratio de Sortino",
      body: "Una métrica de retorno ajustado por riesgo similar a Sharpe, pero que solo penaliza la volatilidad a la baja. Un Sortino alto significa que los retornos vienen con pocas caídas dolorosas. Smart DCA obtiene 6,58 vs 3,34 para DCA ciego.",
    },
  },

  r2: {
    en: {
      title: "R² (coefficient of determination)",
      body: "How well the Power Law regression fits Bitcoin's historical price. R² ranges from 0 (no fit) to 1 (perfect fit). This model achieves R² ≈ 0.907 — extraordinarily high for a financial time series.",
    },
    es: {
      title: "R² (coeficiente de determinación)",
      body: "Qué tan bien la regresión del Power Law se ajusta al precio histórico de Bitcoin. R² va de 0 (sin ajuste) a 1 (ajuste perfecto). Este modelo alcanza R² ≈ 0,907 — extraordinariamente alto para una serie temporal financiera.",
    },
  },

  powerLaw: {
    en: {
      title: "Power Law",
      body: "A mathematical relationship where price scales as a power of time: log(price) = a + b × log(days). Bitcoin has followed this for 16 years with R² above 0.9. The core of the model — fair value is the regression line.",
    },
    es: {
      title: "Ley de Potencias (Power Law)",
      body: "Una relación matemática donde el precio escala como una potencia del tiempo: log(precio) = a + b × log(días). Bitcoin la ha seguido durante 16 años con R² superior a 0,9. Es el núcleo del modelo — el valor justo es la línea de regresión.",
    },
  },

  ransac: {
    en: {
      title: "RANSAC",
      body: "Random Sample Consensus. A robust regression that automatically excludes outliers (like bubble peaks). We use it to fit the support floor — the level Bitcoin has never traded below.",
    },
    es: {
      title: "RANSAC",
      body: "Random Sample Consensus. Una regresión robusta que excluye automáticamente los valores atípicos (como los picos de burbuja). La usamos para ajustar el piso de soporte — el nivel por debajo del cual Bitcoin nunca ha cotizado.",
    },
  },

  mmar: {
    en: {
      title: "MMAR",
      body: "Mandelbrot's Multifractal Model of Asset Returns. A volatility model that captures fat tails, volatility clustering, and long memory — features Gaussian models completely miss. Our Monte Carlo is built on MMAR dynamics.",
    },
    es: {
      title: "MMAR",
      body: "Modelo Multifractal de Retornos de Activos de Mandelbrot. Un modelo de volatilidad que captura colas gruesas, clustering de volatilidad y memoria larga — características que los modelos gaussianos pierden por completo. Nuestro Monte Carlo está construido sobre dinámica MMAR.",
    },
  },

  lambda2: {
    en: {
      title: "Lambda² (λ²)",
      body: "The multifractal intermittency parameter. Measures how volatility clusters across different time scales. Higher λ² means bigger swings between calm and chaotic periods. Bitcoin typically sits around 0.04–0.08.",
    },
    es: {
      title: "Lambda² (λ²)",
      body: "El parámetro de intermitencia multifractal. Mide cómo se agrupa la volatilidad a través de diferentes escalas temporales. Un λ² más alto significa mayores oscilaciones entre períodos calmos y caóticos. Bitcoin se sitúa típicamente en 0,04–0,08.",
    },
  },

  dfa: {
    en: {
      title: "DFA (Detrended Fluctuation Analysis)",
      body: "The method we use to compute the Hurst exponent. Measures how fluctuations scale with time window size after removing local trends. Robust against non-stationary data — which is why it works well for Bitcoin.",
    },
    es: {
      title: "DFA (Análisis de Fluctuación sin Tendencia)",
      body: "El método que usamos para calcular el exponente de Hurst. Mide cómo escalan las fluctuaciones con el tamaño de la ventana temporal tras remover las tendencias locales. Es robusto ante datos no estacionarios — por eso funciona bien para Bitcoin.",
    },
  },

  drawdown: {
    en: {
      title: "Drawdown",
      body: "The peak-to-trough decline during a specific period. A max drawdown of 67% means the portfolio lost 67% from its highest point before recovering. Key risk metric for understanding worst-case experiences.",
    },
    es: {
      title: "Drawdown (caída)",
      body: "La caída de pico a valle durante un período específico. Un drawdown máximo de 67% significa que el portafolio perdió 67% desde su punto más alto antes de recuperarse. Métrica clave de riesgo para entender las peores experiencias.",
    },
  },

  smartDCA: {
    en: {
      title: "Smart DCA",
      body: "A dollar-cost averaging strategy that modulates your monthly investment based on the signal. Buys more at discounts, sells into strength, redeploys profits at the next crash via a \"war chest\". Backtested: +1,118% vs +537% for blind DCA.",
    },
    es: {
      title: "Smart DCA",
      body: "Una estrategia de dollar-cost averaging que modula tu inversión mensual según la señal. Compra más en descuentos, vende en fortaleza, reinvierte ganancias en el próximo crash vía un \"war chest\". Backtest: +1.118% vs +537% para DCA ciego.",
    },
  },

  walkForward: {
    en: {
      title: "Walk-forward backtest",
      body: "A backtest methodology where the model is retrained on past data and tested on future data, then the window slides forward. Ensures no look-ahead bias — you only use information that was actually available at each decision point.",
    },
    es: {
      title: "Backtest walk-forward",
      body: "Una metodología de backtest donde el modelo se reentrena con datos pasados y se prueba con datos futuros, luego la ventana se desplaza hacia adelante. Garantiza que no haya sesgo de anticipación — solo usás información que realmente estaba disponible en cada punto de decisión.",
    },
  },

  monteCarlo: {
    en: {
      title: "Monte Carlo simulation",
      body: "A method that runs thousands of possible price paths using randomised inputs, then aggregates the outcomes into probabilities. We run 2,000 paths with MMAR dynamics to produce the percentile distribution at each horizon.",
    },
    es: {
      title: "Simulación Monte Carlo",
      body: "Un método que corre miles de caminos de precio posibles usando inputs aleatorizados, y agrega los resultados en probabilidades. Corremos 2.000 caminos con dinámica MMAR para producir la distribución de percentiles en cada horizonte.",
    },
  },

  halfLife: {
    en: {
      title: "Half-life",
      body: "The time it takes for Bitcoin's residual (distance from Power Law fair value) to revert halfway back to the mean. Shorter half-life = faster mean-reversion. We estimate it from an Ornstein-Uhlenbeck fit to daily residuals.",
    },
    es: {
      title: "Vida media",
      body: "El tiempo que tarda el residual de Bitcoin (su distancia al valor justo del Power Law) en volver a la mitad del camino hacia la media. Una vida media más corta = reversión más rápida. La estimamos con un ajuste de Ornstein-Uhlenbeck sobre los residuales diarios.",
    },
  },

  kappa: {
    en: {
      title: "κ (kappa)",
      body: "The mean-reversion speed in the Ornstein-Uhlenbeck model. Larger κ = faster pull back to fair value. Related to half-life via half-life = ln(2) / κ. Used as a diagnostic — not as the main driver of the Monte Carlo.",
    },
    es: {
      title: "κ (kappa)",
      body: "La velocidad de reversión a la media en el modelo de Ornstein-Uhlenbeck. Un κ más grande = reversión más rápida al valor justo. Relacionado con la vida media vía vida_media = ln(2) / κ. Se usa como diagnóstico — no como el motor principal del Monte Carlo.",
    },
  },

  ou: {
    en: {
      title: "Ornstein-Uhlenbeck (OU)",
      body: "A stochastic process that models mean-reverting behaviour — the distance from fair value is dragged back toward zero at a speed set by κ. Used here as a diagnostic to classify the current volatility regime (calm vs volatile), not as the main driver of the Monte Carlo.",
    },
    es: {
      title: "Ornstein-Uhlenbeck (OU)",
      body: "Un proceso estocástico que modela el comportamiento de reversión a la media — la distancia al valor justo es arrastrada hacia cero a una velocidad definida por κ. Se usa acá como diagnóstico para clasificar el régimen de volatilidad actual (calmo vs volátil), no como el motor principal del Monte Carlo.",
    },
  },

  evt: {
    en: {
      title: "EVT / GPD",
      body: "Extreme Value Theory with a Generalised Pareto Distribution fitted to the biggest positive residuals above the 85th percentile. Gives us an empirical upside cap for Bitcoin's tail — a data-driven ceiling for the bubble zone instead of an arbitrary multiple.",
    },
    es: {
      title: "EVT / GPD",
      body: "Teoría de Valores Extremos con una Distribución Generalizada de Pareto ajustada a los residuales positivos más grandes por encima del percentil 85. Nos da un techo empírico para la cola alcista de Bitcoin — un límite basado en datos para la zona de burbuja en lugar de un múltiplo arbitrario.",
    },
  },

  autocorrelation: {
    en: {
      title: "Autocorrelation",
      body: "How much a series of returns is correlated with its own past values at a given lag. Positive autocorrelation means momentum (recent direction tends to continue). Negative means mean-reversion. We average lags 1, 2, 3 and 5 to build the momentum diagnostic.",
    },
    es: {
      title: "Autocorrelación",
      body: "Cuánto se correlaciona una serie de retornos con sus propios valores pasados a un lag dado. La autocorrelación positiva significa momentum (la dirección reciente tiende a continuar). Negativa significa reversión a la media. Promediamos los lags 1, 2, 3 y 5 para construir el diagnóstico de momentum.",
    },
  },
};

// ── Info SVG icon — shapes only, no glyph fallback risk ─────────
function InfoIcon({ size = 14, color }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      style={{ verticalAlign: "middle", flexShrink: 0 }}
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.8" stroke={color} strokeWidth="1.3" fill="none" />
      <circle cx="8" cy="4.9" r="0.95" fill={color} />
      <rect x="7.25" y="7" width="1.5" height="5.2" fill={color} rx="0.5" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// <Term />
// ─────────────────────────────────────────────────────────────────
export default function Term({ id, children, iconSize = 13 }) {
  const { t } = useTheme();
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const triggerRef = useRef(null);
  const [pos, setPos] = useState(null);

  const entry = GLOSSARY[id];
  if (!entry) {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.warn(`<Term> unknown id: "${id}"`);
    }
    return children ? <span>{children}</span> : null;
  }
  const content = entry[lang] || entry.en;

  // ── Compute popover position after it's opened ───────────────
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const MAX_W = 320;
    const MARGIN = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Horizontal: centre on the icon, clamp to viewport
    let left = rect.left + rect.width / 2 - MAX_W / 2;
    if (left < MARGIN) left = MARGIN;
    if (left + MAX_W > vw - MARGIN) left = vw - MAX_W - MARGIN;

    // Vertical: prefer above; fall back to below if above is too cramped
    const spaceAbove = rect.top;
    const spaceBelow = vh - rect.bottom;
    const showAbove = spaceAbove >= 140 || spaceAbove > spaceBelow;

    setPos({
      left,
      top: showAbove ? rect.top - 10 : rect.bottom + 10,
      transform: showAbove ? "translateY(-100%)" : "none",
      width: MAX_W,
    });
  }, [open]);

  // ── Close on outside click, escape key, or scroll ────────────
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (e.target.closest?.("[data-glossary-popover]")) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const iconColor = open || hover ? t.cream : t.faint;

  return (
    <>
      {children}
      {children && " "}
      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-label={content.title}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: iconSize + 6,
          height: iconSize + 6,
          cursor: "help",
          verticalAlign: "middle",
          borderRadius: "50%",
          outline: "none",
          transition: "opacity 0.15s",
        }}
      >
        <InfoIcon size={iconSize} color={iconColor} />
      </span>

      {open && pos && createPortal(
        <div
          data-glossary-popover
          style={{
            position: "fixed",
            left: pos.left,
            top: pos.top,
            width: pos.width,
            transform: pos.transform,
            background: t.bgAlt,
            border: `1px solid ${t.border}`,
            borderRadius: 6,
            padding: "14px 16px",
            boxShadow: "0 14px 42px rgba(0, 0, 0, 0.65), 0 2px 8px rgba(0, 0, 0, 0.4)",
            zIndex: 10000,
            animation: "fi 0.16s ease-out",
            pointerEvents: "auto",
          }}
        >
          <div style={{
            fontFamily: bd,
            fontSize: 13,
            fontWeight: 700,
            color: t.cream,
            marginBottom: 6,
            letterSpacing: "-0.01em",
          }}>
            {content.title}
          </div>
          <div style={{
            fontFamily: bd,
            fontSize: 12,
            color: t.dim,
            lineHeight: 1.6,
          }}>
            {content.body}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
