import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { useI18n } from "../i18n/I18nContext";
import { bd, mn } from "../theme/tokens";

// ─────────────────────────────────────────────────────────────────
// Splash — branded loading screen with live progress bar.
//
// Replaces the old <Loading /> component. Shows a big pulsing ₿
// with a green halo, the hero question tagline, and a progress
// bar tied to the current engine phase so the user sees real
// forward motion while the Web Worker grinds through Power Law
// fit → Hurst → Monte Carlo → backtest.
//
// The `progress` number (0-100) is computed by msgToProgress()
// below, which maps the worker's free-text progress messages to
// approximate completion percentages. It's a heuristic — a given
// message has a fixed weight — but it looks and feels real enough
// that the user reads it as "the thing is working" instead of
// "is my browser frozen".
// ─────────────────────────────────────────────────────────────────
export default function Splash({ msg, progress = 0 }) {
  const { t } = useTheme();
  const { t: tr } = useI18n();
  const pct = Math.max(0, Math.min(100, progress));

  return (
    <div style={{
      minHeight: "100vh",
      background: `radial-gradient(ellipse at center top, ${t.bgAlt} 0%, ${t.bg} 55%, #0A0B09 100%)`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      animation: "fi 0.4s ease-out",
    }}>
      {/* Hero question — no ₿ glyph so it reads consistently across
          every browser (Switzer doesn't ship U+20BF, which makes the
          Bitcoin character fall back to a system font and look out
          of place next to the real Switzer letters). */}
      <h1 style={{
        fontFamily: bd,
        fontSize: "clamp(40px, 7vw, 84px)",
        fontWeight: 800,
        color: t.cream,
        letterSpacing: "-0.045em",
        textAlign: "center",
        margin: "0 0 22px",
        lineHeight: 1.02,
        maxWidth: "92vw",
      }}>
        Should I Buy Bitcoin?
      </h1>
      <p style={{
        fontFamily: bd,
        fontSize: 14,
        color: t.faint,
        margin: "0 0 56px",
        letterSpacing: "0.01em",
        textAlign: "center",
        maxWidth: "90vw",
      }}>
        real-time quant signal · backtested daily since 2017
      </p>

      {/* Progress bar */}
      <div style={{
        width: "min(420px, 82vw)",
        height: 3,
        background: t.border,
        borderRadius: 2,
        overflow: "hidden",
        marginBottom: 16,
      }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: "linear-gradient(90deg, #1B8A4A 0%, #27AE60 60%, #33C97B 100%)",
          boxShadow: "0 0 14px rgba(39, 174, 96, 0.55)",
          transition: "width 480ms cubic-bezier(0.22, 0.61, 0.36, 1)",
          borderRadius: 2,
        }} />
      </div>

      {/* Phase caption */}
      <div style={{
        fontFamily: mn,
        fontSize: 11,
        color: t.dim,
        textTransform: "uppercase",
        letterSpacing: "0.16em",
        minHeight: 18,
        textAlign: "center",
        maxWidth: "82vw",
      }}>
        {msg || " "}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// msgToProgress — maps worker progress strings to a 0-100 value.
//
// The worker emits free-text messages at each phase of the compute.
// We parse them heuristically to estimate completion percentage.
// Not a perfect mapping — phases can take variable time depending
// on the device — but it produces a forward-motion feel rather
// than a stalled indeterminate spinner.
// ─────────────────────────────────────────────────────────────────
export function msgToProgress(msg) {
  if (!msg) return 0;
  const m = msg.toLowerCase();

  // Auth + cache phases (fast path)
  if (m.includes("checking session")) return 3;
  if (m.includes("checking cache")) return 10;
  if (m.includes("cache found") || m.includes("fetching live")) return 55;

  // Worker phases (cold path)
  if (m.includes("no cache") || m.includes("computing from scratch")) return 8;
  if (m.includes("connecting to market")) return 12;
  if (m.includes("fetching") && m.includes("btc")) return 14;

  if (m.includes("fitting power law")) return 22;
  if (m.includes("analyzing price dynamics")) return 30;
  if (m.includes("estimating fractal")) return 38;

  // Hurst sweep — "Computing Hurst + vol... 150 points"
  if (m.includes("multi-scale hurst") || m.includes("hurst + vol")) {
    const match = msg.match(/(\d+)\s*points/);
    if (match) {
      const pts = parseInt(match[1], 10);
      // Assume ~300 points is the full sweep
      return Math.min(52, 44 + (pts / 300) * 8);
    }
    return 44;
  }

  // Monte Carlo — "Running Monte Carlo... 800/2000"
  if (m.includes("monte carlo")) {
    const match = msg.match(/(\d+)\/(\d+)/);
    if (match) {
      const done = parseInt(match[1], 10);
      const total = parseInt(match[2], 10);
      return 54 + (done / total) * 30; // 54 → 84
    }
    return 54;
  }

  // Backtest + validation (tail)
  if (m.includes("walk-forward") || m.includes("backtest")) return 88;
  if (m.includes("validating") || m.includes("robust")) return 95;

  return 5; // unknown message — show a sliver of progress
}
