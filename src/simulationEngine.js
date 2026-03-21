// src/simulationEngine.js
// シミュレーション計算責務の集約点
//
// 設計思想:
//   - 各画面から直接 simulation.js を呼ばせない
//   - profileData（store フォーマット）+ selectedChoices（イベント選択結果）を
//     simulation.js 互換フォームに変換してから計算する
//   - 以下を一元管理:
//     ① 年次資産推移の再計算
//     ② collapseAge 判定（資産枯渇年齢）
//     ③ minAsset 判定（資産の谷）
//     ④ FIRE 年齢判定（4%ルール）
//     ⑤ 総合評価サマリー生成

import { runScenario, calcSummaryStats } from './simulation.js';
import { safeNum, estimatePension, estimateSpousePension } from './utils.js';
import { calcInitialGauge, calcNetRatio, MONTHLY_BUFFER } from './gaugeCalc.js';

// ─────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────

/** FIRE判定: 資産 × FIRE_RATE ≥ 年間支出 で FIRE 達成 */
const FIRE_WITHDRAWAL_RATE = 0.04;  // 4% ルール

/** 住宅購入のデフォルトパラメータ */
const HOUSING_DEFAULTS = {
  mortgageRate: 1.0,    // 変動金利 %
  mortgageTerm: 35,     // ローン年数
  downPayRatio: 0.10,   // 頭金率（物件価格の10%）
};

// ─────────────────────────────────────────────────────────────
// 元利均等返済 月返済額計算
// ─────────────────────────────────────────────────────────────
/**
 * @param {number} loanMan      借入額（万円）
 * @param {number} ratePercent  年利（%）
 * @param {number} termYears    借入年数
 * @returns {number}            月返済額（万円/月）
 */
export const calcMonthlyPayment = (loanMan, ratePercent, termYears) => {
  if (loanMan <= 0 || termYears <= 0) return 0;
  const r = ratePercent / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return Math.round((loanMan / n) * 100) / 100;
  const payment = loanMan * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  return Math.round(payment * 100) / 100;
};

// ─────────────────────────────────────────────────────────────
// ① profileData + selectedChoices → simulation.js 形式へ変換
// ─────────────────────────────────────────────────────────────
/**
 * @param {object}   profile        - useAppStore の profileData
 * @param {object[]} selectedChoices - store の selectedChoices[]
 * @returns {object} simulation.js の runScenario に渡す form オブジェクト
 */
export const profileToSimForm = (profile, selectedChoices = []) => {
  const p = profile;

  // ── ベース値をコピー ────────────────────────────────────────
  let selfIncome         = safeNum(p.selfIncome,         450);
  let monthlyExpense     = safeNum(p.monthlyExpense,      20);
  let monthlyInvestment  = safeNum(p.monthlyInvestment,    3);
  let currentSavings     = safeNum(p.currentSavings,     150);
  let housingType        = p.housingPurchaseAge ? 'future_purchase' : 'rent';
  let propertyPrice      = safeNum(p.propertyPrice, 3500);
  let extraLifeEvents    = [];   // 車・病気など一時費用
  let childEduPlans      = {};   // { childIndex: presetId }

  // ── selectedChoices を適用 ──────────────────────────────────
  for (const choice of selectedChoices) {
    const { eventId, choiceId, age: choiceAge } = choice;

    // ── 住宅 ────────────────────────────────────────────────
    if (eventId === 'housing') {
      if (choiceId === 'expensive') {
        housingType = 'future_purchase';
        // プロフィールに housingPurchaseAge が設定済み（InputScreen で価格入力済み）の
        // 場合は profile.propertyPrice を優先。未設定なら選択肢の固定価格を使う。
        // → これによりシナリオ比較での propertyPrice diff が正しく反映される。
        if (!p.housingPurchaseAge) propertyPrice = 7000;
      } else if (choiceId === 'mid') {
        housingType = 'future_purchase';
        if (!p.housingPurchaseAge) propertyPrice = 4500;
      } else if (choiceId === 'skip') {
        housingType = 'rent';
      }
    }

    // ── 転職 ────────────────────────────────────────────────
    if (eventId === 'jobChange') {
      if (choiceId === 'up')   selfIncome = Math.max(0, selfIncome + 100);
      if (choiceId === 'down') selfIncome = Math.max(0, selfIncome - 80);
    }

    // ── 副業 ────────────────────────────────────────────────
    if (eventId === 'sideBusiness' && choiceId === 'start') {
      selfIncome += 60;
    }

    // ── 車購入（eventId は car_<age> 形式） ─────────────────
    if (eventId.startsWith('car_')) {
      const carCost = choiceId === 'new' ? 400 : choiceId === 'used' ? 150 : 0;
      if (carCost > 0) {
        extraLifeEvents.push({
          id:    `car_choice_${choiceAge}`,
          age:   choiceAge ?? p.currentAge,
          label: `車購入（${choiceId === 'new' ? '新車' : '中古'}）`,
          cost:  carCost,
          icon:  '🚗',
        });
      }
    }

    // ── 病気 ────────────────────────────────────────────────
    if (eventId === 'illness') {
      const medCost = choiceId === 'full' ? 100 : 20;
      extraLifeEvents.push({
        id:    `illness_${choiceAge}`,
        age:   choiceAge ?? p.currentAge,
        label: '医療費',
        cost:  medCost,
        icon:  '🏥',
      });
    }

    // ── 相続 ────────────────────────────────────────────────
    if (eventId === 'inheritance') {
      const gain = 500;  // 受取額（万円）
      // costOnce が負値 = 資産増加 → ここでは currentSavings に加算
      currentSavings += gain;
    }

    // ── 子どもの教育プラン ───────────────────────────────────
    if (eventId.startsWith('child_')) {
      const idx = parseInt(eventId.split('_')[1], 10);
      if (!isNaN(idx)) {
        childEduPlans[idx] = {
          public:  'public',
          mixed:   'mix_pub',
          private: 'mix_pri',
        }[choiceId] ?? 'public';
      }
    }
  }

  // ── 子ども配列構築 ──────────────────────────────────────────
  const numChildren  = safeNum(p.numChildren, 0);
  const childAgesArr = Array.isArray(p.childAges)
    ? p.childAges
    : [p.firstChildAge ?? null, null, null, null];
  const childSpacing = safeNum(p.childSpacing, 3);
  const children = [];

  for (let i = 0; i < numChildren; i++) {
    // childAges[i] が設定されていればそれを使用、なければ firstChildAge + i*childSpacing で推定
    let birthAge = childAgesArr[i];
    if (birthAge === null || birthAge === undefined) {
      const base = safeNum(childAgesArr[0] ?? p.firstChildAge, 0);
      birthAge = base > 0 ? base + i * childSpacing : null;
    }
    if (!birthAge) continue;
    const bAge = Number(birthAge);
    if (bAge <= 0) continue;
    const childCurrentAge = -(bAge - safeNum(p.currentAge, 30));
    children.push({
      id:              `c${i}`,
      currentAge:      childCurrentAge,
      educationPreset: childEduPlans[i] ?? p.educationPlan ?? 'public',
    });
  }

  // ── 住居費パラメータ ────────────────────────────────────────
  // 頭金はユーザー入力値をそのまま使う。
  // currentSavings でキャップすると「購入まで数年貯める」ユーザーの頭金が
  // 今の貯蓄に制限されてしまい、シナリオ比較（頭金+500万）でも差が出なくなる。
  // 購入時に資金が足りない場合は simulation 内で cash < 0 → 資産取崩しで自然に反映される。
  const downPayment = housingType !== 'rent'
    ? Math.max(0, safeNum(p.downPayment, Math.round(propertyPrice * HOUSING_DEFAULTS.downPayRatio)))
    : 0;

  const hasSpouse        = p.lifeType !== 'single' && safeNum(p.spouseIncome, 0) > 0;
  const spouseIncGross   = hasSpouse ? safeNum(p.spouseIncome, 0) : 0;
  // 配偶者年齢: 本人-2歳想定（プロフィールに spouseAge がなければ）
  const spouseAge        = safeNum(p.spouseAge, safeNum(p.currentAge, 30) - 2);

  // ── 手取りベース変換（所得税 + 社会保険の概算控除） ────────
  const selfIncomeNet   = Math.round(Math.max(0, selfIncome) * calcNetRatio(selfIncome));
  const spouseIncomeNet = spouseIncGross > 0
    ? Math.round(spouseIncGross * calcNetRatio(spouseIncGross))
    : 0;

  // ── 住居費（家賃）を生活費から分離 ────────────────────────
  // expHousing = ユーザーが入力した現在の家賃・住居費（ローン除く）
  // 賃貸 or 購入予定どちらも「現在は賃貸」なのでこの値が購入前の家賃になる。
  // monthlyExpense から住居費を引いて「住居費以外の生活費」として扱う。
  // → 購入後は家賃0・ローン開始のため二重計上を防ぐ。
  const expHousingMonthly = (housingType === 'rent' || housingType === 'future_purchase')
    ? safeNum(p.expHousing, 8)   // 入力値優先、デフォルト8万/月
    : 0;
  // 住居費を差し引いた純粋な生活費ベース
  monthlyExpense = Math.max(0, monthlyExpense - expHousingMonthly);

  // ── 臨時支出バッファ（医療・慶弔・家電等 ≈ 1.5万/月） ─────
  // バッファは住居費以外の生活費にのみ乗せる
  monthlyExpense = monthlyExpense + MONTHLY_BUFFER;

  // ── 既存借入・固定返済（住宅ローン・車ローン・奨学金等） ──
  const existingLoans = Array.isArray(p.existingLoans) ? p.existingLoans : [];
  for (const loan of existingLoans) {
    const loanEndAge  = safeNum(loan.endAge, safeNum(p.currentAge, 30) + 5);
    const annualCost  = safeNum(loan.monthlyPayment, 0) * 12;
    if (annualCost <= 0) continue;
    for (let lAge = safeNum(p.currentAge, 30); lAge <= loanEndAge; lAge++) {
      extraLifeEvents.push({
        id:    `existing_loan_${loan.id}_${lAge}`,
        age:   lAge,
        label: `既存借入返済`,
        cost:  annualCost,
        icon:  '💳',
      });
    }
  }

  // ── 車の買替周期型コスト生成 ────────────────────────────────
  if (p.carOwnership && p.carFirstAge) {
    const carFirstAge    = safeNum(p.carFirstAge, safeNum(p.currentAge, 30) + 2);
    const carCycle       = safeNum(p.carReplaceCycle, 7);
    const carPrice       = safeNum(p.carPrice, 250);
    const retireAgeNum   = safeNum(p.retirementAge, 65);

    for (let buyAge = carFirstAge; buyAge <= retireAgeNum; buyAge += carCycle) {
      // selectedChoices で同じ年に上書きされた場合は除外（後で追加される）
      const choiceOverride = selectedChoices.find(
        (c) => c.eventId === `car_${buyAge}`
      );
      if (!choiceOverride) {
        extraLifeEvents.push({
          id:    `car_profile_${buyAge}`,
          age:   buyAge,
          label: '車の買替',
          cost:  carPrice,
          icon:  '🚗',
        });
      }
    }
  }

  // ── 住宅購入の追加コスト ────────────────────────────────────
  if (housingType !== 'rent') {
    const purchaseAgeNum = safeNum(p.housingPurchaseAge, 35);
    const lifespanNum    = safeNum(p.lifespan, 90);

    // 購入諸費用（登記・仲介料・不動産取得税等）
    const miscCostRateVal = safeNum(p.miscCostRate, 5) / 100;
    if (propertyPrice > 0) {
      extraLifeEvents.push({
        id:    'housing_misc_cost',
        age:   purchaseAgeNum,
        label: '住宅購入諸費用（登記・仲介・税金等）',
        cost:  Math.round(propertyPrice * miscCostRateVal),
        icon:  '🏠',
      });
    }

    // 年間維持費（管理費・修繕積立・固定資産税・駐車場）
    const managementFeeAnnual = safeNum(p.managementFee, 2.5) * 12;
    const propertyTaxAnnual   = safeNum(p.propertyTax,   15);
    const parkingFeeAnnual    = safeNum(p.parkingFee,    0) * 12;
    const housingMaintAnnual  = managementFeeAnnual + propertyTaxAnnual + parkingFeeAnnual;

    for (let mAge = purchaseAgeNum + 1; mAge <= lifespanNum; mAge++) {
      extraLifeEvents.push({
        id:    `housing_maint_${mAge}`,
        age:   mAge,
        label: '住宅維持費',
        cost:  housingMaintAnnual > 0 ? housingMaintAnnual : 20,
        icon:  '🔧',
      });
    }
  }

  return {
    // ── 基本 ──────────────────────────────────────────────
    currentAge:    safeNum(p.currentAge,    30),
    retirementAge: safeNum(p.retirementAge, 65),
    lifespan:      safeNum(p.lifespan,      90),

    // ── 家族 ──────────────────────────────────────────────
    hasSpouse,
    spouseAge,
    spouseIncome:             spouseIncomeNet,              // 手取りベース
    spouseIsWorking:          hasSpouse,
    spouseReturnToWorkAge:    safeNum(p.spouseReturnAge, spouseAge + 3),
    spouseReturnToWorkIncome: spouseIncomeNet,              // 手取りベース
    children,

    // ── 収入（手取りベース） ───────────────────────────────
    selfIncome:        selfIncomeNet,
    // ── 年金計算用グロス収入（厚生年金は額面で計算するため） ──
    selfIncomeGross:   safeNum(p.selfIncome, 0),       // 額面年収（万円/年）
    spouseIncomeGross: spouseIncGross,                  // 配偶者額面年収（万円/年）
    isSelfEmployed:    false,
    incomeGrowthRate:  safeNum(p.incomeGrowthRate, 1.5),
    idecoMonthly:      0,
    idecoTaxRate:      0.20,
    idecoReceiveTaxRate: 0,

    // ── 住居 ──────────────────────────────────────────────
    housingType,
    // monthlyRent: ユーザー入力の住居費（expHousing）を使用。
    // rent → 常に賃料として計上
    // future_purchase → 購入前のみ賃料として計上（simulation.js 側で購入年齢判定）
    monthlyRent: expHousingMonthly,
    propertyPrice,
    downPayment,
    mortgageRate:  safeNum(p.mortgageRate, HOUSING_DEFAULTS.mortgageRate),
    mortgageTerm:  safeNum(p.mortgageTerm, HOUSING_DEFAULTS.mortgageTerm),
    purchaseAge:   safeNum(p.housingPurchaseAge, 35),

    // ── 支出・資産 ────────────────────────────────────────
    monthlyExpense,                                           // バッファ込み
    retireMonthlyExpense: Math.round(monthlyExpense * 0.82), // 老後は18%減
    emergencyFund:        100,
    currentCash:          currentSavings,
    currentInvestment:    0,
    currentNisa:          0,
    currentIdeco:         0,

    // ── 投資（NISA 枠として扱う） ────────────────────────
    nisaMonthly:          monthlyInvestment,
    nisaCumContrib:       0,
    generalInvestMonthly: 0,

    // ── ライフイベント（一時費用 + 住宅維持費含む） ──────
    lifeEvents: extraLifeEvents,
  };
};

// ─────────────────────────────────────────────────────────────
// ⑧-d 判定根拠リスト（ResultScreen "スコアの根拠" カード向け）
//
// 安全要因・注意要因を 3〜6 件程度に絞って返す。
// 入力値・手取り計算・シミュレーション結果を横断的に評価。
// ─────────────────────────────────────────────────────────────
export const calcExplanationReasons = (profileData, simPartial, gaugeResult) => {
  const p  = profileData;
  const { collapseAge, summary, housingDetail } = simPartial;

  // 手取りベースの収支を再計算（gaugeCalc と同じロジック）
  const selfInc   = safeNum(p.selfIncome,  0);
  const spouseInc = safeNum(p.spouseIncome, 0);
  const netSelf   = selfInc   > 0 ? selfInc   * calcNetRatio(selfInc)   : 0;
  const netSpouse = spouseInc > 0 ? spouseInc * calcNetRatio(spouseInc) : 0;
  const totalNet  = netSelf + netSpouse;
  const expense   = safeNum(p.monthlyExpense, 20);
  const invest    = safeNum(p.monthlyInvestment, 0);
  const annualExp = (expense + MONTHLY_BUFFER) * 12;
  const annualInv = invest * 12;
  const surplus   = totalNet - annualExp - annualInv;
  const surplusRate = totalNet > 0 ? surplus / totalNet : -1;

  const savings         = safeNum(p.currentSavings, 0);
  const retirementAsset = summary?.retirementAsset ?? 0;
  const retireAge       = safeNum(p.retirementAge, 65);
  const emergencyMonths = expense > 0 ? savings / expense : 0;

  const reasons = [];

  // ── 安全要因 ──────────────────────────────────────────────
  if (surplusRate >= 0.25) {
    reasons.push({ type: 'safe', text: `手取りベースで年間${Math.round(surplus)}万円の黒字余力（手取り年収の${Math.round(surplusRate * 100)}%）` });
  } else if (surplusRate >= 0.05) {
    reasons.push({ type: 'safe', text: `手取りベースの年間収支が黒字（${Math.round(surplus)}万円）` });
  }

  if (emergencyMonths >= 6) {
    reasons.push({ type: 'safe', text: `現在の貯蓄が生活費の${Math.round(emergencyMonths)}ヶ月分以上ある` });
  } else if (emergencyMonths >= 3) {
    reasons.push({ type: 'safe', text: `現在の貯蓄が生活費の${Math.floor(emergencyMonths)}ヶ月分ある` });
  }

  if (invest > 0) {
    reasons.push({ type: 'safe', text: `毎月${invest}万円の積立投資習慣がある（長期複利効果）` });
  }

  if (retirementAsset >= 2000 && collapseAge === null) {
    reasons.push({ type: 'safe', text: `退職時に約${Math.round(retirementAsset / 100) * 100}万円の資産が見込める` });
  }

  if (
    housingDetail &&
    housingDetail.repaymentBurdenSeverity === 'ok' &&
    housingDetail.repaymentBurden != null
  ) {
    reasons.push({ type: 'safe', text: `住宅ローン返済負担率${Math.round(housingDetail.repaymentBurden)}%は適正水準（目安：25%以下）` });
  }

  // ── 注意要因 ──────────────────────────────────────────────
  if (surplus <= 0) {
    reasons.push({ type: 'warn', text: `手取りベースで年間収支がマイナス（${Math.round(Math.abs(surplus))}万円不足）` });
  } else if (surplusRate < 0.05) {
    reasons.push({ type: 'warn', text: `収支の黒字幅が薄い（手取り年収の${Math.round(surplusRate * 100)}%）—突発支出への余裕がない` });
  }

  if (emergencyMonths < 3 && expense > 0) {
    reasons.push({ type: 'warn', text: `貯蓄が生活費の3ヶ月未満（${Math.round(emergencyMonths * 10) / 10}ヶ月分）—緊急時のバッファが不足` });
  }

  if (collapseAge !== null) {
    if (collapseAge < retireAge) {
      reasons.push({ type: 'warn', text: `${collapseAge}歳で資産が枯渇する見通し—退職前に破綻リスクあり` });
    } else {
      reasons.push({ type: 'warn', text: `${collapseAge}歳で老後資産が尽きる見通し—支出の見直しが必要` });
    }
  }

  if (housingDetail) {
    if (housingDetail.minAssetPost5 !== null && housingDetail.minAssetPost5 < 200) {
      const v = Math.round(housingDetail.minAssetPost5);
      reasons.push({ type: 'warn', text: `住宅購入後5年間の最低資産が${v < 0 ? '赤字' : v + '万円'}—緊急資金が不足する時期がある` });
    }
    if (housingDetail.nearbyChildren.length > 0) {
      const c = housingDetail.nearbyChildren[0];
      reasons.push({ type: 'warn', text: `第${c.index}子の出産と住宅購入が${Math.abs(c.diff)}年差—2大支出が集中する` });
    }
    if (housingDetail.repaymentBurdenSeverity === 'danger') {
      reasons.push({ type: 'warn', text: `住宅ローン返済負担率${Math.round(housingDetail.repaymentBurden)}%は過重（25%超）—家計を強く圧迫` });
    } else if (housingDetail.repaymentBurdenSeverity === 'warn') {
      reasons.push({ type: 'warn', text: `住宅ローン返済負担率${Math.round(housingDetail.repaymentBurden)}%—20%超は家計圧迫の目安` });
    }
    if (housingDetail.spouseNotYetReturned) {
      reasons.push({ type: 'warn', text: `配偶者が復職前にローン返済が始まる—世帯収入が少ない時期のリスク` });
    }
  }

  if (retirementAsset < 0) {
    reasons.push({ type: 'warn', text: `退職時点で資産がマイナス（約${Math.round(retirementAsset)}万円）` });
  } else if (retirementAsset < 500) {
    reasons.push({ type: 'warn', text: `退職時の資産見込みが${Math.round(retirementAsset)}万円と少なく老後収支が厳しい` });
  }

  // ── 既存借入 ────────────────────────────────────────────
  const existingLoans = Array.isArray(p.existingLoans) ? p.existingLoans : [];
  if (existingLoans.length > 0) {
    const totalMonthly = existingLoans.reduce((sum, l) => sum + safeNum(l.monthlyPayment, 0), 0);
    const netMonthly   = totalNet / 12;
    const loanRatio    = netMonthly > 0 ? totalMonthly / netMonthly : 0;

    if (loanRatio > 0.25) {
      reasons.push({ type: 'warn', text: `既存借入の合計返済額が手取り月収の${Math.round(loanRatio * 100)}%—住宅ローン前から家計を圧迫している` });
    } else if (loanRatio > 0.15) {
      reasons.push({ type: 'warn', text: `既存借入（月${totalMonthly.toFixed(1)}万円）が新規ローン審査に影響する可能性がある` });
    }

    // 住宅購入と既存借入の重複
    const purchaseAge = safeNum(p.housingPurchaseAge, 0);
    if (purchaseAge > 0 && existingLoans.some(l => safeNum(l.endAge, 0) >= purchaseAge)) {
      reasons.push({ type: 'warn', text: `住宅購入時（${purchaseAge}歳）に既存借入の返済が残っている—住宅ローンとの二重返済期間がある` });
    }
  }

  // 安全3件・注意4件に絞る
  const safeList = reasons.filter((r) => r.type === 'safe').slice(0, 3);
  const warnList = reasons.filter((r) => r.type === 'warn').slice(0, 4);
  return [...safeList, ...warnList];
};

// ─────────────────────────────────────────────────────────────
// ② collapseAge 判定（資産枯渇年齢）
// ─────────────────────────────────────────────────────────────
/**
 * totalAssets が初めて 0 以下になる年齢を返す
 * 資産が回復せず最終的にマイナスの場合も含む
 * @param {object[]} rows
 * @returns {number | null}  破綻年齢 or null（破綻なし）
 */
export const calcCollapseAge = (rows) => {
  const row = rows.find((r) => r.totalAssets < 0);
  return row?.age ?? null;
};

// ─────────────────────────────────────────────────────────────
// ③ minAsset 判定（資産の谷）
// ─────────────────────────────────────────────────────────────
/**
 * 年次データの中で総資産が最小になる時点を返す
 * 子育て・住宅購入後の谷など、グラフのハイライトに使用
 * @param {object[]} rows
 * @returns {{ age: number, value: number }}
 */
export const calcMinAsset = (rows) => {
  let minVal = Infinity;
  let minAge = null;

  for (const row of rows) {
    if (row.totalAssets < minVal) {
      minVal = row.totalAssets;
      minAge = row.age;
    }
  }
  return { age: minAge, value: minVal };
};

// ─────────────────────────────────────────────────────────────
// ④ FIRE 年齢判定（4% ルール）
// ─────────────────────────────────────────────────────────────
/**
 * 「総資産 × 4% ≥ 年間支出」を初めて満たす年齢を FIRE 年齢とする
 * 退職前（retirementAge 以前）のみ判定
 * @param {object[]} rows
 * @param {object}   form  - profileToSimForm の戻り値
 * @returns {number | null}  FIRE 達成年齢 or null
 */
export const calcFIREAge = (rows, form) => {
  const annualExpense = safeNum(form.monthlyExpense, 20) * 12;
  const fireTarget    = annualExpense / FIRE_WITHDRAWAL_RATE;  // 支出の25倍

  const retireAge = safeNum(form.retirementAge, 65);

  for (const row of rows) {
    if (row.age >= retireAge) break;  // 退職後は不問
    if (row.totalAssets >= fireTarget) {
      return row.age;
    }
  }
  return null;
};

// ─────────────────────────────────────────────────────────────
// ⑤ 総合評価（Level 1〜4）
// ─────────────────────────────────────────────────────────────

/**
 * 評価レベル定義
 * Level 4: 🌳 とても安心
 * Level 3: 🌿 安心
 * Level 2: 🌱 少し不安
 * Level 1: 🍂 見直し必要
 */
export const EVAL_LEVELS = {
  4: {
    level:   4,
    icon:    '🌳',
    label:   'とても安心',
    color:   '#16a34a',
    bg:      '#f0fdf4',
    border:  '#bbf7d0',
    message: 'このペースを続ければ、豊かな老後を迎えられます。',
  },
  3: {
    level:   3,
    icon:    '🌿',
    label:   '安心',
    color:   '#2d9a5c',
    bg:      '#f0fdf4',
    border:  '#bbf7d0',
    message: '着実に積み上げています。投資を少し増やすとさらに安心です。',
  },
  2: {
    level:   2,
    icon:    '🌱',
    label:   '少し不安',
    color:   '#ca8a04',
    bg:      '#fefce8',
    border:  '#fde68a',
    message: '支出の見直しか投資増額で、大きく改善できます。',
  },
  1: {
    level:   1,
    icon:    '🍂',
    label:   '見直し必要',
    color:   '#dc2626',
    bg:      '#fef2f2',
    border:  '#fecaca',
    message: '収支バランスを早めに改善しましょう。まず支出から確認を。',
  },
};

/**
 * 年次データとサマリーから総合評価レベル（1〜4）を算出
 * @param {object[]} rows
 * @param {object}   summary  - calcSummaryStats の戻り値
 * @param {object}   form
 * @returns {1|2|3|4}
 */
export const calcOverallLevel = (rows, summary, form) => {
  const collapseAge  = calcCollapseAge(rows);
  const retireAsset  = summary.retirementAsset ?? 0;
  const retireAge    = safeNum(form.retirementAge, 65);
  const lifespan     = safeNum(form.lifespan,      90);

  // 退職前破綻 → Level 1
  if (collapseAge !== null && collapseAge < retireAge) return 1;

  // 老後破綻（退職後〜寿命以内） → Level 1
  if (collapseAge !== null && collapseAge <= lifespan) return 1;

  // 退職時資産が3,000万以上 → Level 4
  if (retireAsset >= 3000) return 4;

  // 退職時資産が1,000万以上 → Level 3
  if (retireAsset >= 1000) return 3;

  // 退職時資産が0以上（辛うじてプラス） → Level 2
  if (retireAsset >= 0) return 2;

  // 退職時にすでにマイナス → Level 1
  return 1;
};

// ─────────────────────────────────────────────────────────────
// ⑥ 危険ゾーン（グラフのマイナス区間）
// ─────────────────────────────────────────────────────────────
/**
 * totalAssets がマイナスになっている年齢区間を配列で返す
 * ResultScreen の折れ線グラフでマイナス部分を赤く塗るために使用
 * @param {object[]} rows
 * @returns {Array<{ startAge: number, endAge: number }>}
 */
export const calcDangerZones = (rows) => {
  const zones = [];
  let inDanger = false;
  let zoneStart = null;

  for (const row of rows) {
    if (row.totalAssets < 0 && !inDanger) {
      inDanger   = true;
      zoneStart  = row.age;
    } else if (row.totalAssets >= 0 && inDanger) {
      zones.push({ startAge: zoneStart, endAge: row.age });
      inDanger = false;
    }
  }
  // ループ終了時もマイナスのまま
  if (inDanger && zoneStart !== null) {
    zones.push({ startAge: zoneStart, endAge: rows[rows.length - 1].age });
  }

  return zones;
};

// ─────────────────────────────────────────────────────────────
// ⑦ 危険ポイントリスト（ResultScreen のコメント表示用）
// ─────────────────────────────────────────────────────────────
/**
 * 資産の谷・破綻・教育費ピークなど注意すべき年齢をまとめる
 * @param {object[]} rows
 * @param {object}   summary
 * @param {object}   form
 * @returns {Array<{ age: number, type: string, label: string, severity: 'danger'|'warn'|'info' }>}
 */
export const calcRiskPoints = (rows, summary, form) => {
  const points = [];
  const minA   = calcMinAsset(rows);
  const colAge = calcCollapseAge(rows);

  // 資産が最も少なくなる時点
  if (minA.age !== null && minA.value < 1000) {
    points.push({
      age:      minA.age,
      type:     'minAsset',
      label:    `${minA.age}歳: 資産の谷（${minA.value < 0 ? '赤字' : Math.round(minA.value).toLocaleString() + '万円'}）`,
      severity: minA.value < 0 ? 'danger' : 'warn',
    });
  }

  // 破綻年齢
  if (colAge !== null) {
    points.push({
      age:      colAge,
      type:     'collapse',
      label:    `${colAge}歳: 資産が枯渇`,
      severity: 'danger',
    });
  }

  // 教育費ピーク
  if (summary.peakEduAge) {
    points.push({
      age:      summary.peakEduAge,
      type:     'eduPeak',
      label:    `${summary.peakEduAge}歳: 教育費のピーク`,
      severity: 'info',
    });
  }

  return points.sort((a, b) => a.age - b.age);
};

// ─────────────────────────────────────────────────────────────
// ⑧ メイン: 全計算を実行して統合サマリーを返す
// ─────────────────────────────────────────────────────────────
/**
 * アプリ全体の「再計算」の唯一のエントリポイント。
 * イベント選択後・改善提案適用後など、どこからでもこれ1つを呼ぶ。
 *
 * @param {object}   profileData     - useAppStore の profileData
 * @param {object[]} selectedChoices - useAppStore の selectedChoices
 * @returns {{
 *   form:              object,      // simulation.js 互換フォーム
 *   rows:              object[],    // 年次データ（標準シナリオ）
 *   summary:           object,      // calcSummaryStats の結果
 *   collapseAge:       number|null, // 資産枯渇年齢（null = 破綻なし）
 *   minAsset:          object,      // { age, value } 最低資産ポイント
 *   fireAge:           number|null, // FIRE 達成年齢
 *   overallLevel:      1|2|3|4,    // 総合評価レベル
 *   evalInfo:          object,      // EVAL_LEVELS[overallLevel]
 *   dangerZones:       object[],    // グラフの赤区間
 *   riskPoints:        object[],    // 危険ポイントリスト
 *   gaugeResult:       object,      // calcInitialGauge の結果（住宅警告含む）
 *   safetySummary:     object,      // MVP 4指標をまとめたオブジェクト
 * }}
 */
export const runFullSimulation = (profileData, selectedChoices = []) => {
  // 1. フォーム変換
  const form = profileToSimForm(profileData, selectedChoices);

  // 2. 年次シミュレーション（標準シナリオ）
  const rows = runScenario(form, 'standard');

  // 3. サマリー統計
  const summary = calcSummaryStats(rows, form);

  // 4. 派生指標
  const collapseAge  = calcCollapseAge(rows);
  const minAsset     = calcMinAsset(rows);
  const fireAge      = calcFIREAge(rows, form);
  const overallLevel = calcOverallLevel(rows, summary, form);
  const dangerZones  = calcDangerZones(rows);
  const riskPoints   = calcRiskPoints(rows, summary, form);

  // 5. 生活余裕度ゲージ（住宅安全補正含む）
  const gaugeResult = calcInitialGauge(profileData);

  // 6. 住宅購入詳細分析
  const housingDetail = calcHousingDetail(rows, profileData);

  // 7. MVP 安全判定サマリー（ResultScreen 向け）
  const safetySummaryBase = calcSafetySummary(
    { collapseAge, minAsset, summary, overallLevel },
    gaugeResult,
    form,
    housingDetail,
  );

  // 8. 判定根拠リスト（"スコアの根拠" カード）
  const explanationReasons = calcExplanationReasons(
    profileData,
    { collapseAge, minAsset, summary, overallLevel, housingDetail },
    gaugeResult,
  );

  const safetySummary = { ...safetySummaryBase, explanationReasons };

  // 9. 年金情報（グロス収入ベースで計算・ResultScreen 表示用）
  const selfPensionInfo = estimatePension({
    annualIncome:   safeNum(profileData.selfIncome,   0),
    currentAge:     safeNum(profileData.currentAge,  30),
    retirementAge:  safeNum(profileData.retirementAge, 65),
    isSelfEmployed: false,
  });
  const spousePensionInfo = form.hasSpouse
    ? estimateSpousePension({
        spouseIncome:   safeNum(profileData.spouseIncome, 0),
        spouseAge:      form.spouseAge,
        retirementAge:  safeNum(profileData.retirementAge, 65),
        spouseIsWorking: safeNum(profileData.spouseIncome, 0) > 0,
        isSelfEmployed: false,
      })
    : { annual: 0, monthly: 0 };

  const pensionInfo = {
    selfAnnual:     selfPensionInfo.annual,
    spouseAnnual:   spousePensionInfo.annual,
    totalAnnual:    selfPensionInfo.annual + spousePensionInfo.annual,
    totalMonthly:   Math.round((selfPensionInfo.annual + spousePensionInfo.annual) / 12 * 10) / 10,
    startAge:       65,
  };

  // 10. 「年金なし」シミュレーション（グラフの比較表示用）
  const rowsNoPension = runScenario({ ...form, excludePension: true }, 'standard');

  // ── 将来拡張スロット ────────────────────────────────────────
  // TODO: 多軸スコア（収入安定性・支出余裕・資産成長・老後安全）
  // TODO: 破綻確率シミュレーション（モンテカルロ/パーセンタイル）
  // ────────────────────────────────────────────────────────────

  return {
    form,
    rows,
    rowsNoPension,
    summary,
    collapseAge,
    minAsset,
    fireAge,
    overallLevel,
    evalInfo:     EVAL_LEVELS[overallLevel],
    dangerZones,
    riskPoints,
    gaugeResult,
    housingDetail,
    safetySummary,
    pensionInfo,
  };
};

// ─────────────────────────────────────────────────────────────
// ⑧-b 住宅購入詳細分析（ResultScreen 住宅警戒UI向け）
//
// 年次データ（rows）とプロフィールから以下を算出:
//   1. 購入時点の資産残高
//   2. 購入後5年間の最低資産
//   3. 子ども予定と住宅購入の近接情報（具体的な年齢差）
//   4. 配偶者復職前ローン開始の有無
//   5. 頭金余力（現在貯蓄 vs 必要額）
// ─────────────────────────────────────────────────────────────
export const calcHousingDetail = (rows, profileData) => {
  const purchaseAge  = Number(profileData.housingPurchaseAge ?? 0);
  if (!purchaseAge) return null;

  const currentAge   = Number(profileData.currentAge   ?? 30);
  const savings      = Number(profileData.currentSavings ?? 0);
  const selfInc      = Number(profileData.selfIncome    ?? 0);
  const spouseInc    = Number(profileData.spouseIncome  ?? 0);
  const totalIncome  = selfInc + spouseInc;
  const spouseReturn = Number(profileData.spouseReturnAge ?? 0);
  const childAges    = profileData.childAges ?? [null, null, null, null];
  const numChildren  = Number(profileData.numChildren ?? 0);

  // ── ローン詳細計算 ────────────────────────────────────────
  const propertyPriceVal = safeNum(profileData.propertyPrice, 3500);
  // 頭金の上限は「購入年の前年末時点の総資産」を上限とする。
  // currentSavings でキャップすると将来貯める予定の頭金が反映されなくなる。
  // 購入年の rows は頭金支払い後なので前年の行を参照する。
  const prePurchaseRow   = rows.find((r) => r.age === purchaseAge - 1);
  const assetsBeforePurchase = prePurchaseRow?.totalAssets ?? savings;
  const downPaymentVal   = Math.min(
    Math.max(0, safeNum(profileData.downPayment, Math.round(propertyPriceVal * 0.10))),
    Math.max(0, assetsBeforePurchase),  // 購入前年の資産を上限に
  );
  const loanAmount       = Math.max(0, propertyPriceVal - downPaymentVal);
  const mortgageRateVal  = safeNum(profileData.mortgageRate, HOUSING_DEFAULTS.mortgageRate);
  const mortgageTermVal  = safeNum(profileData.mortgageTerm, HOUSING_DEFAULTS.mortgageTerm);
  const monthlyPayment   = calcMonthlyPayment(loanAmount, mortgageRateVal, mortgageTermVal);

  // 返済負担率（月返済 ÷ 月収入）
  const monthlyIncome       = totalIncome / 12;
  const repaymentBurden     = monthlyIncome > 0
    ? Math.round((monthlyPayment / monthlyIncome) * 1000) / 10   // 小数第1位まで
    : null;
  const repaymentBurdenSeverity =
    repaymentBurden === null  ? 'unknown' :
    repaymentBurden > 25      ? 'danger'  :
    repaymentBurden > 20      ? 'warn'    : 'ok';

  // ① 購入時点の資産残高（rows から / 頭金支払い後）
  const purchaseRow       = rows.find((r) => r.age === purchaseAge);
  const savingsAtPurchase = purchaseRow?.totalAssets ?? null;

  // ② 購入後5年間の最低資産ライン
  const post5Rows     = rows.filter((r) => r.age > purchaseAge && r.age <= purchaseAge + 5);
  const minAssetPost5 = post5Rows.length > 0
    ? Math.min(...post5Rows.map((r) => r.totalAssets))
    : null;

  // ③ 頭金余力（購入前年の資産 vs 物件価格の10%）
  const downPaymentTarget    = Math.round(propertyPriceVal * 0.10);
  const hasDownPayment       = assetsBeforePurchase >= downPaymentTarget;
  const downPaymentShortfall = hasDownPayment ? 0 : downPaymentTarget - assetsBeforePurchase;

  // ④ 子ども予定と住宅購入の近接（将来出産予定のみ・±3年以内）
  const nearbyChildren = [];
  for (let i = 0; i < Math.min(numChildren, childAges.length); i++) {
    const age = childAges[i];
    if (age === null) continue;
    const a = Number(age);
    if (a <= currentAge) continue;  // すでに生まれている
    const diff = a - purchaseAge;
    if (Math.abs(diff) <= 3) {
      nearbyChildren.push({
        index:    i + 1,          // 第1子・第2子…
        birthAge: a,              // 親の出産予定年齢
        diff,                     // 負 = 子が先・正 = 住宅が先
      });
    }
  }

  // ⑤ 配偶者復職前ローン開始
  const spouseNotYetReturned = spouseReturn > 0 && spouseReturn > purchaseAge;

  // ⑥ 既存借入との重複（購入時点に残っている既存ローンの月返済合計）
  const existingLoans = Array.isArray(profileData.existingLoans) ? profileData.existingLoans : [];
  const existingLoanOverlapAmt = existingLoans.reduce((sum, l) => {
    const rem = Number(l.remainingMonths ?? 0);
    const yearsUntilPurchase = Math.max(0, purchaseAge - currentAge);
    if (rem > yearsUntilPurchase * 12) return sum + (Number(l.monthlyPayment) || 0);
    return sum;
  }, 0);
  const existingLoanOverlap = existingLoanOverlapAmt > 0 ? existingLoanOverlapAmt : null;

  // ⑦ 教育費イベントとの近接（購入±3年以内に大学・高校入学がある子ども）
  const CHILD_ORD_SIM = ['第1子', '第2子', '第3子', '第4子'];
  const nearbyEducation = [];
  for (let i = 0; i < Math.min(numChildren, childAges.length); i++) {
    const ba = childAges[i];
    if (!ba) continue;
    const edEvents = [
      { age: Number(ba) + 15, label: `${CHILD_ORD_SIM[i] ?? `第${i+1}子`}高校入学` },
      { age: Number(ba) + 18, label: `${CHILD_ORD_SIM[i] ?? `第${i+1}子`}大学入学` },
    ];
    for (const ev of edEvents) {
      if (Math.abs(ev.age - purchaseAge) <= 3) nearbyEducation.push(ev);
    }
  }

  return {
    purchaseAge,
    // ローン詳細
    propertyPrice:    propertyPriceVal,   // 想定住宅価格（万円）
    downPaymentInput: downPaymentVal,     // 頭金（万円）
    loanAmount,                           // 借入額（万円）
    mortgageRate:     mortgageRateVal,    // 金利（%）
    mortgageTerm:     mortgageTermVal,    // 借入年数
    monthlyPayment,                       // 月返済額（万円/月）
    repaymentBurden,                      // 返済負担率（%）
    repaymentBurdenSeverity,              // 'ok' | 'warn' | 'danger' | 'unknown'
    // 資産状況
    savingsAtPurchase,          // 頭金支払い後の資産残高（rows から）
    minAssetPost5,              // 購入後5年の最低資産（万円）
    savings,                    // 現在貯蓄
    downPaymentTarget,          // 推奨頭金（年収×20%）
    hasDownPayment,             // 頭金余力あり？
    downPaymentShortfall,       // 不足額（万円）
    // 近接リスク
    nearbyChildren,             // [{index, birthAge, diff}]
    spouseNotYetReturned,       // 配偶者が購入時に未復職
    spouseReturnAge: spouseReturn,
    existingLoanOverlap,        // 購入時点に残る既存借入月返済合計（万円/月）、なければ null
    nearbyEducation,            // [{age, label}] 購入±3年以内の高校/大学入学
  };
};

// ─────────────────────────────────────────────────────────────
// ⑧-c MVP 安全判定サマリー（ResultScreen 向け）
//
// 以下の 4 指標を 1 オブジェクトにまとめる:
//   1. 生活余裕度ゲージ  (gauge / status / message)
//   2. 資金ショート年齢  (collapseAge)
//   3. 最低資産年齢/額  (minAsset)
//   4. 住宅購入リスク   (housingRiskReasons)
//
// 将来的に「多軸スコア」や「破綻確率」を追加する場合は
// このオブジェクトに新フィールドを追加するだけで ResultScreen 側が対応できる。
// ─────────────────────────────────────────────────────────────
export const calcSafetySummary = (simPartial, gaugeResult, form, housingDetail = null) => {
  const { collapseAge, minAsset, summary, overallLevel } = simPartial;
  const retireAge = safeNum(form.retirementAge, 65);
  const lifespan  = safeNum(form.lifespan,      90);

  // ① 資金ショート判定
  const isCollapsed       = collapseAge !== null;
  const isCollapsedBefore = isCollapsed && collapseAge < retireAge;
  const isCollapsedAfter  = isCollapsed && collapseAge >= retireAge && collapseAge <= lifespan;

  // ② 最低資産の深刻度
  const minAssetSeverity =
    minAsset.value < 0    ? 'danger' :
    minAsset.value < 200  ? 'warn'   : 'ok';

  // ③ 住宅リスク（ペナルティ理由 + 詳細分析を統合）
  const housingPenalty     = gaugeResult.housingPenalty     ?? 0;
  const housingRiskReasons = gaugeResult.housingRiskReasons ?? [];

  return {
    // 家計安全度（2層構造）
    gauge:          gaugeResult.gauge,          // 後方互換（adjustedGauge と同値）
    baseGauge:      gaugeResult.baseGauge,      // ベーススコア（補正前）
    adjustedGauge:  gaugeResult.adjustedGauge,  // イベント反映後スコア
    corrections:    gaugeResult.corrections,    // 補正ブレイクダウン配列
    dampedTotal:    gaugeResult.dampedTotal,    // 合計補正点
    status:         gaugeResult.status,
    message:        gaugeResult.message,
    color:          gaugeResult.color,

    // 資金ショート
    collapseAge,
    isCollapsed,
    isCollapsedBefore,
    isCollapsedAfter,

    // 最低資産
    minAsset,
    minAssetSeverity,

    // 老後資産
    retirementAsset: summary.retirementAsset ?? 0,

    // 住宅購入（ペナルティ概要・後方互換）
    housingPenalty,
    housingRiskReasons,
    hasHousingRisk:  housingRiskReasons.length > 0,

    // 住宅購入（詳細分析）— calcHousingDetail() の結果をそのまま格納
    housingDetail,

    // 総合評価（後方互換）
    overallLevel,
  };
};

// ─────────────────────────────────────────────────────────────
// ⑨ 簡易ゲージ向け中間計算（SimulationScreen の年次更新用）
// ─────────────────────────────────────────────────────────────
/**
 * 現在年齢時点の資産と当年の cashflow を返す（軽量版）
 * SimulationScreen での「今年の収支」表示に使用
 *
 * @param {object[]} rows
 * @param {number}   age
 * @returns {object | null}  該当年の row or null
 */
export const getRowAtAge = (rows, age) =>
  rows.find((r) => r.age === age) ?? null;

// ─────────────────────────────────────────────────────────────
// ⑩ 改善提案適用後の差分計算（ImprovementCard 用）
// ─────────────────────────────────────────────────────────────
/**
 * 改善案を適用したときに老後資産・破綻リスクがどう変わるかを返す
 * ConfirmModal の「適用したらこうなる」表示に使用
 *
 * @param {object}   profileData
 * @param {object[]} selectedChoices
 * @param {object}   improvement  - { type, delta } 改善内容
 * @returns {{ before: object, after: object, diff: object }}
 */
export const calcImprovementDiff = (profileData, selectedChoices, improvement) => {
  const before = runFullSimulation(profileData, selectedChoices);

  // 改善案をプロフィールに適用
  const improvedProfile = applyImprovement(profileData, improvement);
  const after = runFullSimulation(improvedProfile, selectedChoices);

  return {
    before: {
      retirementAsset: before.summary.retirementAsset,
      collapseAge:     before.collapseAge,
      overallLevel:    before.overallLevel,
    },
    after: {
      retirementAsset: after.summary.retirementAsset,
      collapseAge:     after.collapseAge,
      overallLevel:    after.overallLevel,
    },
    diff: {
      retirementAssetDelta: after.summary.retirementAsset - before.summary.retirementAsset,
      collapseSafetyGained: before.collapseAge !== null && after.collapseAge === null,
      levelChanged:         after.overallLevel !== before.overallLevel,
    },
    improvedProfile,
  };
};

/**
 * 改善案をプロフィールに反映する（非破壊）
 * @param {object} profile
 * @param {object} improvement - ImprovementCard.jsx で定義する改善内容
 * @returns {object} 新しいプロフィール
 */
export const applyImprovement = (profile, improvement) => {
  const p = { ...profile };

  switch (improvement.type) {
    case 'reduceExpense':
      p.monthlyExpense = Math.max(0, p.monthlyExpense - improvement.delta);
      break;
    case 'increaseInvestment':
      p.monthlyInvestment = p.monthlyInvestment + improvement.delta;
      break;
    case 'delayHousing':
      if (p.housingPurchaseAge) {
        p.housingPurchaseAge = p.housingPurchaseAge + improvement.delta;
      }
      break;
    case 'increaseSideIncome':
      p.selfIncome = p.selfIncome + improvement.delta;
      break;
    case 'reduceSavings':
      // 投資に振り替え（生活余裕度は短期下がるが長期上がる）
      p.monthlyInvestment = p.monthlyInvestment + improvement.delta;
      break;
    default:
      break;
  }

  return p;
};
