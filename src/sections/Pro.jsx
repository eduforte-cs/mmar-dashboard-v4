import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { bd, mn } from "../theme/tokens";
import Toggle from "../components/Toggle";
import CatLabel from "../components/CatLabel";

const METRICS = [
  { l: "Hurst (90d)", v: "0.62", s: "Persistent" },
  { l: "λ² multifractal", v: "0.08", s: "Partition fn" },
  { l: "Buy score", v: "0.67", s: "Threshold 0.45" },
  { l: "Regime", v: "Accum", s: "5/7 conditions" },
];

const HORIZONS = [
  {
    h: "1 Year", target: "$114K", ret: "+35%",
    verdict: "Buy", pp: "78%", pl: "22%", fv: "68%", wc: "$52K",
  },
  {
    h: "3 Years", target: "$199K", ret: "+135%",
    verdict: "Strong Buy", pp: "92%", pl: "8%", fv: "81%", wc: "$71K",
  },
];

const PL_SIGNALS = [
  { name: "Price vs fair value", value: "−0.38σ", detail: "7% below fair value", met: true },
  { name: "Worst case floor", value: "$49K", detail: "−42% from today", met: true },
];

const MC_SIGNALS = [
  { name: "Chance of loss (12m)", value: "22%", detail: "P(loss 3Y): 8% · 92% paths profitable at 3Y", weight: "38%" },
  { name: "Chance reaching FV", value: "68%", detail: "FV in 12m: $114K", weight: "35%" },
  { name: "Chance hitting floor", value: "3.2%", detail: "Empirically calibrated", weight: "27%" },
];

const BACKTEST_METRICS = [
  { l: "Buy accuracy", v: "78%", s: "512 buy signals" },
  { l: "Avg return buy", v: "+42%", s: "12m horizon" },
  { l: "Return hold", v: "+12%", s: "335 hold periods" },
  { l: "Return sell", v: "−8%", s: "6m after sell signal" },
];

const RR_DATA = [
  { l: "Risk / Reward (1Y)", v: "3.2x", s: "Favorable asymmetry" },
  { l: "Market temperature", v: "Cool", s: "Below fair value zone" },
];

const PL_BANDS = [
  { l: "Bubble zone", v: "$168K", pct: "+99%" },
  { l: "Cycle ceiling", v: "$132K", pct: "+56%" },
  { l: "Fair value", v: "$114K", pct: "+35%" },
  { l: "Mild discount", v: "$86K", pct: "+2%" },
  { l: "Support floor", v: "$52K", pct: "−38%" },
];

const MC_LOSS = [
  { h: "3 months", v: "32%" },
  { h: "6 months", v: "26%" },
  { h: "1 year", v: "22%" },
  { h: "2 years", v: "12%" },
  { h: "3 years", v: "8%" },
];

const MODEL_PARAMS = [
  { l: "a (intercept)", v: "−17.01", s: "WLS" },
  { l: "b (slope)", v: "5.82", s: "WLS" },
  { l: "R²", v: "0.914", s: "Weighted" },
  { l: "σ residual", v: "0.72", s: "ln-space" },
  { l: "H (DFA-1)", v: "0.62", s: "90-day" },
  { l: "λ²", v: "0.08", s: "Partition fn" },
  { l: "κ global", v: "0.0018", s: "OU" },
  { l: "κ calm", v: "0.0024", s: "Regime 0" },
  { l: "κ volatile", v: "0.0005", s: "Regime 1" },
  { l: "Vol calm", v: "0.72x", s: "Scale" },
  { l: "Vol volatile", v: "1.41x", s: "Scale" },
  { l: "EVT cap", v: "+2.21σ", s: "GPD P99.5" },
  { l: "RANSAC a", v: "−18.42", s: "Robust" },
  { l: "RANSAC b", v: "6.12", s: "Robust" },
  { l: "RANSAC floor", v: "−0.48", s: "ln-space" },
];

function TextPlaceholder({ text }) {
  const { t } = useTheme();
  return (
    <p style={{
      fontFamily: bd, fontSize: 16, fontWeight: 400,
      color: t.cream, lineHeight: 1.7, margin: 0,
    }}>
      {text}
    </p>
  );
}

export default function Pro() {
  const { t } = useTheme();

  return (
    <>
      {/* Pro metrics strip */}
      <div className="data-grid-4" style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        borderBottom: `1px solid ${t.border}`,
      }}>
        {METRICS.map((d, i) => (
          <div key={d.l} style={{
            padding: "18px 0",
            borderRight: (i % 2 === 0) ? `1px solid ${t.border}` : "none",
            paddingRight: (i % 2 === 0) ? 24 : 0,
            paddingLeft: (i % 2 === 1) ? 24 : 0,
            borderBottom: i < 2 ? `1px solid ${t.borderFaint}` : "none",
          }}>
            <div style={{
              fontFamily: bd, fontSize: 9, color: t.faint,
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4,
            }}>
              {d.l}
            </div>
            <div style={{ fontFamily: mn, fontSize: 18, fontWeight: 500, color: t.cream }}>
              {d.v}
            </div>
            <div style={{ fontFamily: bd, fontSize: 10, color: t.faint, marginTop: 2 }}>
              {d.s}
            </div>
          </div>
        ))}
      </div>

      {/* ═══ VERDICT ═══ */}
      <CatLabel label="Verdict" />

      <Toggle label="The short answer" badge="Buy" defaultOpen>
        {/* Horizon cards */}
        <div className="inner-grid" style={{
          display: "grid", gridTemplateColumns: "1fr",
          gap: 0, marginBottom: 24,
        }}>
          {HORIZONS.map((c, i) => (
            <div key={c.h} style={{
              padding: "20px 0",
              borderBottom: i === 0 ? `1px solid ${t.borderFaint}` : "none",
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "baseline", marginBottom: 12,
              }}>
                <div>
                  <span style={{
                    fontFamily: bd, fontSize: 10, color: t.faint,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>
                    {c.h}
                  </span>
                  <span style={{
                    fontFamily: bd, fontSize: 30, fontWeight: 700,
                    color: t.cream, marginLeft: 14, letterSpacing: "-0.03em",
                  }}>
                    {c.target}
                  </span>
                  <span style={{ fontFamily: mn, fontSize: 13, color: t.dim, marginLeft: 8 }}>
                    {c.ret}
                  </span>
                </div>
                <span style={{ fontFamily: bd, fontSize: 11, color: t.dim }}>
                  {c.verdict}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
                {[
                  { l: "Profit", v: c.pp },
                  { l: "Loss", v: c.pl },
                  { l: "Reaches FV", v: c.fv },
                  { l: "Worst case", v: c.wc },
                ].map((s, j) => (
                  <div key={s.l} style={{
                    paddingRight: j < 3 ? 14 : 0,
                    borderRight: j < 3 ? `1px solid ${t.borderFaint}` : "none",
                    paddingLeft: j > 0 ? 14 : 0,
                  }}>
                    <div style={{
                      fontFamily: bd, fontSize: 8, color: t.faint,
                      textTransform: "uppercase", letterSpacing: "0.06em",
                    }}>
                      {s.l}
                    </div>
                    <div style={{
                      fontFamily: mn, fontSize: 15, color: t.cream,
                      fontWeight: 500, marginTop: 2,
                    }}>
                      {s.v}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* PL signals */}
        <div style={{
          fontFamily: bd, fontSize: 9, color: t.faint,
          textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10,
        }}>
          Power Law signals
        </div>
        {PL_SIGNALS.map(s => (
          <div key={s.name} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 0", borderBottom: `1px solid ${t.borderFaint}`,
          }}>
            <div>
              <div style={{ fontFamily: bd, fontSize: 13, fontWeight: 500, color: t.cream }}>
                {s.name}
              </div>
              <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginTop: 1 }}>
                {s.detail}
              </div>
            </div>
            <span style={{ fontFamily: mn, fontSize: 14, fontWeight: 500, color: t.cream }}>
              {s.value}
            </span>
          </div>
        ))}

        {/* MC signals */}
        <div style={{
          fontFamily: bd, fontSize: 9, color: t.faint,
          textTransform: "uppercase", letterSpacing: "0.08em",
          marginTop: 20, marginBottom: 10,
        }}>
          Monte Carlo signals
        </div>
        {MC_SIGNALS.map(s => (
          <div key={s.name} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 0", borderBottom: `1px solid ${t.borderFaint}`,
          }}>
            <div>
              <div style={{ fontFamily: bd, fontSize: 13, fontWeight: 500, color: t.cream }}>
                {s.name}
              </div>
              <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginTop: 1 }}>
                {s.detail}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontFamily: mn, fontSize: 14, fontWeight: 500, color: t.cream }}>
                {s.value}
              </span>
              <span style={{ fontFamily: mn, fontSize: 9, color: t.faint }}>
                w:{s.weight}
              </span>
            </div>
          </div>
        ))}

        {/* Backtest summary */}
        <div style={{
          marginTop: 20, padding: "14px 0",
          borderTop: `1px solid ${t.borderFaint}`,
        }}>
          <div style={{
            fontFamily: bd, fontSize: 9, color: t.faint,
            textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8,
          }}>
            Walk-forward backtest
          </div>
          <div style={{
            fontFamily: mn, fontSize: 12, color: t.dim, lineHeight: 1.8,
          }}>
            Precision: 78% · Avg return buy: +42% · Hold: +12% · n=847 · H and λ² fixed at full-period means
          </div>
        </div>
      </Toggle>

      <Toggle label="The long answer" section="Narrative" textOnly>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            "Bitcoin at $84K is 7% below its fair value of $91K. That's a fair-to-discounted price — right in the sweet spot where historical returns have been strongest.",
            "If you buy today and hold 1 year, there's a 68% chance the price reaches its fair value of $114K. The worst case floor is $49K (−42%). Over 3 years, the fair value target is $198K (+135%).",
            "Bitcoin is in an accumulation phase. Momentum building but not yet fully expressed.",
            "Your chance of loss after 1 year: ~22%. After 3 years: ~8%. Time is on your side.",
          ].map((p, i) => (
            <p key={i} style={{
              fontFamily: bd, fontSize: 17, fontWeight: 400,
              color: t.cream, lineHeight: 1.7, margin: 0,
            }}>
              {p}
            </p>
          ))}
          <p style={{
            fontFamily: bd, fontSize: 12, color: t.faint,
            fontStyle: "italic", marginTop: 8,
          }}>
            Generated dynamically from Power Law + MMAR + Monte Carlo. Walk-forward validated. Math, not prophecy.
          </p>
        </div>
      </Toggle>

      <Toggle label="Has this worked in the past?">
        <p style={{
          fontFamily: bd, fontSize: 17, fontWeight: 400,
          color: t.cream, lineHeight: 1.7, margin: "0 0 20px",
        }}>
          Tested against every point in Bitcoin's history since 2016. When the model said buy, the price was higher 12 months later 78% of the time. Bitcoin goes up in any random 12-month period 68% of the time — so the signal adds +10pp.
        </p>
        <div className="data-grid-4" style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 0, borderTop: `1px solid ${t.borderFaint}`,
        }}>
          {BACKTEST_METRICS.map((d, i) => (
            <div key={d.l} style={{
              padding: "14px 0",
              borderBottom: `1px solid ${t.borderFaint}`,
              borderRight: (i % 2 === 0) ? `1px solid ${t.borderFaint}` : "none",
              paddingRight: (i % 2 === 0) ? 20 : 0,
              paddingLeft: (i % 2 === 1) ? 20 : 0,
            }}>
              <div style={{
                fontFamily: bd, fontSize: 9, color: t.faint,
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3,
              }}>
                {d.l}
              </div>
              <div style={{ fontFamily: mn, fontSize: 18, fontWeight: 500, color: t.cream }}>
                {d.v}
              </div>
              <div style={{ fontFamily: bd, fontSize: 10, color: t.faint, marginTop: 2 }}>
                {d.s}
              </div>
            </div>
          ))}
        </div>
      </Toggle>

      <Toggle label="What's driving this" badge="0.67">
        <TextPlaceholder text="Full signals breakdown — PL signals, MC signals, weighted scores, sell warning paths. Content placeholder for production build." />
      </Toggle>

      {/* ═══ MARKET ═══ */}
      <CatLabel label="Market" />

      <Toggle label="Live snapshot" badge="Live" defaultOpen>
        {/* Risk/reward + temperature */}
        <div className="data-grid-2" style={{
          display: "grid", gridTemplateColumns: "1fr",
          gap: 0, borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 20,
        }}>
          {RR_DATA.map((d, i) => (
            <div key={d.l} style={{
              padding: "14px 0",
              borderBottom: i === 0 ? `1px solid ${t.borderFaint}` : "none",
            }}>
              <div style={{
                fontFamily: bd, fontSize: 9, color: t.faint,
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3,
              }}>
                {d.l}
              </div>
              <div style={{ fontFamily: mn, fontSize: 20, fontWeight: 500, color: t.cream }}>
                {d.v}
              </div>
              <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginTop: 2 }}>
                {d.s}
              </div>
            </div>
          ))}
        </div>

        {/* PL 1Y bands */}
        <div style={{
          fontFamily: bd, fontSize: 9, color: t.faint,
          textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10,
        }}>
          Power Law — 1 Year Forward
        </div>
        {PL_BANDS.map(lv => (
          <div key={lv.l} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "8px 0", borderBottom: `1px solid ${t.borderFaint}`,
          }}>
            <span style={{ fontFamily: bd, fontSize: 13, color: t.cream, fontWeight: 400 }}>
              {lv.l}
            </span>
            <div style={{ display: "flex", gap: 16 }}>
              <span style={{ fontFamily: mn, fontSize: 13, color: t.cream, fontWeight: 500 }}>
                {lv.v}
              </span>
              <span style={{
                fontFamily: mn, fontSize: 11, color: t.faint,
                width: 48, textAlign: "right",
              }}>
                {lv.pct}
              </span>
            </div>
          </div>
        ))}

        {/* MC loss probability */}
        <div style={{
          fontFamily: bd, fontSize: 9, color: t.faint,
          textTransform: "uppercase", letterSpacing: "0.08em",
          marginTop: 24, marginBottom: 10,
        }}>
          Probability of loss — Monte Carlo
        </div>
        {MC_LOSS.map(r => (
          <div key={r.h} style={{
            display: "flex", justifyContent: "space-between",
            padding: "8px 0", borderBottom: `1px solid ${t.borderFaint}`,
          }}>
            <span style={{ fontFamily: bd, fontSize: 13, color: t.dim }}>{r.h}</span>
            <span style={{ fontFamily: mn, fontSize: 13, color: t.cream, fontWeight: 500 }}>
              {r.v}
            </span>
          </div>
        ))}
      </Toggle>

      <Toggle label="Market Regime" badge="Accum">
        <TextPlaceholder text="Regime grid, momentum, vol regime, AC. Content in production." />
      </Toggle>
      <Toggle label="Hurst Regime — Trend Persistence">
        <TextPlaceholder text="σ+H combo, multi-scale Hurst, vol compression. Content in production." />
      </Toggle>
      <Toggle label="Time to Fair Value">
        <TextPlaceholder text="Episode gauge, duration bars, conditional estimate. Content in production." />
      </Toggle>
      <Toggle label="Historical Deviation">
        <TextPlaceholder text="σ area chart with reference lines. Content in production." />
      </Toggle>

      {/* ═══ MODELS ═══ */}
      <CatLabel label="Models" />

      <Toggle label="Power Law Model">
        <TextPlaceholder text="Log-log chart + range selector + σ bands. Content in production." />
      </Toggle>
      <Toggle label="Key Price Levels">
        <TextPlaceholder text="6 levels from +2σ to support. Content in production." />
      </Toggle>
      <Toggle label="Power Law — Forward Projections">
        <TextPlaceholder text="Horizons × σ bands table. Content in production." />
      </Toggle>
      <Toggle label="Monte Carlo — 1 Year">
        <TextPlaceholder text="Fan chart + stats + horizon table. Content in production." />
      </Toggle>
      <Toggle label="Monte Carlo — 3 Years">
        <TextPlaceholder text="3Y extension, same MMAR engine. Content in production." />
      </Toggle>
      <Toggle label="Risk Matrix — PL vs Monte Carlo">
        <TextPlaceholder text="7-row percentile comparison. Content in production." />
      </Toggle>

      <Toggle label="Model Parameters" badge="advanced">
        <div className="data-grid-4" style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0,
        }}>
          {MODEL_PARAMS.map((d, i) => (
            <div key={d.l} style={{
              padding: "12px 0",
              borderBottom: `1px solid ${t.borderFaint}`,
              borderRight: (i % 2 === 0) ? `1px solid ${t.borderFaint}` : "none",
              paddingRight: (i % 2 === 0) ? 20 : 0,
              paddingLeft: (i % 2 === 1) ? 20 : 0,
            }}>
              <div style={{
                fontFamily: bd, fontSize: 8, color: t.faint,
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2,
              }}>
                {d.l}
              </div>
              <div style={{ fontFamily: mn, fontSize: 15, color: t.cream, fontWeight: 500 }}>
                {d.v}
              </div>
              <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, marginTop: 1 }}>
                {d.s}
              </div>
            </div>
          ))}
        </div>
      </Toggle>
    </>
  );
}
