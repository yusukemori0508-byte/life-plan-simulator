// src/components/ActionPage.jsx
// 別パターン比較ページ
// ─ 「結果を比較する」CTAの遷移先
// ─ 住宅・車・教育費・投資・支出などの条件を変えた場合を実際にシミュレーションして比較する
// ─ 外部相談リンクは最下部の補助導線としてのみ配置する

import React from 'react';
import { useAppStore } from '../store/useAppStore.jsx';
import { runFullSimulation } from '../simulationEngine.js';

// ─────────────────────────────────────────────────────────────
// カラー
// ─────────────────────────────────────────────────────────────
const C = {
  bg:        '#f8fafb',
  white:     '#ffffff',
  text:      '#111827',
  muted:     '#6b7280',
  border:    '#e5e7eb',
  green:     '#16a34a',
  greenBg:   '#f0fdf4',
  greenDark: '#14532d',
  greenLight:'#dcfce7',
  amber:     '#d97706',
  amberBg:   '#fffbeb',
  red:       '#dc2626',
  redBg:     '#fef2f2',
  blue:      '#2563eb',
  blueBg:    '#eff6ff',
  teal:      '#0d9488',
  tealBg:    '#f0fdfa',
};

// ─────────────────────────────────────────────────────────────
// SVGアイコン（絵文字の代替）
// ─────────────────────────────────────────────────────────────
const ACT_PATHS = {
  savings:    "M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z",
  car:        "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-5h14v5zm-8-4H9v2h2v-2zm4 0h-2v2h2v-2z",
  graduation: "M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z",
  trending:   "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z",
  receipt:    "M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20z",
  bank:       "M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zM11.5 1L2 6v2h19V6l-9.5-5z",
  shield:     "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z",
  hourglass:  "M6 2v6l2 2-2 2v6h12v-6l-2-2 2-2V2H6zm10 14.5V20H8v-3.5l2-2 2 2 2-2 2 2zm0-9l-2 2-2-2-2 2-2-2V4h8v3.5z",
  tag:        "M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z",
  barchart:   "M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z",
};
const EMOJI_TO_ACT = {
  '💰': 'savings',   '🚗': 'car',       '🎓': 'graduation',
  '📈': 'trending',  '🧾': 'receipt',   '🏦': 'bank',
  '🛡️': 'shield',   '⏳': 'hourglass', '🏷️': 'tag',
  '📊': 'barchart',
};
const ActIcon = ({ emoji, size = 22, color = '#374151' }) => {
  const key = EMOJI_TO_ACT[emoji];
  if (!key || !ACT_PATHS[key]) return <span style={{ fontSize: size * 0.82 }}>{emoji}</span>;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ display: 'block', flexShrink: 0 }}>
      <path d={ACT_PATHS[key]} />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// 比較シナリオ生成
// ─────────────────────────────────────────────────────────────
const buildComparisonScenarios = (profileData) => {
  const scenarios = [];
  const pa  = Number(profileData.housingPurchaseAge ?? 0);
  const pp  = Number(profileData.propertyPrice      ?? 3500);
  const dp  = Number(profileData.downPayment        ?? Math.round(pp * 0.1));
  const inv = Number(profileData.monthlyInvestment  ?? 3);
  const exp = Number(profileData.monthlyExpense     ?? 20);
  const edu = profileData.educationPlan ?? 'public';

  // ── 住宅 ──────────────────────────────────────────────────
  if (pa > 0) {
    const lowPp = Math.max(1000, pp - 500);
    if (lowPp < pp) {
      scenarios.push({
        id:    'house_price_down',
        icon:  '🏷️',
        title: '住宅価格を500万抑えた場合',
        desc:  `${pp.toLocaleString()}万円 → ${lowPp.toLocaleString()}万円`,
        diff:  { propertyPrice: lowPp },
      });
    }
    scenarios.push({
      id:    'house_later',
      icon:  '⏳',
      title: `購入を${pa + 3}歳に遅らせた場合`,
      desc:  `${pa}歳購入 → ${pa + 3}歳購入`,
      diff:  { housingPurchaseAge: pa + 3 },
    });
    const dpPlus = dp + 500;
    scenarios.push({
      id:    'house_dp_up',
      icon:  '💰',
      title: '頭金を500万増やした場合',
      desc:  `頭金 ${dp.toLocaleString()}万円 → ${dpPlus.toLocaleString()}万円`,
      diff:  { downPayment: dpPlus },
    });
  }

  // ── 車 ────────────────────────────────────────────────────
  if (profileData.carOwnership) {
    scenarios.push({
      id:    'car_skip',
      icon:  '🚗',
      title: '車購入を見送った場合',
      desc:  'カーシェアを活用した想定',
      diff:  { carOwnership: false },
    });
  }

  // ── 教育費 ────────────────────────────────────────────────
  if ((profileData.numChildren ?? 0) > 0 && edu !== 'public') {
    scenarios.push({
      id:    'edu_public',
      icon:  '🎓',
      title: '教育費を公立中心にした場合',
      desc:  '小中高大すべて公立ベースに変更',
      diff:  { educationPlan: 'public' },
    });
  }

  // ── 投資 ──────────────────────────────────────────────────
  scenarios.push({
    id:    'invest_plus',
    icon:  '📈',
    title: '積立額を月2万増やした場合',
    desc:  `月${inv}万円 → 月${inv + 2}万円`,
    diff:  { monthlyInvestment: inv + 2 },
  });

  // ── 支出 ──────────────────────────────────────────────────
  const expLow = Math.max(8, exp - 2);
  if (expLow < exp) {
    scenarios.push({
      id:    'exp_down',
      icon:  '🧾',
      title: '毎月の支出を2万抑えた場合',
      desc:  `月${exp}万円 → 月${expLow}万円`,
      diff:  { monthlyExpense: expLow },
    });
  }

  return scenarios;
};

// ─────────────────────────────────────────────────────────────
// メトリクス抽出
// ─────────────────────────────────────────────────────────────
const extractMetrics = (result) => {
  if (!result) return null;
  return {
    gauge:         result.safetySummary?.gauge         ?? null,
    collapseAge:   result.collapseAge                  ?? null,
    retireAsset:   result.summary?.retirementAsset     ?? null,
    savingsAtPurch:result.housingDetail?.savingsAtPurchase ?? null,
    minAssetPost5: result.housingDetail?.minAssetPost5     ?? null,
  };
};

// ─────────────────────────────────────────────────────────────
// 差分テキスト生成
// ─────────────────────────────────────────────────────────────
const diffLabel = (bv, av, higherBetter = true) => {
  if (bv == null || av == null) return null;
  if (typeof bv !== 'number' || typeof av !== 'number') return null;
  const d = Math.round(av - bv);
  if (d === 0) return { text: '変化なし', type: 'neutral' };
  const abs = Math.abs(d);
  const sign = d > 0 ? '+' : '−';
  const txt = abs >= 10000
    ? `${sign}${(abs / 10000).toFixed(1)}億`
    : `${sign}${abs.toLocaleString()}万`;
  const isGood = higherBetter ? d > 0 : d < 0;
  return { text: txt, type: isGood ? 'good' : 'bad' };
};

const gaugeDiffLabel = (bv, av) => {
  if (bv == null || av == null) return null;
  const d = Math.round(av - bv);
  if (d === 0) return { text: '同水準', type: 'neutral' };
  return { text: `${d > 0 ? '+' : ''}${d}点`, type: d > 0 ? 'good' : 'bad' };
};

// ─────────────────────────────────────────────────────────────
// 比較メトリクス表示コンポーネント
// ─────────────────────────────────────────────────────────────
const MetricChip = ({ label, baseVal, altVal, fmt, higherBetter, isGauge }) => {
  const diff = isGauge
    ? gaugeDiffLabel(baseVal, altVal)
    : diffLabel(baseVal, altVal, higherBetter);

  const typeColor = {
    good:    C.green,
    bad:     C.red,
    neutral: C.muted,
  };

  return (
    <div style={{
      background: '#f8fafc',
      border:     `1px solid ${C.border}`,
      borderRadius: 10,
      padding:    '8px 10px',
      display:    'flex',
      flexDirection: 'column',
      gap:        3,
    }}>
      <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>
          {fmt(altVal)}
        </span>
        {diff && (
          <span style={{
            fontSize:   10,
            fontWeight: 700,
            color:      typeColor[diff.type] ?? C.muted,
          }}>
            {diff.text}
          </span>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 比較カード
// ─────────────────────────────────────────────────────────────
const ComparisonCard = ({ scenario, base, alt, onAdopt, adopted, hasHousing, isFeasible = true }) => {
  const bm = extractMetrics(base);
  const am = extractMetrics(alt);

  const fmtGauge   = (v) => v != null ? `${v}点` : '—';
  const fmtAsset   = (v) => {
    if (v == null) return '—';
    const abs = Math.abs(Math.round(v));
    const s   = v < 0 ? '−' : '';
    return abs >= 10000 ? `${s}${(abs / 10000).toFixed(1)}億円` : `${s}${abs.toLocaleString()}万円`;
  };
  const fmtCollapse = (v) => v != null ? `${v}歳` : 'なし';

  // 表示する指標を選択（住宅購入あり・なしで分岐）
  const metrics = hasHousing
    ? [
        { label: '家計安全度',   bv: bm?.gauge,         av: am?.gauge,         fmt: fmtGauge,    higherBetter: true,  isGauge: true  },
        { label: '退職時資産',   bv: bm?.retireAsset,   av: am?.retireAsset,   fmt: fmtAsset,    higherBetter: true,  isGauge: false },
        { label: '購入後5年最低', bv: bm?.minAssetPost5, av: am?.minAssetPost5, fmt: fmtAsset,    higherBetter: true,  isGauge: false },
        { label: '資金ショート',  bv: bm?.collapseAge,   av: am?.collapseAge,   fmt: fmtCollapse, higherBetter: false, isGauge: false },
      ]
    : [
        { label: '家計安全度',   bv: bm?.gauge,       av: am?.gauge,       fmt: fmtGauge,    higherBetter: true,  isGauge: true  },
        { label: '退職時資産',   bv: bm?.retireAsset, av: am?.retireAsset, fmt: fmtAsset,    higherBetter: true,  isGauge: false },
        { label: '資金ショート',  bv: bm?.collapseAge, av: am?.collapseAge, fmt: fmtCollapse, higherBetter: false, isGauge: false },
      ];

  // 変化なし判定（住宅固有指標も含めて判定）
  const collapseChange  = bm?.collapseAge   !== am?.collapseAge;
  const gaugeChange     = Math.abs((am?.gauge        ?? 0) - (bm?.gauge        ?? 0)) >= 1;
  const retireChange    = Math.abs((am?.retireAsset  ?? 0) - (bm?.retireAsset  ?? 0)) >= 50;
  const savingsChange   = Math.abs((am?.savingsAtPurch ?? 0) - (bm?.savingsAtPurch ?? 0)) >= 100;
  const minPost5Change  = Math.abs((am?.minAssetPost5  ?? 0) - (bm?.minAssetPost5  ?? 0)) >= 100;
  const anyChange       = gaugeChange || retireChange || collapseChange || savingsChange || minPost5Change;

  return (
    <div style={{
      background:   C.white,
      borderRadius: 16,
      boxShadow:    '0 2px 10px rgba(0,0,0,0.06)',
      padding:      '16px 16px 14px',
      // 実行不可能なシナリオは薄く表示
      opacity:      isFeasible ? 1 : 0.85,
    }}>
      {/* ── タイトル行 ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
        <ActIcon emoji={scenario.icon} size={22} color="#374151" />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>
              {scenario.title}
            </span>
            {!isFeasible && (
              <span style={{
                fontSize:     9,
                fontWeight:   700,
                color:        C.amber,
                background:   C.amberBg,
                border:       `1px solid ${C.amber}`,
                borderRadius: 999,
                padding:      '2px 7px',
                lineHeight:   1.6,
                flexShrink:   0,
              }}>
                参考シナリオ
              </span>
            )}
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
            {scenario.desc}
          </div>
        </div>
      </div>

      {/* 実行不可能な場合の警告ノート */}
      {!isFeasible && (
        <div style={{
          background:   C.amberBg,
          border:       `1px solid #fbbf24`,
          borderRadius: 8,
          padding:      '7px 10px',
          marginBottom: 10,
          fontSize:     11,
          color:        '#92400e',
          lineHeight:   1.6,
        }}>
          ! 現在の貯蓄では、この頭金増額を実行すると購入時に資金が不足する可能性があります。
          積立を増やすか、購入時期を遅らせた場合の参考としてご確認ください。
        </div>
      )}

      {/* ── メトリクスグリッド ── */}
      {am ? (
        <>
          <div style={{
            display:             'grid',
            gridTemplateColumns: `repeat(${Math.min(metrics.length, 2)}, 1fr)`,
            gap:                 6,
            marginBottom:        12,
          }}>
            {metrics.map((m) => (
              <MetricChip
                key={m.label}
                label={m.label}
                baseVal={m.bv}
                altVal={m.av}
                fmt={m.fmt}
                higherBetter={m.higherBetter}
                isGauge={m.isGauge}
              />
            ))}
          </div>

          {/* 変化なし時のメモ */}
          {!anyChange && isFeasible && (
            <div style={{
              fontSize: 11, color: C.muted, textAlign: 'center',
              marginBottom: 10, fontStyle: 'italic',
            }}>
              この条件変更では大きな差は生じませんでした
            </div>
          )}

          {/* ── 反映ボタン（実行可能なシナリオのみ） ── */}
          {isFeasible ? (
            <>
              <button
                onClick={() => onAdopt(scenario)}
                disabled={adopted === scenario.id}
                style={{
                  width:        '100%',
                  padding:      '11px',
                  borderRadius: 999,
                  border:       `1.5px solid ${C.green}`,
                  background:   adopted === scenario.id ? C.greenBg : C.white,
                  color:        C.green,
                  fontSize:     13,
                  fontWeight:   700,
                  cursor:       adopted === scenario.id ? 'default' : 'pointer',
                  transition:   'all 0.18s',
                }}
              >
                {adopted === scenario.id ? '✓ 反映しました' : 'この条件を反映する'}
              </button>
              {adopted !== scenario.id && (
                <div style={{ fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 4 }}>
                  入力画面に戻ってさらに細かく調整できます
                </div>
              )}
            </>
          ) : (
            <button
              onClick={() => onAdopt(scenario)}
              style={{
                width:        '100%',
                padding:      '11px',
                borderRadius: 999,
                border:       `1.5px solid ${C.amber}`,
                background:   C.amberBg,
                color:        C.amber,
                fontSize:     12,
                fontWeight:   700,
                cursor:       'pointer',
                transition:   'all 0.18s',
              }}
            >
              それでもこの条件を入力画面で試す
            </button>
          )}
        </>
      ) : (
        <div style={{ fontSize: 11, color: C.muted, textAlign: 'center', padding: '10px 0' }}>
          計算中…
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 補助導線カード（外部リンク・小さく配置）
// ─────────────────────────────────────────────────────────────
const SUPPLEMENT_LINKS = [
  {
    id:       'fp',
    icon:     '🏦',
    label:    'FPに相談する',
    note:     '住宅・教育費の前提を専門家と確認したい場合',
    href:     'https://example.com/fp',
    condition: ({ hasHousing, hasExistingLoans, gauge }) =>
      hasHousing || hasExistingLoans || gauge < 65,
  },
  {
    id:       'insurance',
    icon:     '🛡️',
    label:    '保障内容を確認する',
    note:     '住宅購入・子どもの予定がある場合のリスク確認',
    href:     'https://example.com/insurance',
    condition: ({ hasHousing, hasChildren, gauge }) =>
      hasHousing || hasChildren || gauge < 65,
  },
];

// eslint-disable-next-line no-unused-vars
const logClick = (_id, _href) => { /* analytics placeholder */ };

// ─────────────────────────────────────────────────────────────
// メイン：ActionPage
// ─────────────────────────────────────────────────────────────
export const ActionPage = ({ profileData, result, onBack }) => {
  const { state, actions } = useAppStore();
  const selectedChoices    = state.selectedChoices ?? [];

  const s          = result?.safetySummary ?? {};
  const gauge      = s.gauge ?? 50;
  const isCollapsed = s.isCollapsed ?? false;

  // 住宅タイプ判定
  const housingType =
    profileData?.housingType ??
    (profileData?.housingPurchaseAge ? 'future_purchase' : 'rent');
  const hasHousing = housingType !== 'rent';

  React.useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // 比較シナリオ生成
  const scenarios = React.useMemo(
    () => buildComparisonScenarios(profileData ?? {}),
    [profileData],
  );

  // 基準シミュレーション結果
  const baseResult = React.useMemo(
    () => runFullSimulation(profileData, selectedChoices),
    [profileData, selectedChoices],
  );

  // 各シナリオのシミュレーション結果
  const scenarioResults = React.useMemo(() =>
    scenarios.map(sc => ({
      ...sc,
      altResult: runFullSimulation({ ...profileData, ...sc.diff }, selectedChoices),
    })),
    [scenarios, profileData, selectedChoices],
  );

  // 反映済みシナリオ
  const [adoptedId, setAdoptedId] = React.useState(null);

  const handleAdopt = (scenario) => {
    actions.setProfile({ ...profileData, ...scenario.diff });
    window.__scenarioAdoptedMsg = `「${scenario.title}」の条件を反映しました`;
    setAdoptedId(scenario.id);
    setTimeout(() => actions.setScreen('input'), 420);
  };

  // 補助導線の表示判定
  const ctx = {
    gauge,
    isCollapsed,
    hasHousing,
    hasChildren:      (profileData?.numChildren ?? 0) > 0,
    hasExistingLoans: (profileData?.existingLoans ?? []).length > 0,
  };
  const visibleLinks = SUPPLEMENT_LINKS.filter(l => l.condition(ctx));

  return (
    <div style={{
      minHeight:    '100vh',
      background:   C.bg,
      paddingBottom: 56,
      fontFamily:   "'Noto Sans JP', -apple-system, 'Apple Color Emoji', sans-serif",
    }}>

      {/* ── ヘッダー ─────────────────────────────────────────── */}
      <div style={{
        position:       'fixed', top: 0, left: 0, right: 0, zIndex: 10,
        background:     'rgba(248,250,251,0.94)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom:   '1px solid rgba(0,0,0,0.06)',
        paddingTop:     'env(safe-area-inset-top, 0px)',
      }}>
        <div style={{ padding: '14px 20px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onBack}
            style={{
              background: 'none', border: 'none',
              padding: '4px 8px 4px 2px',
              cursor: 'pointer', fontSize: 18,
              color: '#374151', lineHeight: 1,
            }}
          >
            ←
          </button>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.greenDark, letterSpacing: '0.02em' }}>
              別パターンで比較する
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
              条件を変えた場合の違いをシミュレーションで確認
            </div>
          </div>
        </div>
      </div>

      {/* ── コンテンツ ── */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 0', paddingTop: 'calc(62px + env(safe-area-inset-top, 0px))' }}>

        {/* ── 現在の試算サマリー ── */}
        <div style={{
          background:   C.white,
          borderRadius: 14,
          padding:      '12px 16px',
          boxShadow:    '0 2px 8px rgba(0,0,0,0.05)',
          marginBottom: 20,
          display:      'flex',
          alignItems:   'center',
          gap:          12,
        }}>
          <div style={{ lineHeight: 1 }}>
            <ActIcon emoji="📊" size={24} color={gauge >= 70 ? '#16a34a' : gauge >= 50 ? '#d97706' : '#dc2626'} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>
              現在の試算における家計安全度
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{
                fontSize:   24,
                fontWeight: 900,
                color:      gauge >= 70 ? C.green : gauge >= 50 ? C.amber : C.red,
              }}>
                {gauge}
              </span>
              <span style={{ fontSize: 11, color: C.muted }}>/100</span>
              <span style={{
                fontSize:   10, fontWeight: 700, marginLeft: 4,
                color:      gauge >= 70 ? C.green : gauge >= 50 ? C.amber : C.red,
                background: gauge >= 70 ? C.greenBg : gauge >= 50 ? C.amberBg : C.redBg,
                padding:    '2px 8px', borderRadius: 999,
              }}>
                {gauge >= 85 ? '安全圏' : gauge >= 70 ? '概ね安定' : gauge >= 50 ? '要注意' : '要見直し'}
              </span>
            </div>
          </div>
          <div style={{
            fontSize: 10, color: C.muted, textAlign: 'right', lineHeight: 1.6,
          }}>
            下の比較カードで<br />条件違いを確認
          </div>
        </div>

        {/* ── 比較セクション ── */}
        <div style={{ marginBottom: 8 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: C.muted,
            letterSpacing: '0.06em', marginBottom: 12,
            textTransform: 'uppercase',
          }}>
            条件を変えた場合の比較
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {scenarioResults.map(sc => {
              // 頭金増額シナリオ: 購入時の資産がマイナスになる場合は実行不可能
              const isFeasible = sc.id === 'house_dp_up'
                ? (sc.altResult?.housingDetail?.savingsAtPurchase ?? 0) >= 0
                : true;
              return (
                <ComparisonCard
                  key={sc.id}
                  scenario={sc}
                  base={baseResult}
                  alt={sc.altResult}
                  onAdopt={handleAdopt}
                  adopted={adoptedId}
                  hasHousing={hasHousing}
                  isFeasible={isFeasible}
                />
              );
            })}
          </div>
        </div>

        {/* ── 補助導線（外部リンク）── */}
        {visibleLinks.length > 0 && (
          <div style={{
            marginTop:    28,
            padding:      '14px 16px',
            background:   '#f1f5f9',
            borderRadius: 12,
            border:       '1px solid #e2e8f0',
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#64748b',
              letterSpacing: '0.06em', marginBottom: 10,
            }}>
              参考情報
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visibleLinks.map(link => (
                <button
                  key={link.id}
                  onClick={() => {
                    logClick(link.id, link.href);
                    window.open(link.href, '_blank', 'noopener,noreferrer');
                  }}
                  style={{
                    display:        'flex',
                    alignItems:     'center',
                    gap:            10,
                    padding:        '10px 12px',
                    borderRadius:   10,
                    border:         '1px solid #e2e8f0',
                    background:     C.white,
                    cursor:         'pointer',
                    textAlign:      'left',
                    width:          '100%',
                  }}
                >
                  <ActIcon emoji={link.icon} size={18} color="#6b7280" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
                      {link.label}
                    </div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                      {link.note}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: C.muted }}>→</span>
                </button>
              ))}
            </div>
            <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 10, lineHeight: 1.7 }}>
              * 特定のサービスを推奨するものではありません。参考情報としてご利用ください。
            </div>
          </div>
        )}

        {/* ── フッターボタン ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
          <button
            onClick={() => {
              actions.setScreen('input');
            }}
            style={{
              width:        '100%',
              padding:      '14px',
              borderRadius: 999,
              border:       'none',
              background:   `linear-gradient(135deg, ${C.green}, #15803d)`,
              color:        C.white,
              fontSize:     14,
              fontWeight:   700,
              cursor:       'pointer',
              boxShadow:    '0 4px 14px rgba(22,163,74,0.22)',
            }}
          >
            条件を変えて再試算する
          </button>
          <button
            onClick={onBack}
            style={{
              width:        '100%',
              padding:      '12px',
              borderRadius: 999,
              border:       `1.5px solid ${C.border}`,
              background:   C.white,
              color:        C.text,
              fontSize:     13,
              fontWeight:   600,
              cursor:       'pointer',
            }}
          >
            ← 結果画面に戻る
          </button>
        </div>

        {/* 注意書き */}
        <div style={{
          marginTop: 20, fontSize: 9, color: '#aabcaa',
          textAlign: 'center', lineHeight: 1.8,
        }}>
          * 各比較は入力条件を変えた場合の概算です。実際の結果は個別の状況により異なります。
        </div>

      </div>
    </div>
  );
};
