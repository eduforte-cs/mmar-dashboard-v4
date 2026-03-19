import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { bd, mn } from "../theme/tokens";

export default function DataCell({ label, value, sub, borderRight }) {
  const { t } = useTheme();
  return (
    <div style={{
      padding: "16px 0",
      borderRight: borderRight ? `1px solid ${t.borderFaint}` : "none",
      paddingRight: borderRight ? 20 : 0,
    }}>
      <div style={{
        fontFamily: bd, fontSize: 9, color: t.faint,
        textTransform: "uppercase", letterSpacing: "0.08em",
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: mn, fontSize: 18, fontWeight: 500,
        color: t.cream,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontFamily: bd, fontSize: 10, color: t.faint,
          marginTop: 2,
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}
