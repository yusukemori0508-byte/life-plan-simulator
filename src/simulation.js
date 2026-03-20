// src/simulation.js
import { SCENARIOS, NISA_LIMITS, PENSION, IDECO_MONTHLY_LIMITS } from './constants.js';
import {
  calcIncomeAtYear,
  calcEducationCostForYear,
  buildMortgageSchedule,
  summarizeMortgageByYear,
  calcLoanAmount,
  estimatePension,
  estimateSpousePension,
  calcIdecoAnnualTaxSaving,
  detectDepletionAge,
  detectEducationPeak,
  getRetirementRow,
  safeNum,
} from './utils.js';

// ────────────────────────────────────────────────
// 全シナリオ実行
// ────────────────────────────────────────────────
export const runAllScenarios = (form) => ({
  pessimistic: runScenario(form, 'pessimistic'),
  standard:    runScenario(form, 'standard'),
  optimistic:  runScenario(form, 'optimistic'),
});

// ────────────────────────────────────────────────
// 年次シミュレーション
// ────────────────────────────────────────────────
export const runScenario = (form, scenarioKey) => {
  const sc = SCENARIOS[scenarioKey];
  const f  = form;

  // ── 基本パラメータ ──────────────────────────
  const startAge      = safeNum(f.currentAge, 30);
  const retireAge     = safeNum(f.retirementAge, 65);
  const lifespan      = safeNum(f.lifespan, 90);
  const isSelf        = !!f.isSelfEmployed;
  const hasSpouse     = !!f.hasSpouse;
  const spouseAge0    = safeNum(f.spouseAge, 28);
  const spouseWorking = !!f.spouseIsWorking;
  const spouseRTWAge  = safeNum(f.spouseReturnToWorkAge, 35);  // 配偶者年齢基準
  const spouseRTWInc  = safeNum(f.spouseReturnToWorkIncome, 0);
  const children      = Array.isArray(f.children) ? f.children : [];
  const lifeEvents    = Array.isArray(f.lifeEvents) ? f.lifeEvents : [];
  const growthRate    = safeNum(f.incomeGrowthRate, 1.0) * sc.incomeGrowthMul;

  // ── 初期資産 ────────────────────────────────
  const emergencyFund = safeNum(f.emergencyFund, 0);
  let cash       = Math.max(0, safeNum(f.currentCash, 0) - emergencyFund);
  let investment = safeNum(f.currentInvestment, 0);
  let nisa       = safeNum(f.currentNisa, 0);
  let ideco      = safeNum(f.currentIdeco, 0);
  let nisaCumContrib = safeNum(f.nisaCumContrib, 0);

  // ── iDeCo設定 ───────────────────────────────
  const idecoMonthly      = safeNum(f.idecoMonthly, 0);
  const idecoTaxRate      = safeNum(f.idecoTaxRate, 0);
  const idecoReceiveTax   = safeNum(f.idecoReceiveTaxRate, 0);
  const idecoLimit        = isSelf ? IDECO_MONTHLY_LIMITS.selfEmployed : IDECO_MONTHLY_LIMITS.employee;
  const idecoAnnual       = Math.min(idecoMonthly, idecoLimit) * 12;
  let idecoClosed         = false;

  // ── NISA設定 ────────────────────────────────
  const nisaMonthlyDesired = safeNum(f.nisaMonthly, 0);
  const generalMonthly     = safeNum(f.generalInvestMonthly, 0);

  // ── 住宅ローン ──────────────────────────────
  const housingType   = f.housingType ?? 'rent';
  const monthlyRent   = safeNum(f.monthlyRent, 0);
  const propertyPrice = safeNum(f.propertyPrice, 0);
  const downPayment   = safeNum(f.downPayment, 0);
  const mortgageRate  = safeNum(f.mortgageRate, 1.0);
  const mortgageTerm  = safeNum(f.mortgageTerm, 35);
  const purchaseAge   = safeNum(f.purchaseAge, 35);

  // ── 既存ローンのスケジュール（own の場合） ───
  let activeSched    = [];
  let startIdx       = 0;
  let currentMortgageBalance = 0;
  let isPurchaseYearDone     = false;

  if (housingType === 'own') {
    const loan = calcLoanAmount(propertyPrice, downPayment);
    if (loan > 0) {
      activeSched = buildMortgageSchedule(loan, mortgageRate, mortgageTerm);
    }
  }

  // ── 年金概算（事前に計算） ──────────────────
  const selfPension = estimatePension({
    annualIncome: safeNum(f.selfIncome, 0),
    currentAge: startAge,
    retirementAge: retireAge,
    isSelfEmployed: isSelf,
  });
  const spousePension = hasSpouse
    ? estimateSpousePension({
        spouseIncome: spouseWorking ? safeNum(f.spouseIncome, 0) : spouseRTWInc,
        spouseAge: spouseAge0,
        retirementAge: retireAge,
        spouseIsWorking: spouseWorking || spouseRTWInc > 0,
        isSelfEmployed: false,
      })
    : { annual: 0, monthly: 0 };

  // ════════════════════════════════════════════
  // 年次ループ
  // ════════════════════════════════════════════
  const rows = [];

  for (let age = startAge; age <= lifespan; age++) {
    const yr          = age - startAge;  // 経過年数
    const spouseAge   = spouseAge0 + yr;
    const isRetired   = age >= retireAge;
    const isRetirementYear = age === retireAge;
    const isPurchaseYear   = housingType === 'future_purchase' && age === purchaseAge && !isPurchaseYearDone;

    // ── iDeCo退職時一括受取 ──────────────────
    if (isRetirementYear && !idecoClosed && ideco > 0) {
      const tax     = ideco * idecoReceiveTax;
      ideco         = ideco - tax;
      cash         += ideco;
      ideco         = 0;
      idecoClosed   = true;
    }
    if (isRetirementYear && !idecoClosed) idecoClosed = true;

    // ── 将来購入年: ローン開始 ────────────────
    if (isPurchaseYear) {
      isPurchaseYearDone = true;
      const loan = calcLoanAmount(propertyPrice, downPayment);
      if (loan > 0) {
        activeSched  = buildMortgageSchedule(loan, mortgageRate, mortgageTerm);
        startIdx     = 0;
        currentMortgageBalance = loan;
      }
    }

    // ── ローン返済額（該当年） ────────────────
    let mortgagePay = 0;
    if (activeSched.length > 0) {
      const yearOffset = isPurchaseYear ? 0 : (housingType === 'own' ? yr : yr - (purchaseAge - startAge) - 1);
      const monthStart = yearOffset * 12;
      const monthEnd   = monthStart + 12;
      for (let m = monthStart; m < monthEnd && m < activeSched.length; m++) {
        mortgagePay += activeSched[m].payment;
      }
      const lastM = Math.min(monthEnd, activeSched.length) - 1;
      if (lastM >= 0 && lastM < activeSched.length) {
        currentMortgageBalance = activeSched[lastM].balance;
      }
    }

    // ── 収入 ─────────────────────────────────
    let selfInc = 0;
    if (!isRetired) {
      selfInc = calcIncomeAtYear(safeNum(f.selfIncome, 0), growthRate, startAge, yr, retireAge);
      selfInc = Math.round(selfInc);
    }

    // 配偶者収入（配偶者の年齢で判定）
    let spouseInc = 0;
    if (hasSpouse && !isRetired) {
      if (spouseWorking) {
        spouseInc = Math.round(safeNum(f.spouseIncome, 0) * Math.pow(1 + (growthRate / 100 || 0.01), yr));
      } else if (spouseAge >= spouseRTWAge) {
        // 配偶者が復帰年齢に達した場合
        spouseInc = spouseRTWInc;
      }
    }

    // 年金収入（65歳以降）
    let pensionSelf   = 0;
    let pensionSpouse = 0;
    if (age >= PENSION.receiveStartAge) {
      pensionSelf   = selfPension.annual;
      pensionSpouse = hasSpouse ? spousePension.annual : 0;
    }

    const totalIncome = Math.round(selfInc + spouseInc + pensionSelf + pensionSpouse);

    // ── 生活費・インフレ ──────────────────────
    const inflFactor  = Math.pow(1 + sc.inflation, yr);
    const baseExpense = isRetired
      ? safeNum(f.retireMonthlyExpense, 15) * 12
      : safeNum(f.monthlyExpense, 20) * 12;
    const livingExp   = Math.round(baseExpense * inflFactor);

    // ── 住居費 ────────────────────────────────
    const rentPay     = housingType === 'rent' ? Math.round(monthlyRent * 12 * inflFactor) : 0;

    // ── 教育費 ────────────────────────────────
    const eduCost = Math.round(calcEducationCostForYear(children, yr));

    // ── ライフイベント ────────────────────────
    const eventCost = lifeEvents
      .filter((e) => Number(e.age) === age)
      .reduce((s, e) => s + safeNum(e.cost, 0), 0);

    // ── 頭金（購入年のみ） ────────────────────
    const downCost = isPurchaseYear ? downPayment : 0;

    // ── NISA積立 ─────────────────────────────
    const nisaLifetimeRemaining = Math.max(0, NISA_LIMITS.lifetimeMax - nisaCumContrib);
    const nisaAnnualMax         = NISA_LIMITS.annualMax;
    const nisaDesiredAnnual     = nisaMonthlyDesired * 12;
    const nisaContrib = !isRetired
      ? Math.min(nisaDesiredAnnual, nisaLifetimeRemaining, nisaAnnualMax)
      : 0;
    nisaCumContrib += nisaContrib;

    // ── iDeCo積立（退職前のみ） ───────────────
    const idecoContrib   = (!isRetired && !idecoClosed) ? idecoAnnual : 0;
    const idecoTaxSaving = (!isRetired && !idecoClosed) ? calcIdecoAnnualTaxSaving(idecoMonthly, idecoTaxRate) : 0;

    // ── 一般投資積立 ──────────────────────────
    const generalContrib = !isRetired ? generalMonthly * 12 : 0;

    // ── 総支出 ────────────────────────────────
    const totalExpense = Math.round(
      livingExp + rentPay + mortgagePay + eduCost + eventCost + downCost +
      nisaContrib + idecoContrib + generalContrib
    );

    // ── 資産運用（成長） ──────────────────────
    investment = investment * (1 + sc.generalReturn) + generalContrib;
    nisa       = nisa       * (1 + sc.nisaReturn)    + nisaContrib;
    if (!idecoClosed) {
      ideco    = ideco      * (1 + sc.idecoReturn)   + idecoContrib;
    }

    // ── キャッシュフロー ──────────────────────
    const cashflow = totalIncome - totalExpense;
    cash += cashflow;

    // ── 現金不足 → 資産取崩し順: 一般投資→NISA→iDeCo ──
    if (cash < 0) {
      const need = Math.abs(cash);
      if (investment >= need) {
        investment -= need; cash = 0;
      } else {
        cash += investment; investment = 0;
        if (cash < 0) {
          const need2 = Math.abs(cash);
          if (nisa >= need2) {
            nisa -= need2; cash = 0;
          } else {
            cash += nisa; nisa = 0;
            if (cash < 0 && !idecoClosed && ideco > 0) {
              const need3 = Math.abs(cash);
              if (ideco >= need3) {
                ideco -= need3; cash = 0;
              } else {
                cash += ideco; ideco = 0;
              }
            }
          }
        }
      }
    }

    // ── 緊急予備資金を含めた現預金合計 ──────
    const cashTotal  = Math.round(cash + emergencyFund);
    const totalAssets = Math.round(cashTotal + investment + nisa + ideco);

    rows.push({
      age,
      selfIncome:      selfInc,
      spouseIncome:    spouseInc,
      pensionSelf,
      pensionSpouse,
      totalIncome,
      livingExp,
      rentPay,
      mortgagePay:     Math.round(mortgagePay),
      eduCost,
      eventCost,
      downCost,
      nisaContrib,
      idecoContrib,
      generalContrib,
      idecoTaxSaving,
      totalExpense,
      cashflow:        Math.round(cashflow),
      cash:            cashTotal,
      investment:      Math.round(investment),
      nisa:            Math.round(nisa),
      ideco:           Math.round(ideco),
      totalAssets,
      isRetired,
      isPurchaseYear:  isPurchaseYear || false,
      mortgageBalance: Math.round(currentMortgageBalance),
    });
  }

  return rows;
};

// ────────────────────────────────────────────────
// サマリー統計
// ────────────────────────────────────────────────
export const calcSummaryStats = (rows, form) => {
  const retirementAge = safeNum(form.retirementAge, 65);
  const retireRow     = getRetirementRow(rows, retirementAge) ?? rows[rows.length - 1];
  const finalRow      = rows[rows.length - 1];

  const totalMortgagePay   = rows.reduce((s, r) => s + (r.mortgagePay ?? 0), 0);
  const totalIdecoTaxSaving= rows.reduce((s, r) => s + (r.idecoTaxSaving ?? 0), 0);
  const totalEduCost       = rows.reduce((s, r) => s + (r.eduCost ?? 0), 0);

  return {
    retirementAsset:   retireRow?.totalAssets ?? 0,
    finalAsset:        finalRow?.totalAssets  ?? 0,
    depletionAge:      detectDepletionAge(rows),
    peakEduAge:        detectEducationPeak(rows),
    totalEduCost:      Math.round(totalEduCost),
    totalMortgagePay:  Math.round(totalMortgagePay),
    totalIdecoTaxSaving: Math.round(totalIdecoTaxSaving),
  };
};

// ────────────────────────────────────────────────
// 年金概算（UI表示用）
// ────────────────────────────────────────────────
export const calcPensionEstimates = (form) => {
  const self = estimatePension({
    annualIncome:   safeNum(form.selfIncome, 0),
    currentAge:     safeNum(form.currentAge, 30),
    retirementAge:  safeNum(form.retirementAge, 65),
    isSelfEmployed: !!form.isSelfEmployed,
  });

  let spouseAnnual  = 0;
  let spouseMonthly = 0;

  if (form.hasSpouse) {
    const inc = form.spouseIsWorking
      ? safeNum(form.spouseIncome, 0)
      : safeNum(form.spouseReturnToWorkIncome, 0);
    const sp = estimateSpousePension({
      spouseIncome:    inc,
      spouseAge:       safeNum(form.spouseAge, 28),
      retirementAge:   safeNum(form.retirementAge, 65),
      spouseIsWorking: !!form.spouseIsWorking || inc > 0,
      isSelfEmployed:  false,
    });
    spouseAnnual  = sp.annual;
    spouseMonthly = sp.monthly;
  }

  return {
    selfAnnual:    self.annual,
    selfMonthly:   self.monthly,
    spouseAnnual,
    spouseMonthly,
    totalAnnual:   Math.round(self.annual + spouseAnnual),
    totalMonthly:  Math.round((self.monthly + spouseMonthly) * 10) / 10,
  };
};
