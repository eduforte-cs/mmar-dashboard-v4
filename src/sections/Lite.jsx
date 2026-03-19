import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { bd, mn } from "../theme/tokens";
import { fmtK } from "../engine/constants.js";
import Toggle from "../components/Toggle";

const HOW_TO_READ = [
  ["Not a price prediction.", "The model gives probabilities, not a single number."],
  ["Not a trading signal.", "The YES/NO assumes you hold for at least 1 year."],
  ["Not a guarantee.", "2,000 simulations show plausible futures, not all."],
  ["Don't invest money you can't lose.", "Even at Strong Buy, catastrophic loss is possible."],
];

export default function Lite({ d, derived }) {
  const { t } = useTheme();
  if (!d || !derived) return null;

  const { verdict } = derived;
  const horizonCards = verdict.horizonCards || [];
  const paras = verdict.paras || [];

  return (
    <>
      {/* Horizons */}
      <div className="horizon-grid" style={{
        display: "grid", gridTemplateColumns: "1fr",
        borderBottom: `1px solid ${t.border}`,
      }}>
        {horizonCards.map((c, i) => (
          <div key={c.horizon} style={{
            padding: "28px 0",
            borderBottom: i === 0 ? `1px solid ${t.borderFaint}` : "none",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "baseline", marginBottom: 16,
            }}>
              <div>
                <span style={{
                  fontFamily: bd, fontSize: 10, color: t.faint,
                  textTransform: "uppercase", letterSpacing: "0.08em",
                }}>
                  {c.horizon}
                </span>
                <span style={{
                  fontFamily: bd, fontSize: 34, fontWeight: 700,
                  color: t.cream, letterSpacing: "-0.03em", marginLeft: 16,
                }}>
                  {fmtK(c.plTarget)}
                </span>
                <span style={{
                  fontFamily: mn, fontSize: 14, color: t.dim, marginLeft: 10,
                }}>
                  {c.plReturn >= 0 ? "+" : ""}{c.plReturn.toFixed(0)}%
                </span>
              </div>
              <span style={{ fontFamily: bd, fontSize: 12, color: t.dim }}>
                {c.verdict}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 0 }}>
              {[
                { l: "Profit", v: `${c.pProfit.toFixed(0)}%` },
                { l: "Loss", v: `${c.pLoss.toFixed(0)}%` },
                { l: "Reaches FV", v: `${c.pFairValue.toFixed(0)}%` },
                { l: "Worst case", v: fmtK(c.worstCase) },
              ].map((s, j) => (
                <div key={s.l} style={{
                  paddingRight: j < 3 ? 16 : 0,
                  borderRight: j < 3 ? `1px solid ${t.borderFaint}` : "none",
                  paddingLeft: j > 0 ? 16 : 0,
                }}>
                  <div style={{
                    fontFamily: bd, fontSize: 9, color: t.faint,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>
                    {s.l}
                  </div>
                  <div style={{
                    fontFamily: mn, fontSize: 16, color: t.cream,
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

      {/* Why */}
      <Toggle label="Why?" section="Explanation" textOnly defaultOpen>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {paras.map((p, i) => (
            <p key={i} style={{
              fontFamily: bd, fontSize: 17, fontWeight: 400,
              color: t.cream, lineHeight: 1.7, margin: 0,
            }}>
              {p}
            </p>
          ))}
        </div>
      </Toggle>

      {/* How to read */}
      <Toggle label="How should I read this?" section="Interpretation" textOnly>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {HOW_TO_READ.map(([bold, rest], i) => (
            <p key={i} style={{
              fontFamily: bd, fontSize: 17, fontWeight: 400,
              color: t.cream, lineHeight: 1.6, margin: 0,
            }}>
              <strong style={{ fontWeight: 600 }}>{bold}</strong> {rest}
            </p>
          ))}
        </div>
      </Toggle>
    </>
  );
}
