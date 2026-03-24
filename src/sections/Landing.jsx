import React, { useRef, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { bd, mn } from "../theme/tokens";
import { fmtK } from "../engine/constants.js";
import Chevron from "../components/Chevron";

export default function Landing({ d, onAuth }) {
  const { t } = useTheme();
  const topRef = useRef(null);
  const whatRef = useRef(null);
  const hoodRef = useRef(null);
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [loginNudge, setLoginNudge] = useState(false);

  const S0 = d?.S0;

  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: "smooth" });

  const handleGoogle = () => onAuth?.("google");
  const handleApple = () => onAuth?.("apple");
  const handleMagicLink = async () => {
    if (!email || !email.includes("@")) return;
    setPhase("sending");
    setErrorMsg("");
    try {
      await onAuth?.("magic", email);
      setPhase("sent");
    } catch (err) {
      setErrorMsg(err?.message || "Something went wrong.");
      setPhase("error");
    }
  };

  Landing.showNudge = () => setLoginNudge(true);

  return (
    <>
      {/* ── Viewport ── */}
      <div ref={topRef} style={{
        height: "calc(100vh - 56px)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Title + subtitle — fill the space */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          justifyContent: "flex-start",
          paddingTop: "clamp(24px, 6vh, 80px)",
        }}>
          <h1 style={{
            fontFamily: bd,
            fontSize: "clamp(42px, 12vw, 140px)",
            fontWeight: 700,
            color: t.cream,
            letterSpacing: "-0.04em",
            lineHeight: 0.95,
            margin: 0,
          }}>
            Should I buy Bitcoin today at {S0 ? fmtK(S0) : "..."}?
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#27AE60",
              animation: "fi 2s ease-in-out infinite alternate",
            }} />
            <span style={{ fontFamily: bd, fontSize: 12, color: t.faint }}>Live</span>
          </div>

          <p style={{
            fontFamily: bd,
            fontSize: "clamp(16px, 2vw, 24px)",
            fontWeight: 400,
            color: t.faint,
            lineHeight: 1.55,
            margin: "clamp(16px, 3vw, 40px) 0 0",
          }}>
            A <strong style={{ fontWeight: 700, color: t.cream }}>Yes or No</strong> answer and your real odds of losing money at 1 year and 3 years. Based on institutional-grade quantitative analysis, explained in plain language you can actually understand.
          </p>
        </div>

        {/* Auth + bars + footer — pinned to bottom, full width */}
        <div style={{ flexShrink: 0, paddingBottom: "clamp(12px, 1.5vh, 24px)" }}>

          {loginNudge && (
            <div style={{
              padding: "8px 0 12px",
              fontFamily: bd, fontSize: 13, color: "#E2A84B",
              animation: "fi 0.3s ease",
            }}>
              Sign in to access the dashboard
            </div>
          )}

          <div style={{
            fontFamily: bd, fontSize: 9, color: t.faint,
            textTransform: "uppercase", letterSpacing: "0.08em",
            marginBottom: "clamp(8px, 1vh, 12px)",
          }}>
            Free access
          </div>

          {phase === "sent" ? (
            <div style={{ padding: "16px 0", textAlign: "center" }}>
              <div style={{ fontFamily: bd, fontSize: 16, fontWeight: 600, color: t.cream, marginBottom: 6 }}>Check your email</div>
              <p style={{ fontFamily: bd, fontSize: 13, color: t.faint, margin: 0 }}>
                Magic link sent to <strong style={{ color: t.cream }}>{email}</strong>.
              </p>
              <button onClick={() => { setPhase("idle"); setEmail(""); }}
                style={{ background: "none", border: "none", color: t.faint, textDecoration: "underline", cursor: "pointer", fontSize: 12, fontFamily: bd, marginTop: 8 }}>
                Try again
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: "clamp(6px, 1vw, 10px)", marginBottom: "clamp(6px, 1vw, 10px)" }}>
                <div onClick={handleGoogle} style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 8, padding: "clamp(10px, 1.2vh, 14px) 16px",
                  border: `1px solid ${t.border}`, cursor: "pointer",
                }}>
                  <svg width="15" height="15" viewBox="0 0 18 18">
                    <path d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" fill="#4285F4"/>
                    <path d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" fill="#34A853"/>
                    <path d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z" fill="#FBBC05"/>
                    <path d="M8.98 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A8 8 0 0 0 1.83 5.4l2.67 2.07a4.8 4.8 0 0 1 4.48-3.9z" fill="#EA4335"/>
                  </svg>
                  <span style={{ fontFamily: bd, fontSize: 13, color: t.cream }}>Google</span>
                </div>
                <div onClick={handleApple} style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 8, padding: "clamp(10px, 1.2vh, 14px) 16px",
                  border: `1px solid ${t.border}`, cursor: "pointer",
                }}>
                  <svg width="15" height="15" viewBox="0 0 18 18" fill={t.cream}>
                    <path d="M14.94 9.88c-.03-2.3 1.88-3.4 1.97-3.46-1.07-1.57-2.74-1.78-3.34-1.81-1.42-.14-2.77.84-3.49.84s-1.83-.82-3.01-.8a4.44 4.44 0 0 0-3.74 2.28c-1.6 2.76-.41 6.86 1.15 9.1.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74s1.78.74 2.99.71c1.23-.02 2.01-1.12 2.77-2.23a9.9 9.9 0 0 0 1.26-2.58 4.06 4.06 0 0 1-2.39-3.6zM12.68 5.08A4.13 4.13 0 0 0 13.62 2a4.19 4.19 0 0 0-2.71 1.4 3.93 3.93 0 0 0-.98 2.85 3.47 3.47 0 0 0 2.75-1.17z"/>
                  </svg>
                  <span style={{ fontFamily: bd, fontSize: 13, color: t.cream }}>Apple</span>
                </div>
              </div>

              <div style={{ display: "flex", border: `1px solid ${t.border}` }}>
                <input
                  type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleMagicLink()}
                  placeholder="you@email.com"
                  disabled={phase === "sending"}
                  style={{
                    flex: 1, padding: "clamp(10px, 1.2vh, 14px) 16px", fontSize: 13,
                    border: "none", background: "transparent", color: t.cream,
                    fontFamily: bd, outline: "none",
                  }}
                />
                <div onClick={handleMagicLink} style={{
                  padding: "clamp(10px, 1.2vh, 14px) 18px",
                  borderLeft: `1px solid ${t.border}`,
                  fontFamily: bd, fontSize: 13, fontWeight: 500, color: t.cream,
                  cursor: phase === "sending" ? "wait" : "pointer",
                  opacity: phase === "sending" ? 0.5 : 1, whiteSpace: "nowrap",
                }}>
                  {phase === "sending" ? "Sending..." : "Send magic link"}
                </div>
              </div>

              {phase === "error" && (
                <div style={{ fontFamily: bd, fontSize: 12, color: "#EB5757", marginTop: 6 }}>{errorMsg}</div>
              )}
              <div style={{ fontFamily: bd, fontSize: 11, color: "#3A3B36", marginTop: "clamp(4px, 0.6vh, 8px)" }}>
                No password, no spam, no newsletters. Just access.
              </div>
            </>
          )}

          {/* Anchors */}
          <div onClick={() => scrollTo(whatRef)} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "clamp(10px, 1.2vh, 16px) 0",
            borderTop: `1px solid ${t.border}`,
            marginTop: "clamp(6px, 0.8vh, 10px)",
            cursor: "pointer",
          }}>
            <div>
              <div style={{ fontFamily: bd, fontSize: 15, fontWeight: 500, color: t.cream }}>What you'll get</div>
              <div style={{ fontFamily: bd, fontSize: 12, color: t.faint, marginTop: 2 }}>4 things that make this different</div>
            </div>
            <Chevron size={14} color={t.faint} />
          </div>
          <div onClick={() => scrollTo(hoodRef)} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "clamp(10px, 1.2vh, 16px) 0",
            borderTop: `1px solid ${t.border}`,
            borderBottom: `1px solid ${t.border}`,
            cursor: "pointer",
          }}>
            <div>
              <div style={{ fontFamily: bd, fontSize: 15, fontWeight: 500, color: t.cream }}>Under the hood</div>
              <div style={{ fontFamily: bd, fontSize: 12, color: t.faint, marginTop: 2 }}>The math, briefly</div>
            </div>
            <Chevron size={14} color={t.faint} />
          </div>

          {/* Footer */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontFamily: bd, fontSize: 11, color: "#3A3B36",
            paddingTop: "clamp(8px, 1vh, 14px)",
          }}>
            <span>CommonSense & Edu Forte · Barcelona</span>
            <span>Not financial advice</span>
          </div>
        </div>
      </div>

      {/* ── Fullscreen: What you'll get ── */}
      <div ref={whatRef} style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        justifyContent: "center", paddingTop: 48, paddingBottom: 48,
      }}>
        <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 32 }}>
          What you'll get
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {[
            { title: "A clear signal based on probabilities, not opinions", desc: "The model weighs price position, loss risk, and upside potential across 2,000 simulated scenarios — and gives you one actionable answer: buy, hold, reduce, or get out. No gut feeling, no guesswork." },
            { title: "A warning before the correction, not after", desc: "Most tools only tell you when to buy. This one also flags when the price is dangerously stretched above its fair value — so you can reduce before the market does it for you." },
            { title: "Your real odds of losing money at each horizon", desc: "If you buy today, what's the probability you're down in 6 months? In a year? In three years? The model runs 2,000 scenarios and gives you an actual number, not a feeling." },
            { title: "Backtested against every month since 2016", desc: "When it said \"buy,\" the price was higher 12 months later 98% of the time. When it said \"reduce\" or \"sell,\" every major correction followed. No hindsight — only data available at that moment was used. Everything is shown openly inside." },
          ].map((item) => (
            <div key={item.title}>
              <div style={{ fontFamily: bd, fontSize: "clamp(16px, 1.5vw, 19px)", fontWeight: 500, color: t.cream, marginBottom: 6 }}>{item.title}</div>
              <div style={{ fontFamily: bd, fontSize: "clamp(14px, 1.3vw, 16px)", color: t.faint, lineHeight: 1.65 }}>{item.desc}</div>
            </div>
          ))}
        </div>
        {/* Navigate to next */}
        <div onClick={() => scrollTo(hoodRef)} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 0", marginTop: 40,
          borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`,
          cursor: "pointer",
        }}>
          <div>
            <div style={{ fontFamily: bd, fontSize: 15, fontWeight: 500, color: t.cream }}>Under the hood</div>
            <div style={{ fontFamily: bd, fontSize: 12, color: t.faint, marginTop: 2 }}>The math, briefly</div>
          </div>
          <Chevron size={14} color={t.faint} />
        </div>
      </div>

      {/* ── Fullscreen: Under the hood ── */}
      <div ref={hoodRef} style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        justifyContent: "center", paddingTop: 48, paddingBottom: 48,
      }}>
        <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 32 }}>
          Under the hood
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {[
            { title: "Power Law — WLS + RANSAC", desc: "Weighted Least Squares on 16 years of daily data with 4-year recency decay. RANSAC for a robust support floor that excludes bubble peaks. EVT/Generalized Pareto Distribution for the empirical upside cap." },
            { title: "Fractal volatility — MMAR", desc: "Mandelbrot's Multifractal Model of Asset Returns with Hurst exponent via DFA and multifractal partition function. Captures fat tails, volatility clustering, and long memory that Gaussian models miss entirely." },
            { title: "Regime detection — OU diagnostic", desc: "Ornstein-Uhlenbeck process with two regimes (calm and volatile). Used as a regime diagnostic — not as the MC engine. The simulation runs on pure MMAR/Hurst dynamics to avoid artificially dampening tail risk." },
            { title: "Monte Carlo — 2,000 paths, 3-year horizon", desc: "Fractal cascades, empirical shock resampling, Hurst-correlated noise. Single unified run — 1Y and 3Y percentiles extracted from the same paths. RANSAC reflective floor with empirically calibrated break probability." },
            { title: "Signal calibration — walk-forward backtest", desc: "Buy score weights and sell thresholds calibrated by grid search against historical returns. Two independent sell paths. Probabilistic calibration table shows how well MC loss estimates matched reality across every market cycle." },
          ].map((item) => (
            <div key={item.title} style={{ display: "flex", gap: 14 }}>
              <div style={{ width: 2, background: t.border, flexShrink: 0, alignSelf: "stretch" }} />
              <div>
                <div style={{ fontFamily: bd, fontSize: "clamp(14px, 1.3vw, 16px)", fontWeight: 500, color: t.cream, marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontFamily: bd, fontSize: "clamp(13px, 1.1vw, 15px)", color: t.faint, lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="grid-4" style={{
          textAlign: "center", marginTop: 36, paddingTop: 24, borderTop: `1px solid ${t.border}`,
        }}>
          {[{ v: "16yr", l: "of daily data" }, { v: "2,000", l: "MC paths" }, { v: "98%", l: "buy accuracy" }, { v: "5", l: "signal levels" }].map(({ v, l }) => (
            <div key={l}>
              <div style={{ fontFamily: mn, fontSize: 22, fontWeight: 700, color: t.cream }}>{v}</div>
              <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>
        {/* Back to top */}
        <div onClick={() => scrollTo(topRef)} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 0", marginTop: 40,
          borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`,
          cursor: "pointer",
        }}>
          <div style={{ fontFamily: bd, fontSize: 15, fontWeight: 500, color: t.cream }}>Back to top</div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 9.5L7 5.5L11 9.5" stroke={t.faint} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* ── Disclaimer ── */}
      <div style={{ fontFamily: bd, fontSize: 12, color: "#3A3B36", lineHeight: 1.6, padding: "16px 0" }}>
        <span style={{ color: t.faint }}>Not financial advice.</span> Past signal accuracy doesn't guarantee future results. Bitcoin is volatile and the model can be wrong. The 98% accuracy figure is historical and based on data the model was partially trained on.
      </div>
    </>
  );
}
