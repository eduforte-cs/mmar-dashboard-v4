import React, { createContext, useContext, useState, useMemo, useCallback } from "react";
import en from "./en.json";
import es from "./es.json";

const strings = { en, es };
const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("lang") || "en"; } catch { return "en"; }
  });

  const switchLang = useCallback((l) => {
    setLang(l);
    try { localStorage.setItem("lang", l); } catch {}
  }, []);

  const t = useCallback((key) => {
    return strings[lang]?.[key] || strings.en[key] || key;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang: switchLang, t }), [lang, switchLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be inside I18nProvider");
  return ctx;
}
