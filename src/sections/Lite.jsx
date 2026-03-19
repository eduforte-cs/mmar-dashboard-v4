import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { bd, mn } from "../theme/tokens";
import { fmtK } from "../engine/constants.js";
import Toggle from "../components/Toggle";

export default function Lite({ d, derived, setTab }) {
  const { t } = useTheme();
  if (!d || !derived) return null;

  const { S0 } = d;
  const { verdict } = derived;
  const paras = verdict.paras || [];

  return (
    <>
      {/* Title question with price */}
      <div style={{ padding: "32px 0 0" }}>
        <h1 className="hero-title" style={{
          fontFamily: bd, fontSize: 36, fontWeight: 700,
          color: t.cream, letterSpacing: "-0.04em",
          lineHeight: 1.05, margin: 0,
        }}>
          Should I buy<br />Bitcoin today<br />at {fmtK(S0)}?
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#27AE60",
            animation: "fi 2s ease-in-out infinite alternate",
          }} />
          <span style={{ fontFamily: bd, fontSize: 12, color: t.faint }}>Live</span>
        </div>
      </div>

      {/* Big answer */}
      <div style={{ padding: "48px 0 0" }}>
        <div className="verdict-num" style={{
          fontFamily: bd, fontSize: 80, fontWeight: 800,
          color: t.cream, letterSpacing: "-0.04em",
          lineHeight: 0.85, margin: 0,
        }}>
          {verdict.answer}
        </div>
        <div style={{ marginTop: 16 }}>
          <span style={{ fontFamily: bd, fontSize: 15, fontWeight: 500, color: t.cream }}>
            {verdict.subtitle}
          </span>
          <span style={{ fontFamily: bd, fontSize: 15, color: t.faint, marginLeft: 8 }}>
            — Confidence {verdict.confidence}
          </span>
        </div>
      </div>

      {/* Summary paragraph */}
      <div style={{ padding: "40px 0 32px", maxWidth: 540 }}>
        <p style={{
          fontFamily: bd, fontSize: 19, fontWeight: 400,
          color: t.cream, lineHeight: 1.7, margin: 0,
        }}>
          {verdict.answerSub}
        </p>
      </div>

      {/* Switch to Pro bar */}
      <div
        onClick={() => setTab && setTab("pro")}
        style={{
          display: "grid", gridTemplateColumns: "1fr auto",
          borderTop: `1px solid ${t.border}`,
          borderBottom: `1px solid ${t.border}`,
          cursor: "pointer",
        }}
      >
        <div style={{ padding: "16px 0", fontFamily: bd, fontSize: 14, color: t.faint }}>
          Want the full picture?
        </div>
        <div style={{
          padding: "16px 24px", borderLeft: `1px solid ${t.border}`,
          fontFamily: bd, fontSize: 14, fontWeight: 400, color: t.cream,
        }}>
          Switch to Pro
        </div>
      </div>

      {/* Why? toggle */}
      <Toggle label="Why?" section="Explanation" textOnly>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {paras.map((p, i) => (
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
            Generated from Power Law + MMAR + Monte Carlo. Walk-forward validated against every 30-day point since 2016.
          </p>
        </div>
      </Toggle>
    </>
  );
}
