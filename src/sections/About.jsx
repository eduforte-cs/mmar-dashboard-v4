import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { useI18n } from "../i18n/I18nContext";
import { bd } from "../theme/tokens";

export default function About() {
  const { t } = useTheme();
  const { t: tr } = useI18n();
  return (
    <div style={{ padding: "48px 0", animation: "fi 0.3s ease" }}>
      <h2 style={{ fontFamily: bd, fontSize: 56, fontWeight: 800, color: t.cream, letterSpacing: "-0.04em", lineHeight: 0.95, margin: 0 }}>{tr("about.title")}</h2>
      <p style={{ fontFamily: bd, fontSize: 15, color: t.faint, marginTop: 16 }}>{tr("about.comingSoon")}</p>
    </div>
  );
}
