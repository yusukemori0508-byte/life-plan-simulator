// src/eventOptions.js
// 住宅・車イベントの動的選択肢生成ヘルパー
//
// ユーザーが入力した想定価格（propertyPrice / carPrice）を基準に
// 「想定より高め・想定どおり・価格を抑える・見送り」の4選択肢を動的生成する。
//
// 設計思想:
//   - 固定価格テンプレートを廃止し、入力値と一貫した価格をイベントカードに表示
//   - selectedPrice を choice オブジェクトに含め、シミュレーションエンジンが参照できるようにする
//   - 表示価格の丸め（住宅100万単位・車10万単位）と実計算値は分離しない

import { safeNum } from './utils.js';

// ─────────────────────────────────────────────────────────────
// 内部ヘルパー
// ─────────────────────────────────────────────────────────────

/** 住宅ローン月返済額（元利均等） 単位: 万円/月 */
const calcMortgageMonthly = (loanAmount, annualRatePct, termYears) => {
  const p = Number(loanAmount);
  const r = Number(annualRatePct) / 100 / 12;
  const n = Number(termYears) * 12;
  if (p <= 0 || n <= 0) return 0;
  if (r === 0) return p / n;
  return (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};

/** 100万単位で丸め（住宅価格表示用） */
const roundTo100 = (n) => Math.round(n / 100) * 100;

/** 10万単位で丸め（車価格表示用） */
const roundTo10 = (n) => Math.round(n / 10) * 10;

/** 万円 → "X,XXX万" or "X.X億" 表示 */
const fmtMan = (n) => {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}億`;
  return `${n.toLocaleString()}万`;
};

// ─────────────────────────────────────────────────────────────
// 住宅購入イベント 動的選択肢生成
// ─────────────────────────────────────────────────────────────

/**
 * ユーザーの想定住宅価格を基準に住宅購入イベントの選択肢を生成する。
 *
 * @param {object} profileData - ユーザープロフィール
 * @returns {Array<{id, label, sub, selectedPrice, gaugeDelta, costOnce, incomeBoost}>}
 */
export const getHousingEventOptions = (profileData) => {
  const base    = safeNum(profileData?.propertyPrice, 3500);
  const dpInput = safeNum(profileData?.downPayment, Math.round(base * 0.1));
  const rate    = safeNum(profileData?.mortgageRate, 1.0);
  const term    = safeNum(profileData?.mortgageTerm, 35);

  // ── 価格帯計算（100万単位丸め）─────────────────────────────
  const highPrice = roundTo100(base * 1.20);  // 想定+20%
  const basePrice = base;                      // 想定どおり
  const lowPrice  = roundTo100(base * 0.90);  // 想定−10%

  // 表示用の価格帯（min〜max の幅表示）
  const highMin = roundTo100(base * 1.15);
  const highMax = roundTo100(base * 1.25);
  const lowMin  = roundTo100(base * 0.85);
  const lowMax  = roundTo100(base * 0.95);

  // ── 月返済目安計算 ─────────────────────────────────────────
  // 頭金はユーザー入力値を使い、各価格帯ではその比率を維持する
  const dpRatio   = base > 0 ? dpInput / base : 0.1;
  const monthly   = (price) => {
    const dp   = Math.round(price * dpRatio);
    const loan = Math.max(0, price - dp);
    const m    = calcMortgageMonthly(loan, rate, term);
    return Math.round(m * 10) / 10;  // 小数1桁（万円/月）
  };

  // ── サブテキスト生成 ──────────────────────────────────────
  const subRange  = (min, max, price) =>
    `約${fmtMan(min)}〜${fmtMan(max)}円・月返済目安 ${monthly(price).toFixed(1)}万円`;
  const subExact  = (price) =>
    `${fmtMan(price)}前後・月返済目安 ${monthly(price).toFixed(1)}万円`;

  return [
    {
      id:            'high',
      label:         '想定より高い住宅を購入',
      sub:           subRange(highMin, highMax, highPrice),
      selectedPrice: highPrice,
      gaugeDelta:    -15,
      costOnce:      highPrice,
      incomeBoost:   0,
    },
    {
      id:            'base',
      label:         '想定どおり購入',
      sub:           subExact(basePrice),
      selectedPrice: basePrice,
      gaugeDelta:    -10,
      costOnce:      basePrice,
      incomeBoost:   0,
    },
    {
      id:            'low',
      label:         '価格を抑えて購入',
      sub:           subRange(lowMin, lowMax, lowPrice),
      selectedPrice: lowPrice,
      gaugeDelta:    -7,
      costOnce:      lowPrice,
      incomeBoost:   0,
    },
    {
      id:            'skip',
      label:         '賃貸を継続する',
      sub:           'まだ様子を見る',
      selectedPrice: 0,
      gaugeDelta:    0,
      costOnce:      0,
      incomeBoost:   0,
    },
  ];
};

// ─────────────────────────────────────────────────────────────
// 車購入イベント 動的選択肢生成
// ─────────────────────────────────────────────────────────────

/**
 * ユーザーの想定車価格を基準に車購入イベントの選択肢を生成する。
 *
 * @param {object} profileData - ユーザープロフィール
 * @returns {Array<{id, label, sub, selectedPrice, gaugeDelta, costOnce, incomeBoost}>}
 */
export const getCarEventOptions = (profileData) => {
  const base   = safeNum(profileData?.carPrice, 250);
  const isLoan = profileData?.carPaymentType === 'loan';

  // ── 価格帯計算（10万単位丸め）─────────────────────────────
  const highPrice = roundTo10(base * 1.20);  // 想定+20%
  const basePrice = base;                     // 想定どおり
  const lowPrice  = roundTo10(base * 0.85);  // 想定−15%

  const highMin = roundTo10(base * 1.15);
  const highMax = roundTo10(base * 1.25);
  const lowMin  = roundTo10(base * 0.80);
  const lowMax  = roundTo10(base * 0.90);

  // ── 月負担目安 ────────────────────────────────────────────
  // ローン: 頭金10%・5年60回・金利3%で計算
  // 現金:   購入価格の表示のみ（維持費ベースは別途）
  const carMonthly = (price) => {
    if (!isLoan) return null;
    const dp   = price * 0.1;
    const loan = price - dp;
    const r    = 0.03 / 12;
    const n    = 60;
    const m    = (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return Math.round(m * 10) / 10;
  };

  // ── サブテキスト生成 ──────────────────────────────────────
  const subText = (price, min, max) => {
    const m        = carMonthly(price);
    const rangeStr = (min != null && max != null && min !== max)
      ? `約${fmtMan(min)}〜${fmtMan(max)}円`
      : `${fmtMan(price)}前後`;
    return m != null
      ? `${rangeStr}・月返済目安 ${m.toFixed(1)}万円`
      : rangeStr;
  };

  return [
    {
      id:            'high',
      label:         '想定より高い車を購入',
      sub:           subText(highPrice, highMin, highMax),
      selectedPrice: highPrice,
      gaugeDelta:    -10,
      costOnce:      highPrice,
      incomeBoost:   0,
    },
    {
      id:            'base',
      label:         '想定どおり購入',
      sub:           subText(basePrice, null, null),
      selectedPrice: basePrice,
      gaugeDelta:    -8,
      costOnce:      basePrice,
      incomeBoost:   0,
    },
    {
      id:            'low',
      label:         '価格を抑えて購入',
      sub:           subText(lowPrice, lowMin, lowMax),
      selectedPrice: lowPrice,
      gaugeDelta:    -5,
      costOnce:      lowPrice,
      incomeBoost:   0,
    },
    {
      id:            'skip',
      label:         '今は見送る / カーシェア活用',
      sub:           '維持費を最小限に抑える',
      selectedPrice: 0,
      gaugeDelta:    0,
      costOnce:      0,
      incomeBoost:   0,
    },
  ];
};
