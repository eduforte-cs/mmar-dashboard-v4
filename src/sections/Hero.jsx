import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { bd, mn } from "../theme/tokens";
import { fmtK } from "../engine/constants.js";
import Gauge from "../components/Gauge";

export default function Hero({ d, derived }) {
  const { t } = useTheme();
  if (!d || !derived) return null;

  const { S0, sigmaFromPL: sigma, plToday, r2 } = d;
  const { verdict, supportPrice, deviationPct } = derived;

  const sigmaLabel = sigma < -1.0 ? "Deep discount" : sigma < -0.5 ? "Discount"
    : sigma < 0.5 ? "Near fair value" : sigma < 1.0 ? "Premium" : "Overheated";

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
              {verdict.answer}
            </div>
            <div style={{ fontFamily: bd, fontSize: 14, color: t.dim, marginTop: 8 }}>
              {verdict.subtitle} · Confidence {verdict.confidence}
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
          { l: "Price", v: fmtK(S0), s: `${d.source?.split("(")[0] || "Live"}` },
          { l: "σ from fair value", v: `${sigma >= 0 ? "+" : ""}${sigma.toFixed(2)}σ`, s: sigmaLabel },
          { l: "Fair value", v: fmtK(plToday), s: `Power Law WLS · R² ${r2.toFixed(3)}` },
          { l: "Support floor", v: fmtK(supportPrice), s: `RANSAC ${d.resFloorSigma?.toFixed(1) || ""}σ` },
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
      <Gauge sigma={sigma} />

      {/* Summary */}
      <div style={{ padding: "24px 0 28px", borderBottom: `1px solid ${t.border}` }}>
        <p style={{
          fontFamily: bd, fontSize: 16, fontWeight: 300,
          color: t.dim, lineHeight: 1.7, margin: 0, maxWidth: 640,
        }}>
          {verdict.answerSub}
        </p>
      </div>
    </>
  );
}
