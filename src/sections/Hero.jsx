import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { bd, mn } from "../theme/tokens";
import Gauge from "../components/Gauge";

// Placeholder data — will be replaced by engine results
const MOCK = {
  answer: "YES",
  subtitle: "Buy · Confidence moderate",
  price: "$84,432",
  priceDelta: "+1.8% 24h",
  sigma: -0.38,
  sigmaLabel: "Mild discount",
  fairValue: "$91,200",
  fairSub: "Power Law WLS",
  support: "$48,900",
  supportSub: "RANSAC −1.8σ",
  summary:
    "The odds are in your favor. Both the structural and probabilistic picture support entry. Bitcoin at $84K is 7% below fair value — right in the sweet spot where historical returns have been strongest.",
};

export default function Hero({ data = MOCK }) {
  const { t } = useTheme();
  const d = data;

  return (
    <>
      {/* Title + Verdict */}
      <div style={{ padding: "32px 0", borderBottom: `1px solid ${t.border}` }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "flex-end", flexWrap: "wrap", gap: 20,
        }}>
          <div style={{ minWidth: 200 }}>
            <h1 className="hero-title" style={{
              fontFamily: bd, fontSize: 36, fontWeight: 700,
              color: t.cream, letterSpacing: "-0.04em",
              lineHeight: 0.95, margin: 0,
            }}>
              Should I buy<br />Bitcoin today?
            </h1>
            <p style={{
              fontFamily: bd, fontSize: 13, fontWeight: 300,
              color: t.faint, marginTop: 14, lineHeight: 1.6,
            }}>
              A quantitative answer. 16 years of data. 2,000 simulated futures.
            </p>
          </div>
          <div>
            <div className="verdict-num" style={{
              fontFamily: bd, fontSize: 56, fontWeight: 700,
              color: t.cream, lineHeight: 0.85, letterSpacing: "-0.05em",
            }}>
              {d.answer}
            </div>
            <div style={{ fontFamily: bd, fontSize: 14, color: t.dim, marginTop: 8 }}>
              {d.subtitle}
            </div>
          </div>
        </div>
      </div>

      {/* Price + Sigma strip */}
      <div className="data-grid-4" style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        borderBottom: `1px solid ${t.border}`,
      }}>
        {[
          { l: "Price", v: d.price, s: d.priceDelta },
          { l: "σ from fair value", v: `${d.sigma >= 0 ? "+" : ""}${d.sigma.toFixed(2)}σ`, s: d.sigmaLabel },
          { l: "Fair value", v: d.fairValue, s: d.fairSub },
          { l: "Support floor", v: d.support, s: d.supportSub },
        ].map((item, i) => (
          <div key={item.l} style={{
            padding: "20px 0",
            borderRight: (i % 2 === 0) ? `1px solid ${t.border}` : "none",
            paddingRight: (i % 2 === 0) ? 24 : 0,
            paddingLeft: (i % 2 === 1) ? 24 : 0,
            borderBottom: i < 2 ? `1px solid ${t.borderFaint}` : "none",
          }}>
            <div style={{
              fontFamily: bd, fontSize: 10, color: t.faint,
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6,
            }}>
              {item.l}
            </div>
            <div style={{
              fontFamily: mn, fontSize: 22, fontWeight: 500,
              color: t.cream, letterSpacing: "-0.02em",
            }}>
              {item.v}
            </div>
            <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginTop: 3 }}>
              {item.s}
            </div>
          </div>
        ))}
      </div>

      {/* Gauge */}
      <Gauge sigma={d.sigma} />

      {/* Summary */}
      <div style={{ padding: "24px 0 28px", borderBottom: `1px solid ${t.border}` }}>
        <p style={{
          fontFamily: bd, fontSize: 16, fontWeight: 300,
          color: t.dim, lineHeight: 1.7, margin: 0, maxWidth: 640,
        }}>
          {d.summary}
        </p>
      </div>
    </>
  );
}
