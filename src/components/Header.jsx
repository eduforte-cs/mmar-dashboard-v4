import React, { useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { bd, mn } from "../theme/tokens";

const LEFT_TABS = [
  { label: "Lite", key: "lite" },
  { label: "Pro", key: "pro" },
  { label: "PL", key: "pl" },
  { label: "MC", key: "mc" },
];

const RIGHT_TABS = [
  { label: "Backtest", key: "backtest" },
  { label: "FAQ", key: "faq" },
  { label: "Whitepaper", key: "whitepaper" },
  { label: "About", key: "about" },
];

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
        {/* Brand */}
        <div style={{
          padding: "20px 28px",
          borderRight: `1px solid ${t.border}`,
          display: "flex", alignItems: "center",
        }}>
          <span style={{
            fontFamily: bd, fontSize: 18, fontWeight: 700,
            color: t.cream, letterSpacing: "-0.02em",
          }}>
            CommonSense
          </span>
        </div>

        {/* Left tabs: Lite Pro PL MC */}
        {LEFT_TABS.map(n => {
          const isActive = tab === n.key;
          return (
            <button
              key={n.key}
              onClick={() => setTab(n.key)}
              style={{
                padding: "0 28px", border: "none",
                borderRight: `1px solid ${t.border}`,
                cursor: "pointer", fontFamily: bd, fontSize: 14, fontWeight: 400,
                color: isActive ? t.cream : t.faint,
                background: isActive ? t.bgAlt : "transparent",
                borderBottom: isActive ? `2px solid ${t.cream}` : "2px solid transparent",
                transition: "all 0.2s",
              }}
            >
              {n.label}
            </button>
          );
        })}

        <div style={{ flex: 1 }} />

        {/* Right tabs: Backtest FAQ Whitepaper About */}
        {RIGHT_TABS.map(n => {
          const isActive = tab === n.key;
          return (
            <button
              key={n.key}
              onClick={() => setTab(n.key)}
              style={{
                padding: "0 22px", border: "none",
                borderLeft: `1px solid ${t.border}`,
                cursor: "pointer", fontFamily: bd, fontSize: 13, fontWeight: 400,
                color: isActive ? t.cream : t.faint,
                background: isActive ? t.bgAlt : "transparent",
                borderBottom: isActive ? `2px solid ${t.cream}` : "2px solid transparent",
                transition: "all 0.2s",
              }}
            >
              {n.label}
            </button>
          );
        })}

        {/* R² */}
        <div style={{
          padding: "0 22px", display: "flex", alignItems: "center",
          borderLeft: `1px solid ${t.border}`, gap: 6,
        }}>
          <span style={{ fontFamily: mn, fontSize: 11, color: t.faint }}>R²</span>
          <span style={{ fontFamily: mn, fontSize: 11, color: t.cream }}>{r2 ? r2.toFixed(3) : "0.907"}</span>
        </div>

        {/* Theme toggle */}
        <div
          style={{
            padding: "0 22px", display: "flex", alignItems: "center",
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
        {/* Brand */}
        <div style={{
          padding: "14px 16px",
          borderRight: `1px solid ${t.border}`,
          display: "flex", alignItems: "center",
        }}>
          <span style={{
            fontFamily: bd, fontSize: 14, fontWeight: 700,
            color: t.cream, letterSpacing: "-0.02em",
          }}>
            CommonSense
          </span>
        </div>

        {/* Left tabs: Lite Pro PL MC */}
        {LEFT_TABS.map(n => {
          const isActive = tab === n.key;
          return (
            <button
              key={n.key}
              onClick={() => { setTab(n.key); setMobileMenu(false); }}
              style={{
                padding: "0 14px", border: "none",
                borderRight: `1px solid ${t.border}`,
                cursor: "pointer", fontFamily: bd, fontSize: 13, fontWeight: 500,
                color: isActive ? t.cream : t.faint,
                background: isActive ? t.bgAlt : "transparent",
                borderBottom: isActive ? `2px solid ${t.cream}` : "2px solid transparent",
              }}
            >
              {n.label}
            </button>
          );
        })}

        <div style={{ flex: 1 }} />

        {/* Hamburger */}
        <button
          onClick={() => setMobileMenu(m => !m)}
          style={{
            padding: "0 14px", border: "none", background: "none",
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
          {RIGHT_TABS.map(n => (
            <button
              key={n.key}
              onClick={() => { setTab(n.key); setMobileMenu(false); }}
              style={{
                padding: "16px 20px", border: "none",
                borderBottom: `1px solid ${t.borderFaint}`,
                cursor: "pointer", fontFamily: bd, fontSize: 14, fontWeight: 500,
                color: tab === n.key ? t.cream : t.faint,
                background: "transparent", textAlign: "left",
              }}
            >
              {n.label}
            </button>
          ))}
          <div style={{
            padding: "16px 20px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontFamily: mn, fontSize: 10, color: t.faint }}>
              R² {r2 ? r2.toFixed(3) : "0.907"}
            </span>
            <div
              style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
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
