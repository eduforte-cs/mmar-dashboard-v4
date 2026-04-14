import React from "react";
import { useTheme } from "../../theme/ThemeContext";
import { useI18n } from "../../i18n/I18nContext";
import { bd, mn } from "../../theme/tokens";

// Resolves a structured episodeCalloutData object into a localised
// string. The engine emits { key, params, modKey?, tailKey?, sampleKey? }
// instead of a pre-formatted English sentence so the React layer can
// translate prose without re-implementing the engine's branching logic.
function renderEpisodeCallout(data, tr) {
  if (!data?.key) return "";
  // Translate the embedded {label} placeholder via the labelKey lookup
  // so the prose reads "discount" / "descuento" / etc. depending on lang.
  const labelText = data.params?.labelKey
    ? tr(`episode.label.${data.params.labelKey}`)
    : "";
  const tail = data.tailKey ? tr(data.tailKey) : "";
  const sample = data.sampleKey ? tr(data.sampleKey) : "";
  const mod = data.modKey ? tr(data.modKey) : "";
  let out = tr(data.key);
  // Apply parameters first, then the snippet placeholders. Order
  // matters for {tail}/{sample}/{mod} because they themselves can
  // contain {…} placeholders that need substitution after embedding.
  for (const [k, v] of Object.entries(data.params || {})) {
    out = out.split(`{${k}}`).join(v);
  }
  out = out.split("{label}").join(labelText);
  out = out.split("{tail}").join(tail);
  out = out.split("{sample}").join(sample);
  out = out.split("{mod}").join(mod);
  // Run a second pass to resolve placeholders that lived inside the
  // embedded snippets (e.g. {shortAvg} inside the "improving" mod).
  for (const [k, v] of Object.entries(data.params || {})) {
    out = out.split(`{${k}}`).join(v);
  }
  return out;
}

export default function TimeToFairValue({ sig, episode }) {
  const { t } = useTheme();
  const { t: tr } = useI18n();
  if (!episode) return null;

  const { episodeCallout, episodeCalloutData, episodeDays, episodePeak, episodeHistory,
    sigImproving, sigWorsening, conditionalRemaining, longerEpisodes,
    pctThrough, pastBranchPoint } = episode;

  if (Math.abs(sig) < 0.15) {
    return (
      <div style={{ padding: "16px 0", fontFamily: bd, fontSize: 15, fontWeight: 500, color: "#27AE60" }}>
        {tr("pro.episode.atFairValue")}
      </div>
    );
  }

  const nEps = episodeHistory.durations.length;
  if (nEps === 0) return null;
  const maxD = Math.max(...episodeHistory.durations, episodeDays) * 1.1;
  const isDeepEnough = sig < 0
    ? episodePeak < (episodeHistory.deepThreshold || -1.0)
    : episodePeak > (episodeHistory.deepThreshold || 1.0);

  const conditionalFast = longerEpisodes?.length > 2
    ? longerEpisodes[Math.floor(longerEpisodes.length * 0.25)] - episodeDays
    : Math.max(0, conditionalRemaining);
  const conditionalSlow = longerEpisodes?.length > 2
    ? longerEpisodes[Math.floor(longerEpisodes.length * 0.75)] - episodeDays
    : Math.max(0, conditionalRemaining);

  return (
    <>
      {/* Episode header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{tr("pro.currentEpisode")}</div>
          <div style={{ fontFamily: mn, fontSize: 28, fontWeight: 700, color: t.cream }}>{tr("pro.episode.day").replace("{n}", episodeDays)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontFamily: mn, fontSize: 10, color: t.faint, padding: "2px 8px", border: `1px solid ${t.borderFaint}`, borderRadius: 10 }}>
            {sigImproving ? tr("pro.episode.improving") : sigWorsening ? tr("pro.episode.worsening") : tr("pro.episode.flat")}
          </span>
          <span style={{ fontFamily: mn, fontSize: 10, color: t.faint, padding: "2px 8px", border: `1px solid ${t.borderFaint}`, borderRadius: 10, marginLeft: 6 }}>
            {tr("pro.episode.peak").replace("{peak}", episodePeak.toFixed(2))} {isDeepEnough ? tr("pro.episode.deep") : tr("pro.episode.shallow")}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontFamily: bd, fontSize: 10, color: t.faint }}>{tr("pro.episodeStart")}</span>
          <span style={{ fontFamily: mn, fontSize: 10, color: pctThrough > 75 ? "#27AE60" : t.faint }}>
            {tr("pro.episode.through").replace("{pct}", pctThrough)}
          </span>
        </div>
        <div style={{ position: "relative", height: 20, background: t.ghost, borderRadius: 10, overflow: "hidden" }}>
          {/* Historical markers */}
          {episodeHistory.durations.map((d, i) => (
            <div key={i} style={{ position: "absolute", left: `${(d / maxD) * 100}%`, top: 0, bottom: 0, width: 2, background: t.faint, opacity: 0.3 }} />
          ))}
          {/* Current */}
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0,
            width: `${Math.min(100, (episodeDays / maxD) * 100)}%`,
            background: sig < 0 ? "#2F80ED" : "#F2994A", borderRadius: 10,
          }} />
          {/* Median marker */}
          <div style={{
            position: "absolute", left: `${(episodeHistory.median / maxD) * 100}%`,
            top: -2, bottom: -2, width: 3, background: t.cream, borderRadius: 2, zIndex: 2,
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontFamily: mn, fontSize: 9, color: t.ghost }}>0d</span>
          <span style={{ fontFamily: mn, fontSize: 9, color: t.cream, fontWeight: 600 }}>{tr("pro.episode.median").replace("{n}", episodeHistory.median)}</span>
          <span style={{ fontFamily: mn, fontSize: 9, color: t.ghost }}>{Math.max(...episodeHistory.durations)}d</span>
        </div>
      </div>

      {/* Conditional estimates */}
      <div className="data-grid-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 16 }}>
        {[
          { id: "fast", labelKey: "pro.episode.optimistic",   days: conditionalFast },
          { id: "exp",  labelKey: "pro.episode.expected",     days: conditionalRemaining },
          { id: "slow", labelKey: "pro.episode.conservative", days: conditionalSlow },
        ].map((c, i) => (
          <div key={c.id} style={{ padding: "12px 0", textAlign: "center", borderRight: i < 2 ? `1px solid ${t.borderFaint}` : "none" }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{tr(c.labelKey)}</div>
            <div style={{ fontFamily: mn, fontSize: 22, fontWeight: 700, color: t.cream }}>{c.days > 0 ? `${Math.round(c.days / 30)}m` : tr("pro.episode.now")}</div>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, marginTop: 2 }}>{c.days > 0 ? tr("pro.episode.daysLeft").replace("{n}", c.days) : tr("pro.episode.overdue")}</div>
          </div>
        ))}
      </div>

      {/* Callout. Prefer the structured data emitted by the new engine;
          fall back to the legacy English string for cached payloads. */}
      {(episodeCalloutData || episodeCallout) && (
        <div style={{ fontFamily: bd, fontSize: 14, color: t.dim, lineHeight: 1.7, marginBottom: 16 }}>
          {episodeCalloutData ? renderEpisodeCallout(episodeCalloutData, tr) : episodeCallout}
        </div>
      )}

      {/* Historical duration bars. The engine emits a stable `labelKey`
          (e.g. "discount", "overheated") which we resolve via i18n; the
          old free-text `label` field is kept as a fallback for cached
          payloads from before the labelKey rollout. */}
      <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
        {tr("pro.episode.previousLabel").replace(
          "{label}",
          episodeHistory.labelKey
            ? tr(`episode.label.${episodeHistory.labelKey}`)
            : episodeHistory.label
        )}
      </div>
      {episodeHistory.durations.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ width: 45, fontFamily: mn, fontSize: 10, color: t.faint, textAlign: "right" }}>{d}d</span>
          <div style={{ flex: 1, height: 8, background: t.ghost, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(d / maxD) * 100}%`, background: t.faint, borderRadius: 4, opacity: 0.4 }} />
          </div>
          <span style={{ width: 30, fontFamily: mn, fontSize: 10, color: t.faint }}>{Math.round(d / 30)}m</span>
        </div>
      ))}
      {/* Current bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ width: 45, fontFamily: mn, fontSize: 10, color: sig < 0 ? "#2F80ED" : "#F2994A", textAlign: "right", fontWeight: 700 }}>{episodeDays}d</span>
        <div style={{ flex: 1, height: 8, background: t.ghost, borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(episodeDays / maxD) * 100}%`, background: sig < 0 ? "#2F80ED" : "#F2994A", borderRadius: 4 }} />
        </div>
        <span style={{ width: 30, fontFamily: mn, fontSize: 10, color: sig < 0 ? "#2F80ED" : "#F2994A", fontWeight: 700 }}>{tr("pro.episode.now")}</span>
      </div>
    </>
  );
}
