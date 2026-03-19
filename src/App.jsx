import React, { useState } from "react";
import { ThemeProvider, useTheme } from "./theme/ThemeContext";
import { bd, mn } from "./theme/tokens";
import useEngine from "./hooks/useEngine";
import Header from "./components/Header";
import Hero from "./sections/Hero";
import Lite from "./sections/Lite";
import Pro from "./sections/Pro";
import Faq from "./sections/Faq";
import PowerLaw from "./sections/PowerLaw";
import Footer from "./sections/Footer";

function Loading({ msg }) {
  const { t } = useTheme();
  return (
    <div style={{
      background: t.bg, minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>₿</div>
        <div style={{
          fontFamily: bd, color: t.faint, fontSize: 14,
          animation: "fi 1.5s ease-in-out infinite alternate",
        }}>
          {msg}
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({ msg, onRetry }) {
  const { t } = useTheme();
  return (
    <div style={{
      background: t.bg, minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: 24 }}>
        <div style={{
          fontFamily: bd, fontSize: 16, fontWeight: 600,
          color: t.cream, marginBottom: 8,
        }}>
          Something went wrong
        </div>
        <div style={{
          fontFamily: bd, fontSize: 13, color: t.faint, marginBottom: 20,
        }}>
          {msg}
        </div>
        <button
          onClick={onRetry}
          style={{
            fontFamily: bd, background: t.cream, color: t.bg,
            border: "none", padding: "8px 24px", cursor: "pointer",
            fontSize: 13, borderRadius: 4, fontWeight: 500,
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function Dashboard() {
  const { t } = useTheme();
  const [tab, setTab] = useState("lite");
  const { phase, msg, d, derived, lastRefresh, retry } = useEngine();

  if (phase === "loading") return <Loading msg={msg} />;
  if (phase === "error") return <ErrorScreen msg={msg} onRetry={retry} />;

  return (
    <div style={{
      background: t.bg, minHeight: "100vh",
      transition: "background 0.3s ease",
    }}>
      <Header tab={tab} setTab={setTab} r2={d?.r2} />

      {tab === "pl" ? (
        <div style={{ animation: "fi 0.3s ease" }}>
          <PowerLaw d={d} derived={derived} />
        </div>
      ) : (
        <div className="page-pad" style={{ padding: "0 24px" }}>
          <Hero d={d} derived={derived} />
          <div style={{ animation: "fi 0.3s ease" }}>
            {tab === "lite" && <Lite d={d} derived={derived} />}
            {tab === "pro" && <Pro d={d} derived={derived} />}
            {tab === "faq" && <Faq />}
          </div>
          <Footer lastRefresh={lastRefresh} />
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Dashboard />
    </ThemeProvider>
  );
}
