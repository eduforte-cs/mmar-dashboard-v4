import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { bd, mn } from "../theme/tokens";

export default function Gauge({ sigma = -0.38 }) {
  const { t } = useTheme();
  // Map sigma range [-2.5, +2.5] to [0%, 100%]
  const pct = ((sigma + 2.5) / 5) * 100;
  const clamped = Math.max(0, Math.min(100, pct));

  return (
    <div style={{ padding: "24px 0", borderBottom: `1px solid ${t.border}` }}>
      {/* Label row */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{
          fontFamily: bd, fontSize: 10, color: t.faint,
          textTransform: "uppercase", letterSpacing: "0.08em",
        }}>
          Position
        </span>
        <span style={{ fontFamily: mn, fontSize: 11, color: t.cream }}>
          {sigma >= 0 ? "+" : ""}{sigma.toFixed(2)}σ
        </span>
      </div>

      {/* Track */}
      <div style={{ position: "relative", height: 32 }}>
        {/* Base line */}
        <div style={{
          position: "absolute", top: 13, left: 0, right: 0,
          height: 1, background: t.ghost,
        }} />

        {/* Tick marks */}
        {Array.from({ length: 21 }, (_, i) => {
          const pos = (i / 20) * 100;
          const isMajor = i % 5 === 0;
          return (
            <div key={i} style={{
              position: "absolute", left: `${pos}%`,
              top: isMajor ? 6 : 10,
              width: 1,
              height: isMajor ? 16 : 8,
              background: isMajor ? t.faint : t.ghost,
            }} />
          );
        })}

        {/* Marker */}
        <div style={{
          position: "absolute", left: `${clamped}%`,
          top: 2, width: 2, height: 24,
          background: t.cream, borderRadius: 1,
        }} />
      </div>

      {/* Labels */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        {["−2.5σ", "−1σ", "Fair value", "+1σ", "+2.5σ"].map(l => (
          <span key={l} style={{ fontFamily: mn, fontSize: 9, color: t.ghost }}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}
