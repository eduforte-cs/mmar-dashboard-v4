import React, { useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { bd, mn } from "../theme/tokens";
import Chevron from "./Chevron";

export default function Toggle({
  label, badge, children, sub,
  defaultOpen = false, section, textOnly,
}) {
  const { t } = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ borderBottom: `1px solid ${t.border}` }}>
      {/* Header button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", width: "100%",
          padding: "24px 0", background: "none", border: "none",
          cursor: "pointer", fontFamily: bd, gap: 16,
        }}
      >
        <span style={{
          flex: 1, textAlign: "left",
          fontFamily: bd, fontSize: 18, fontWeight: 500,
          color: t.cream, lineHeight: 1.3,
        }}>
          {label}
          {sub && <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, fontWeight: 400, marginTop: 2 }}>{sub}</div>}
        </span>

        {badge && (
          <span style={{
            fontFamily: mn, fontSize: 10, fontWeight: 500,
            color: t.dim, padding: "3px 10px",
            border: `1px solid ${t.border}`, borderRadius: 3,
            flexShrink: 0,
          }}>
            {badge}
          </span>
        )}

        <div style={{
          width: 20, height: 20, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.25s ease",
        }}>
          <Chevron size={16} color={t.faint} />
        </div>
      </button>

      {/* Content */}
      {open && (
        textOnly ? (
          <div className="faq-expanded" style={{
            display: "grid", gridTemplateColumns: "1fr",
            gap: 0, paddingBottom: 40,
          }}>
            <div style={{ marginBottom: 20 }}>
              {section && (
                <div style={{
                  fontFamily: bd, fontSize: 11, fontWeight: 600,
                  color: t.faint, marginBottom: 6,
                }}>
                  {section}
                </div>
              )}
              <div style={{
                display: "flex", gap: 20,
                fontFamily: bd, fontSize: 11, color: t.faint,
              }}>
                <span
                  onClick={() => setOpen(false)}
                  style={{
                    cursor: "pointer",
                    borderBottom: `1px solid ${t.borderFaint}`,
                    paddingBottom: 1,
                  }}
                >
                  Close
                </span>
              </div>
            </div>
            <div>{children}</div>
          </div>
        ) : (
          <div style={{ paddingBottom: 32 }}>
            {children}
          </div>
        )
      )}
    </div>
  );
}
