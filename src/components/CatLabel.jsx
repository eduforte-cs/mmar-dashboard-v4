import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { bd } from "../theme/tokens";

export default function CatLabel({ label }) {
  const { t } = useTheme();
  return (
    <>
      <div style={{
        fontFamily: bd, fontSize: 14, fontWeight: 500,
        color: t.cream, padding: "36px 0 10px",
        letterSpacing: "0.01em",
      }}>
        {label}
      </div>
      <div style={{ height: 2, background: t.cream, marginBottom: 0 }} />
    </>
  );
}
