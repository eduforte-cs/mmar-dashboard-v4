import { fmtK } from "../../engine/constants.js";

export const answerSubs = {
  sell: (d) => `Bitcoin is ${d.devPct}% above fair value (σ ${d.sig}). Historically, every time Bitcoin was this extended, the 12-month return was negative. The average outcome from here is −34%.`,
  reduce: (d) => `Bitcoin is ${d.devPct}% above fair value (σ ${d.sig}). Only 33% of the time was the price higher 12 months later from this zone. Corrections happen more often than not — reduce exposure or wait.`,
  strongBuy: (d) => `Bitcoin is ${d.devPct}% below fair value (σ ${d.sig}). Deep discount — the model's strongest configuration. Historically, 100% of the time the price was higher 12 months later, with a worst case of +30%.`,
  buy: (d) => `Bitcoin is ${d.devPct}% below fair value (σ ${d.sig}). Structural discount — 100% accuracy historically, worst case +22%. The odds are clearly in your favor.`,
  accumulate: (d) => `Bitcoin is ${d.devPct}% ${d.aboveBelow} fair value (σ ${d.sig}). Not technically at a discount, but every time Bitcoin was in this zone, it was higher 12 months later. Good entry if you're building a position.`,
  caution: (d) => `Bitcoin is ${d.devPct}% above fair value (σ ${d.sig}). Getting warm. From this zone, it's close to a coin flip whether the price is higher in 12 months. If you're already in, hold. If you're not, wait.`,
  neutral: (d) => `Bitcoin is ${d.devPct}% ${d.aboveBelow} fair value (σ ${d.sig}). Fair value zone — odds still favor you (83% historically) but downside risk appears. Patience.`,
};

export const answerSubsLite = {
  strongBuy: (d) => `If you buy Bitcoin today at ${fmtK(d.S0)}, according to our model's backtest, every single time Bitcoin was this cheap, the price was higher after 1 year. Even the worst entry returned +30%. After 3 years, your chance of being at a loss: less than 5%. This is the best buying opportunity the model can identify.`,
  buy: (d) => `If you buy Bitcoin today at ${fmtK(d.S0)}, according to our model's backtest, 100% of the time the price was higher after 1 year from this level. The worst entry still returned +22%. After 3 years, your chance of being at a loss: less than 5%.`,
  accumulate: (d) => `If you buy Bitcoin today at ${fmtK(d.S0)}, according to our model's backtest, 100% of the time the price was higher after 1 year. Not technically a discount, but it has never failed from here. After 3 years, your chance of being at a loss: less than 10%.`,
  neutral: (d) => `If you buy Bitcoin today at ${fmtK(d.S0)}, according to our model's backtest, the price was higher after 1 year 83% of the time. After 3 years, 88%. The odds are in your favor, but it's not a clear signal.`,
  caution: (d) => `If you buy Bitcoin today at ${fmtK(d.S0)}, according to our model's backtest, the price was higher after 1 year only 56% of the time. After 3 years, 72%. That's close to a coin flip. Not the time to enter.`,
  reduce: (d) => `If you hold Bitcoin today at ${fmtK(d.S0)}, according to our model's backtest, the price was lower after 1 year 67% of the time. After 3 years, 45% still at a loss. Consider reducing your position.`,
  sell: (d) => `If you hold Bitcoin today at ${fmtK(d.S0)}, according to our model's backtest, the price was lower after 1 year in every single case. The average outcome: −34%. Get out.`,
};

export const signals = {
  strongBuy: "Strong Buy",
  buy: "Buy",
  hold: "Hold",
  sell: "Sell",
  reduce: "Reduce",
  accumulate: "Accumulate",
  neutral: "Neutral",
  caution: "Caution",
};

export const answers = { yes: "YES", no: "NO" };
