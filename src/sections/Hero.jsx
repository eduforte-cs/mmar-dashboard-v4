import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { useI18n } from "../i18n/I18nContext";
import { localizeVerdict } from "../i18n/localizeVerdict";
import { bd, mn } from "../theme/tokens";
import { fmtK } from "../engine/constants.js";
import Gauge from "../components/Gauge";
import Term from "../components/Term";

export default function Hero({ d, derived }) {
  const { t } = useTheme();
  const { t: tr, lang } = useI18n();
  if (!d || !derived) return null;

  const { S0, sigmaFromPL: sigma, plToday, r2, backtestResults: bt } = d;
  const verdict = localizeVerdict(derived.verdict, d, lang);
  const { supportPrice } = derived;

  const sigmaLabel = sigma < -1.0 ? tr("hero.deepDiscount") : sigma < -0.5 ? tr("hero.discount")
    : sigma < 0.5 ? tr("hero.nearFairValue") : sigma < 1.0 ? tr("hero.premium") : tr("hero.overheated");

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
              {tr("hero.titleLine1")}<br />{tr("hero.titleLine2")}
            </h1>
            <p style={{
              fontFamily: bd, fontSize: 13, fontWeight: 300,
              color: t.faint, marginTop: 14, lineHeight: 1.6,
            }}>
              {tr("hero.subtitleQuant")}
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
              {verdict.subtitle} · {tr("lite.confidence")} {verdict.confidence}
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
          { id: "price", l: tr("hero.price"),                                         v: fmtK(S0),            s: `${d.source?.split("(")[0] || tr("live")}` },
          { id: "sigma", l: <>σ <Term id="sigma" iconSize={11} /></>,                 v: `${sigma >= 0 ? "+" : ""}${sigma.toFixed(2)}σ`, s: sigmaLabel },
          { id: "fv",    l: tr("hero.fairValue"),                                     v: fmtK(plToday),       s: `Power Law WLS · R² ${r2.toFixed(3)}` },
          { id: "sup",   l: <>{tr("hero.supportFloor")} <Term id="ransac" iconSize={11} /></>, v: fmtK(supportPrice), s: `RANSAC ${d.resFloorSigma?.toFixed(1) || ""}σ` },
        ].map((item, i) => (
          <div key={item.id} style={{
            padding: "20px 0",
            borderRight: (i % 2 === 0) ? `1px solid ${t.border}` : "none",
            paddingRight: (i % 2 === 0) ? 24 : 0,
            paddingLeft: (i % 2 === 1) ? 24 : 0,
            borderBottom: i < 2 ? `1px solid ${t.borderFaint}` : "none",
          }}>
            <div style={{
              fontFamily: bd, fontSize: 10, color: t.faint,
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6,
              display: "flex", alignItems: "center",
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

      {/* answerSubLite */}
      <div style={{ padding: "24px 0 0" }}>
        <p style={{
          fontFamily: bd, fontSize: 16, fontWeight: 400,
          color: t.cream, lineHeight: 1.7, margin: 0, maxWidth: 680,
        }}>
          {verdict.answerSubLite || verdict.answerSub}
        </p>
      </div>

      {/* Horizon cards */}
      <div style={{ marginTop: 20, borderTop: `1px solid ${t.border}` }}>
        {verdict.horizonCards.map((c, i) => (
          <div key={c.horizon} style={{ padding: "20px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <div>
                <span style={{ fontFamily: bd, fontSize: 10, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em" }}>{c.horizon}</span>
                <span style={{ fontFamily: bd, fontSize: 30, fontWeight: 700, color: t.cream, marginLeft: 14, letterSpacing: "-0.03em" }}>{fmtK(c.plTarget)}</span>
                <span style={{ fontFamily: mn, fontSize: 13, color: t.dim, marginLeft: 8 }}>{c.plReturn >= 0 ? "+" : ""}{c.plReturn.toFixed(0)}%</span>
              </div>
              <span style={{ fontFamily: bd, fontSize: 11, color: t.dim }}>{c.verdict}</span>
            </div>
            <div className="hz-stats">
              {[
                { l: tr("hero.profit"), v: `${c.pProfit.toFixed(0)}%` },
                { l: tr("hero.loss"), v: `${c.pLoss.toFixed(0)}%` },
                { l: tr("hero.reachesFV"), v: `${c.pFairValue.toFixed(0)}%` },
                { l: tr("hero.worstCase"), v: fmtK(c.worstCase) },
              ].map((s, j) => (
                <div key={s.l} style={{ paddingRight: j < 3 ? 14 : 0, borderRight: j < 3 ? `1px solid ${t.borderFaint}` : "none", paddingLeft: j > 0 ? 14 : 0 }}>
                  <div style={{ fontFamily: bd, fontSize: 8, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.l}</div>
                  <div style={{ fontFamily: mn, fontSize: 15, color: t.cream, fontWeight: 500, marginTop: 2 }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Backtest note */}
      {bt && (
        <div style={{ padding: "10px 0 24px", borderBottom: `1px solid ${t.border}` }}>
          <div style={{ fontFamily: mn, fontSize: 11, color: t.dim }}>
            {tr("hero.walkForwardNote")
              .replace("{precision}", bt.precision)
              .replace("{avgReturn}", bt.avgReturnYes)
              .replace("{n}", bt.nYes + bt.nNo)}
          </div>
        </div>
      )}
    </>
  );
}
