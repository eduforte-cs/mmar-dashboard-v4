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
};

export const paras = {
  sell: (d) => `Bitcoin at ${fmtK(d.S0)} is ${d.devPct}% above where the model says it should be (${fmtK(d.plToday)}). That's expensive — every time BTC got this stretched in the past, a correction followed.`,
  reduce: (d) => `Bitcoin at ${fmtK(d.S0)} is ${d.devPct}% above its fair value of ${fmtK(d.plToday)}. You're paying a premium. Historically, from this zone the 12-month return was negative on average.`,
  caution: (d) => `Bitcoin at ${fmtK(d.S0)} is ${d.devPct}% above its fair value of ${fmtK(d.plToday)}. Getting warm — the risk/reward starts to shift against you from here.`,
  neutral: (d) => `Bitcoin at ${fmtK(d.S0)} is ${d.devPct}% ${d.aboveBelow} its fair value of ${fmtK(d.plToday)}. That's a fair price — right in the middle of the normal range.`,
  buy: (d) => `Bitcoin at ${fmtK(d.S0)} is ${d.devPct}% below its fair value of ${fmtK(d.plToday)}. It's on sale. These are the entries people look back on and wish they'd sized up.`,
  outlook: (d) => `If you buy today and hold 1 year, there's a ${d.pFV}% chance the price reaches its fair value of ${fmtK(d.pl1y)}. The worst case floor — the lowest level Bitcoin has historically respected — is ${fmtK(d.supportPrice)} (−${d.maxDownside}% from today). Over 3 years, the fair value target is ${fmtK(d.pl3y)} (${d.pl3yReturn >= 0 ? "+" : ""}${d.pl3yReturn}%).${d.mcWorst3yProfit ? " Even in the worst 5% of simulations, you're in profit at 3 years." : ""}`,
  duration: (d) => `Based on how long previous episodes lasted, the model estimates about ${d.monthsRemaining} more months before Bitcoin returns to fair value. ${d.sigImproving ? "The trend is already improving — it could be faster." : d.sigWorsening ? "The trend is still worsening — it could take longer." : "The trend is flat — patience required."}`,
  lossProbability: (d) => `Your chance of being at a loss after 1 year: ~${d.l1y}%. After 3 years: ~${d.l3y}%.${d.l3y < 5 ? " Time is on your side." : d.l3y < 15 ? " The longer you hold, the better the odds." : ""}`,
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
