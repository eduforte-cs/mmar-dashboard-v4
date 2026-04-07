import React, { useState, useCallback, useEffect } from "react";
import { ThemeProvider, useTheme } from "./theme/ThemeContext";
import { bd, mn } from "./theme/tokens";
import useEngine from "./hooks/useEngine";
import Header from "./components/Header";
import Hero from "./sections/Hero";
import Lite from "./sections/Lite";
import Pro from "./sections/Pro";
import Faq from "./sections/Faq";
import PowerLaw from "./sections/PowerLaw";
import MonteCarlo from "./sections/MonteCarlo";
import Backtest from "./sections/Backtest";
import Whitepaper from "./sections/Whitepaper";
import About from "./sections/About";
import Footer from "./sections/Footer";
import Landing from "./sections/Landing";
import { supabase } from "./lib/supabase";
import { trackTabView, trackPageView, trackSignalView } from "./tracking";

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

function Placeholder({ label }) {
  const { t } = useTheme();
  return (
    <div style={{
      minHeight: "60vh", display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center", gap: 12,
    }}>
      <div style={{ fontFamily: bd, fontSize: 24, fontWeight: 700, color: t.cream, letterSpacing: "-0.03em" }}>{label}</div>
      <div style={{ fontFamily: bd, fontSize: 14, color: t.faint }}>Coming soon</div>
    </div>
  );
}

function Dashboard() {
  const { t } = useTheme();
  const [tab, setTabRaw] = useState("lite");
  const setTab = useCallback((t) => { trackTabView(t); setTabRaw(t); }, []);
  const { phase, msg, d, derived, lastRefresh, retry } = useEngine();

  // ── Auth state ──
  const [session, setSession] = useState(undefined); // undefined = loading, null = no session, object = logged in
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!supabase) { setSession(null); setAuthChecked(true); return; }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthChecked(true);
    });

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const showLanding = authChecked && !session;

  // Track signal when data loads
  useEffect(() => {
    if (d?.sigma != null) trackSignalView(d.answerLabel || "–", d.sigma);
    trackPageView(showLanding ? "landing" : "dashboard");
  }, [d?.sigma, showLanding]);

  // ── Auth handlers ──
  const handleAuth = async (method, email) => {
    if (!supabase) { console.log("Supabase not configured"); return; }

    if (method === "google") {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    }

    if (method === "magic") {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
    }
  };

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
  };

  // Show loading while checking auth
  if (!authChecked) return <Loading msg="Checking session..." />;

  if (phase === "loading") return <Loading msg={msg} />;
  if (phase === "error") return <ErrorScreen msg={msg} onRetry={retry} />;

  if (showLanding) {
    const handleTabClick = () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      Landing.showNudge?.();
    };
    return (
      <div style={{ background: t.bg, minHeight: "100vh" }}>
        <Header tab={null} setTab={handleTabClick} r2={d?.r2} />
        <div className="page-pad" style={{ padding: "0 24px" }}>
          <Landing d={d} onAuth={handleAuth} setTab={setTab} />
        </div>
      </div>
    );
  }

  // Full-bleed tabs (no page-pad)
  const fullBleedTabs = ["pl", "mc"];
  // Tabs that show Hero
  const heroTabs = ["pro"];

  return (
    <div style={{
      background: t.bg, minHeight: "100vh",
      transition: "background 0.3s ease",
    }}>
      <Header tab={tab} setTab={setTab} r2={d?.r2} user={session?.user} onLogout={handleLogout} />

      {fullBleedTabs.includes(tab) ? (
        <div style={{ animation: "fi 0.3s ease" }}>
          {tab === "pl" && <PowerLaw d={d} derived={derived} />}
          {tab === "mc" && <MonteCarlo d={d} derived={derived} />}
        </div>
      ) : (
        <div className="page-pad" style={{ padding: "0 24px" }}>
          {heroTabs.includes(tab) && <Hero d={d} derived={derived} />}
          <div style={{ animation: "fi 0.3s ease" }}>
            {tab === "lite" && <Lite d={d} derived={derived} setTab={setTab} />}
            {tab === "pro" && <Pro d={d} derived={derived} setTab={setTab} />}
            {tab === "backtest" && <Backtest d={d} />}
            {tab === "faq" && <Faq />}
            {tab === "whitepaper" && <Whitepaper d={d} />}
            {tab === "about" && <About />}
          </div>
          <Footer lastRefresh={lastRefresh} />
        </div>
      )}
    </div>
  );
}

import { I18nProvider } from "./i18n/I18nContext";

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <Dashboard />
      </I18nProvider>
    </ThemeProvider>
  );
}
