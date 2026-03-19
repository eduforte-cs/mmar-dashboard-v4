import React, { useState } from "react";
import { ThemeProvider, useTheme } from "./theme/ThemeContext";
import Header from "./components/Header";
import Hero from "./sections/Hero";
import Lite from "./sections/Lite";
import Pro from "./sections/Pro";
import Faq from "./sections/Faq";
import Footer from "./sections/Footer";

function Dashboard() {
  const { t } = useTheme();
  const [tab, setTab] = useState("lite");

  return (
    <div style={{
      background: t.bg, minHeight: "100vh",
      transition: "background 0.3s ease",
    }}>
      <Header tab={tab} setTab={setTab} />

      <div className="page-pad" style={{ padding: "0 24px" }}>
        <Hero />

        <div style={{ animation: "fi 0.3s ease" }}>
          {tab === "lite" && <Lite />}
          {tab === "pro" && <Pro />}
          {tab === "faq" && <Faq />}
        </div>

        <Footer />
      </div>
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
