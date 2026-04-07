import React, { useRef, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { useI18n } from "../i18n/I18nContext";
import { bd, mn } from "../theme/tokens";
import { fmtK } from "../engine/constants.js";
import Chevron from "../components/Chevron";
import { trackAuthStart, trackAuthComplete, trackCtaClick } from "../tracking";

export default function Landing({ d, onAuth, setTab }) {
  const { t } = useTheme();
  const { t: tr } = useI18n();
  const topRef = useRef(null);
  const whatRef = useRef(null);
  const hoodRef = useRef(null);
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [loginNudge, setLoginNudge] = useState(false);

  const S0 = d?.S0;

  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: "smooth" });

  const BacktestCTA = () => (
    <div onClick={() => { trackCtaClick("see_backtest", "landing"); setTab && setTab("backtest"); }} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "clamp(10px, 1.2vh, 16px) 0",
      borderTop: `1px solid ${t.border}`,
      cursor: "pointer",
    }}>
      <div>
        <div style={{ fontFamily: bd, fontSize: 13, color: t.faint, lineHeight: 1.5 }}>
          {tr("landing.backtested")}
        </div>
      </div>
      <div style={{ fontFamily: bd, fontSize: 15, fontWeight: 500, color: t.cream, whiteSpace: "nowrap", marginLeft: 16 }}>
        {tr("landing.seeBacktest")}
      </div>
    </div>
  );

  const handleGoogle = () => { trackAuthStart("google"); onAuth?.("google"); };
  const handleMagicLink = async () => {
    if (!email || !email.includes("@")) return;
    trackAuthStart("magic_link");
    setPhase("sending");
    setErrorMsg("");
    try {
      await onAuth?.("magic", email);
      trackAuthComplete("magic_link");
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
            {tr("landing.title").replace("{price}", S0 ? fmtK(S0) : "...")}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#27AE60",
              animation: "fi 2s ease-in-out infinite alternate",
            }} />
            <span style={{ fontFamily: bd, fontSize: 12, color: t.faint }}>{tr("live")}</span>
          </div>

          <p style={{
            fontFamily: bd,
            fontSize: "clamp(16px, 2vw, 24px)",
            fontWeight: 400,
            color: t.faint,
            lineHeight: 1.55,
            margin: "clamp(16px, 3vw, 40px) 0 0",
          }}>
            {(() => { const p = tr("landing.subtitle").split("{yesOrNo}"); return <>{p[0]}<strong style={{ fontWeight: 700, color: t.cream }}>{tr("landing.yesOrNo")}</strong>{p[1]}</>; })()}
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
              <div style={{ fontFamily: bd, fontSize: 16, fontWeight: 600, color: t.cream, marginBottom: 6 }}>{tr("landing.checkEmail")}</div>
              <p style={{ fontFamily: bd, fontSize: 13, color: t.faint, margin: 0 }}>
                {tr("landing.magicLinkSent")} <strong style={{ color: t.cream }}>{email}</strong>.
              </p>
              <button onClick={() => { setPhase("idle"); setEmail(""); }}
                style={{ background: "none", border: "none", color: t.faint, textDecoration: "underline", cursor: "pointer", fontSize: 12, fontFamily: bd, marginTop: 8 }}>
                Try again
              </button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: "clamp(6px, 1vw, 10px)" }}>
                <div onClick={handleGoogle} style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 8, padding: "clamp(10px, 1.2vh, 14px) 16px",
                  border: `1px solid ${t.border}`, cursor: "pointer",
                }}>
                  <svg width="15" height="15" viewBox="0 0 18 18">
                    <path d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" fill="#4285F4"/>
                    <path d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" fill="#34A853"/>
                    <path d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z" fill="#FBBC05"/>
                    <path d="M8.98 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A8 8 0 0 0 1.83 5.4l2.67 2.07a4.8 4.8 0 0 1 4.48-3.9z" fill="#EA4335"/>
                  </svg>
                  <span style={{ fontFamily: bd, fontSize: 13, color: t.cream }}>{tr("landing.google")}</span>
                </div>
              </div>

              <div style={{ display: "flex", border: `1px solid ${t.border}` }}>
                <input
                  type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleMagicLink()}
                  placeholder={tr("landing.emailPlaceholder")}
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
                  {phase === "sending" ? tr("landing.sending") : tr("landing.getAccessLink")}
                </div>
              </div>

              {phase === "error" && (
                <div style={{ fontFamily: bd, fontSize: 12, color: "#EB5757", marginTop: 6 }}>{errorMsg}</div>
              )}
              <div style={{ fontFamily: bd, fontSize: 11, color: "#3A3B36", marginTop: "clamp(4px, 0.6vh, 8px)" }}>
                {tr("landing.noSpam")}
              </div>
            </>
          )}

          {/* Backtest CTA */}
          <div style={{ marginTop: "clamp(6px, 0.8vh, 10px)" }}>
            <BacktestCTA />
          </div>

          {/* Anchors */}
          <div onClick={() => scrollTo(whatRef)} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "clamp(10px, 1.2vh, 16px) 0",
            borderTop: `1px solid ${t.border}`,
            cursor: "pointer",
          }}>
            <div>
              <div style={{ fontFamily: bd, fontSize: 15, fontWeight: 500, color: t.cream }}>{tr("landing.whatYouGet")}</div>
              <div style={{ fontFamily: bd, fontSize: 12, color: t.faint, marginTop: 2 }}>{tr("landing.whatYouGetSub")}</div>
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
              <div style={{ fontFamily: bd, fontSize: 15, fontWeight: 500, color: t.cream }}>{tr("landing.underTheHood")}</div>
              <div style={{ fontFamily: bd, fontSize: 12, color: t.faint, marginTop: 2 }}>{tr("landing.underTheHoodSub")}</div>
            </div>
            <Chevron size={14} color={t.faint} />
          </div>

          {/* Footer */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontFamily: bd, fontSize: 11, color: "#3A3B36",
            paddingTop: "clamp(8px, 1vh, 14px)",
          }}>
            <span>{tr("footer.brand")}</span>
            <span>{tr("footer.notFinancialAdvice").split(".")[0]}</span>
          </div>
        </div>
      </div>

      {/* ── Fullscreen: What you'll get ── */}
      <div ref={whatRef} style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        justifyContent: "center", paddingTop: 48, paddingBottom: 48,
      }}>
        <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 32 }}>
          {tr("landing.whatYouGet")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {[
            { title: tr("landing.wyg1.title"), desc: tr("landing.wyg1.desc") },
            { title: tr("landing.wyg2.title"), desc: tr("landing.wyg2.desc") },
            { title: tr("landing.wyg3.title"), desc: tr("landing.wyg3.desc") },
            { title: tr("landing.wyg4.title"), desc: tr("landing.wyg4.desc") },
          ].map((item) => (
            <div key={item.title}>
              <div style={{ fontFamily: bd, fontSize: "clamp(16px, 1.5vw, 19px)", fontWeight: 500, color: t.cream, marginBottom: 6 }}>{item.title}</div>
              <div style={{ fontFamily: bd, fontSize: "clamp(14px, 1.3vw, 16px)", color: t.faint, lineHeight: 1.65 }}>{item.desc}</div>
            </div>
          ))}
        </div>
        {/* Backtest CTA */}
        <div style={{ marginTop: 40 }}>
          <BacktestCTA />
        </div>
        {/* Navigate to next */}
        <div onClick={() => scrollTo(hoodRef)} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 0", marginTop: 40,
          borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`,
          cursor: "pointer",
        }}>
          <div>
            <div style={{ fontFamily: bd, fontSize: 15, fontWeight: 500, color: t.cream }}>{tr("landing.underTheHood")}</div>
            <div style={{ fontFamily: bd, fontSize: 12, color: t.faint, marginTop: 2 }}>{tr("landing.underTheHoodSub")}</div>
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
          {tr("landing.underTheHood")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {[
            { title: tr("landing.uth1.title"), desc: tr("landing.uth1.desc") },
            { title: tr("landing.uth2.title"), desc: tr("landing.uth2.desc") },
            { title: tr("landing.uth3.title"), desc: tr("landing.uth3.desc") },
            { title: tr("landing.uth4.title"), desc: tr("landing.uth4.desc") },
            { title: tr("landing.uth5.title"), desc: tr("landing.uth5.desc") },
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
          {[{ v: "16yr", l: tr("landing.stat.data") }, { v: "2,000", l: tr("landing.stat.paths") }, { v: "100%", l: tr("landing.stat.accuracy") }, { v: "7", l: tr("landing.stat.zones") }].map(({ v, l }) => (
            <div key={l}>
              <div style={{ fontFamily: mn, fontSize: 22, fontWeight: 700, color: v === "100%" ? "#27AE60" : t.cream }}>{v}</div>
              <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>
        {/* Backtest CTA */}
        <div style={{ marginTop: 32 }}>
          <BacktestCTA />
        </div>
        {/* Back to top */}
        <div onClick={() => scrollTo(topRef)} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 0", marginTop: 40,
          borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`,
          cursor: "pointer",
        }}>
          <div style={{ fontFamily: bd, fontSize: 15, fontWeight: 500, color: t.cream }}>{tr("landing.backToTop")}</div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 9.5L7 5.5L11 9.5" stroke={t.faint} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* ── Disclaimer ── */}
      <div style={{ fontFamily: bd, fontSize: 12, color: "#3A3B36", lineHeight: 1.6, padding: "16px 0" }}>
        <span style={{ color: t.faint }}>{tr("footer.notFinancialAdvice").split(".")[0]}.</span> {tr("landing.disclaimer")}
      </div>
    </>
  );
}
