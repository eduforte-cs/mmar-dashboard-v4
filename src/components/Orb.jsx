// ── Orb.jsx — Floating gradient blob, signal-aware ──
import { useState, useEffect } from "react";

const SIGNAL_GRADIENTS = {
  buy:  ["#27AE60", "#1B8A4A", "#0D5C2E"],
  hold: ["#E8A838", "#C4891E", "#A06B10"],
  sell: ["#EB5757", "#C74141", "#9A2B2B"],
};

export default function Orb({ state = "idle", signal = "buy", size = 48, onClick, style }) {
  const [c1, c2, c3] = SIGNAL_GRADIENTS[signal] || SIGNAL_GRADIENTS.buy;
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
        cursor: onClick ? "pointer" : "default",
        padding: 0,
        opacity: mounted ? 1 : 0,
        transition: "opacity 0.6s ease",
        ...style,
      }}
    >
      {/* Ambient glow */}
      <span className="orb-ring orb-ring-3" style={{
        position: "absolute",
        inset: size * -0.35,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${c1}20 0%, transparent 70%)`,
        filter: `blur(${size * 0.2}px)`,
      }} />
      {/* Mid glow */}
      <span className="orb-ring orb-ring-2" style={{
        position: "absolute",
        inset: size * -0.15,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${c1}30 0%, transparent 65%)`,
        filter: `blur(${size * 0.1}px)`,
      }} />
      {/* Core gradient blob */}
      <span className="orb-core" style={{
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        background: `
          radial-gradient(ellipse 120% 80% at 30% 25%, ${c1}CC 0%, transparent 60%),
          radial-gradient(ellipse 100% 120% at 70% 75%, ${c2}AA 0%, transparent 55%),
          radial-gradient(circle at 50% 50%, ${c3}88 0%, ${c3}22 100%)
        `,
        filter: `blur(${size * 0.03}px)`,
      }} />
    </button>
  );
}
