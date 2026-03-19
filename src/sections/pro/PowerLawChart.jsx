import React, { useState, useMemo } from "react";
import { useTheme } from "../../theme/ThemeContext";
import { bd, mn } from "../../theme/tokens";
import { fmtK, fmtY, daysSinceGenesis } from "../../engine/constants.js";
import { plPrice } from "../../engine/powerlaw.js";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

const GENESIS_MS = new Date("2009-01-03").getTime();

function fmtLogT(v) {
  const days = Math.pow(10, v);
  const date = new Date(GENESIS_MS + days * 86400000);
  return date.getFullYear().toString();
}

export default function PowerLawChart({ d }) {
  const { t } = useTheme();
  const [range, setRange] = useState("2017");

  const { a, b, resMean, resStd, resFloor, sigmaChart, t0, lastDate } = d;

  // Build plChart from sigmaChart (already sampled every 5 points)
  const { plChart, forecastChart, filteredPL, logTMin, logTMax, yearTicks, autoMin, autoMax, yTicks, lastLogT } = useMemo(() => {
    // Historical data: transform sigmaChart to log10 space
    const plChart = (sigmaChart || []).map(p => {
      const days = daysSinceGenesis(p.fullDate || p.date);
      if (days <= 0 || p.price <= 0) return null;
      const plV = p.fair || plPrice(a, b, days);
      const lpl = Math.log10(plV);
      const lprice = Math.log10(p.price);
      return {
        date: p.fullDate || p.date,
        logT: +Math.log10(days).toFixed(4),
        lPrice: +lprice.toFixed(4),
        lPl: +lpl.toFixed(4),
        lR2up: +(lpl + (resMean + 2 * resStd) / Math.LN10).toFixed(4),
        lR1up: +(lpl + (resMean + resStd) / Math.LN10).toFixed(4),
        lR05up: +(lpl + (resMean + 0.5 * resStd) / Math.LN10).toFixed(4),
        lR05dn: +(lpl + (resMean - 0.5 * resStd) / Math.LN10).toFixed(4),
        lSup: +(lpl + resFloor / Math.LN10).toFixed(4),
      };
    }).filter(Boolean);

    // Forecast: monthly from today to 2039
    const forecastChart = [];
    const monthsTo2039 = Math.ceil((new Date("2039-01-01") - new Date(lastDate || Date.now())) / (1000 * 60 * 60 * 24 * 30));
    for (let m = 1; m <= Math.max(24, monthsTo2039); m++) {
      const tF = t0 + m * 30;
      const plF = plPrice(a, b, tF);
      const fd = new Date(lastDate || Date.now());
      fd.setDate(fd.getDate() + m * 30);
      const lplF = Math.log10(plF);
      forecastChart.push({
        date: fd.toISOString().slice(0, 7),
        logT: +Math.log10(tF).toFixed(4),
        lPl: +lplF.toFixed(4),
        lPrice: null,
        lR2up: +(lplF + (resMean + 2 * resStd) / Math.LN10).toFixed(4),
        lR1up: +(lplF + (resMean + resStd) / Math.LN10).toFixed(4),
        lR05up: +(lplF + (resMean + 0.5 * resStd) / Math.LN10).toFixed(4),
        lR05dn: +(lplF + (resMean - 0.5 * resStd) / Math.LN10).toFixed(4),
        lSup: +(lplF + resFloor / Math.LN10).toFixed(4),
      });
    }

    // Merge + filter by range
    const allData = [...plChart, ...forecastChart.map(p => ({ ...p, forecast: true }))];
    const rangeStart = { "2010": "2010-01-01", "2017": "2017-01-01", "2020": "2020-01-01", "2024": "2024-01-01", "all": "1900-01-01" }[range] || "2020-01-01";
    const allFiltered = allData.filter(p => p.date >= rangeStart);

    // Sample for performance
    const sampleRate = { "all": 7, "2010": 3, "2017": 3, "2020": 2, "2024": 1 }[range] || 2;
    const filteredPL = allFiltered.filter((_, i) => i % sampleRate === 0 || i === allFiltered.length - 1);

    // Y axis bounds
    const allVals = filteredPL.flatMap(p => [p.lR2up, p.lR1up, p.lR05up, p.lPl, p.lR05dn, p.lSup, p.lPrice].filter(v => v != null && isFinite(v)));
    const autoMin = allVals.length ? Math.floor(Math.min(...allVals) * 2) / 2 : 3;
    const autoMax = allVals.length ? Math.ceil(Math.max(...allVals) * 2) / 2 + 0.5 : 7;
    const yTicks = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(tt => tt >= autoMin - 0.3 && tt <= autoMax + 0.3);

    // X axis bounds + year ticks
    const logTVals = filteredPL.map(p => p.logT).filter(v => v != null && isFinite(v));
    const logTMin = logTVals.length ? Math.floor(Math.min(...logTVals) * 10) / 10 : 2.5;
    const logTMax = logTVals.length ? Math.ceil(Math.max(...logTVals) * 10) / 10 : 4.1;
    const yearTicks = [2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024, 2026, 2028, 2030, 2035, 2039]
      .map(y => +Math.log10(daysSinceGenesis(`${y}-01-01`)).toFixed(4))
      .filter(lt => lt >= logTMin - 0.02 && lt <= logTMax + 0.02);

    const lastLogT = plChart.length ? plChart[plChart.length - 1].logT : null;

    return { plChart, forecastChart, filteredPL, logTMin, logTMax, yearTicks, autoMin, autoMax, yTicks, lastLogT };
  }, [sigmaChart, a, b, resMean, resStd, resFloor, t0, lastDate, range]);

  const legendItems = [
    { color: "#EB5757", label: "Bubble zone", dash: false },
    { color: "#F2994A", label: "Cycle ceiling", dash: true },
    { color: "#E8A838", label: "Slightly warm", dash: true },
    { color: "#27AE60", label: "Fair Value", dash: false },
    { color: "#56CCF2", label: "Mild discount", dash: true },
    { color: "#2F80ED", label: "Support", dash: false },
    { color: t.cream, label: "BTC Price", dash: false },
  ];

  return (
    <>
      <p style={{ fontFamily: bd, fontSize: 13, color: t.dim, lineHeight: 1.6, margin: "0 0 14px" }}>
        Bitcoin's price has followed a power law growth curve since 2010. The bands show historical deviation ranges. When price touches the upper bands, it tends to correct. When it reaches lower bands, it tends to recover.
      </p>

      {/* Range selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {["2010", "2017", "2020", "2024", "all"].map(r => (
          <button key={r} onClick={() => setRange(r)} style={{
            fontFamily: bd, fontSize: 12, padding: "5px 14px",
            background: range === r ? t.cream : t.bgAlt,
            border: `1px solid ${range === r ? t.cream : t.border}`,
            color: range === r ? t.bg : t.faint,
            cursor: "pointer", borderRadius: 4, fontWeight: 500,
          }}>
            {r === "all" ? "All time" : `${r}+`}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
        {legendItems.map(({ color, dash, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="16" height="3">
              <line x1="0" y1="1.5" x2="16" y2="1.5" stroke={color} strokeWidth={2} strokeDasharray={dash ? "4 2" : undefined} />
            </svg>
            <span style={{ fontFamily: bd, fontSize: 10, color: t.faint }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ background: t.bgAlt, border: `1px solid ${t.borderFaint}`, borderRadius: 4, padding: "16px 8px 4px", height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredPL} margin={{ top: 8, right: 16, left: 10, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.ghost} />
            <XAxis
              dataKey="logT" type="number"
              domain={[logTMin, logTMax]}
              ticks={yearTicks}
              tick={{ fill: t.faint, fontSize: 10, fontFamily: mn }}
              tickLine={false}
              tickFormatter={fmtLogT}
            />
            <YAxis
              domain={[autoMin, autoMax]}
              ticks={yTicks}
              tick={{ fill: t.faint, fontSize: 10, fontFamily: mn }}
              tickLine={false}
              tickFormatter={fmtY}
              width={55}
            />
            <Tooltip
              contentStyle={{ background: t.bgAlt, border: `1px solid ${t.border}`, borderRadius: 4, fontSize: 11, fontFamily: mn, color: t.cream, padding: "8px 12px" }}
              labelFormatter={(v, payload) => payload?.[0]?.payload?.date || fmtLogT(v)}
              formatter={(v, n) => [fmtK(Math.pow(10, v)), n]}
            />
            {lastLogT && <ReferenceLine x={lastLogT} stroke={t.ghost} strokeDasharray="4 2" />}
            <Line type="monotone" dataKey="lR2up" stroke="#EB5757" strokeWidth={1.2} dot={false} name="Bubble" connectNulls />
            <Line type="monotone" dataKey="lR1up" stroke="#F2994A" strokeWidth={1.2} strokeDasharray="5 3" dot={false} name="Ceiling" connectNulls />
            <Line type="monotone" dataKey="lR05up" stroke="#E8A838" strokeWidth={1} strokeDasharray="4 3" dot={false} name="+0.5σ" connectNulls />
            <Line type="monotone" dataKey="lPl" stroke="#27AE60" strokeWidth={2} dot={false} name="Fair Value" connectNulls />
            <Line type="monotone" dataKey="lR05dn" stroke="#56CCF2" strokeWidth={1} strokeDasharray="4 3" dot={false} name="−0.5σ" connectNulls />
            <Line type="monotone" dataKey="lSup" stroke="#2F80ED" strokeWidth={1.5} dot={false} name="Support" connectNulls />
            <Line type="monotone" dataKey="lPrice" stroke={t.cream} strokeWidth={2.5} dot={false} name="BTC" connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ fontFamily: mn, fontSize: 9, color: t.ghost, textAlign: "center", marginTop: 6 }}>
        Log-log scale · X: log₁₀(days since genesis) · Y: log₁₀(price USD)
      </div>
    </>
  );
}
