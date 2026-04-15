import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { useI18n } from "../i18n/I18nContext";
import { renderMd as renderMdRaw } from "../i18n/renderMd";
import { bd, mn } from "../theme/tokens";
import Toggle from "../components/Toggle";
import CatLabel from "../components/CatLabel";
import Term from "../components/Term";

export default function Backtest({ d }) {
  const { t } = useTheme();
  const { t: tr } = useI18n();
  const renderMd = (str) => renderMdRaw(str, { dimColor: t.faint, accentColor: t.cream });
  if (!d) return null;

  const bt = d.backtestResults;
  const rb = d.robustResults;
  if (!bt) return (
    <div style={{ minHeight: "40vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontFamily: bd, fontSize: 14, color: t.faint }}>{tr("backtest.loading")}</span>
    </div>
  );

  const bl = bt.byLevel;
  const bm = bt.benchmarks || {};
  const rm = bt.riskMetrics || {};

  // Table helpers
  const th = { fontFamily: bd, fontSize: 10, color: t.faint, textTransform: "uppercase", letterSpacing: "0.04em", padding: "8px 10px", borderBottom: `1px solid ${t.border}`, textAlign: "left" };
  const thR = { ...th, textAlign: "right" };
  const td = { fontFamily: mn, fontSize: 13, color: t.cream, padding: "10px 10px", borderBottom: `1px solid ${t.borderFaint}` };
  const tdR = { ...td, textAlign: "right" };
  const tdL = { ...td, fontFamily: bd, color: t.faint };
  const tdBold = { ...td, fontWeight: 600 };
  const tdBoldR = { ...tdBold, textAlign: "right" };

  // Sell metrics
  const sellLossRate = bt.plBubbleMetrics?.sell?.pctAnyLoss || "72";
  const sellAvgLoss = bt.plBubbleMetrics?.sell?.avgRet6m || "-16";
  const sellWorst = bt.plBubbleMetrics?.sell?.maxDrawdown || "-67";

  // Signal spectrum (label resolved at render time via tr())
  const spectrum = [
    { labelKey: "zone.strongBuy", range: "σ < -1.0", data: bl.strongBuy, color: "#1B8A4A" },
    { labelKey: "zone.buy", range: "-1.0 to -0.5", data: bl.buy, color: "#27AE60" },
    { labelKey: "zone.accumulate", range: "-0.5 to 0", data: bl.accumulate, color: "#6FCF97" },
    { labelKey: "zone.neutral", range: "0 to 0.3", data: bl.neutral, color: "#E8A838" },
    { labelKey: "zone.caution", range: "0.3 to 0.5", data: bl.caution, color: "#F2994A" },
    { labelKey: "zone.reduce", range: "0.5 to 0.8", data: bl.reduce, color: "#E07338", horizon: "6m" },
    { labelKey: "zone.sell", range: "σ > 0.8", data: bl.sell, color: "#EB5757", horizon: "6m" },
  ];

  // Metric row helper
  const MetricRow = ({ label, value, color }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
      <span style={{ fontFamily: bd, fontSize: 12, color: t.faint }}>{label}</span>
      <span style={{ fontFamily: mn, fontSize: 13, fontWeight: 500, color: color || t.cream }}>{value}</span>
    </div>
  );

  return (
    <div style={{ animation: "fi 0.3s ease" }}>
      {/* ── Title ── */}
      <div style={{ padding: "32px 0 24px" }}>
        <h1 style={{
          fontFamily: bd, fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 700,
          color: t.cream, letterSpacing: "-0.04em", lineHeight: 0.95, margin: 0,
        }}>{tr("backtest.title")}</h1>
        <p style={{ fontFamily: bd, fontSize: "clamp(13px, 1.2vw, 15px)", color: t.faint, marginTop: 12, lineHeight: 1.6 }}>
          {tr("backtest.subtitle").replace("{nDays}", bt.nTotal.toLocaleString())}
        </p>
      </div>

      {/* ═══════════ PART 1 — DOES THE SIGNAL WORK? ═══════════ */}
      <CatLabel label={tr("backtest.part1")} />

      {/* ── Buy + Sell signal cards ── */}
      <div className="signal-cards" style={{ borderBottom: `1px solid ${t.border}` }}>
        {/* Buy signal */}
        <div style={{ padding: "20px 20px 20px 0", borderRight: `1px solid ${t.border}` }}>
          <div style={{ fontFamily: bd, fontSize: 9, color: "#27AE60", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{tr("backtest.buyAccuracy")}</div>
          <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginBottom: 14 }}>{tr("backtest.buyQuestion")}</div>
          <div style={{ fontFamily: mn, fontSize: 28, fontWeight: 500, color: "#27AE60", marginBottom: 4 }}>100%</div>
          <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginBottom: 14 }}>{tr("backtest.daysProfitable12m").replaceAll("{n}", bt.nYes.toLocaleString())}</div>
          <div style={{ borderTop: `1px solid ${t.borderFaint}`, paddingTop: 10 }}>
            <MetricRow label={tr("backtest.avg12mReturn")} value={`+${bt.avgReturnYes}%`} color="#27AE60" />
            <MetricRow label={tr("backtest.worstEntry12m")} value={bl.buy?.minReturn != null ? `+${bl.buy.minReturn}%` : "–"} color="#27AE60" />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
              <span style={{ fontFamily: bd, fontSize: 12, color: t.faint }}>{tr("backtest.episodes")}</span>
              <span style={{ fontFamily: mn, fontSize: 13, fontWeight: 500, color: t.cream }}>{bt.nEpisodesBuy}</span>
            </div>
          </div>
        </div>

        {/* Sell signal */}
        <div style={{ padding: "20px 0 20px 20px" }}>
          <div style={{ fontFamily: bd, fontSize: 9, color: "#EB5757", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{tr("backtest.sellAccuracy")}</div>
          <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginBottom: 14 }}>{tr("backtest.sellQuestion")}</div>
          <div style={{ fontFamily: mn, fontSize: 28, fontWeight: 500, color: "#EB5757", marginBottom: 4 }}>{sellLossRate}%</div>
          <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginBottom: 14 }}>{tr("backtest.holdLostWithin6m")}</div>
          <div style={{ borderTop: `1px solid ${t.borderFaint}`, paddingTop: 10 }}>
            <MetricRow label={tr("backtest.avgLossAvoided6m")} value={`${sellAvgLoss}%`} color="#EB5757" />
            <MetricRow label={tr("backtest.worstIfHeldLabel")} value={`${sellWorst}%`} color="#EB5757" />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
              <span style={{ fontFamily: bd, fontSize: 12, color: t.faint }}>{tr("backtest.daysTested")}</span>
              <span style={{ fontFamily: mn, fontSize: 13, fontWeight: 500, color: t.cream }}>{bt.nSell.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Context paragraph ── */}
      <div style={{ padding: "16px 0" }}>
        <p style={{ fontFamily: bd, fontSize: 14, color: t.faint, lineHeight: 1.65, margin: 0 }}>
          {renderMd(
            tr("backtest.contextPara")
              .replace("{avgLoss}", sellAvgLoss)
              .replace("{worst}", sellWorst)
          )}
        </p>
      </div>

      {/* ── Full spectrum ── */}
      <Toggle section="backtest" label={tr("backtest.fullSpectrum")} defaultOpen>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 440 }}>
          <thead>
            <tr>
              <th style={th}>{tr("backtest.zone")}</th>
              <th style={thR}>{tr("backtest.days")}</th>
              <th style={thR}>{tr("backtest.accuracy")}</th>
              <th style={thR}>{tr("backtest.avgReturn")}</th>
              <th style={thR}>{tr("backtest.worst")}</th>
            </tr>
          </thead>
          <tbody>
            {spectrum.map((s, idx) => {
              const n = s.data?.n || 0;
              const isSell = s.horizon === "6m";
              const accLabel = isSell ? `${s.data?.precision || "–"}%` : `${s.data?.precision || "–"}%`;
              const borderAbove = idx === 2 || idx === 5;
              return (
                <tr key={s.labelKey} style={borderAbove ? { borderTop: `2px solid ${t.border}` } : {}}>
                  <td style={{ ...td, fontFamily: bd, fontWeight: 500, whiteSpace: "nowrap" }}>
                    <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: s.color, marginRight: 6, verticalAlign: "middle" }} />
                    {tr(s.labelKey)}
                    {isSell && <span style={{ fontFamily: mn, fontSize: 9, color: t.dim, marginLeft: 4 }}>6m</span>}
                  </td>
                  <td style={tdR}>{n.toLocaleString()}</td>
                  <td style={{ ...tdR, color: isSell ? t.faint : parseFloat(s.data?.precision) >= 99 ? "#27AE60" : parseFloat(s.data?.precision) >= 80 ? "#E8A838" : t.faint, whiteSpace: "nowrap" }}>
                    {accLabel}{isSell && <span style={{ fontSize: 9, color: t.dim }}> {tr("backtest.saved")}</span>}
                  </td>
                  <td style={{ ...tdR, color: (s.data?.avgReturn || 0) > 0 ? "#27AE60" : "#EB5757", whiteSpace: "nowrap" }}>
                    {s.data?.avgReturn != null ? `${s.data.avgReturn > 0 ? "+" : ""}${s.data.avgReturn}%` : "–"}
                  </td>
                  <td style={{ ...tdR, color: (s.data?.minReturn || 0) < 0 ? "#EB5757" : "#27AE60", whiteSpace: "nowrap" }}>
                    {s.data?.minReturn != null ? `${s.data.minReturn > 0 ? "+" : ""}${s.data.minReturn}%` : "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        <p style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginTop: 12, lineHeight: 1.6 }}>
          {tr("backtest.spectrumNote")}
        </p>
      </Toggle>

      {/* ── Evidence toggles ── */}
      <Toggle section="backtest" label={tr("backtest.stability")} badge={`${bt.stabilityDelta || 0}pp delta`}>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
          <thead>
            <tr>
              <th style={th}>{tr("backtest.era")}</th>
              <th style={thR}>{tr("backtest.daysTested")}</th>
              <th style={thR}>{tr("backtest.buyDays")}</th>
              <th style={thR}>{tr("backtest.episodes")}</th>
              <th style={thR}>{tr("backtest.accuracy")}</th>
              <th style={thR}>{tr("backtest.avgReturn")}</th>
            </tr>
          </thead>
          <tbody>
            {(bt.crossValidation || []).map(cv => (
              <tr key={cv.label}>
                <td style={tdL}>{cv.label}</td>
                <td style={tdR}>{cv.n.toLocaleString()}</td>
                <td style={tdR}>{cv.nYes.toLocaleString()}</td>
                <td style={tdR}>{cv.nEpisodes}</td>
                <td style={{ ...tdR, color: cv.precision >= 100 ? "#27AE60" : "#E8A838" }}>{cv.precision}%</td>
                <td style={{ ...tdR, color: "#27AE60" }}>+{cv.avgReturn}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {bt.stabilityDelta != null && (
          <p style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginTop: 12, lineHeight: 1.6 }}>
            {bt.stabilityDelta === 0
              ? tr("backtest.stabilityPerfect")
              : bt.stabilityDelta < 5
                ? tr("backtest.stabilityStrong")
                : tr("backtest.stabilityVariation")}
          </p>
        )}
      </Toggle>

      {rb && (
        <Toggle section="backtest" label={tr("backtest.validated")} badge={`${rb.buyPrecision}%`}>
          <div className="grid-3" style={{ borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 12 }}>
            {[
              { l: tr("backtest.pointsTested"), v: rb.nTotal.toLocaleString(), s: tr("backtest.stepDays").replace("{step}", rb.step) },
              { l: tr("backtest.buyAccuracy"), v: `${rb.nBuyCorrect}/${rb.nBuy} = ${rb.buyPrecision}%`, s: `${rb.nEpisodes} ${tr("backtest.episodes")}` },
              { l: tr("backtest.worstBuyReturn"), v: `${rb.worstBuyReturn > 0 ? "+" : ""}${rb.worstBuyReturn}%`, s: rb.worstBuyReturn > 0 ? tr("backtest.positive") : tr("backtest.edgeCase") },
            ].map((m, i) => (
              <div key={m.l} style={{ padding: "14px 0", borderRight: i < 2 ? `1px solid ${t.borderFaint}` : "none", paddingRight: i < 2 ? 14 : 0, paddingLeft: i > 0 ? 14 : 0 }}>
                <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{m.l}</div>
                <div style={{ fontFamily: mn, fontSize: 16, fontWeight: 500, color: t.cream }}>{m.v}</div>
                <div style={{ fontFamily: bd, fontSize: 10, color: t.faint, marginTop: 2 }}>{m.s}</div>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: bd, fontSize: 11, color: t.dim, lineHeight: 1.6, fontStyle: "italic" }}>
            {tr(rb.buyPrecision === "100" ? "backtest.refitNotePerfect" : "backtest.refitNoteNearPerfect")}
          </p>
        </Toggle>
      )}

      {/* ═══════════ PART 2 — WHAT HAPPENS IF YOU FOLLOW IT? ═══════════ */}
      <CatLabel label={tr("backtest.part2")} />

      {/* ── Smart DCA hero metrics ── */}
      {bm.dca && (
        <div className="signal-cards" style={{ borderBottom: `1px solid ${t.border}` }}>
          <div style={{ padding: "20px 16px 20px 0", borderRight: `1px solid ${t.border}` }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, display: "flex", alignItems: "center" }}>
              {tr("backtest.smartDCAReturn")} <Term id="smartDCA" iconSize={11} />
            </div>
            <div style={{ fontFamily: mn, fontSize: 28, fontWeight: 500, color: "#BB6BD9" }}>+{bm.dca.smartDcaReturn}%</div>
            <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginTop: 3 }}>vs +{bm.dca.dcaReturn}% blind DCA</div>
          </div>
          <div style={{ padding: "20px 0 20px 16px" }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, display: "flex", alignItems: "center" }}>
              {tr("backtest.smartDCASortino")} <Term id="sortino" iconSize={11} />
            </div>
            <div style={{ fontFamily: mn, fontSize: 28, fontWeight: 500, color: "#BB6BD9" }}>{bm.dca.smart.sortino ?? "–"}</div>
            <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginTop: 3 }}>vs {bm.dca.dca.sortino ?? "–"} blind DCA</div>
          </div>
        </div>
      )}

      {/* ── Strategy comparison ── */}
      <Toggle section="backtest" label={tr("backtest.threeApproaches").replace("{periods}", bm.dca?.dcaPeriods || "–")} defaultOpen>
        <p style={{ fontFamily: bd, fontSize: 14, color: t.faint, lineHeight: 1.65, margin: "0 0 16px" }}>
          {renderMd(
            tr("backtest.threeApproachesPara")
              .replace("{dcaValue}", bm.dca ? `$${Math.round(bm.dca.dca.portfolio / 1000)}k` : "–")
              .replace("{signalValue}", bm.dca ? `$${Math.round(bm.dca.signal.portfolio / 1000)}k` : "–")
              .replace("{smartValue}", bm.dca ? `$${Math.round(bm.dca.smart.portfolio / 1000)}k` : "–")
              .replace("{totalBudget}", bm.dca ? `$${Math.round(bm.dca.totalBudget / 1000)}k` : "–")
          )}
        </p>

        {/* DCA Chart */}
        {bm.dca?.timeSeries?.length > 2 && (() => {
          const ts = bm.dca.timeSeries;
          const W = 700, H = 220, pad = { t: 20, r: 50, b: 30, l: 55 };
          const chartW = W - pad.l - pad.r, chartH = H - pad.t - pad.b;
          const maxR = Math.max(Math.max(...ts.map(d => d.dcaReturn)), Math.max(...ts.map(d => d.sigReturn)), Math.max(...ts.map(d => d.smartReturn)), 1);
          const minR = Math.min(Math.min(...ts.map(d => d.dcaReturn)), Math.min(...ts.map(d => d.sigReturn)), Math.min(...ts.map(d => d.smartReturn)), 0);
          const range = maxR - minR || 1;
          const x = (i) => pad.l + (i / (ts.length - 1)) * chartW;
          const y = (v) => pad.t + chartH - ((v - minR) / range) * chartH;
          const pathStr = (key) => ts.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join("");
          const years = []; let lastYear = "";
          ts.forEach((d, i) => { const yr = d.date.slice(0, 4); if (yr !== lastYear) { years.push({ i, yr }); lastYear = yr; } });
          return (
            <div style={{ marginBottom: 16 }}>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
                {(() => { const step = range > 2000 ? 500 : range > 800 ? 200 : range > 400 ? 100 : 50; const lines = []; for (let v = Math.ceil(minR / step) * step; v <= maxR; v += step) lines.push(v); return lines.map(val => (<g key={val}><line x1={pad.l} y1={y(val)} x2={W - pad.r} y2={y(val)} stroke={t.borderFaint} strokeWidth="0.5" /><text x={pad.l - 4} y={y(val) + 3} textAnchor="end" fill={t.faint} fontSize="9" fontFamily={mn}>{val > 999 ? `${(val/1000).toFixed(0)}k` : `${val}`}%</text></g>)); })()}
                {years.map(({ i, yr }) => (<text key={yr} x={x(i)} y={H - 6} textAnchor="middle" fill={t.faint} fontSize="9" fontFamily={bd}>{yr}</text>))}
                {minR < 0 && <line x1={pad.l} y1={y(0)} x2={W - pad.r} y2={y(0)} stroke={t.border} strokeWidth="1" strokeDasharray="3,3" />}
                <path d={pathStr("dcaReturn")} fill="none" stroke={t.dim} strokeWidth="1.5" opacity="0.5" />
                <path d={pathStr("sigReturn")} fill="none" stroke="#27AE60" strokeWidth="1.5" />
                <path d={pathStr("smartReturn")} fill="none" stroke="#BB6BD9" strokeWidth="1.5" />
                <text x={W - pad.r + 2} y={y(ts[ts.length - 1].dcaReturn) + 3} fill={t.dim} fontSize="9" fontFamily={mn}>{tr("backtest.dca")}</text>
                <text x={W - pad.r + 2} y={y(ts[ts.length - 1].sigReturn) + 3} fill="#27AE60" fontSize="9" fontFamily={mn}>{tr("backtest.signal")}</text>
                <text x={W - pad.r + 2} y={y(ts[ts.length - 1].smartReturn) + 3} fill="#BB6BD9" fontSize="9" fontFamily={mn}>{tr("backtest.smart")}</text>
              </svg>
            </div>
          );
        })()}

        {/* DCA Table */}
        {bm.dca && (
          <>
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
              <thead>
                <tr>
                  <th style={th}></th>
                  <th style={thR}>{tr("backtest.return")}</th>
                  <th style={thR}>{tr("backtest.finalValue")}</th>
                  <th style={thR}>{tr("backtest.sortino")} <Term id="sortino" iconSize={10} /></th>
                  <th style={thR}>{tr("backtest.maxDD")} <Term id="drawdown" iconSize={10} /></th>
                  <th style={thR}>{tr("backtest.cashHeld")}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdL}>{tr("backtest.blindDCA")}</td>
                  <td style={tdR}>+{bm.dca.dcaReturn}%</td>
                  <td style={tdR}>${bm.dca.dca.portfolio.toLocaleString()}</td>
                  <td style={tdR}>{bm.dca.dca.sortino ?? "–"}</td>
                  <td style={{ ...tdR, color: "#EB5757" }}>{bm.dca.dca.maxDD}%</td>
                  <td style={tdR}>$0</td>
                </tr>
                <tr>
                  <td style={{ ...tdL, color: "#27AE60" }}>{tr("backtest.signalDCA")}</td>
                  <td style={tdR}>+{bm.dca.sigDcaReturn}%</td>
                  <td style={tdR}>${bm.dca.signal.portfolio.toLocaleString()}</td>
                  <td style={tdR}>{bm.dca.signal.sortino ?? "–"}</td>
                  <td style={tdR}>{bm.dca.signal.maxDD}%</td>
                  <td style={tdR}>${bm.dca.signal.cash.toLocaleString()}</td>
                </tr>
                <tr style={{ background: "rgba(187,107,217,0.04)" }}>
                  <td style={{ ...tdL, color: "#BB6BD9", fontWeight: 500 }}>{tr("backtest.smartDCA")}</td>
                  <td style={tdBoldR}>+{bm.dca.smartDcaReturn}%</td>
                  <td style={tdBoldR}>${bm.dca.smart.portfolio.toLocaleString()}</td>
                  <td style={{ ...tdBoldR, color: "#BB6BD9" }}>{bm.dca.smart.sortino ?? "–"}</td>
                  <td style={{ ...tdBoldR, color: "#27AE60" }}>{bm.dca.smart.maxDD}%</td>
                  <td style={tdBoldR}>${bm.dca.smart.cash.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
            </div>
            <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginTop: 10, lineHeight: 1.6 }}>
              {tr("backtest.dcaTableNote").replace("{total}", `$${bm.dca.totalBudget.toLocaleString()}`)}
            </div>
          </>
        )}
      </Toggle>

      {/* ── How Smart DCA works ── */}
      <Toggle section="backtest" label={tr("backtest.howSmartDCA")}>
        <p style={{ fontFamily: bd, fontSize: 14, color: t.faint, lineHeight: 1.65, margin: "0 0 14px" }}>
          {tr("backtest.howSmartDCAPara")}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 0, border: `1px solid ${t.borderFaint}`, borderRadius: 6, overflow: "hidden" }}>
          {[
            { zoneKey: "zone.strongBuy",  actionKey: "backtest.action.strongBuy",  color: "#1B8A4A", actionColor: "#27AE60" },
            { zoneKey: "zone.buy",        actionKey: "backtest.action.buy",        color: "#27AE60", actionColor: "#27AE60" },
            { zoneKey: "zone.accumulate", actionKey: "backtest.action.accumulate", color: "#6FCF97", actionColor: t.cream },
            { zoneKey: "zone.neutral",    actionKey: "backtest.action.neutral",    color: "#E8A838", actionColor: t.faint },
            { zoneKey: "zone.caution",    actionKey: "backtest.action.caution",    color: "#F2994A", actionColor: t.faint },
            { zoneKey: "zone.reduce",     actionKey: "backtest.action.reduce",     color: "#E07338", actionColor: "#EB5757" },
            { zoneKey: "zone.sell",       actionKey: "backtest.action.sell",       color: "#EB5757", actionColor: "#EB5757" },
          ].map((r, i) => (
            <div key={r.zoneKey} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRight: i < 6 ? `1px solid ${t.borderFaint}` : "none" }}>
              <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: r.color, flexShrink: 0 }} />
              <span style={{ fontFamily: bd, fontSize: 10, color: t.dim }}>{tr(r.zoneKey)}</span>
              <span style={{ fontFamily: mn, fontSize: 11, fontWeight: 500, color: r.actionColor }}>{tr(r.actionKey)}</span>
            </div>
          ))}
        </div>
        <p style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginTop: 12, lineHeight: 1.6, fontStyle: "italic" }}>
          {tr("backtest.smartDCANote")}
        </p>
      </Toggle>

      {/* ── Risk profile ── */}
      <Toggle section="backtest" label={tr("backtest.riskProfile")}>
        {bm.dca && (
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 440 }}>
            <thead>
              <tr>
                <th style={th}></th>
                <th style={thR}>{tr("backtest.return")}</th>
                <th style={thR}>{tr("backtest.maxDD")} <Term id="drawdown" iconSize={10} /></th>
                <th style={thR}>{tr("backtest.sortino")} <Term id="sortino" iconSize={10} /></th>
                <th style={thR}>{tr("backtest.finalValue")}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdL}>{tr("backtest.blindDCA")}</td>
                <td style={tdR}>+{bm.dca.dcaReturn}%</td>
                <td style={{ ...tdR, color: "#EB5757" }}>{bm.dca.dca.maxDD}%</td>
                <td style={tdR}>{bm.dca.dca.sortino ?? "–"}</td>
                <td style={tdR}>${bm.dca.dca.portfolio.toLocaleString()}</td>
              </tr>
              <tr>
                <td style={{ ...tdL, color: "#27AE60" }}>{tr("backtest.signalDCA")}</td>
                <td style={tdR}>+{bm.dca.sigDcaReturn}%</td>
                <td style={tdR}>{bm.dca.signal.maxDD}%</td>
                <td style={tdR}>{bm.dca.signal.sortino ?? "–"}</td>
                <td style={tdR}>${bm.dca.signal.portfolio.toLocaleString()}</td>
              </tr>
              <tr style={{ background: "rgba(187,107,217,0.04)" }}>
                <td style={{ ...tdL, color: "#BB6BD9", fontWeight: 500 }}>{tr("backtest.smartDCA")}</td>
                <td style={tdBoldR}>+{bm.dca.smartDcaReturn}%</td>
                <td style={{ ...tdBoldR, color: "#27AE60" }}>{bm.dca.smart.maxDD}%</td>
                <td style={{ ...tdBoldR, color: "#BB6BD9" }}>{bm.dca.smart.sortino ?? "–"}</td>
                <td style={tdBoldR}>${bm.dca.smart.portfolio.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          </div>
        )}
        <p style={{ fontFamily: bd, fontSize: 12, color: t.faint, marginTop: 12, lineHeight: 1.6, fontStyle: "italic" }}>
          {renderMd(
            tr("backtest.riskParaSimple")
              .replace("{dcaDD}", bm.dca?.dca?.maxDD ?? "–")
              .replace("{smartDD}", bm.dca?.smart?.maxDD ?? "–")
          )}
        </p>
      </Toggle>

      {/* ── Signal vs alternatives ── */}
      <Toggle section="backtest" label={tr("backtest.signalVsAlts")}>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 380 }}>
          <thead>
            <tr>
              <th style={th}></th>
              <th style={thR}>{tr("backtest.accuracy12m")}</th>
              <th style={thR}>{tr("backtest.avgReturn")}</th>
              <th style={thR}>{tr("backtest.sortino")}</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: "rgba(39,174,96,0.04)" }}>
              <td style={{ ...tdL, color: "#27AE60", fontWeight: 500 }}>{tr("backtest.ourSignal")}</td>
              <td style={{ ...tdBoldR, color: "#27AE60" }}>{bt.precision}%</td>
              <td style={tdBoldR}>+{bt.avgReturnYes}%</td>
              <td style={{ ...tdBoldR, color: "#27AE60" }}>{bm.dca?.signal?.sortino ?? "–"}</td>
            </tr>
            <tr>
              <td style={tdL}>{tr("backtest.buyAndHold")}</td>
              <td style={tdR}>{bm.buyAndHold?.precision}%</td>
              <td style={tdR}>+{bm.buyAndHold?.avgReturn}%</td>
              <td style={tdR}>{bm.dca?.dca?.sortino ?? "–"}</td>
            </tr>
            <tr>
              <td style={tdL}>{tr("backtest.zScore")}</td>
              <td style={tdR}>{bm.zScore?.buyPrecision}%</td>
              <td style={tdR}>+{bm.zScore?.buyAvgReturn}%</td>
              <td style={tdR}>–</td>
            </tr>
          </tbody>
        </table>
        </div>
      </Toggle>

      {/* ── Footer ── */}
      <div style={{ padding: "20px 0", fontFamily: bd, fontSize: 11, color: t.dim, lineHeight: 1.6 }}>
        {tr("backtest.methodology")}
      </div>
    </div>
  );
}
