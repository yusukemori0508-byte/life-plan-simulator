// src/mvpCalc.js — MVPシミュレーション計算（3入力）

/**
 * @param {object} params
 * @param {number} params.income     - 年収（万円/年）
 * @param {number} params.expense    - 月支出（万円/月）
 * @param {number} params.investment - 月投資額（万円/月）
 * @returns {{ totalAssets:number, hasNegative:boolean, level:1|2|3|4 }}
 */
export function calcMVP({ income, expense, investment }) {
  const annualExpense    = expense * 12;
  const annualInvestment = investment * 12;
  const annualCashFlow   = income - annualExpense;

  let cashSavings  = 0;
  let investAssets = 0;
  let hasNegative  = false;

  // 積立フェーズ：35年（30歳〜65歳想定）
  for (let y = 0; y < 35; y++) {
    cashSavings  += annualCashFlow - annualInvestment;
    investAssets  = (investAssets + annualInvestment) * 1.05; // 年利5%
    if (cashSavings + investAssets < 0) hasNegative = true;
  }

  // 退職後フェーズ：25年（65歳〜90歳）
  const pensionAnnual  = 180;                        // 年金 約180万/年
  const retireExpense  = annualExpense * 0.85;       // 老後は支出15%減
  const shortfall      = Math.max(0, retireExpense - pensionAnnual);

  for (let y = 0; y < 25; y++) {
    investAssets = investAssets * 1.03; // 退職後は控えめ3%運用
    if (cashSavings >= shortfall) {
      cashSavings -= shortfall;
    } else {
      investAssets -= (shortfall - cashSavings);
      cashSavings   = 0;
    }
    if (cashSavings + investAssets < 0) hasNegative = true;
  }

  const totalAssets = Math.round(cashSavings + investAssets);

  let level;
  if      (totalAssets >= 1000 && !hasNegative) level = 1;
  else if (totalAssets >= 300  && !hasNegative) level = 2;
  else if (totalAssets >= 0)                    level = 3;
  else                                          level = 4;

  return { totalAssets, hasNegative, level };
}

export const LEVEL_INFO = {
  1: { label: 'とても安心な未来です', emoji: '🌳', color: '#1e6838', bg: '#e8f8ee' },
  2: { label: '安心な未来です',       emoji: '🌿', color: '#2a7848', bg: '#eef8f2' },
  3: { label: '少し不安があります',    emoji: '🌱', color: '#6a7a20', bg: '#f4f8e8' },
  4: { label: '見直しが必要です',      emoji: '🍂', color: '#8a4018', bg: '#faf0e4' },
};
