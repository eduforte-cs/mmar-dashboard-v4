/**
 * Localizes verdict text at render time.
 * verdict.js stays pure (English, computation only).
 * This replaces key text fields based on current language.
 * 
 * Covers: answer (YES/NO), subtitle (Buy/Hold/Sell), answerSub, answerSubLite, horizon cards.
 * parasLite stays English for now (too many conditional branches to template).
 */
import * as en from "./templates/en.js";
import * as es from "./templates/es.js";
import { localizeParasLite } from "./parasLite.js";

const templates = { en, es };

export function localizeVerdict(verdict, d, lang) {
  if (!verdict || lang === "en") return verdict;

  const tpl = templates[lang];
  if (!tpl) return verdict;

  const sig = d?.sigmaFromPL || 0;
  const S0 = d?.S0 || 0;
  const deviationPct = Math.abs(d?.deviationPct || 0).toFixed(0);
  const aboveBelow = (d?.deviationPct || 0) >= 0 ? "above" : "below";
  const sigStr = sig.toFixed(2);

  const data = { S0, sig: sigStr, devPct: deviationPct, aboveBelow };

  // Clone to avoid mutation
  const v = { ...verdict };

  // 1. Answer: YES → SÍ, NO → NO
  if (v.answer === "YES") v.answer = tpl.answers.yes;
  if (v.answer === "NO") v.answer = tpl.answers.no;

  // 2. Subtitle: Buy → Comprar, etc.
  const subMap = {
    "Strong Buy": "strongBuy", "Buy": "buy", "Hold": "hold",
    "Sell": "sell", "Reduce": "reduce",
  };
  if (subMap[v.subtitle] && tpl.signals[subMap[v.subtitle]]) {
    v.subtitle = tpl.signals[subMap[v.subtitle]];
  }

  // 3. answerSub — main description
  const level = verdict.level;
  const internal = verdict.internalLevel;
  const answerKey = level === "hold" ? (internal || "neutral") : level;
  if (answerKey && tpl.answerSubs[answerKey]) {
    v.answerSub = tpl.answerSubs[answerKey](data);
  }

  // 4. answerSubLite
  if (internal && tpl.answerSubsLite[internal]) {
    v.answerSubLite = tpl.answerSubsLite[internal](data);
  }

  // 5. Horizon cards
  if (v.horizonCards) {
    v.horizonCards = v.horizonCards.map(c => {
      const hc = { ...c };
      if (subMap[c.verdict] && tpl.signals[subMap[c.verdict]]) {
        hc.verdict = tpl.signals[subMap[c.verdict]];
      }
      if (hc.answer === "YES") hc.answer = tpl.answers.yes;
      if (hc.answer === "NO") hc.answer = tpl.answers.no;
      if (c.horizon === "1 year") hc.horizon = lang === "es" ? "1 año" : c.horizon;
      if (c.horizon === "3 years") hc.horizon = lang === "es" ? "3 años" : c.horizon;
      return hc;
    });
  }

  // 6. parasLite — narrative paragraphs
  const localizedParas = localizeParasLite(verdict, d, lang);
  if (localizedParas) {
    v.parasLite = localizedParas;
    v.paras = localizedParas;
  }

  return v;
}
