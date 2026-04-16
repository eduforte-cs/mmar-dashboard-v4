// ── Orb.jsx — Breathing AI orb with signal-aware colors ──
// States: idle (slow pulse), thinking (fast ripple), responding (steady glow)
import { useState, useEffect } from "react";

const SIGNAL_COLORS = {
  strongBuy: { core: "#27AE60", glow: "#1B8A4A" },
  buy:       { core: "#27AE60", glow: "#1B8A4A" },
  hold:      { core: "#E8A838", glow: "#C4891E" },
  caution:   { core: "#F2994A", glow: "#E07338" },
  reduce:    { core: "#F2994A", glow: "#E07338" },
  sell:      { core: "#EB5757", glow: "#C74141" },
};

export default function Orb({ state = "idle", signal = "buy", size = 48, onClick, style }) {
  const colors = SIGNAL_COLORS[signal] || SIGNAL_COLORS.buy;
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const animClass =
    state === "thinking" ? "orb-thinking" :
    state === "responding" ? "orb-responding" :
    "orb-idle";

  return (
    <button
      onClick={onClick}
      aria-label="Open chat"
      className={`orb ${animClass}`}
      style={{
        position: "relative",
        width: size,
        height: size,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        padding: 0,
        opacity: mounted ? 1 : 0,
        transition: "opacity 0.6s ease",
        ...style,
      }}
    >
      {/* Outer glow rings */}
      <span className="orb-ring orb-ring-3" style={{
        position: "absolute", inset: -12,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${colors.glow}15 0%, transparent 70%)`,
      }} />
      <span className="orb-ring orb-ring-2" style={{
        position: "absolute", inset: -6,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${colors.glow}25 0%, transparent 70%)`,
      }} />
      {/* Core */}
      <span className="orb-core" style={{
        position: "absolute", inset: 0,
        borderRadius: "50%",
        background: `radial-gradient(circle at 35% 35%, ${colors.core}DD, ${colors.glow}AA 60%, ${colors.glow}44 100%)`,
        boxShadow: `0 0 ${size * 0.4}px ${colors.core}66, 0 0 ${size * 0.8}px ${colors.glow}33`,
      }} />
      {/* Inner highlight */}
      <span style={{
        position: "absolute",
        top: "18%", left: "22%",
        width: "30%", height: "30%",
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%)`,
        filter: "blur(2px)",
      }} />
    </button>
  );
}
