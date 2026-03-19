import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { bd, mn } from "../theme/tokens";
import Toggle from "../components/Toggle";

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

const WHY_PARAS = [
  "Bitcoin at $84K is 7% below its fair value of $91K. That's a fair-to-discounted price — right in the sweet spot where historical returns have been strongest.",
  "If you buy today and hold 1 year, there's a 68% chance the price reaches its fair value of $114K. The worst case floor — the lowest level Bitcoin has historically respected — is $49K (−42% from today).",
  "Bitcoin is in an accumulation phase. The fractal structure suggests momentum is building but hasn't fully expressed yet. Patience is rewarded in this zone.",
  "Your chance of being at a loss after 1 year: ~22%. After 3 years: ~8%. Time is on your side.",
];

const HOW_TO_READ = [
  ["Not a price prediction.", "The model gives probabilities, not a single number."],
  ["Not a trading signal.", "The YES/NO assumes you hold for at least 1 year."],
  ["Not a guarantee.", "2,000 simulations show plausible futures, not all."],
  ["Don't invest money you can't lose.", "Even at Strong Buy, catastrophic loss is possible."],
];

export default function Lite() {
  const { t } = useTheme();

  return (
    <>
      {/* Horizons */}
      <div className="horizon-grid" style={{
        display: "grid", gridTemplateColumns: "1fr",
        borderBottom: `1px solid ${t.border}`,
      }}>
        {HORIZONS.map((c, i) => (
          <div key={c.h} style={{
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
                  {c.h}
                </span>
                <span style={{
                  fontFamily: bd, fontSize: 34, fontWeight: 700,
                  color: t.cream, letterSpacing: "-0.03em", marginLeft: 16,
                }}>
                  {c.target}
                </span>
                <span style={{
                  fontFamily: mn, fontSize: 14, color: t.dim, marginLeft: 10,
                }}>
                  {c.ret}
                </span>
              </div>
              <span style={{ fontFamily: bd, fontSize: 12, color: t.dim }}>
                {c.verdict}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 0 }}>
              {[
                { l: "Profit", v: c.pp },
                { l: "Loss", v: c.pl },
                { l: "Reaches FV", v: c.fv },
                { l: "Worst case", v: c.wc },
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
          {WHY_PARAS.map((p, i) => (
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
