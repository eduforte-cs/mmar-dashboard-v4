import React, { useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { bd } from "../theme/tokens";

export default function FaqToggle({ question, answer, category }) {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderBottom: `1px solid ${t.border}` }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "block", width: "100%", textAlign: "left",
          padding: "28px 0", background: "none", border: "none",
          cursor: "pointer",
        }}
      >
        <span style={{
          fontFamily: bd, fontSize: 18, fontWeight: 500,
          color: t.cream, lineHeight: 1.4,
        }}>
          {question}
        </span>
      </button>

      {open && (
        <div className="faq-expanded" style={{
          display: "grid", gridTemplateColumns: "1fr",
          gap: 0, paddingBottom: 40,
        }}>
          <div style={{ marginBottom: 20 }}>
            {category && (
              <div style={{
                fontFamily: bd, fontSize: 11, fontWeight: 600,
                color: t.faint, marginBottom: 6,
              }}>
                {category}
              </div>
            )}
            <div style={{
              display: "flex", gap: 20,
              fontFamily: bd, fontSize: 11, color: t.faint,
            }}>
              <span style={{
                cursor: "pointer",
                borderBottom: `1px solid ${t.borderFaint}`,
                paddingBottom: 1,
              }}>
                Copy link
              </span>
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
          <div>
            <p style={{
              fontFamily: bd, fontSize: 17, fontWeight: 400,
              color: t.cream, lineHeight: 1.7, margin: 0,
            }}>
              {answer}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
