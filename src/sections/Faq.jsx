import React, { useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { bd, mn } from "../theme/tokens";
import CatLabel from "../components/CatLabel";
import FaqToggle from "../components/FaqToggle";

const FAQS = {
  Model: [
    {
      q: "What is the Bitcoin Power Law model?",
      a: "A log-log linear regression on Bitcoin's entire price history showing BTC follows a power-law growth trajectory similar to network effects. R² > 0.91 across 16 years — one of the most persistent statistical regularities in financial assets.",
    },
    {
      q: "What does it mean that Bitcoin is fractal?",
      a: "Bitcoin's returns exhibit self-similar patterns across time scales. The statistical structure of daily moves resembles monthly and yearly moves. This multifractality (measured by λ²) means volatility clusters and extreme moves are more common than Gaussian models predict.",
    },
    {
      q: "How does the calculation work?",
      a: "Three layers: (1) Power Law gives fair value + σ bands via WLS, and support floor via RANSAC, (2) MMAR provides fractal dynamics — Hurst exponent, intermittency λ², regime-switching volatility, (3) Monte Carlo simulates 2,000 price paths combining both. The verdict scores four factors with backtest-calibrated weights.",
    },
    {
      q: "What is Monte Carlo and how is it used here?",
      a: "Running thousands of random simulations using estimated parameters. Each path uses fractal cascades, regime-switching volatility, and MMAR dynamics — not simple random walks. The fan charts show the probability distribution of outcomes, not a single prediction.",
    },
  ],
  Signal: [
    {
      q: "How does the buy/sell signal work?",
      a: "Buy scores four factors: price discount, loss probability, fair value reach probability, and floor proximity — weighted by walk-forward backtest. Sell has two independent paths: Power Law overextension (σ threshold) and Hurst momentum divergences (3 sub-signals). Either sell path alone is sufficient.",
    },
    {
      q: "What are Hurst divergences and why do they signal corrections?",
      a: "Three divergences: (D1) price extending while H falls — momentum weakening under rising price, (D2) short-term H breaking below long-term H — fracture starts at shorter scales, (D3) H falling while volatility expands — persistence weakens as uncertainty grows. When all three fire simultaneously, it's the highest-conviction sell configuration.",
    },
  ],
  Data: [
    {
      q: "Where does the data come from?",
      a: "Monthly prices 2010–2013 (~33 points from early records), daily CoinGecko from April 2013 (~4,700 points), and live Binance spot refreshing every 60 seconds. Everything recalculates on every page load — Power Law, RANSAC, fractal parameters, Monte Carlo, backtest, verdict. Nothing is cached.",
    },
    {
      q: "How accurate is this?",
      a: "The Power Law fit has R² above 0.91 over 16 years. RANSAC support has contained every cycle bottom since 2013. The bubble zone has identified every cycle top. The episode timing analysis uses 5 completed discount and 7 overheated episodes — small but consistent samples. Past consistency doesn't guarantee the future.",
    },
  ],
  General: [
    {
      q: "How is this different from technical analysis?",
      a: "TA uses patterns in recent price action and operates on days to weeks. This model operates on years — a 16-year structural trajectory, 1–3 year Monte Carlo projections, multi-month deviation episodes. The question isn't 'will Bitcoin go up tomorrow?' but 'if I buy today and hold for a year, what are the probabilities?'",
    },
    {
      q: "How should this NOT be interpreted?",
      a: "Not a price prediction — probabilities, not a number. Not a trading signal — assumes 1Y hold minimum. Not a guarantee — simulations show plausible futures, not all futures. Don't invest money you can't lose. Even at Strong Buy with all signals green, catastrophic loss is possible.",
    },
    {
      q: "Who built this?",
      a: "Built by Edu Forte and CommonSense, a digital asset manager based in Barcelona. The approach combines Santostasi/Burger Power Law, Mandelbrot's MMAR, DFA-based Hurst estimation, regime-switching volatility, EVT/GPD empirical cap, and a probabilistic verdict validated through walk-forward backtesting.",
    },
    {
      q: "What are the limitations?",
      a: "The Power Law is empirical, not physical — it could break if adoption dynamics fundamentally change. Episode analysis uses only 5–7 historical episodes per zone. The RANSAC support is a historical minimum, not a physical barrier. This is a quantitative model, not financial advice. It cannot predict black swans, regulatory shifts, or protocol failures.",
    },
  ],
};

const CATEGORIES = ["Model", "Signal", "Data", "General"];
const TOTAL = Object.values(FAQS).reduce((s, arr) => s + arr.length, 0);

export default function Faq() {
  const { t } = useTheme();
  const [activeCat, setActiveCat] = useState("Model");

  return (
    <div style={{ animation: "fi 0.3s ease" }}>
      {/* Page title */}
      <div style={{ padding: "48px 0 36px", borderBottom: `1px solid ${t.border}` }}>
        <h2 className="hero-title" style={{
          fontFamily: bd, fontSize: 56, fontWeight: 800,
          color: t.cream, letterSpacing: "-0.04em",
          lineHeight: 0.95, margin: 0,
        }}>
          FAQs
        </h2>
      </div>

      {/* Sub-nav */}
      <div style={{
        display: "flex", alignItems: "center",
        borderBottom: `1px solid ${t.border}`, gap: 0,
      }}>
        <span style={{
          fontFamily: mn, fontSize: 10, color: t.ghost,
          padding: "14px 0", marginRight: "auto",
        }}>
          {TOTAL} questions
        </span>
        {CATEGORIES.map(cat => (
          <span
            key={cat}
            onClick={() => setActiveCat(cat)}
            style={{
              fontFamily: bd, fontSize: 13, fontWeight: 500,
              color: activeCat === cat ? t.cream : t.faint,
              padding: "14px 24px", cursor: "pointer",
              borderBottom: activeCat === cat
                ? `2px solid ${t.cream}`
                : "2px solid transparent",
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

      {/* Questions */}
      {CATEGORIES.map(cat => (
        <div key={cat}>
          <CatLabel label={cat} />
          {FAQS[cat].map(f => (
            <FaqToggle
              key={f.q}
              question={f.q}
              answer={f.a}
              category={cat}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
