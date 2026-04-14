import React, { useState, useCallback, useEffect } from "react";
import { ThemeProvider, useTheme } from "./theme/ThemeContext";
import { I18nProvider } from "./i18n/I18nContext";
import { bd, mn } from "./theme/tokens";
import useEngine from "./hooks/useEngine";
import Header from "./components/Header";
import Splash, { msgToProgress } from "./components/Splash";
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
import { fetchSpotPrice } from "./data/fetch.js";
import { trackTabView, trackPageView, trackSignalView } from "./tracking";

// ─────────────────────────────────────────────────────────────────
// ErrorScreen — shown when the engine fails.
// ─────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────
// Dashboard (root) — owns auth state, decides what to mount.
//
// Decision tree:
//   authChecked === false    →  <Splash> "Checking session..."
//   session === null         →  <LandingShell>  (lightweight, no engine)
//   session === object       →  <AuthedDashboard>  (runs useEngine)
//
// The split matters because useEngine() spins up a Web Worker that
// runs a ~20-30 second cold computation (Power Law fit + Hurst +
// 2,000 Monte Carlo paths + walk-forward backtest). Running that
// while the user is still looking at the landing page is wasted
// effort — the landing only needs the current spot price, which is
// a single fetch call.
// ─────────────────────────────────────────────────────────────────
function Dashboard() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = no session, object = logged in
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!supabase) { setSession(null); setAuthChecked(true); return; }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

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

  // ── Render decision ──
  if (!authChecked) {
    return <Splash msg="Checking session..." progress={3} />;
  }

  if (!session) {
    return <LandingShell onAuth={handleAuth} />;
  }

  return <AuthedDashboard session={session} onLogout={handleLogout} />;
}

// ─────────────────────────────────────────────────────────────────
// LandingShell — renders the Landing page with just the spot price.
//
// No Web Worker, no cache, no Monte Carlo. Just a single fetch
// against the spot price endpoint (~200-400ms). If that fails, the
// landing still renders with a "..." placeholder where the price
// would be — no blocking.
// ─────────────────────────────────────────────────────────────────
function LandingShell({ onAuth }) {
  const { t } = useTheme();
  const [spotData, setSpotData] = useState(null);

  useEffect(() => {
    trackPageView("landing");
    let cancelled = false;
    fetchSpotPrice()
      .then(({ spot }) => {
        if (cancelled) return;
        if (spot && spot > 1000) setSpotData({ S0: spot });
      })
      .catch(() => { /* non-fatal — landing renders without price */ });
    return () => { cancelled = true; };
  }, []);

  const handleTabClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    Landing.showNudge?.();
  };

  return (
    <div style={{ background: t.bg, minHeight: "100vh" }}>
      <Header tab={null} setTab={handleTabClick} r2={null} />
      <div className="page-pad" style={{ padding: "0 24px" }}>
        <Landing d={spotData} onAuth={onAuth} setTab={() => {}} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// AuthedDashboard — the full dashboard. Only mounts after login so
// useEngine() fires exactly once the user is authenticated.
// ─────────────────────────────────────────────────────────────────
function AuthedDashboard({ session, onLogout }) {
  const { t } = useTheme();
  const [tab, setTabRaw] = useState("lite");
  const setTab = useCallback((tabId) => { trackTabView(tabId); setTabRaw(tabId); }, []);
  const { phase, msg, d, derived, lastRefresh, retry } = useEngine();

  // Track signal when data loads
  useEffect(() => {
    if (d?.sigma != null) trackSignalView(d.answerLabel || "–", d.sigma);
    trackPageView("dashboard");
  }, [d?.sigma]);

  if (phase === "loading") {
    return <Splash msg={msg} progress={msgToProgress(msg)} />;
  }
  if (phase === "error") {
    return <ErrorScreen msg={msg} onRetry={retry} />;
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
      <Header tab={tab} setTab={setTab} r2={d?.r2} user={session?.user} onLogout={onLogout} />

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

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <Dashboard />
      </I18nProvider>
    </ThemeProvider>
  );
}
