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
const ComparisonCard = ({ scenario, base, alt, onAdopt, adopted, hasHousing }) => {
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
        { label: '家計安全度',  bv: bm?.gauge,         av: am?.gauge,         fmt: fmtGauge,   higherBetter: true,  isGauge: true  },
        { label: '退職時資産',  bv: bm?.retireAsset,   av: am?.retireAsset,   fmt: fmtAsset,   higherBetter: true,  isGauge: false },
        { label: '購入後5年最低',bv: bm?.minAssetPost5, av: am?.minAssetPost5, fmt: fmtAsset,   higherBetter: true,  isGauge: false },
        { label: '資金ショート', bv: null,              av: am?.collapseAge,   fmt: fmtCollapse, higherBetter: false, isGauge: false },
      ]
    : [
        { label: '家計安全度',  bv: bm?.gauge,       av: am?.gauge,       fmt: fmtGauge,   higherBetter: true,  isGauge: true  },
        { label: '退職時資産',  bv: bm?.retireAsset, av: am?.retireAsset, fmt: fmtAsset,   higherBetter: true,  isGauge: false },
        { label: '資金ショート', bv: null,            av: am?.collapseAge, fmt: fmtCollapse, higherBetter: false, isGauge: false },
      ];

  // 変化なし判定（主要指標がすべて変化なしの場合）
  const collapseChange = bm?.collapseAge !== am?.collapseAge;
  const gaugeChange    = Math.abs((am?.gauge ?? 0) - (bm?.gauge ?? 0)) >= 1;
  const retireChange   = Math.abs((am?.retireAsset ?? 0) - (bm?.retireAsset ?? 0)) >= 50;
  const anyChange      = gaugeChange || retireChange || collapseChange;

  return (
    <div style={{
      background:   C.white,
      borderRadius: 16,
      boxShadow:    '0 2px 10px rgba(0,0,0,0.06)',
      padding:      '16px 16px 14px',
    }}>
      {/* ── タイトル行 ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{scenario.icon}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>
            {scenario.title}
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
            {scenario.desc}
          </div>
        </div>
      </div>

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
          {!anyChange && (
            <div style={{
              fontSize: 11, color: C.muted, textAlign: 'center',
              marginBottom: 10, fontStyle: 'italic',
            }}>
              この条件変更では大きな差は生じませんでした
            </div>
          )}

          {/* ── 反映ボタン ── */}
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

const logClick = (id, href) => {
  console.log('[ActionPage] link_click', { id, href, ts: Date.now() });
};

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
      fontFamily:   "'Hiragino Sans', 'Noto Sans JP', sans-serif",
    }}>

      {/* ── ヘッダー ─────────────────────────────────────────── */}
      <div style={{
        position:       'sticky', top: 0, zIndex: 10,
        background:     'rgba(248,250,251,0.94)',
        backdropFilter: 'blur(8px)',
        padding:        '14px 20px 12px',
        display:        'flex',
        alignItems:     'center',
        gap:            10,
        borderBottom:   '1px solid rgba(0,0,0,0.06)',
      }}>
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

      {/* ── コンテンツ ── */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 0' }}>

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
          <div style={{ fontSize: 24, lineHeight: 1 }}>
            {gauge >= 70 ? '📊' : gauge >= 50 ? '📊' : '📊'}
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
                {gauge >= 85 ? '安全圏' : gauge >= 70 ? '比較的安全' : gauge >= 50 ? '慎重判断' : '要確認'}
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
            {scenarioResults.map(sc => (
              <ComparisonCard
                key={sc.id}
                scenario={sc}
                base={baseResult}
                alt={sc.altResult}
                onAdopt={handleAdopt}
                adopted={adoptedId}
                hasHousing={hasHousing}
              />
            ))}
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
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{link.icon}</span>
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
              ※ 特定のサービスを推奨するものではありません。参考情報としてご利用ください。
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
          ※ 各比較は入力条件を変えた場合の概算です。実際の結果は個別の状況により異なります。
        </div>

      </div>
    </div>
  );
};
