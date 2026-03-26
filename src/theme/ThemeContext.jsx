import React, { createContext, useContext, useState, useMemo } from "react";
import { DARK, LIGHT } from "./tokens";

import { trackThemeToggle } from "../tracking";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState("dark");
  const t = mode === "dark" ? DARK : LIGHT;
  const toggle = () => setMode(m => { const next = m === "dark" ? "light" : "dark"; trackThemeToggle(next); return next; });
  const value = useMemo(() => ({ t, mode, toggle }), [mode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}
