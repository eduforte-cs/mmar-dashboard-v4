import React, { useRef } from "react";
import { useTheme } from "../theme/ThemeContext";
import { bd, mn } from "../theme/tokens";
import { fmtK } from "../engine/constants.js";
import Chevron from "../components/Chevron";

export default function Lite({ d, derived, setTab }) {
  const { t } = useTheme();
  const whyRef = useRef(null);
  if (!d || !derived) return null;

  const { S0 } = d;
  const { verdict } = derived;
  const paras = verdict.paras || [];

  const scrollToWhy = () => {
    whyRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* ── Viewport statement ── */}
      <div style={{
        height: "calc(100vh - 56px)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Title + YES + summary — starts from top */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-start", paddingTop: "clamp(24px, 6vh, 80px)" }}>
          <h1 style={{
            fontFamily: bd, fontSize: "clamp(42px, 12vw, 140px)", fontWeight: 700,
            color: t.cream, letterSpacing: "-0.04em",
            lineHeight: 0.95, margin: 0,
          }}>
            Should I buy Bitcoin today at {fmtK(S0)}?
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#27AE60",
              animation: "fi 2s ease-in-out infinite alternate",
            }} />
            <span style={{ fontFamily: bd, fontSize: 12, color: t.faint }}>Live</span>
          </div>

          <div className="verdict-num" style={{
            fontFamily: bd, fontSize: "clamp(100px, 25vw, 260px)", fontWeight: 800,
            color: t.cream, letterSpacing: "-0.05em",
            lineHeight: 0.75, margin: 0,
            marginTop: "clamp(20px, 3vw, 48px)",
          }}>
            {verdict.answer}
          </div>
          <div style={{ marginTop: "clamp(8px, 1vw, 16px)" }}>
            <span style={{ fontFamily: bd, fontSize: "clamp(14px, 1.2vw, 18px)", fontWeight: 500, color: t.cream }}>
              {verdict.subtitle}
            </span>
            <span style={{ fontFamily: bd, fontSize: "clamp(14px, 1.2vw, 18px)", color: t.faint, marginLeft: 10 }}>
              — Confidence {verdict.confidence}
            </span>
          </div>
          <p style={{
            fontFamily: bd, fontSize: "clamp(14px, 1.3vw, 19px)", fontWeight: 400,
            color: t.faint, lineHeight: 1.6,
            margin: "clamp(10px, 1vw, 20px) 0 0",
          }}>
            {verdict.answerSub}
          </p>
        </div>

        {/* Bottom bars — with breathing room below */}
        <div style={{ flexShrink: 0, paddingBottom: "clamp(16px, 2vh, 32px)" }}>
          <div
            onClick={() => setTab && setTab("pro")}
            style={{
              display: "grid", gridTemplateColumns: "1fr auto",
              borderTop: `1px solid ${t.border}`,
              cursor: "pointer",
            }}
          >
            <div style={{ padding: "16px 0", fontFamily: bd, fontSize: 15, color: t.dim }}>
              Want the full picture?
            </div>
            <div style={{
              padding: "16px 24px", borderLeft: `1px solid ${t.border}`,
              fontFamily: bd, fontSize: 15, fontWeight: 500, color: t.cream,
            }}>
              Switch to Pro
            </div>
          </div>
          <div
            onClick={scrollToWhy}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 0",
              borderTop: `1px solid ${t.border}`,
              borderBottom: `1px solid ${t.border}`,
              cursor: "pointer",
            }}
          >
            <div>
              <div style={{ fontFamily: bd, fontSize: 15, fontWeight: 500, color: t.cream }}>
                The simple explanation
              </div>
              <div style={{ fontFamily: bd, fontSize: 12, color: t.faint, marginTop: 2 }}>
                Plain English, no jargon, 15 second read
              </div>
            </div>
            <Chevron size={14} color={t.faint} />
          </div>
        </div>
      </div>

      {/* ── Full-screen explanation ── */}
      <div ref={whyRef} style={{
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
        justifyContent: "center",
        paddingTop: 48, paddingBottom: 48,
      }}>
        <div style={{
          fontFamily: bd, fontSize: 9, color: t.faint,
          textTransform: "uppercase", letterSpacing: "0.08em",
          marginBottom: 24,
        }}>
          The simple explanation
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {paras.map((p, i) => (
            <p key={i} style={{
              fontFamily: bd, fontSize: "clamp(17px, 2vw, 24px)", fontWeight: 400,
              color: t.cream, lineHeight: 1.7, margin: 0,
            }}>
              {p}
            </p>
          ))}
          <p style={{
            fontFamily: bd, fontSize: 12, color: t.faint,
            fontStyle: "italic", marginTop: 16,
          }}>
            Generated from Power Law + MMAR + Monte Carlo. Walk-forward validated against every 30-day point since 2016.
          </p>
        </div>
      </div>
    </>
  );
}
