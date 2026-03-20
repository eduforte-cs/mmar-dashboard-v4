// ── Engine barrel export ──
// All math modules re-exported for clean imports

export { GENESIS, MS_DAY, daysSinceGenesis, randn, fmt, fmtK, fmtPct, fmtY, getVerdictPlain, getVolLabel } from "./constants.js";
export { normInv, normCDF, adfTest, computeEVTcap } from "./stats.js";
export { fitPowerLaw, plPrice } from "./powerlaw.js";
export { hurstDFA, partitionFunction, fitLambda2, generateCascade } from "./fractal.js";
export { estimateKappa, estimateRegimeSwitchingOU, computeHurstDivergences } from "./regime.js";
export { simulatePathsPL, computePercentiles } from "./montecarlo.js";
export { runWalkForwardBacktest } from "./backtest.js";
export { generateVerdict, computeMCLossHorizons, computeEpisodeAnalysis, detectRegime } from "./verdict.js";
export { supportFloor, allBands, bandsLog10, keyLevels, fairValue } from "./bands.js";
