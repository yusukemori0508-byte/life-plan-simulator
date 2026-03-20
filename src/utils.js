// src/utils.js
import {
  TAX_BRACKETS,
  EDUCATION_ANNUAL_COST,
  AGE_TO_SCHOOL,
  EDUCATION_PRESETS,
  PENSION,
  STORAGE_KEYS,
  DEFAULT_FORM,
  IDECO_MONTHLY_LIMITS,
} from './constants.js';

// ────────────────────────────────────────────────
// 数値フォーマッター
// ────────────────────────────────────────────────
export const fmtMan = (val) => {
  const n = Math.round(Number(val) || 0);
  return n.toLocaleString('ja-JP');
};

export const fmtManSign = (val) => {
  const n = Math.round(Number(val) || 0);
  return (n >= 0 ? '+' : '') + n.toLocaleString('ja-JP');
};

export const fmtPct = (val) => `${(Number(val) * 100).toFixed(1)}%`;
export const fmtPctRaw = (val) => `${Number(val).toFixed(1)}%`;
export const fmtAge = (val) => `${Number(val)}歳`;

export const monthlyToAnnual = (m) => Number(m) * 12;
export const annualToMonthly = (a) => Number(a) / 12;

export const getCurrentYear = () => new Date().getFullYear();
export const ageToCalendarYear = (currentAge, targetAge) =>
  getCurrentYear() + (targetAge - currentAge);

export const clamp = (v, min, max) => Math.min(Math.max(Number(v), min), max);
export const safeNum = (v, fallback = 0) => (isFinite(Number(v)) ? Number(v) : fallback);

export const calcDiff = (a, b) => Number(b) - Number(a);
export const genId = () => Math.random().toString(36).slice(2, 9);

// ────────────────────────────────────────────────
// 住宅ローン計算
// ────────────────────────────────────────────────
/** 月額返済額（元利均等）を返す（万円） */
export const calcMonthlyMortgage = (principal, annualRatePct, termYears) => {
  const p = Number(principal);
  const r = Number(annualRatePct) / 100 / 12;
  const n = Number(termYears) * 12;
  if (p <= 0 || n <= 0) return 0;
  if (r === 0) return p / n;
  return (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};

/** 年間返済額（万円） */
export const calcAnnualMortgage = (principal, annualRatePct, termYears) =>
  calcMonthlyMortgage(principal, annualRatePct, termYears) * 12;

/** 月次返済スケジュール（元本・利息・残高の配列） */
export const buildMortgageSchedule = (principal, annualRatePct, termYears) => {
  const r = Number(annualRatePct) / 100 / 12;
  const n = Number(termYears) * 12;
  const monthly = calcMonthlyMortgage(principal, annualRatePct, termYears);
  let balance = Number(principal);
  const schedule = [];
  for (let i = 0; i < n; i++) {
    const interest = balance * r;
    const principal_pay = monthly - interest;
    balance = Math.max(0, balance - principal_pay);
    schedule.push({ month: i + 1, payment: monthly, interest, principal: principal_pay, balance });
  }
  return schedule;
};

/** 月次スケジュールを年次に集計 */
export const summarizeMortgageByYear = (schedule) => {
  const byYear = {};
  schedule.forEach((m) => {
    const yr = Math.ceil(m.month / 12);
    if (!byYear[yr]) byYear[yr] = { year: yr, totalPayment: 0, totalInterest: 0, endBalance: 0 };
    byYear[yr].totalPayment  += m.payment;
    byYear[yr].totalInterest += m.interest;
    byYear[yr].endBalance     = m.balance;
  });
  return Object.values(byYear);
};

export const calcLoanAmount = (propertyPrice, downPayment) =>
  Math.max(0, Number(propertyPrice) - Number(downPayment));

export const calcMortgageIncomeRatio = (loanAmount, annualIncome) =>
  annualIncome > 0 ? Number(loanAmount) / Number(annualIncome) : 0;

// ────────────────────────────────────────────────
// 教育費計算
// ────────────────────────────────────────────────
export const getEducationSettings = (presetId) => {
  const preset = EDUCATION_PRESETS.find((p) => p.id === presetId);
  return preset?.settings ?? EDUCATION_PRESETS[0].settings;
};

export const getEducationCostAtAge = (childAge, settings) => {
  const school = AGE_TO_SCHOOL(childAge);
  if (!school) return 0;
  const type = settings[school] === 'private' ? 1 : 0;
  return EDUCATION_ANNUAL_COST[school]?.[type] ?? 0;
};

export const calcEducationCostForYear = (children, yearsFromNow) => {
  if (!Array.isArray(children) || children.length === 0) return 0;
  return children.reduce((sum, child) => {
    const ageAtYear = Number(child.currentAge ?? 0) + yearsFromNow;
    const settings  = getEducationSettings(child.educationPreset ?? 'public');
    return sum + getEducationCostAtAge(ageAtYear, settings);
  }, 0);
};

export const calcTotalEducationCostPerChild = (childCurrentAge, presetId) => {
  const settings = getEducationSettings(presetId);
  let total = 0;
  for (let age = childCurrentAge; age <= 21; age++) {
    total += getEducationCostAtAge(age, settings);
  }
  return total;
};

// ────────────────────────────────────────────────
// 税金・所得計算
// ────────────────────────────────────────────────
export const calcEmploymentDeduction = (income) => {
  const i = Number(income);
  if (i <= 180)  return Math.max(55, i * 0.40);
  if (i <= 360)  return 72 + (i - 180) * 0.30;
  if (i <= 660)  return 126 + (i - 360) * 0.20;
  if (i <= 850)  return 186 + (i - 660) * 0.10;
  if (i <= 1000) return 205 + (i - 850) * 0.05;
  return 195;
};

export const calcIncomeTax = (taxableIncome) => {
  const t = Number(taxableIncome);
  const bracket = TAX_BRACKETS.find((b) => t >= b.min && t < b.max) ?? TAX_BRACKETS[TAX_BRACKETS.length - 1];
  return Math.max(0, t * bracket.rate - bracket.deduction);
};

export const calcNetIncome = (gross, isSelfEmployed = false) => {
  const g = Number(gross);
  const deduction = isSelfEmployed ? g * 0.20 : calcEmploymentDeduction(g);
  const socialIns = isSelfEmployed ? g * 0.15 : g * 0.14;
  const taxable   = Math.max(0, g - deduction - socialIns - 48); // 基礎控除48万
  const tax       = calcIncomeTax(taxable);
  const resident  = taxable * 0.10;
  return Math.round(g - tax - resident - socialIns);
};

export const calcIdecoAnnualTaxSaving = (idecoMonthly, taxRate) =>
  Math.round(Number(idecoMonthly) * 12 * Number(taxRate) * 10) / 10;

// ────────────────────────────────────────────────
// 年金概算
// ────────────────────────────────────────────────
export const calcBasicPension = () => PENSION.basicAnnual;

export const calcKouseiPension = (avgAnnualIncome, workingYears) => {
  const monthly = Number(avgAnnualIncome) / 12 * 10000; // 万円→円
  const months  = Number(workingYears) * 12;
  return Math.round(monthly * PENSION.kousei_rate * months) / 10000; // 万円
};

export const estimatePension = ({ annualIncome, currentAge, retirementAge, isSelfEmployed }) => {
  const workingYears = Math.max(0, Number(retirementAge) - Number(currentAge));
  const basic  = calcBasicPension();
  const kousei = isSelfEmployed ? 0 : calcKouseiPension(annualIncome, workingYears);
  const annual  = Math.round(basic + kousei);
  const monthly = Math.round(annual / 12 * 10) / 10;
  return { annual, monthly };
};

export const estimateSpousePension = ({ spouseIncome, spouseAge, retirementAge, spouseIsWorking, isSelfEmployed }) => {
  if (!spouseIsWorking && spouseIncome <= 0) {
    // 第3号被保険者 → 基礎年金のみ
    const annual  = calcBasicPension();
    return { annual, monthly: Math.round(annual / 12 * 10) / 10 };
  }
  const workYears = Math.max(0, Number(retirementAge) - Number(spouseAge));
  return estimatePension({ annualIncome: spouseIncome, currentAge: spouseAge, retirementAge, isSelfEmployed });
};

// ────────────────────────────────────────────────
// 収入成長計算
// ────────────────────────────────────────────────
/** 指定年の年収を計算（48歳でピーク、以降緩やかに低下） */
export const calcIncomeAtYear = (baseIncome, growthRatePct, currentAge, yearsFromNow, retirementAge) => {
  const age      = Number(currentAge) + yearsFromNow;
  const rate     = Number(growthRatePct) / 100;
  const peakAge  = 48;
  const retired  = age >= Number(retirementAge);
  if (retired) return 0;
  if (age <= peakAge) {
    return Number(baseIncome) * Math.pow(1 + rate, Math.min(yearsFromNow, peakAge - currentAge));
  }
  const atPeak   = Number(baseIncome) * Math.pow(1 + rate, Math.max(0, peakAge - currentAge));
  const decline  = Math.pow(0.995, age - peakAge);
  return atPeak * decline;
};

// ────────────────────────────────────────────────
// 複利計算
// ────────────────────────────────────────────────
export const compoundGrowth = (principal, rate, years) =>
  Number(principal) * Math.pow(1 + Number(rate), Number(years));

export const futureValueOfAnnuity = (annual, rate, years) => {
  if (rate === 0) return annual * years;
  return annual * (Math.pow(1 + rate, years) - 1) / rate;
};

// ────────────────────────────────────────────────
// バリデーション
// ────────────────────────────────────────────────
const STEP_FIELD_MAP = {
  basic:   ['currentAge', 'retirementAge', 'lifespan'],
  family:  ['spouseAge', 'spouseIncome', 'spouseReturnToWorkAge', 'spouseReturnToWorkIncome'],
  income:  ['selfIncome', 'idecoMonthly'],
  housing: ['housingType', 'monthlyRent', 'propertyPrice', 'downPayment', 'purchaseAge'],
  expense: ['monthlyExpense', 'retireMonthlyExpense', 'emergencyFund', 'currentCash'],
  nisa:    ['nisaMonthly', 'nisaCumContrib'],
  events:  [],
  result:  [],
};

export const validateForm = (form) => {
  const errors = {};
  const f = form;

  if (f.retirementAge <= f.currentAge)
    errors.retirementAge = `退職年齢は現在の年齢（${f.currentAge}歳）より大きくしてください`;
  if (f.lifespan <= f.retirementAge)
    errors.lifespan = `想定寿命は退職年齢（${f.retirementAge}歳）より大きくしてください`;
  if (f.housingType !== 'rent' && f.downPayment >= f.propertyPrice)
    errors.downPayment = '頭金は物件価格より小さくしてください';
  if (f.housingType === 'future_purchase' && f.purchaseAge <= f.currentAge)
    errors.purchaseAge = `購入年齢は現在の年齢（${f.currentAge}歳）より大きくしてください`;
  if (f.hasSpouse && f.spouseReturnToWorkAge <= f.spouseAge && !f.spouseIsWorking)
    errors.spouseReturnToWorkAge = `復帰年齢は配偶者の現在の年齢（${f.spouseAge}歳）より大きくしてください`;
  if (f.retireMonthlyExpense > f.monthlyExpense * 1.5)
    errors.retireMonthlyExpense = '老後の生活費が現役時の1.5倍を超えています。確認してください';

  const loanAmount = calcLoanAmount(f.propertyPrice, f.downPayment);
  const ratio = calcMortgageIncomeRatio(loanAmount, f.selfIncome);
  if (f.housingType !== 'rent' && f.selfIncome > 0 && ratio > 7)
    errors.mortgageRatio = `借入額が年収の${ratio.toFixed(1)}倍と高すぎます（目安: 7倍以内）`;

  return { isValid: Object.keys(errors).length === 0, errors };
};

export const validateStep = (stepId, form) => {
  const { errors } = validateForm(form);
  const fields = STEP_FIELD_MAP[stepId] ?? [];
  const stepErrors = {};
  fields.forEach((f) => { if (errors[f]) stepErrors[f] = errors[f]; });
  // 追加: stepId特有チェック
  if (stepId === 'basic') {
    if (errors.retirementAge) stepErrors.retirementAge = errors.retirementAge;
    if (errors.lifespan)      stepErrors.lifespan      = errors.lifespan;
  }
  if (stepId === 'housing') {
    if (errors.downPayment)   stepErrors.downPayment   = errors.downPayment;
    if (errors.purchaseAge)   stepErrors.purchaseAge   = errors.purchaseAge;
    if (errors.mortgageRatio) stepErrors.mortgageRatio = errors.mortgageRatio;
  }
  if (stepId === 'family') {
    if (errors.spouseReturnToWorkAge) stepErrors.spouseReturnToWorkAge = errors.spouseReturnToWorkAge;
  }
  if (stepId === 'expense') {
    if (errors.retireMonthlyExpense) stepErrors.retireMonthlyExpense = errors.retireMonthlyExpense;
  }
  return { isValid: Object.keys(stepErrors).length === 0, errors: stepErrors };
};

// ────────────────────────────────────────────────
// localStorage ヘルパー
// ────────────────────────────────────────────────
export const saveFormData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEYS.formData, JSON.stringify(data));
  } catch (e) { /* ignore */ }
};

export const loadFormData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.formData);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
};

export const clearSavedData = () => {
  try {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem(STORAGE_KEYS.formData);
  } catch (e) { /* ignore */ }
};

export const formatLastSaved = (isoStr) => {
  try {
    const d = new Date(isoStr);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  } catch (e) { return ''; }
};

// ────────────────────────────────────────────────
// フォーム初期化ヘルパー
// ────────────────────────────────────────────────
export const mergeWithDefaults = (presetData) => ({
  ...DEFAULT_FORM,
  ...presetData,
});

export const normalizeChildren = (children) => {
  if (!Array.isArray(children)) return [];
  return children.map((c) => ({
    id:              c.id ?? Math.random().toString(36).slice(2),
    currentAge:      Number(c.currentAge ?? 0),
    educationPreset: c.educationPreset ?? 'public',
  }));
};

export const normalizeLifeEvents = (events) => {
  if (!Array.isArray(events)) return [];
  return events.map((e) => ({
    id:    e.id ?? Math.random().toString(36).slice(2),
    age:   Number(e.age ?? 40),
    label: e.label ?? 'イベント',
    cost:  Number(e.cost ?? 100),
    icon:  e.icon ?? '📌',
  }));
};

// ────────────────────────────────────────────────
// シミュレーション分析ヘルパー
// ────────────────────────────────────────────────
export const detectDepletionAge = (rows) => {
  const row = rows.find((r) => r.totalAssets < 0);
  return row ? row.age : null;
};

export const detectEducationPeak = (rows) => {
  let maxCost = 0;
  let peakAge = null;
  rows.forEach((r) => {
    if ((r.eduCost ?? 0) > maxCost) {
      maxCost = r.eduCost;
      peakAge = r.age;
    }
  });
  return peakAge;
};

export const getRetirementRow = (rows, retirementAge) =>
  rows.find((r) => r.age >= Number(retirementAge)) ?? null;
