import React, { useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { bd, mn } from "../theme/tokens";

export default function Header({ tab, setTab, r2 }) {
  const { t, mode, toggle } = useTheme();
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <>
      {/* ═══ DESKTOP HEADER ═══ */}
      <header className="header-desktop" style={{
        borderBottom: `1px solid ${t.border}`,
        display: "flex", alignItems: "stretch",
      }}>
        <div style={{
          padding: "20px 24px",
          borderRight: `1px solid ${t.border}`,
          display: "flex", alignItems: "center",
        }}>
          <span style={{
            fontFamily: bd, fontSize: 22, fontWeight: 700,
            color: t.cream, letterSpacing: "-0.03em",
          }}>
            MMAR
          </span>
        </div>

        {["Lite", "Pro", "PL", "FAQ"].map(n => {
          const tabKey = n === "PL" ? "pl" : n.toLowerCase();
          return (
          <button
            key={n}
            onClick={() => setTab(tabKey)}
            style={{
              padding: "0 32px", border: "none",
              borderRight: `1px solid ${t.border}`,
              cursor: "pointer", fontFamily: bd, fontSize: 14, fontWeight: 400,
              color: tab === tabKey ? t.cream : t.faint,
              background: tab === tabKey ? t.bgAlt : "transparent",
              transition: "all 0.2s",
            }}
          >
            {n}
          </button>
          );
        })}

        <div style={{ flex: 1 }} />

        <div style={{
          padding: "0 24px", display: "flex", alignItems: "center",
          borderLeft: `1px solid ${t.border}`,
        }}>
          <span style={{ fontFamily: mn, fontSize: 11, color: t.faint }}>
            R² {r2 ? r2.toFixed(3) : "0.914"}
          </span>
        </div>

        <div
          style={{
            padding: "0 24px", display: "flex", alignItems: "center",
            borderLeft: `1px solid ${t.border}`, cursor: "pointer",
          }}
          onClick={toggle}
        >
          <div style={{
            width: 24, height: 12, borderRadius: 12,
            background: t.ghost, position: "relative",
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: t.cream, position: "absolute", top: 2,
              left: mode === "dark" ? 2 : 14,
              transition: "left 0.2s",
            }} />
          </div>
        </div>
      </header>

      {/* ═══ MOBILE HEADER ═══ */}
      <header className="header-mobile" style={{
        position: "sticky", top: 0, zIndex: 100,
        borderBottom: `1px solid ${t.border}`,
        background: t.bg,
        display: "flex", alignItems: "stretch",
      }}>
        <div style={{ padding: "14px 16px", display: "flex", alignItems: "center" }}>
          <span style={{
            fontFamily: bd, fontSize: 18, fontWeight: 700,
            color: t.cream, letterSpacing: "-0.03em",
          }}>
            MMAR
          </span>
        </div>

        {["Lite", "Pro", "PL"].map(n => {
          const tabKey = n === "PL" ? "pl" : n.toLowerCase();
          return (
          <button
            key={n}
            onClick={() => { setTab(tabKey); setMobileMenu(false); }}
            style={{
              padding: "0 16px", border: "none",
              cursor: "pointer", fontFamily: bd, fontSize: 13, fontWeight: 500,
              color: tab === tabKey ? t.cream : t.faint,
              background: tab === tabKey ? t.bgAlt : "transparent",
              borderBottom: tab === tabKey
                ? `2px solid ${t.cream}`
                : "2px solid transparent",
            }}
          >
            {n}
          </button>
          );
        })}

        <div style={{ flex: 1 }} />

        <button
          onClick={() => setMobileMenu(m => !m)}
          style={{
            padding: "0 16px", border: "none", background: "none",
            cursor: "pointer", display: "flex", alignItems: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{
              width: 18, height: 1.5, background: t.cream,
              transition: "all 0.2s",
              transform: mobileMenu ? "rotate(45deg) translate(2px, 2px)" : "none",
            }} />
            <div style={{
              width: 18, height: 1.5, background: t.cream,
              transition: "all 0.2s",
              opacity: mobileMenu ? 0 : 1,
            }} />
            <div style={{
              width: 18, height: 1.5, background: t.cream,
              transition: "all 0.2s",
              transform: mobileMenu ? "rotate(-45deg) translate(2px, -2px)" : "none",
            }} />
          </div>
        </button>
      </header>

      {/* ═══ MOBILE MENU DROPDOWN ═══ */}
      {mobileMenu && (
        <div className="header-mobile" style={{
          position: "sticky", top: 49, zIndex: 99,
          background: t.bg, borderBottom: `1px solid ${t.border}`,
          display: "flex", flexDirection: "column",
        }}>
          <button
            onClick={() => { setTab("faq"); setMobileMenu(false); }}
            style={{
              padding: "16px 20px", border: "none",
              borderBottom: `1px solid ${t.borderFaint}`,
              cursor: "pointer", fontFamily: bd, fontSize: 14, fontWeight: 500,
              color: tab === "faq" ? t.cream : t.faint,
              background: "transparent", textAlign: "left",
            }}
          >
            FAQ
          </button>
          <div style={{
            padding: "16px 20px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontFamily: mn, fontSize: 10, color: t.faint }}>
              R² {r2 ? r2.toFixed(3) : "0.914"}
            </span>
            <div
              style={{
                display: "flex", alignItems: "center", gap: 8,
                cursor: "pointer",
              }}
              onClick={toggle}
            >
              <span style={{ fontFamily: bd, fontSize: 11, color: t.faint }}>
                {mode === "dark" ? "Light" : "Dark"}
              </span>
              <div style={{
                width: 24, height: 12, borderRadius: 12,
                background: t.ghost, position: "relative",
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: t.cream, position: "absolute", top: 2,
                  left: mode === "dark" ? 2 : 14,
                  transition: "left 0.2s",
                }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
