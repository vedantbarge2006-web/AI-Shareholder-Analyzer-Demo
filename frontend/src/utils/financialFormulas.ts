import { FinancialData, CalculatedMetrics, ScoreClassification } from '../types/financial';

/**
 * Calculates the Shareholder Value Creation Score (0-100) using a composite index:
 * - Value Spread (ROIC - WACC): 50 pts base +/- up to 25 pts based on excess return
 * - Return on Equity (ROE): +/- up to 15 pts based on benchmark (12% cost of equity hurdle)
 * - Topline Growth: +/- up to 10 pts based on revenue velocity
 * - Leverage / Solvency Health: up to +5 pts for conservative leverage, down to -15 pts for excessive debt
 */
function computeScore(
  valueSpread: number,
  roe: number,
  revenueGrowth: number,
  debtToEquity: number
): number {
  let score = 50;

  // 1. Value Spread factor (+/- 25 pts): 2.5 pts per 1.0% spread
  score += Math.max(-25, Math.min(25, valueSpread * 2.5));

  // 2. ROE performance vs 12% equity hurdle (+/- 15 pts)
  if (roe >= 12) {
    score += Math.min(15, (roe - 12) * 1.25);
  } else {
    score -= Math.max(-15, (12 - roe) * 1.5);
  }

  // 3. Topline revenue growth factor (+/- 10 pts)
  if (revenueGrowth > 0) {
    score += Math.min(10, revenueGrowth * 0.5);
  } else {
    score += Math.max(-10, revenueGrowth * 0.4);
  }

  // 4. Balance sheet solvency & leverage factor (+5 to -15 pts)
  if (debtToEquity <= 0.6) {
    score += 5;
  } else if (debtToEquity > 1.5) {
    score -= Math.min(15, (debtToEquity - 1.5) * 10);
  }

  return Math.round(Math.max(0, Math.min(100, score)));
}

export function calculateFinancialMetrics(data: FinancialData): CalculatedMetrics {
  const taxRateDecimal = data.taxRate / 100;
  const waccDecimal = data.wacc / 100;

  // 1. Current Year NOPAT (Net Operating Profit After Tax)
  // NOPAT = Operating Profit (EBIT) * (1 - Tax Rate)
  const nopat = data.operatingProfit * (1 - taxRateDecimal);

  // 2. Capital Charge = Invested Capital * WACC
  const capitalCharge = data.investedCapital * waccDecimal;

  // 3. Economic Value Added (EVA) = NOPAT - Capital Charge
  const eva = nopat - capitalCharge;
  const isValueCreating = eva > 0;

  // 4. Return on Equity (ROE) = (Net Profit / Shareholders' Equity) * 100
  const roe = data.shareholdersEquity > 0 ? (data.netProfit / data.shareholdersEquity) * 100 : 0;

  // 5. Return on Invested Capital (ROIC) = (NOPAT / Invested Capital) * 100
  // Capital-structure neutral operating return
  const roic = data.investedCapital > 0 ? (nopat / data.investedCapital) * 100 : 0;

  // 6. Return on Investment (ROI) = (Net Profit / Invested Capital) * 100
  // Bottom-line earnings return per unit of invested capital
  const roi = data.investedCapital > 0 ? (data.netProfit / data.investedCapital) * 100 : 0;

  // 7. Value Spread = ROIC - WACC
  const valueSpread = roic - data.wacc;

  // 8. Leverage & Solvency Ratios
  const totalCapital = data.totalDebt + data.shareholdersEquity;
  const debtRatio = totalCapital > 0 ? (data.totalDebt / totalCapital) * 100 : 0;
  const debtToEquity = data.shareholdersEquity > 0 ? data.totalDebt / data.shareholdersEquity : 0;

  // 9. Margins
  const operatingMargin = data.revenue > 0 ? (data.operatingProfit / data.revenue) * 100 : 0;
  const netProfitMargin = data.revenue > 0 ? (data.netProfit / data.revenue) * 100 : 0;

  // 10. Growth Calculations
  const revenueGrowth = data.prevRevenue > 0
    ? ((data.revenue - data.prevRevenue) / data.prevRevenue) * 100
    : 0;

  const profitGrowth = data.prevNetProfit > 0
    ? ((data.netProfit - data.prevNetProfit) / data.prevNetProfit) * 100
    : 0;

  // Prior Year Metrics for Comparative Baseline
  const prevTaxRateDecimal = data.taxRate / 100;
  const prevWaccDecimal = data.prevWacc / 100;
  const prevNopat = data.prevOperatingProfit * (1 - prevTaxRateDecimal);
  const prevCapitalCharge = data.prevInvestedCapital * prevWaccDecimal;
  const prevEva = prevNopat - prevCapitalCharge;
  const prevRoe = data.prevShareholdersEquity > 0 ? (data.prevNetProfit / data.prevShareholdersEquity) * 100 : 0;
  const prevRoic = data.prevInvestedCapital > 0 ? (prevNopat / data.prevInvestedCapital) * 100 : 0;
  const prevRoi = data.prevInvestedCapital > 0 ? (data.prevNetProfit / data.prevInvestedCapital) * 100 : 0;
  const prevValueSpread = prevRoic - data.prevWacc;

  const prevTotalCapital = (data.prevTotalDebt || 0) + data.prevShareholdersEquity;
  const prevDebtRatio = prevTotalCapital > 0 ? ((data.prevTotalDebt || 0) / prevTotalCapital) * 100 : 0;
  const prevDebtToEquity = data.prevShareholdersEquity > 0 ? (data.prevTotalDebt || 0) / data.prevShareholdersEquity : 0;
  const debtRatioChange = debtRatio - prevDebtRatio;

  const evaGrowth = prevEva !== 0 ? ((eva - prevEva) / Math.abs(prevEva)) * 100 : 0;

  // Calculate Scores Consistently with computeScore()
  const finalScore = computeScore(valueSpread, roe, revenueGrowth, debtToEquity);

  // Prior Score uses identical formula logic
  const prevRevenueGrowth = 0; // Baseline normalized
  const prevFinalScore = computeScore(prevValueSpread, prevRoe, prevRevenueGrowth, prevDebtToEquity);

  let classification: ScoreClassification = 'Moderate Value Creator';
  if (finalScore >= 75) {
    classification = 'Strong Value Creator';
  } else if (finalScore >= 55) {
    classification = 'Moderate Value Creator';
  } else if (finalScore >= 45) {
    classification = 'Value Neutral';
  } else {
    classification = 'Value Destructive';
  }

  return {
    nopat,
    capitalCharge,
    eva,
    isValueCreating,
    roe,
    roic,
    roi,
    valueSpread,
    debtToEquity,
    debtRatio,
    debtRatioChange,
    operatingMargin,
    netProfitMargin,
    revenueGrowth,
    profitGrowth,
    shareholderValueScore: finalScore,
    scoreClassification: classification,
    prevNopat,
    prevCapitalCharge,
    prevEva,
    prevRoe,
    prevRoic,
    prevRoi,
    prevDebtRatio,
    prevValueSpread,
    prevShareholderValueScore: prevFinalScore,
    evaGrowth,
  };
}

export function formatCurrency(value: number, compact = false): string {
  if (isNaN(value)) return '$0';
  if (compact) {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
    return `${sign}$${abs.toFixed(0)}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, withSign = false, decimals = 1): string {
  if (isNaN(value)) return '0.0%';
  const sign = withSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatMultiplier(value: number): string {
  if (isNaN(value)) return '0.0x';
  return `${value.toFixed(2)}x`;
}
