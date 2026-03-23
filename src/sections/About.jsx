import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { bd } from "../theme/tokens";

export default function About() {
  const { t } = useTheme();
  return (
    <div style={{ padding: "48px 0", animation: "fi 0.3s ease" }}>
      <h2 style={{ fontFamily: bd, fontSize: 56, fontWeight: 800, color: t.cream, letterSpacing: "-0.04em", lineHeight: 0.95, margin: 0 }}>About</h2>
      <p style={{ fontFamily: bd, fontSize: 15, color: t.faint, marginTop: 16 }}>Coming soon.</p>
    </div>
  );
}
