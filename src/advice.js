// src/advice.js
import { DIAGNOSIS_LEVELS, NISA_LIMITS, IDECO_MONTHLY_LIMITS } from './constants.js';
import { runScenario, calcSummaryStats } from './simulation.js';
import { safeNum, fmtMan } from './utils.js';

// ────────────────────────────────────────────────
// 自動診断
// ────────────────────────────────────────────────
export const generateDiagnosis = (rows, form, stats) => {
  const diag = [];
  const retireAge = safeNum(form.retirementAge, 65);
  const lifespan  = safeNum(form.lifespan, 90);

  // 1. 資産枯渇チェック
  if (stats.depletionAge) {
    diag.push({
      id: 'depletion',
      level: 'critical',
      ...DIAGNOSIS_LEVELS.critical,
      title: `${stats.depletionAge}歳で資産が枯渇する可能性があります`,
      detail: `現在のプランでは${stats.depletionAge}歳時点で資産がマイナスになります。支出削減・収入増加・運用改善を検討してください。`,
    });
  }

  // 2. 退職時資産充足度
  const retirementAsset = stats.retirementAsset;
  const yearlyRetireExp = safeNum(form.retireMonthlyExpense, 15) * 12;
  const postRetireYears = lifespan - retireAge;
  const neededAsset     = yearlyRetireExp * postRetireYears * 0.7; // 年金カバー分を差し引き
  if (retirementAsset < neededAsset * 0.5) {
    diag.push({
      id: 'retire_asset_low',
      level: 'critical',
      ...DIAGNOSIS_LEVELS.critical,
      title: '退職時の資産が不足する見込みです',
      detail: `退職時資産${fmtMan(retirementAsset)}万円は老後生活費の目安（${fmtMan(Math.round(neededAsset))}万円）を大きく下回っています。`,
    });
  } else if (retirementAsset < neededAsset) {
    diag.push({
      id: 'retire_asset_warn',
      level: 'warning',
      ...DIAGNOSIS_LEVELS.warning,
      title: '退職時の資産がやや不足する可能性があります',
      detail: `退職時資産${fmtMan(retirementAsset)}万円。老後の支出に備え、積立増額を検討してください。`,
    });
  } else {
    diag.push({
      id: 'retire_asset_ok',
      level: 'great',
      ...DIAGNOSIS_LEVELS.great,
      title: '退職時の資産は充分な水準です',
      detail: `退職時資産${fmtMan(retirementAsset)}万円。老後生活費の目安を上回っています。`,
    });
  }

  // 3. 年金カバー率
  const retireRow = rows.find((r) => r.age >= retireAge);
  if (retireRow) {
    const pensionTotal = (retireRow.pensionSelf ?? 0) + (retireRow.pensionSpouse ?? 0);
    const coverageRate = yearlyRetireExp > 0 ? pensionTotal / yearlyRetireExp : 0;
    if (coverageRate < 0.5) {
      diag.push({
        id: 'pension_low',
        level: 'warning',
        ...DIAGNOSIS_LEVELS.warning,
        title: `年金が老後生活費の${Math.round(coverageRate * 100)}%しかカバーできません`,
        detail: `年金収入${fmtMan(pensionTotal)}万円/年に対し、老後生活費は${fmtMan(yearlyRetireExp)}万円/年です。自助努力での資産形成が重要です。`,
      });
    } else {
      diag.push({
        id: 'pension_ok',
        level: 'good',
        ...DIAGNOSIS_LEVELS.good,
        title: `年金が老後生活費の${Math.round(coverageRate * 100)}%をカバーできます`,
        detail: `年金収入${fmtMan(pensionTotal)}万円/年。老後の一定の収入基盤が確保されています。`,
      });
    }
  }

  // 4. 緊急予備資金
  const emergencyFund  = safeNum(form.emergencyFund, 0);
  const monthlyExpense = safeNum(form.monthlyExpense, 20);
  const emergencyMonths = monthlyExpense > 0 ? emergencyFund / monthlyExpense : 0;
  if (emergencyMonths < 3) {
    diag.push({
      id: 'emergency_low',
      level: 'warning',
      ...DIAGNOSIS_LEVELS.warning,
      title: `緊急予備資金が${Math.round(emergencyMonths)}ヶ月分と不足しています`,
      detail: `一般的に生活費の6ヶ月分（約${fmtMan(monthlyExpense * 6)}万円）の確保が推奨されます。`,
    });
  } else {
    diag.push({
      id: 'emergency_ok',
      level: 'good',
      ...DIAGNOSIS_LEVELS.good,
      title: `緊急予備資金${Math.round(emergencyMonths)}ヶ月分を確保できています`,
      detail: `${fmtMan(emergencyFund)}万円の緊急予備資金があります。`,
    });
  }

  // 5. NISA活用度
  const nisaMonthly    = safeNum(form.nisaMonthly, 0);
  const nisaAnnual     = nisaMonthly * 12;
  const nisaUtilization = nisaAnnual / NISA_LIMITS.annualMax;
  if (nisaUtilization < 0.1) {
    diag.push({
      id: 'nisa_unused',
      level: 'warning',
      ...DIAGNOSIS_LEVELS.warning,
      title: 'NISAをほとんど活用できていません',
      detail: `NISA年間上限${NISA_LIMITS.annualMax}万円に対し${fmtMan(nisaAnnual)}万円のみ積立中。非課税メリットを最大化しましょう。`,
    });
  } else if (nisaUtilization >= 0.8) {
    diag.push({
      id: 'nisa_great',
      level: 'great',
      ...DIAGNOSIS_LEVELS.great,
      title: 'NISAを積極的に活用しています',
      detail: `年間${fmtMan(nisaAnnual)}万円のNISA積立は優秀な水準です。`,
    });
  } else {
    diag.push({
      id: 'nisa_caution',
      level: 'caution',
      ...DIAGNOSIS_LEVELS.caution,
      title: 'NISAの活用余地があります',
      detail: `現在年間${fmtMan(nisaAnnual)}万円積立中。上限${NISA_LIMITS.annualMax}万円まであと${fmtMan(NISA_LIMITS.annualMax - nisaAnnual)}万円の枠があります。`,
    });
  }

  // 6. iDeCo活用度
  const idecoMonthly = safeNum(form.idecoMonthly, 0);
  const isSelf       = !!form.isSelfEmployed;
  const idecoLimit   = isSelf ? IDECO_MONTHLY_LIMITS.selfEmployed : IDECO_MONTHLY_LIMITS.employee;
  if (idecoMonthly === 0) {
    diag.push({
      id: 'ideco_unused',
      level: 'caution',
      ...DIAGNOSIS_LEVELS.caution,
      title: 'iDeCoを活用していません',
      detail: `iDeCoは掛金全額が所得控除になります。月${idecoLimit}万円まで積立可能です。`,
    });
  } else {
    diag.push({
      id: 'ideco_ok',
      level: 'good',
      ...DIAGNOSIS_LEVELS.good,
      title: `iDeCoを月${fmtMan(idecoMonthly)}万円活用しています`,
      detail: `節税効果を活かした賢い老後資産形成です。`,
    });
  }

  // 7. 住宅ローン年収倍率
  if (form.housingType !== 'rent') {
    const loan      = Math.max(0, safeNum(form.propertyPrice, 0) - safeNum(form.downPayment, 0));
    const income    = safeNum(form.selfIncome, 0);
    const ratio     = income > 0 ? loan / income : 0;
    if (ratio > 7) {
      diag.push({
        id: 'mortgage_high',
        level: 'warning',
        ...DIAGNOSIS_LEVELS.warning,
        title: `住宅ローンが年収の${ratio.toFixed(1)}倍と高水準です`,
        detail: `借入額${fmtMan(loan)}万円は年収${fmtMan(income)}万円の${ratio.toFixed(1)}倍です。返済計画を見直してください。`,
      });
    } else if (ratio > 0) {
      diag.push({
        id: 'mortgage_ok',
        level: 'good',
        ...DIAGNOSIS_LEVELS.good,
        title: `住宅ローンは年収の${ratio.toFixed(1)}倍（適切な水準）`,
        detail: `借入額${fmtMan(loan)}万円は年収比で適切な範囲内です。`,
      });
    }
  }

  // 8. 教育費ピーク時資産余力
  if (stats.peakEduAge && Array.isArray(rows)) {
    const peakRow = rows.find((r) => r.age === stats.peakEduAge);
    if (peakRow && peakRow.totalAssets < safeNum(form.emergencyFund, 0) * 3) {
      diag.push({
        id: 'edu_peak_risk',
        level: 'caution',
        ...DIAGNOSIS_LEVELS.caution,
        title: `教育費ピーク（${stats.peakEduAge}歳）時に資産余力が少なめです`,
        detail: `教育費が集中する時期の資産残高が${fmtMan(peakRow.totalAssets)}万円です。事前の積立増額を検討してください。`,
      });
    }
  }

  // 9. 老後生活費水準
  const retireMonthly = safeNum(form.retireMonthlyExpense, 15);
  const currentMonthly = safeNum(form.monthlyExpense, 20);
  if (retireMonthly > currentMonthly * 0.9 && postRetireYears > 20) {
    diag.push({
      id: 'retire_expense_high',
      level: 'caution',
      ...DIAGNOSIS_LEVELS.caution,
      title: '老後の生活費が現役時とほぼ同水準です',
      detail: `老後${fmtMan(retireMonthly)}万円/月は現役時（${fmtMan(currentMonthly)}万円/月）の${Math.round(retireMonthly / currentMonthly * 100)}%です。長期間の場合、資産への影響が大きくなります。`,
    });
  }

  // 10. 総合健全性
  const hasCritical = diag.some((d) => d.level === 'critical');
  const hasWarning  = diag.some((d) => d.level === 'warning');
  if (!hasCritical && !hasWarning && stats.finalAsset > 0) {
    diag.push({
      id: 'overall_great',
      level: 'great',
      ...DIAGNOSIS_LEVELS.great,
      title: 'ライフプラン全体が健全な水準です',
      detail: `重大な問題は見つかりませんでした。${fmtMan(stats.finalAsset)}万円の最終資産が確保できる見込みです。`,
    });
  }

  return diag;
};

// ────────────────────────────────────────────────
// 改善提案生成
// ────────────────────────────────────────────────
export const generateAdvice = (form, baselineRows, baseStats) => {
  const advice = [];

  const tryAdvice = (fn) => {
    try { const r = fn(); if (r) advice.push(r); } catch (e) { /* skip */ }
  };

  tryAdvice(() => adviceNisaIncrease(form, baselineRows, baseStats));
  tryAdvice(() => adviceIdecoStart(form, baselineRows, baseStats));
  tryAdvice(() => adviceRetireDelay(form, baselineRows, baseStats));
  tryAdvice(() => adviceReduceExpense(form, baselineRows, baseStats));
  tryAdvice(() => adviceReduceRetireExpense(form, baselineRows, baseStats));
  tryAdvice(() => adviceIncreaseDownPayment(form, baselineRows, baseStats));

  // priority順にソート
  advice.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  return advice;
};

// ── NISA積立増額 ────────────────────────────────
const adviceNisaIncrease = (form, baseRows, baseStats) => {
  const current = safeNum(form.nisaMonthly, 0);
  const nisaCum = safeNum(form.nisaCumContrib, 0);
  if (current >= 30 || nisaCum >= NISA_LIMITS.lifetimeMax) return null;
  const increased  = Math.min(current + 3, 30);
  const newForm    = { ...form, nisaMonthly: increased };
  const newRows    = runScenario(newForm, 'standard');
  const newStats   = calcSummaryStats(newRows, newForm);
  const diff       = newStats.finalAsset - baseStats.finalAsset;
  if (diff <= 0) return null;
  return {
    id: 'nisa_increase',
    icon: '💹',
    title: `NISA積立を月${fmtMan(current)}→${fmtMan(increased)}万円に増額`,
    summary: `最終資産が約${fmtMan(diff)}万円増加する見込みです`,
    description: '非課税の複利効果を最大化することで、長期的な資産形成に大きく貢献します。',
    changes: [{ label: 'NISA月額積立', before: `${fmtMan(current)}万円`, after: `${fmtMan(increased)}万円` }],
    depletionBefore: baseStats.depletionAge,
    depletionAfter:  newStats.depletionAge,
    finalAssetBefore: baseStats.finalAsset,
    finalAssetAfter:  newStats.finalAsset,
    priority: diff > 500 ? 3 : 2,
  };
};

// ── iDeCo開始/増額 ──────────────────────────────
const adviceIdecoStart = (form, baseRows, baseStats) => {
  const current    = safeNum(form.idecoMonthly, 0);
  const isSelf     = !!form.isSelfEmployed;
  const limit      = isSelf ? IDECO_MONTHLY_LIMITS.selfEmployed : IDECO_MONTHLY_LIMITS.employee;
  if (current >= limit) return null;
  const increased  = current === 0 ? Math.min(1.0, limit) : Math.min(current + 0.5, limit);
  const newForm    = { ...form, idecoMonthly: increased };
  const newRows    = runScenario(newForm, 'standard');
  const newStats   = calcSummaryStats(newRows, newForm);
  const diff       = newStats.finalAsset - baseStats.finalAsset;
  if (diff <= 0) return null;
  return {
    id: 'ideco_start',
    icon: '🏦',
    title: current === 0
      ? `iDeCoを月${fmtMan(increased)}万円で開始する`
      : `iDeCo積立を月${fmtMan(current)}→${fmtMan(increased)}万円に増額`,
    summary: `節税効果と運用益で最終資産が約${fmtMan(diff)}万円増加する見込みです`,
    description: 'iDeCoは掛金が全額所得控除になるため、税負担を減らしながら老後資産を積み立てられます。',
    changes: [{ label: 'iDeCo月額掛金', before: `${fmtMan(current)}万円`, after: `${fmtMan(increased)}万円` }],
    depletionBefore: baseStats.depletionAge,
    depletionAfter:  newStats.depletionAge,
    finalAssetBefore: baseStats.finalAsset,
    finalAssetAfter:  newStats.finalAsset,
    priority: diff > 300 ? 3 : 2,
  };
};

// ── 退職を3年延期 ───────────────────────────────
const adviceRetireDelay = (form, baseRows, baseStats) => {
  const retireAge = safeNum(form.retirementAge, 65);
  if (retireAge >= 70) return null;
  const newForm  = { ...form, retirementAge: retireAge + 3 };
  const newRows  = runScenario(newForm, 'standard');
  const newStats = calcSummaryStats(newRows, newForm);
  const diff     = newStats.finalAsset - baseStats.finalAsset;
  if (diff <= 0) return null;
  return {
    id: 'retire_delay',
    icon: '⏰',
    title: `退職年齢を${retireAge}→${retireAge + 3}歳に延ばす`,
    summary: `収入期間が3年延び、最終資産が約${fmtMan(diff)}万円増加する見込みです`,
    description: '退職を遅らせることで収入が増え、資産取崩し期間も短縮できます。',
    changes: [{ label: '退職年齢', before: `${retireAge}歳`, after: `${retireAge + 3}歳` }],
    depletionBefore: baseStats.depletionAge,
    depletionAfter:  newStats.depletionAge,
    finalAssetBefore: baseStats.finalAsset,
    finalAssetAfter:  newStats.finalAsset,
    priority: diff > 1000 ? 4 : 3,
  };
};

// ── 生活費5%削減 ────────────────────────────────
const adviceReduceExpense = (form, baseRows, baseStats) => {
  const expense = safeNum(form.monthlyExpense, 20);
  if (expense <= 10) return null;
  const reduced  = Math.round(expense * 0.95 * 10) / 10;
  const newForm  = { ...form, monthlyExpense: reduced };
  const newRows  = runScenario(newForm, 'standard');
  const newStats = calcSummaryStats(newRows, newForm);
  const diff     = newStats.finalAsset - baseStats.finalAsset;
  if (diff <= 0) return null;
  return {
    id: 'reduce_expense',
    icon: '💡',
    title: `月の生活費を${fmtMan(expense)}→${fmtMan(reduced)}万円（5%削減）`,
    summary: `最終資産が約${fmtMan(diff)}万円増加する見込みです`,
    description: '月々の固定費の見直し（通信費・保険・サブスク等）で無理なく支出を抑えられます。',
    changes: [{ label: '月額生活費', before: `${fmtMan(expense)}万円`, after: `${fmtMan(reduced)}万円` }],
    depletionBefore: baseStats.depletionAge,
    depletionAfter:  newStats.depletionAge,
    finalAssetBefore: baseStats.finalAsset,
    finalAssetAfter:  newStats.finalAsset,
    priority: 2,
  };
};

// ── 老後生活費10%削減 ───────────────────────────
const adviceReduceRetireExpense = (form, baseRows, baseStats) => {
  const expense = safeNum(form.retireMonthlyExpense, 15);
  if (expense <= 10) return null;
  const reduced  = Math.round(expense * 0.90 * 10) / 10;
  const newForm  = { ...form, retireMonthlyExpense: reduced };
  const newRows  = runScenario(newForm, 'standard');
  const newStats = calcSummaryStats(newRows, newForm);
  const diff     = newStats.finalAsset - baseStats.finalAsset;
  if (diff <= 0) return null;
  return {
    id: 'reduce_retire_expense',
    icon: '🌿',
    title: `老後生活費を${fmtMan(expense)}→${fmtMan(reduced)}万円/月（10%削減）`,
    summary: `最終資産が約${fmtMan(diff)}万円増加する見込みです`,
    description: '老後の支出を少し抑えることで、長期間にわたり大きな効果が積み重なります。',
    changes: [{ label: '老後月額生活費', before: `${fmtMan(expense)}万円`, after: `${fmtMan(reduced)}万円` }],
    depletionBefore: baseStats.depletionAge,
    depletionAfter:  newStats.depletionAge,
    finalAssetBefore: baseStats.finalAsset,
    finalAssetAfter:  newStats.finalAsset,
    priority: 2,
  };
};

// ── 頭金増額 ────────────────────────────────────
const adviceIncreaseDownPayment = (form, baseRows, baseStats) => {
  if (form.housingType === 'rent') return null;
  const down     = safeNum(form.downPayment, 0);
  const price    = safeNum(form.propertyPrice, 0);
  const cash     = safeNum(form.currentCash, 0);
  const maxIncrease = Math.min(cash * 0.3, price * 0.1, 300);
  if (maxIncrease < 50) return null;
  const newDown  = Math.round(down + maxIncrease);
  if (newDown >= price) return null;
  const newForm  = { ...form, downPayment: newDown };
  const newRows  = runScenario(newForm, 'standard');
  const newStats = calcSummaryStats(newRows, newForm);
  const diff     = newStats.finalAsset - baseStats.finalAsset;
  if (diff <= 0) return null;
  return {
    id: 'increase_down',
    icon: '🏡',
    title: `頭金を${fmtMan(down)}→${fmtMan(newDown)}万円（+${fmtMan(maxIncrease)}万円）に増額`,
    summary: `利息軽減により最終資産が約${fmtMan(diff)}万円増加する見込みです`,
    description: '頭金を増やすことで借入額が減り、総返済額（利息）を抑えられます。',
    changes: [{ label: '頭金', before: `${fmtMan(down)}万円`, after: `${fmtMan(newDown)}万円` }],
    depletionBefore: baseStats.depletionAge,
    depletionAfter:  newStats.depletionAge,
    finalAssetBefore: baseStats.finalAsset,
    finalAssetAfter:  newStats.finalAsset,
    priority: 1,
  };
};

// ────────────────────────────────────────────────
// スコア計算
// ────────────────────────────────────────────────
export const calcLifePlanScore = (diagnosis, stats, form) => {
  let score = 50; // ベーススコア

  // 資産枯渇：大きなペナルティ
  if (stats.depletionAge) {
    const lifespan = safeNum(form.lifespan, 90);
    const retireAge = safeNum(form.retirementAge, 65);
    const remaining = lifespan - stats.depletionAge;
    score -= Math.min(30, remaining * 2);
  } else {
    score += 15;
  }

  // 最終資産
  if (stats.finalAsset > 1000) score += 10;
  else if (stats.finalAsset > 0) score += 5;
  else if (stats.finalAsset < 0) score -= 10;

  // 退職時資産
  if (stats.retirementAsset > 3000) score += 10;
  else if (stats.retirementAsset > 1000) score += 5;

  // 診断結果
  diagnosis.forEach((d) => {
    if (d.level === 'critical') score -= 8;
    else if (d.level === 'warning') score -= 3;
    else if (d.level === 'good')  score += 2;
    else if (d.level === 'great') score += 4;
  });

  return Math.max(0, Math.min(100, Math.round(score)));
};

// ────────────────────────────────────────────────
// スコアランク
// ────────────────────────────────────────────────
export const getScoreRank = (score) => {
  if (score >= 85) return { rank: 'S', label: '非常に優秀',   color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' };
  if (score >= 70) return { rank: 'A', label: '優秀',         color: '#059669', bg: '#f0fdf4', border: '#a7f3d0' };
  if (score >= 55) return { rank: 'B', label: '良好',         color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };
  if (score >= 40) return { rank: 'C', label: '要改善',       color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
  return             { rank: 'D', label: '要注意',           color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
};
