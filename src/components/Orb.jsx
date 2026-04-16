// ── Orb.jsx — Floating gradient blob, signal-aware ──
import { useState, useEffect } from "react";
import { bd } from "../theme/tokens";

const SIGNAL_GRADIENTS = {
  buy:  ["#27AE60", "#BB6BD9", "#1B8A4A"],
  hold: ["#E8A838", "#BB6BD9", "#A06B10"],
  sell: ["#EB5757", "#BB6BD9", "#9A2B2B"],
};

export default function Orb({ state = "idle", signal = "buy", size = 48, label, onClick, style }) {
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
      {/* Core gradient blob — green/violet shift */}
      <span className="orb-core" style={{
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        overflow: "hidden",
      }}>
        {/* Green layer */}
        <span className="orb-layer-a" style={{
          position: "absolute", inset: 0,
          borderRadius: "50%",
          background: `radial-gradient(ellipse 140% 100% at 25% 30%, ${c1}DD 0%, transparent 65%)`,
          filter: `blur(${size * 0.04}px)`,
        }} />
        {/* Violet layer */}
        <span className="orb-layer-b" style={{
          position: "absolute", inset: 0,
          borderRadius: "50%",
          background: `radial-gradient(ellipse 100% 140% at 75% 70%, ${c2}CC 0%, transparent 60%)`,
          filter: `blur(${size * 0.04}px)`,
        }} />
        {/* Base */}
        <span style={{
          position: "absolute", inset: 0,
          borderRadius: "50%",
          background: `radial-gradient(circle at 50% 50%, ${c3}66 0%, ${c3}11 100%)`,
        }} />
      </span>
      {/* Label */}
      {label && (
        <span style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: bd,
          fontSize: size * 0.22,
          fontWeight: 700,
          color: "#fff",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          zIndex: 1,
          textShadow: `0 1px ${size * 0.06}px ${c3}88`,
        }}>
          {label}
        </span>
      )}
    </button>
  );
}
