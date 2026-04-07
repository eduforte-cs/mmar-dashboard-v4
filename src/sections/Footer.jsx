import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { useI18n } from "../i18n/I18nContext";
import { bd } from "../theme/tokens";

export default function Footer() {
  const { t } = useTheme();
  const { t: tr } = useI18n();

  return (
    <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${t.border}` }}>
      <div className="footer-row" style={{
        display: "flex", justifyContent: "space-between", marginBottom: 16,
      }}>
        <span style={{ fontFamily: bd, fontSize: 14, fontWeight: 700, color: t.faint }}>
          CommonSense
        </span>
        <span style={{ fontFamily: bd, fontSize: 11, color: t.ghost }}>
          Edu Forte · Barcelona
        </span>
      </div>

      <p style={{
        fontFamily: bd, fontSize: 10, color: t.ghost, lineHeight: 1.7,
      }}>
        Santostasi Power Law · Mandelbrot MMAR · DFA · Regime-switching · EVT/GPD · Walk-forward backtest · Spot refreshes 60s · Browser-only
      </p>

      <div className="footer-bottom" style={{
        marginTop: 16, paddingTop: 12,
        borderTop: `1px solid ${t.borderFaint}`,
        display: "flex", justifyContent: "space-between",
      }}>
        <span style={{ fontFamily: bd, fontSize: 9, color: t.ghost }}>
          {tr("footer.notFinancialAdvice")}
        </span>
        <span style={{ fontFamily: bd, fontSize: 9, color: t.ghost }}>
          © {new Date().getFullYear()} CommonSense Technologies S.L.
        </span>
      </div>
    </div>
  );
}
