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
  if (gauge >= 85) return '現時点では安定していますが、大きなイベント前に再確認を';     // 安全圏
  if (gauge >= 70) return '比較的安定しています。住宅購入や教育費には注意が必要です';  // 比較的安全
  if (gauge >= 50) return '大きな支出イベント前には必ず再確認が必要です';              // 慎重判断
  if (gauge >= 30) return '住宅購入判断は慎重に行いましょう';                          // 要見直し
  return '現状のままでは将来の家計が厳しくなる可能性があります';                      // 高リスク
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
  if (gauge >= 85) return { label: '安全圏',    color: '#16a34a', bg: '#f0fdf4' };
  if (gauge >= 70) return { label: '比較的安全', color: '#65a30d', bg: '#f7fee7' };
  if (gauge >= 50) return { label: '慎重判断',  color: '#d97706', bg: '#fffbeb' };
  if (gauge >= 30) return { label: '要見直し',  color: '#dc2626', bg: '#fef2f2' };
  return                 { label: '高リスク',   color: '#991b1b', bg: '#fff1f2' };
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
export const calcInitialGauge = (profile) => {
  const selfInc   = Number(profile.selfIncome       ?? 0);
  const spouseInc = Number(profile.spouseIncome      ?? 0);
  const expense   = Number(profile.monthlyExpense    ?? 0);
  const invest    = Number(profile.monthlyInvestment ?? 0);

  // 手取りベース変換（所得税 + 社会保険の概算控除）
  const netSelf        = selfInc   > 0 ? selfInc   * calcNetRatio(selfInc)   : 0;
  const netSpouse      = spouseInc > 0 ? spouseInc * calcNetRatio(spouseInc) : 0;
  const totalNetIncome = netSelf + netSpouse;

  // 既存借入の月返済合計
  const existingLoans     = Array.isArray(profile.existingLoans) ? profile.existingLoans : [];
  const monthlyLoanRepay  = existingLoans.reduce((sum, l) => sum + (Number(l.monthlyPayment) || 0), 0);

  // 支出は手取りベースで評価（臨時支出バッファ + 既存借入を加算）
  const annualExpense     = (expense + MONTHLY_BUFFER + monthlyLoanRepay) * 12;
  const annualInvestment  = invest * 12;
  const surplus           = totalNetIncome - annualExpense - annualInvestment;

  // 手取り年収ゼロ対策（surplusRate は手取り年収ベース）
  const surplusRate = totalNetIncome > 0
    ? surplus / totalNetIncome
    : -1;

  // テーブル参照でゲージ変換
  let baseGauge = 8;
  for (const row of SURPLUS_TO_GAUGE) {
    if (surplusRate >= row.minRate) {
      baseGauge = row.gauge;
      break;
    }
  }

  // 住宅安全補正（減点）
  const { penalty, reasons } = calcHousingPenalty(profile);
  const gauge = Math.max(0, Math.min(100, baseGauge - penalty));

  return {
    gauge,
    surplus:             Math.round(surplus),
    surplusRatePct:      Math.round(surplusRate * 1000) / 10,
    message:             gaugeToMessage(gauge),
    color:               gaugeToColor(gauge),
    gradient:            gaugeToGradient(gauge),
    treeLevel:           gaugeToTreeLevel(gauge),
    status:              gaugeToStatus(gauge),
    housingPenalty:      penalty,
    housingRiskReasons:  reasons,
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
