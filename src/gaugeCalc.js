// src/gaugeCalc.js
// 生活余裕度ゲージ算出ロジック
// 【コンセプト】「家計の優秀さ」ではなく「将来イベント耐性」「ローン安全度」を評価する

// ─────────────────────────────────────────────────────────────
// 年収 → 手取り率（所得税 + 社会保険の概算）
// 日本の会社員ベース（健康保険・厚生年金・雇用保険・所得税・住民税）
// ─────────────────────────────────────────────────────────────
export const calcNetRatio = (grossAnnual) => {
  if (grossAnnual <= 200) return 0.88;   // 〜200万：社会保険のみ低税率
  if (grossAnnual <= 400) return 0.83;   // 200-400万：一般的なパート〜正社員
  if (grossAnnual <= 600) return 0.79;   // 400-600万：中間層
  if (grossAnnual <= 800) return 0.76;   // 600-800万：課税強化帯
  if (grossAnnual <= 1200) return 0.72;  // 800-1200万：高所得
  return 0.67;                            // 1200万超：最高税率帯
};

// 毎月の臨時支出バッファ（医療・慶弔・家電買い替え・修理等）
export const MONTHLY_BUFFER = 1.5;  // 万円/月

// ─────────────────────────────────────────────────────────────
// surplusRate → ゲージ値テーブル（厳しめ基準）
// surplus     = 手取り年収 - (月支出×12 + バッファ×12 + 月投資×12)
// surplusRate = surplus / 手取り年収
//
// 余剰率 40%以上 → 85（安全圏上限）
// 余剰率 25%以上 → 72（比較的安全）
// 余剰率 10%以上 → 55（慎重判断中央）
// 余剰率  2%以上 → 38（要見直し中央）
// 余剰率 -10%以上 → 20（高リスク）
// それ以下       →  8（高リスク・深刻）
// ─────────────────────────────────────────────────────────────
const SURPLUS_TO_GAUGE = [
  { minRate:  0.40, gauge: 85 },
  { minRate:  0.25, gauge: 72 },
  { minRate:  0.10, gauge: 55 },
  { minRate:  0.02, gauge: 38 },
  { minRate: -0.10, gauge: 20 },
  { minRate: -Infinity, gauge: 8 },
];

// ─────────────────────────────────────────────────────────────
// ゲージ → 表示メッセージ（5ゾーン・前向きすぎない表現）
// ─────────────────────────────────────────────────────────────
export const gaugeToMessage = (gauge) => {
  if (gauge >= 85) return '収支・貯蓄ともに安定しています。このペースを維持しましょう';
  if (gauge >= 70) return '概ね安定しています。住宅・教育費など大型イベント前に再確認を';
  if (gauge >= 50) return '収支の余裕に課題があります。支出か積立の見直しを検討してください';
  if (gauge >= 30) return '家計バランスの改善が必要です。まず支出から見直しましょう';
  return '収支の改善が急務です。家計全体を見直してください';
};

// ─────────────────────────────────────────────────────────────
// ゲージ → アクセントカラー（70 / 50 境界）
// ─────────────────────────────────────────────────────────────
export const gaugeToColor = (gauge) => {
  if (gauge >= 80) return '#16a34a';  // 緑：安全圏・比較的安全（上位）
  if (gauge >= 70) return '#65a30d';  // 黄緑：比較的安全（70台）
  if (gauge >= 50) return '#f59e0b';  // オレンジ：慎重判断
  return '#ef4444';                   // 赤：要見直し・高リスク
};

// ─────────────────────────────────────────────────────────────
// ゲージ → ゲージ背景グラデーション（トラック用）
// ─────────────────────────────────────────────────────────────
export const gaugeToGradient = (gauge) => {
  if (gauge >= 80) return 'linear-gradient(90deg, #bbf7d0, #22c55e)';
  if (gauge >= 70) return 'linear-gradient(90deg, #d9f99d, #84cc16)';
  if (gauge >= 50) return 'linear-gradient(90deg, #fef9c3, #f59e0b)';
  return 'linear-gradient(90deg, #fee2e2, #ef4444)';
};

// ─────────────────────────────────────────────────────────────
// ゲージ → 木レベル（1〜4）— 厳しめ設定
// Level 4: gauge >= 90  本当に盤石（イベントボーナスが必要）
// Level 3: gauge >= 70  比較的安全（健康的な木）
// Level 2: gauge >= 40  慎重〜要見直し（やや不安）
// Level 1: gauge <  40  高リスク（細い・くすんだ木）
// ─────────────────────────────────────────────────────────────
export const gaugeToTreeLevel = (gauge) => {
  if (gauge >= 90) return 4;  // 盤石（シミュレーション中のイベントボーナスが必要）
  if (gauge >= 70) return 3;  // 比較的安全
  if (gauge >= 40) return 2;  // 慎重〜要見直し
  return 1;                   // 高リスク
};

// ─────────────────────────────────────────────────────────────
// ゲージ → ステータスラベル（5ゾーン: 85 / 70 / 50 / 30 境界）
// ─────────────────────────────────────────────────────────────
export const gaugeToStatus = (gauge) => {
  if (gauge >= 85) return { label: '安全圏',  color: '#16a34a', bg: '#f0fdf4' };
  if (gauge >= 70) return { label: '概ね安定', color: '#65a30d', bg: '#f7fee7' };
  if (gauge >= 50) return { label: '要注意',  color: '#d97706', bg: '#fffbeb' };
  if (gauge >= 30) return { label: '要見直し', color: '#dc2626', bg: '#fef2f2' };
  return               { label: '要見直し',  color: '#991b1b', bg: '#fff1f2' };
};

// ─────────────────────────────────────────────────────────────
// 住宅購入安全補正（ペナルティ）
//
// housingPurchaseAge が現在〜5年以内に迫っている場合に
// リスク要因をチェックして減点する。
//
// リスク要因：
//   ① 貯蓄が薄い（currentSavings < 200万）            → -8
//   ② 子ども予定が住宅購入と近い（±3年以内）          → -7
//   ③ 配偶者が購入時点でまだ復職前                     → -6
//   ④ 頭金余力が乏しい（貯蓄 < 年収×0.20）            → -5
// ─────────────────────────────────────────────────────────────
const calcHousingPenalty = (profile) => {
  const purchaseAge = Number(profile.housingPurchaseAge ?? 0);
  const currentAge  = Number(profile.currentAge ?? 30);

  // 購入予定なし、または5年超先 → ペナルティなし
  if (!purchaseAge || purchaseAge <= currentAge || purchaseAge - currentAge > 5) {
    return { penalty: 0, reasons: [] };
  }

  const savings      = Number(profile.currentSavings    ?? 0);
  const selfInc      = Number(profile.selfIncome         ?? 0);
  const spouseInc    = Number(profile.spouseIncome       ?? 0);
  const totalIncome  = selfInc + spouseInc;
  const spouseReturn = Number(profile.spouseReturnAge    ?? 0);
  const childAges    = profile.childAges ?? [null, null, null, null];

  let penalty = 0;
  const reasons = [];

  // ① 貯蓄が薄い（200万未満）
  if (savings < 200) {
    penalty += 8;
    reasons.push('貯蓄が薄い');
  }

  // ② 子ども予定が住宅購入と近い（将来出産予定 ±3年以内）
  const hasFutureChildNearPurchase = childAges.some((age) => {
    if (age === null) return false;
    const a = Number(age);
    return a > currentAge && Math.abs(a - purchaseAge) <= 3;
  });
  if (hasFutureChildNearPurchase) {
    penalty += 7;
    reasons.push('子ども予定と住宅購入が近い');
  }

  // ③ 配偶者が購入時点でまだ復職前
  if (spouseReturn > 0 && spouseReturn > purchaseAge && spouseInc === 0) {
    penalty += 6;
    reasons.push('配偶者が購入時に復職前');
  }

  // ④ 頭金余力が乏しい（貯蓄 < 物件価格の10%）
  // 旧式: 年収×0.20 は低年収者に過度に緩い基準だったため物件価格ベースに修正
  const propPrice = Number(profile.propertyPrice ?? 3500);
  const minReqDown = Math.round(propPrice * 0.10);
  if (savings < minReqDown) {
    penalty += 5;
    reasons.push('頭金余力が乏しい');
  }

  return { penalty, reasons };
};

// ─────────────────────────────────────────────────────────────
// プロフィールから初期生活余裕度ゲージを算出
// ─────────────────────────────────────────────────────────────
/**
 * @param {object} profile
 * @param {number} profile.selfIncome          - 本人年収（万円/年）
 * @param {number} [profile.spouseIncome]      - 配偶者年収（万円/年、0 = なし）
 * @param {number} profile.monthlyExpense      - 月生活費（万円/月）
 * @param {number} profile.monthlyInvestment   - 月投資額（万円/月）
 * @param {number} [profile.currentAge]        - 現在年齢
 * @param {number} [profile.currentSavings]    - 現在の貯蓄（万円）
 * @param {number} [profile.housingPurchaseAge]- 住宅購入予定年齢（null = なし）
 * @param {number[]} [profile.childAges]       - 子ども出生年齢配列
 * @param {number} [profile.spouseReturnAge]   - 配偶者復職予定年齢
 * @returns {{
 *   gauge: number,
 *   surplus: number,
 *   surplusRatePct: number,
 *   message: string,
 *   color: string,
 *   treeLevel: number,
 *   housingPenalty: number,
 *   housingRiskReasons: string[]
 * }}
 */
// ─────────────────────────────────────────────────────────────
// 住宅ローン月返済の簡易計算（gaugeCalc 内専用）
// ─────────────────────────────────────────────────────────────
const _estMonthlyPayment = (loan, annualRatePct, termYears) => {
  if (loan <= 0 || termYears <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return loan / (termYears * 12);
  const n = termYears * 12;
  return loan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};

// ─────────────────────────────────────────────────────────────
// 家計安全度スコアの補正内訳を計算
//
// 返り値:
//   corrections = [{ key, label, icon, pts, items[] }]
//   dampedTotal = 減衰後の合計補正点
// ─────────────────────────────────────────────────────────────
export const calcScoreCorrections = (profile) => {
  const selfInc   = Number(profile.selfIncome   ?? 0);
  const spouseInc = Number(profile.spouseIncome ?? 0);
  const totalNet  = (selfInc   > 0 ? selfInc   * calcNetRatio(selfInc)   : 0)
                  + (spouseInc > 0 ? spouseInc * calcNetRatio(spouseInc) : 0);
  const monthlyNet = totalNet / 12;
  const currentAge = Number(profile.currentAge ?? 30);
  const savings    = Number(profile.currentSavings ?? 0);
  const existingLoans = Array.isArray(profile.existingLoans) ? profile.existingLoans : [];

  // ① 住宅購入補正（max 15点）
  let housingPts = 0;
  const housingItems = [];
  const purchaseAge = Number(profile.housingPurchaseAge ?? 0);
  if (purchaseAge > currentAge) {
    const yearsUntil = purchaseAge - currentAge;
    const propPrice  = Number(profile.propertyPrice ?? 3500);
    const downPay    = Number(profile.downPayment   ?? Math.round(propPrice * 0.10));
    const loan       = Math.max(0, propPrice - downPay);
    const mp         = _estMonthlyPayment(loan, Number(profile.mortgageRate ?? 1.5), Number(profile.mortgageTerm ?? 35));
    const burden     = monthlyNet > 0 ? (mp / monthlyNet * 100) : 0;

    // 近接リスク（購入が迫っているほど高リスク）
    if (yearsUntil <= 2) {
      housingPts += 6; housingItems.push(`購入まで${yearsUntil}年と近い`);
    } else if (yearsUntil <= 5) {
      housingPts += 3; housingItems.push(`購入まで${yearsUntil}年`);
    }
    // 返済負担率
    if (burden > 30) {
      housingPts += 5; housingItems.push(`返済負担率 ${Math.round(burden)}%（目安25%超）`);
    } else if (burden > 20) {
      housingPts += 2; housingItems.push(`返済負担率 ${Math.round(burden)}%（やや高め）`);
    }
    // 頭金不足
    if (savings < propPrice * 0.10) {
      housingPts += 3; housingItems.push('頭金の準備が不足');
    }
    // 育児費との重複
    const childAges = profile.childAges ?? [];
    if (childAges.some(a => a !== null && Number(a) > currentAge && Math.abs(Number(a) - purchaseAge) <= 3)) {
      housingPts += 3; housingItems.push('育児費と購入時期が重なる');
    }
    // 配偶者復職前
    const srAge = Number(profile.spouseReturnAge ?? 0);
    if (srAge > 0 && srAge > purchaseAge && spouseInc === 0) {
      housingPts += 2; housingItems.push('配偶者が購入時に復職前');
    }
  }
  housingPts = Math.min(housingPts, 15);

  // ② 教育費補正（max 10点）
  let educationPts = 0;
  const educationItems = [];
  const childAgeArr   = profile.childAges ?? [];
  const futureKids    = childAgeArr.filter(a => a !== null && Number(a) >= currentAge);
  if (futureKids.length >= 3) {
    educationPts = 10; educationItems.push(`子ども${futureKids.length}人分の教育費が集中`);
  } else if (futureKids.length === 2) {
    educationPts = 6;  educationItems.push('子ども2人分の教育費ピークがある');
  } else if (futureKids.length === 1) {
    educationPts = 3;  educationItems.push('教育費のピーク期がある');
  }
  educationPts = Math.min(educationPts, 10);

  // ③ 車関連補正（max 5点）
  let carPts = 0;
  const carItems = [];
  if (profile.carPaymentType === 'loan') {
    carPts += 3; carItems.push('車ローン返済予定');
  }
  const carLoans = existingLoans.filter(l => /車|カー|自動車|car/i.test(l.label ?? ''));
  if (carLoans.length > 0) {
    const carMonthly = carLoans.reduce((s, l) => s + (Number(l.monthlyPayment) || 0) / 10, 0); // 千円→万円
    carPts += carMonthly > 3 ? 3 : 1;
    carItems.push(`車ローン残 ${Math.round(carMonthly)}万円/月`);
  }
  carPts = Math.min(carPts, 5);

  // ④ 既存借入補正（max 8点）
  let loanPts = 0;
  const loanItems = [];
  const totalMonthlyLoan = existingLoans.reduce((s, l) => s + (Number(l.monthlyPayment) || 0) / 10, 0); // 千円→万円
  if (monthlyNet > 0 && totalMonthlyLoan > 0) {
    const loanBurden = totalMonthlyLoan / monthlyNet * 100;
    if (loanBurden > 20) {
      loanPts = 8; loanItems.push(`返済負担率 ${Math.round(loanBurden)}%（高い）`);
    } else if (loanBurden > 10) {
      loanPts = 4; loanItems.push(`返済負担率 ${Math.round(loanBurden)}%`);
    } else {
      loanPts = 2; loanItems.push(`既存借入を返済中`);
    }
  }
  loanPts = Math.min(loanPts, 8);

  const rawTotal = housingPts + educationPts + carPts + loanPts;
  // 複数補正が重なる場合の減衰（重いほど減衰が大きい）
  const dampFactor = rawTotal > 20 ? 0.78 : rawTotal > 14 ? 0.88 : 1.0;
  const dampedTotal = Math.round(rawTotal * dampFactor);

  const corrections = [
    { key: 'housing',   label: '住宅購入補正', icon: '🏠', pts: housingPts,   items: housingItems   },
    { key: 'education', label: '教育費補正',   icon: '🎓', pts: educationPts, items: educationItems },
    { key: 'car',       label: '車関連補正',   icon: '🚗', pts: carPts,       items: carItems       },
    { key: 'loan',      label: '既存借入補正', icon: '💴', pts: loanPts,      items: loanItems      },
  ].filter(c => c.pts > 0);

  return { corrections, rawTotal, dampedTotal };
};

export const calcInitialGauge = (profile) => {
  const selfInc   = Number(profile.selfIncome       ?? 0);
  const spouseInc = Number(profile.spouseIncome      ?? 0);
  const expense   = Number(profile.monthlyExpense    ?? 0);
  const invest    = Number(profile.monthlyInvestment ?? 0);

  // 手取りベース変換（所得税 + 社会保険の概算控除）
  const netSelf        = selfInc   > 0 ? selfInc   * calcNetRatio(selfInc)   : 0;
  const netSpouse      = spouseInc > 0 ? spouseInc * calcNetRatio(spouseInc) : 0;
  const totalNetIncome = netSelf + netSpouse;

  // 既存借入の月返済合計（endAge を過ぎた借入は除外）
  const existingLoans    = Array.isArray(profile.existingLoans) ? profile.existingLoans : [];
  const currentAge_      = Number(profile.currentAge ?? 30);
  const monthlyLoanRepay = existingLoans.reduce((sum, l) => {
    const endAge = Number(l.endAge ?? 0);
    // endAge が未設定(0) または現在年齢より大きい場合のみ加算（まだ返済中）
    if (endAge <= 0 || endAge > currentAge_) return sum + (Number(l.monthlyPayment) || 0) / 10; // 千円→万円
    return sum;
  }, 0);

  // 支出は手取りベースで評価（臨時支出バッファ + 既存借入を加算）
  const annualExpense    = (expense + MONTHLY_BUFFER + monthlyLoanRepay) * 12;
  const annualInvestment = invest * 12;
  const surplus          = totalNetIncome - annualExpense - annualInvestment;

  // 手取り年収ゼロ対策（surplusRate は手取り年収ベース）
  const surplusRate = totalNetIncome > 0 ? surplus / totalNetIncome : -1;

  // ── ベーススコア（余剰率のみ、補正なし） ──────────────────
  let cfBaseGauge = 8;
  for (const row of SURPLUS_TO_GAUGE) {
    if (surplusRate >= row.minRate) { cfBaseGauge = row.gauge; break; }
  }

  // ── 各種補正（住宅・教育費・車・借入）──────────────────────
  const { corrections, dampedTotal } = calcScoreCorrections(profile);

  // ── イベント反映後スコア（減衰済み補正を適用） ────────────
  const adjustedGauge = Math.max(0, Math.min(100, cfBaseGauge - dampedTotal));

  // ── 後方互換フィールド ──────────────────────────────────────
  const housingCorr = corrections.find(c => c.key === 'housing');

  return {
    gauge:              adjustedGauge,            // 後方互換（調整後を返す）
    baseGauge:          cfBaseGauge,              // ベーススコア（補正前）
    adjustedGauge,                                // イベント反映後スコア
    corrections,                                  // 補正ブレイクダウン配列
    dampedTotal,                                  // 合計補正点（減衰済み）
    surplus:            Math.round(surplus),
    surplusRatePct:     Math.round(surplusRate * 1000) / 10,
    message:            gaugeToMessage(adjustedGauge),
    color:              gaugeToColor(adjustedGauge),
    gradient:           gaugeToGradient(adjustedGauge),
    treeLevel:          gaugeToTreeLevel(adjustedGauge),
    status:             gaugeToStatus(adjustedGauge),
    housingPenalty:     dampedTotal,              // 後方互換
    housingRiskReasons: housingCorr?.items ?? [], // 後方互換
  };
};

// ─────────────────────────────────────────────────────────────
// 年次シミュレーション行からその時点のゲージを動的計算
//
// simRow: { totalIncome, totalExpense, totalAssets,
//           nisaContrib, idecoContrib, generalContrib, downCost }（年間万円）
//
// 採点ロジック:
//   ① 構造的収支余剰率（投資積立・頭金を除く実生活費ベース）→ ベーススコア
//   ② 生活防衛資金（資産÷月構造支出）→ ボーナス/ペナルティ
//      - マイナス資産: -30
//      - 3ヶ月未満:   -15
//      - 6ヶ月未満:    -8
//      - 6ヶ月以上:    +3
//      - 12ヶ月以上:  +10
//      - 24ヶ月以上:  +18
//      - 36ヶ月以上:  +25
// ─────────────────────────────────────────────────────────────
export const calcDynamicGaugeFromRow = (simRow) => {
  if (!simRow) return null;

  const totalIncome  = Number(simRow.totalIncome  ?? 0);
  const totalExpense = Number(simRow.totalExpense  ?? 0);
  const totalAssets  = Number(simRow.totalAssets   ?? 0);

  // 投資積立・頭金は資産移転（支出ではない）→ 除外して実生活費を計算
  const investContrib = Number(simRow.nisaContrib    ?? 0)
                      + Number(simRow.idecoContrib   ?? 0)
                      + Number(simRow.generalContrib ?? 0);
  const downCost      = Number(simRow.downCost ?? 0);
  const structuralExp = Math.max(0, totalExpense - investContrib - downCost);

  // ① 構造的収支余剰率 → ベーススコア
  const surplus     = totalIncome - structuralExp;
  const surplusRate = totalIncome > 0 ? surplus / totalIncome : -1;

  let baseGauge = 6;
  for (const row of SURPLUS_TO_GAUGE) {
    if (surplusRate >= row.minRate) { baseGauge = row.gauge; break; }
  }
  // -10%〜-25% の中間ゾーン（一時的な収入減などで生じやすい）
  if (surplusRate < -0.10 && surplusRate >= -0.25) baseGauge = 14;

  // ② 生活防衛資金（構造的月支出の何ヶ月分を資産で賄えるか）
  const monthlyExp      = structuralExp > 0 ? structuralExp / 12 : 1;
  const emergencyMonths = totalAssets / monthlyExp;

  let assetAdj = 0;
  if (totalAssets < 0) {
    assetAdj = -30;
  } else if (emergencyMonths >= 36) {
    assetAdj = +25;
  } else if (emergencyMonths >= 24) {
    assetAdj = +18;
  } else if (emergencyMonths >= 12) {
    assetAdj = +10;
  } else if (emergencyMonths >= 6) {
    assetAdj = +3;
  } else if (emergencyMonths < 3) {
    assetAdj = -15;
  } else if (emergencyMonths < 6) {
    assetAdj = -8;
  }

  const gauge = Math.max(0, Math.min(100, Math.round(baseGauge + assetAdj)));

  return {
    gauge,
    surplus:          Math.round(surplus),
    surplusRate,
    surplusRatePct:   Math.round(surplusRate * 1000) / 10,
    emergencyMonths:  Math.round(emergencyMonths * 10) / 10,
    assetAdj,
  };
};

// ─────────────────────────────────────────────────────────────
// calcDynamicScoreFromRows — 4指標スコアを年齢ごとに動的計算
//
// ResultScreen の calcFourIndicators と同じ4指標ロジックを
// シミュレーション行データから年次再計算する。
//
// 指標:
//   A: 毎月収支余力    — その年の構造的年間黒字（投資・頭金除く）
//   B: 貯蓄バッファ   — その時点の資産 ÷ 月生活費
//   C: 大型イベント耐性 — 現在〜退職までの最低資産 ÷ 月生活費
//   D: 老後余力       — 全期間の collapseAge から判定
//
// 老後余力ペナルティ（calcFourIndicators と同一）:
//   scoreD=0  → 上限55点（要注意止まり）
//   scoreD≤8  → 上限65点
//
// 判定閾値: 0-40 要見直し / 41-65 要注意 / 66-80 概ね安定 / 81-100 安全圏
// ─────────────────────────────────────────────────────────────
export const calcDynamicScoreFromRows = (simRows, currentAge, retirementAge) => {
  if (!simRows || simRows.length === 0) return null;

  const currentRow = simRows.find(r => r.age === currentAge);
  if (!currentRow) return null;

  // 月生活費（その年の実績値から逆算）
  const monthlyExp = Math.max(1, (currentRow.livingExp ?? 0) / 12);

  // ── A: 毎月収支余力（投資積立・頭金を除いた構造的黒字） ──
  const investContrib = (currentRow.nisaContrib    ?? 0)
                      + (currentRow.idecoContrib   ?? 0)
                      + (currentRow.generalContrib ?? 0);
  const downCost      = currentRow.downCost ?? 0;
  const structuralExp = Math.max(0, (currentRow.totalExpense ?? 0) - investContrib - downCost);
  const annualSurplus = (currentRow.totalIncome ?? 0) - structuralExp;

  const scoreA =
    annualSurplus >= 120 ? 25 :
    annualSurplus >=  80 ? 20 :
    annualSurplus >=  40 ? 15 :
    annualSurplus >=   1 ?  8 : 0;

  // ── B: 貯蓄バッファ（その時点の資産÷月生活費） ──
  const totalAssets    = currentRow.totalAssets ?? 0;
  const emergencyMonths = monthlyExp > 0 ? totalAssets / monthlyExp : 0;

  const scoreB =
    emergencyMonths >= 12 ? 25 :
    emergencyMonths >=  9 ? 20 :
    emergencyMonths >=  6 ? 15 :
    emergencyMonths >=  3 ?  8 : 0;

  // ── C: 大型イベント耐性（現在〜退職までの最低資産） ──
  const futureWorkRows = simRows.filter(r => r.age >= currentAge && r.age < retirementAge);
  const workMinAsset   = futureWorkRows.length > 0
    ? Math.min(...futureWorkRows.map(r => r.totalAssets))
    : totalAssets;
  const minAssetMonths = monthlyExp > 0 ? workMinAsset / monthlyExp : 0;

  const scoreC =
    minAssetMonths >= 12 ? 25 :
    minAssetMonths >=  9 ? 20 :
    minAssetMonths >=  6 ? 15 :
    minAssetMonths >=  3 ?  8 :
    workMinAsset   >   0 ?  4 : 0;

  // ── D: 老後余力（全期間のcollapseAgeから判定） ──
  const collapseAge    = simRows.find(r => r.totalAssets < 0)?.age ?? null;
  const retireMonthlyExp = monthlyExp * 0.82;  // 老後は18%減
  const annualRetireExp  = retireMonthlyExp * 12;
  const row90   = simRows.find(r => r.age >= 90) ?? simRows[simRows.length - 1];
  const asset90 = row90?.totalAssets ?? 0;

  let scoreD;
  if (collapseAge === null) {
    scoreD = asset90 > annualRetireExp * 5 ? 25 : 20;
  } else if (collapseAge >= 85) {
    scoreD = 15;
  } else if (collapseAge >= 80) {
    scoreD = 8;
  } else {
    scoreD = 0;
  }

  // ── 老後余力ペナルティ・合計スコア ──
  const rawScore   = scoreA + scoreB + scoreC + scoreD;
  const scoreCap   = scoreD === 0 ? 55 : scoreD <= 8 ? 65 : 100;
  const totalScore = Math.min(rawScore, scoreCap);

  // ── 判定 ──
  const status = totalScore >= 81 ? '安全圏' : totalScore >= 66 ? '概ね安定' : totalScore >= 41 ? '要注意' : '要見直し';
  const color  = totalScore >= 81 ? '#16a34a' : totalScore >= 66 ? '#65a30d' : totalScore >= 41 ? '#d97706' : '#dc2626';

  return {
    gauge: totalScore,
    scoreA, scoreB, scoreC, scoreD,
    annualSurplus, emergencyMonths, workMinAsset, collapseAge,
    status, color,
  };
};

// ─────────────────────────────────────────────────────────────
// gaugeDelta を適用して新しいゲージ値を返す
// ─────────────────────────────────────────────────────────────
export const applyGaugeDelta = (current, delta) =>
  Math.max(0, Math.min(100, current + delta));

// ─────────────────────────────────────────────────────────────
// ゲージ変化の方向を返す（アニメーション制御用）
// ─────────────────────────────────────────────────────────────
export const gaugeDirection = (prev, next) => {
  if (next > prev) return 'up';
  if (next < prev) return 'down';
  return 'same';
};
