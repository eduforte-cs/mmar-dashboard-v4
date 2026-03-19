import React, { createContext, useContext, useState, useMemo } from "react";
import { DARK, LIGHT } from "./tokens";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState("dark");
  const t = mode === "dark" ? DARK : LIGHT;
  const toggle = () => setMode(m => (m === "dark" ? "light" : "dark"));
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
