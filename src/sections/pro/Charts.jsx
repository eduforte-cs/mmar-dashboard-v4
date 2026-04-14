import React from "react";
import { useTheme } from "../../theme/ThemeContext";
import { useI18n } from "../../i18n/I18nContext";
import { bd, mn } from "../../theme/tokens";
import { fmtK } from "../../engine/constants.js";
import { plPrice } from "../../engine/powerlaw.js";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, ReferenceLine, Legend
} from "recharts";

function ChartTooltip({ active, payload, label, t }) {
  if (!active || !payload?.[0]) return null;
  return (
    <div style={{ background: t.bgAlt, border: `1px solid ${t.border}`, borderRadius: 4, padding: "8px 12px", fontSize: 11, fontFamily: mn, color: t.cream }}>
      {payload.map((p, i) => (
        <div key={i} style={{ marginBottom: 2 }}>
          <span style={{ color: t.faint }}>{p.name}: </span>
          <span>{typeof p.value === "number" ? fmtK(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function MCChart({ percentiles, plForecast, horizon, stats, t }) {
  const { t: tr } = useI18n();
  if (!percentiles?.length) return null;
  const maxDays = horizon === "1Y" ? 365 : 365 * 3;
  const tickFormat = horizon === "1Y" ? (v => `${Math.round(v / 30)}m`) : (v => `${(v / 365).toFixed(1)}y`);

  // Build PL forecast data aligned to percentile timepoints
  const plData = percentiles.map(p => ({
    t: p.t,
    pl: plForecast ? plForecast.find(f => f.t === p.t)?.pl || null : null,
  }));

  return (
    <>
      {/* Stats row */}
      <div className="data-grid-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 0, borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 12 }}>
        {stats.map((s, i) => (
          <div key={s.label} style={{ padding: "12px 0", textAlign: "center", borderRight: i < 3 ? `1px solid ${t.borderFaint}` : "none" }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: mn, fontSize: 18, fontWeight: 700, color: t.cream }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ background: t.bgAlt, border: `1px solid ${t.borderFaint}`, borderRadius: 4, padding: "12px 8px 4px", height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart>
            <CartesianGrid strokeDasharray="3 3" stroke={t.ghost} />
            <XAxis dataKey="t" type="number" domain={[0, maxDays]}
              tick={{ fill: t.faint, fontSize: 9, fontFamily: mn }}
              tickFormatter={tickFormat}
              allowDuplicatedCategory={false} />
            <YAxis tick={{ fill: t.faint, fontSize: 9, fontFamily: mn }}
              tickFormatter={fmtK} />
            <Tooltip content={<ChartTooltip t={t} />} />
            {plData.some(p => p.pl) && (
              <Line data={plData} type="monotone" dataKey="pl" stroke="#27AE60" strokeWidth={1.5} strokeDasharray="6 3" dot={false} name="Power Law" />
            )}
            <Line data={percentiles} type="monotone" dataKey="p95" stroke={t.faint} strokeWidth={1} dot={false} name="P95" />
            <Line data={percentiles} type="monotone" dataKey="p75" stroke={t.ghost} strokeWidth={1} strokeDasharray="5 3" dot={false} name="P75" />
            <Line data={percentiles} type="monotone" dataKey="p50" stroke={t.cream} strokeWidth={2.5} dot={false} name="P50" />
            <Line data={percentiles} type="monotone" dataKey="p25" stroke={t.ghost} strokeWidth={1} strokeDasharray="5 3" dot={false} name="P25" />
            <Line data={percentiles} type="monotone" dataKey="p5" stroke={t.faint} strokeWidth={1} dot={false} name="P5" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 6 }}>
        {[{ id: "p50", labelKey: "pro.legend.p50median", color: t.cream }, { id: "p5p95", labelKey: "pro.legend.p5p95", color: t.faint }, { id: "pl", labelKey: "pro.legend.powerLaw", color: "#27AE60" }].map(l => (
          <span key={l.id} style={{ fontFamily: mn, fontSize: 9, color: l.color }}>{tr(l.labelKey)}</span>
        ))}
      </div>
    </>
  );
}

export function SigmaChart({ sigmaChart, t }) {
  const { t: tr } = useI18n();
  if (!sigmaChart?.length) return null;

  // Sample for performance (every 3rd point)
  const sampled = sigmaChart.filter((_, i) => i % 3 === 0 || i === sigmaChart.length - 1);

  return (
    <>
      <p style={{ fontFamily: bd, fontSize: 13, color: t.dim, lineHeight: 1.6, margin: "0 0 14px" }}>
        {tr("pro.note.sigmaChart")}
      </p>
      <div style={{ background: t.bgAlt, border: `1px solid ${t.borderFaint}`, borderRadius: 4, padding: "12px 8px 4px", height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sampled}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.ghost} />
            <XAxis dataKey="date" tick={{ fill: t.faint, fontSize: 9, fontFamily: mn }}
              tickLine={false} interval={Math.floor(sampled.length / 8)} />
            <YAxis tick={{ fill: t.faint, fontSize: 9, fontFamily: mn }}
              domain={[-3, 3]} ticks={[-2, -1, 0, 1, 2]} />
            <Tooltip content={<ChartTooltip t={t} />} />
            <ReferenceLine y={0} stroke={t.faint} strokeWidth={1} />
            <ReferenceLine y={1} stroke="#F2994A" strokeDasharray="4 3" strokeOpacity={0.4} />
            <ReferenceLine y={-1} stroke="#2F80ED" strokeDasharray="4 3" strokeOpacity={0.4} />
            <Area type="monotone" dataKey="sigma" stroke={t.cream} strokeWidth={1.5}
              fill={t.cream} fillOpacity={0.08} dot={false} name="σ" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontFamily: mn, fontSize: 9, color: "#2F80ED" }}>{tr("pro.legend.undervalued")}</span>
        <span style={{ fontFamily: mn, fontSize: 9, color: "#F2994A" }}>{tr("pro.legend.overvalued")}</span>
      </div>
    </>
  );
}

export function MCHorizonTable({ d, t }) {
  const { t: tr } = useI18n();
  const { S0, a, b, t0, percentiles, percentiles3y, plToday, pl1y, pl2y, pl3y } = d;

  const rows = [
    { id: "today", labelKey: "pro.horizon.today", days: 0, pcts: percentiles, plV: plToday },
    { id: "6m",    labelKey: "pro.horizon.6m",    days: 182, pcts: percentiles, plV: plPrice(a, b, t0 + 182) },
    { id: "1y",    labelKey: "pro.horizon.1y",    days: 365, pcts: percentiles, plV: pl1y },
    { id: "2y",    labelKey: "pro.horizon.2y",    days: 730, pcts: percentiles3y, plV: pl2y },
    { id: "3y",    labelKey: "pro.horizon.3y",    days: 1095, pcts: percentiles3y, plV: pl3y },
  ];

  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      {/* Header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", padding: "8px 0", borderBottom: `1px solid ${t.border}`, minWidth: 400 }}>
        {[{ k: "pro.horizon", align: "left" }, { k: "pro.col.plTarget", align: "right" }, { k: "pro.bear", align: "right" }, { k: "pro.median", align: "right", suffix: " (P50)" }, { k: "pro.bull", align: "right" }].map((h, i) => (
          <div key={i} style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: h.align }}>{tr(h.k)}{h.suffix || ""}</div>
        ))}
      </div>
      {rows.map(r => {
        const idx = Math.min(Math.floor(r.days / 5), r.pcts.length - 1);
        const row = r.days === 0 ? { p5: S0, p50: S0, p95: S0 } : r.pcts[idx] || {};
        return (
          <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", padding: "8px 0", borderBottom: `1px solid ${t.borderFaint}`, minWidth: 400 }}>
            <div style={{ fontFamily: bd, fontSize: 12, fontWeight: r.days === 0 ? 600 : 400, color: t.cream }}>{tr(r.labelKey)}</div>
            <div style={{ fontFamily: mn, fontSize: 12, color: "#27AE60", textAlign: "right" }}>{fmtK(r.plV)}</div>
            <div style={{ fontFamily: mn, fontSize: 12, color: "#EB5757", textAlign: "right" }}>{fmtK(row.p5)}</div>
            <div style={{ fontFamily: mn, fontSize: 12, color: t.cream, textAlign: "right", fontWeight: 600 }}>{fmtK(row.p50)}</div>
            <div style={{ fontFamily: mn, fontSize: 12, color: "#27AE60", textAlign: "right" }}>{fmtK(row.p95)}</div>
          </div>
        );
      })}
    </div>
  );
}
