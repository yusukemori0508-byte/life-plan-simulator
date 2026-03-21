// src/components/ScenarioComparison.jsx
// 住宅購入プラン比較パネル
// 基準プランに対して条件変更シナリオを比較表示する

import React from 'react';
import { runFullSimulation } from '../simulationEngine.js';
import { useAppStore } from '../store/useAppStore.jsx';

const C = {
  text:     '#111827',
  muted:    '#6b7280',
  border:   '#e5e7eb',
  green:    '#16a34a',
  greenBg:  '#f0fdf4',
  greenDark:'#14532d',
  amber:    '#d97706',
  amberBg:  '#fffbeb',
  red:      '#dc2626',
  redBg:    '#fef2f2',
  white:    '#ffffff',
  slate:    '#334155',
  slateBg:  '#f1f5f9',
};

// ── 住宅購入判定ラベル ────────────────────────────────────────
const judgeHousing = (h) => {
  if (!h) return { label: '—', color: C.muted, order: -1 };
  const { repaymentBurdenSeverity: sev, minAssetPost5, savingsAtPurchase } = h;
  const danger  = sev === 'danger'
    || (minAssetPost5    != null && minAssetPost5    < 0)
    || (savingsAtPurchase != null && savingsAtPurchase < 0);
  const caution = !danger && (
    sev === 'warn'
    || (minAssetPost5    != null && minAssetPost5    < 200)
    || (savingsAtPurchase != null && savingsAtPurchase < 200)
  );
  return danger  ? { label: '危険', color: C.red,   order: 0 }
       : caution ? { label: '慎重', color: C.amber, order: 1 }
                 : { label: '安全', color: C.green, order: 2 };
};

// ── メトリクス抽出 ────────────────────────────────────────────
const extractMetrics = (result) => ({
  gauge:          result.safetySummary.gauge,
  housingJudge:   judgeHousing(result.housingDetail),
  savingsAtPurch: result.housingDetail?.savingsAtPurchase ?? null,
  minAssetPost5:  result.housingDetail?.minAssetPost5     ?? null,
  collapseAge:    result.collapseAge,
  retireAsset:    result.summary.retirementAsset,
});

// ── シナリオ定義 ───────────────────────────────────────────────
const buildScenarios = (profile) => {
  const pa      = Number(profile.housingPurchaseAge ?? 0);
  const pp      = Number(profile.propertyPrice      ?? 3500);
  const dp      = Number(profile.downPayment        ?? Math.round(pp * 0.1));
  const savings = Number(profile.currentSavings     ?? 0);

  if (pa === 0) {
    const inv = Number(profile.monthlyInvestment) || 3;
    const exp = Number(profile.monthlyExpense)    || 20;
    return [
      { id: 'invest+', label: '投資+2万/月にする', icon: '📈', diff: { monthlyInvestment: inv + 2 } },
      { id: 'exp-',    label: '支出-2万/月にする', icon: '💰', diff: { monthlyExpense: Math.max(8, exp - 2) } },
    ];
  }

  const newPp = Math.max(1000, pp - 500);

  // 「頭金を増やす」プリセット: 現在の貯蓄でどこまで増やせるかを判定
  // dp+500 が貯蓄上限を超える場合はプリセット内容を調整
  let downScenario;
  const dpPlus500 = dp + 500;
  if (dpPlus500 <= savings) {
    // 通常ケース: +500万が貯蓄内に収まる
    downScenario = { id: 'down+', label: `頭金を500万増やす`, icon: '💰', diff: { downPayment: dpPlus500 } };
  } else if (savings > dp + 50) {
    // 貯蓄で増やせる範囲に調整（+500万は無理だが、ある程度増やせる）
    const maxDp = savings;
    const addAmt = maxDp - dp;
    downScenario = {
      id: 'down+',
      label: `頭金を${addAmt}万増やす`,
      icon: '💰',
      diff: { downPayment: maxDp },
    };
  } else {
    // 頭金をこれ以上増やせない → 代替として購入価格を下げるシナリオ
    const altPp = Math.max(1000, pp - 500);
    downScenario = { id: 'price2-', label: `価格をさらに下げる（${altPp}万）`, icon: '🏷️', diff: { propertyPrice: altPp } };
  }

  return [
    { id: 'later3', label: `${pa + 3}歳に購入する`, icon: '⏳', diff: { housingPurchaseAge: pa + 3 } },
    downScenario,
    { id: 'price-', label: `価格を500万下げる`,      icon: '🏷️', diff: { propertyPrice: newPp } },
  ];
};

// ── 数値フォーマット ──────────────────────────────────────────
const fmtV = (v, key) => {
  if (v === null || v === undefined) return '—';
  if (key === 'gauge')        return String(v);
  if (key === 'housingJudge') return v.label;
  if (key === 'collapseAge')  return v ? `${v}歳` : 'なし';
  const a = Math.abs(Math.round(v));
  const s = v < 0 ? '-' : '';
  if (a >= 10000) return `${s}${(a / 10000).toFixed(1)}億`;
  return `${s}${a.toLocaleString()}万`;
};

// ── 指標定義 ──────────────────────────────────────────────────
const METRICS = [
  { key: 'gauge',          label: '家計安全度',    higherBetter: true,  showDiff: true  },
  { key: 'housingJudge',   label: '住宅購入判定',  higherBetter: null,  showDiff: false },
  { key: 'savingsAtPurch', label: '購入年末残高',  higherBetter: true,  showDiff: true  },
  { key: 'minAssetPost5',  label: '購入後5年最低', higherBetter: true,  showDiff: true  },
  { key: 'collapseAge',    label: '資金ショート',   higherBetter: false, showDiff: false },
  { key: 'retireAsset',    label: '退職時資産',     higherBetter: true,  showDiff: true  },
];

// ── 比較サマリー（短い箇条書き形式）────────────────────────
const buildSummaryItems = (base, alt) => {
  if (!alt) return [];
  const items = [];

  // 住宅余力系3指標
  const housing = [
    { key: 'savingsAtPurch', label: '購入時残貯蓄' },
    { key: 'minAssetPost5',  label: '購入後5年最低' },
    { key: 'retireAsset',    label: '退職時資産' },
  ];
  let housingImproved = false;
  for (const { key, label } of housing) {
    const bv = base[key]; const av = alt[key];
    if (typeof bv !== 'number' || typeof av !== 'number') continue;
    const diff = Math.round(av - bv);
    if (Math.abs(diff) < 50) continue;
    housingImproved = housingImproved || diff > 0;
    const sign = diff > 0 ? '+' : '';
    items.push({
      type: diff > 0 ? 'good' : 'bad',
      text: `${label} ${sign}${diff.toLocaleString()}万`,
    });
  }

  // 住宅購入判定
  const bj = base.housingJudge?.order ?? -1;
  const aj = alt.housingJudge?.order  ?? -1;
  if (aj > bj) items.push({ type: 'good', text: `住宅購入判定が「${alt.housingJudge?.label}」に改善` });
  else if (aj < bj) items.push({ type: 'bad', text: `住宅購入判定が「${alt.housingJudge?.label}」に悪化` });

  // 家計安全度
  const gaugeDiff = (alt.gauge ?? 0) - (base.gauge ?? 0);
  if (Math.abs(gaugeDiff) >= 3) {
    items.push({
      type: gaugeDiff > 0 ? 'good' : 'bad',
      text: `家計安全度 ${gaugeDiff > 0 ? '+' : ''}${gaugeDiff}点`,
    });
  } else {
    items.push({ type: 'neutral', text: '家計安全度は同水準' });
    if (housingImproved) {
      items.push({ type: 'neutral', text: '住宅購入後の余力が改善' });
    }
  }

  return items.slice(0, 4);
};

// ── diff列テキスト ────────────────────────────────────────────
const getDiffText = (bv, av, key, higherBetter) => {
  if (key === 'housingJudge' || key === 'collapseAge') return null;
  if (typeof bv !== 'number' || typeof av !== 'number') return null;

  if (key === 'gauge') {
    const d = Math.round(av - bv);
    if (Math.abs(d) < 1) return { label: '同水準', isGood: null, noChange: true };
    return { label: `${d > 0 ? '+' : ''}${d}`, isGood: higherBetter ? d > 0 : d < 0, noChange: false };
  }

  const d = Math.round(av - bv);
  if (Math.abs(d) < 50) return { label: '変化なし', isGood: null, noChange: true };
  const abs = Math.abs(d);
  const sign = d > 0 ? '+' : '-';
  const label = abs >= 10000
    ? `${sign}${(abs / 10000).toFixed(1)}億`
    : `${sign}${abs.toLocaleString()}万`;
  return { label, isGood: higherBetter ? d > 0 : d < 0, noChange: false };
};

// ── メインコンポーネント ──────────────────────────────────────
export const ScenarioComparison = ({ profileData, selectedChoices }) => {
  const { actions } = useAppStore();
  const scenarios = React.useMemo(() => buildScenarios(profileData), [profileData]);
  const [activeId, setActiveId] = React.useState(scenarios[0]?.id ?? null);
  const [adopted, setAdopted]   = React.useState(false);

  // 基準シナリオ
  const baseResult  = React.useMemo(
    () => runFullSimulation(profileData, selectedChoices),
    [profileData, selectedChoices],
  );
  const baseMetrics = React.useMemo(() => extractMetrics(baseResult), [baseResult]);

  // 選択中の比較シナリオ
  const activeSc = scenarios.find(s => s.id === activeId);
  const altResult = React.useMemo(() => {
    if (!activeSc) return null;
    return runFullSimulation({ ...profileData, ...activeSc.diff }, selectedChoices);
  }, [activeSc, profileData, selectedChoices]);
  const altMetrics = altResult ? extractMetrics(altResult) : null;

  const summaryItems = React.useMemo(
    () => buildSummaryItems(baseMetrics, altMetrics),
    [baseMetrics, altMetrics],
  );

  // この案を採用して入力画面に戻る
  const handleAdopt = () => {
    if (!activeSc?.diff) return;
    actions.setProfile({ ...profileData, ...activeSc.diff });
    // 入力画面に渡すトーストメッセージをセット
    window.__scenarioAdoptedMsg = `「${activeSc.label}」の条件を反映しました`;
    setAdopted(true);
    setTimeout(() => {
      actions.setScreen('input');
    }, 400);
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif' }}>

      {/* ── シナリオ選択エリア ─────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
        {/* 基準プランバッジ（控えめな青グレー） */}
        <div style={{
          flex: '0 0 auto', padding: '10px 12px 8px',
          borderRadius: 12, border: '1.5px solid #cbd5e1',
          background: '#f1f5f9', textAlign: 'center', minWidth: 64,
        }}>
          <div style={{ fontSize: 16, marginBottom: 4 }}>📊</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>基準プラン</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', color: C.muted, fontSize: 14, padding: '0 2px' }}>vs</div>

        {/* 比較シナリオボタン */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${scenarios.length}, 1fr)`, gap: 6, flex: 1 }}>
          {scenarios.map(s => {
            const isActive = s.id === activeId;
            return (
              <button
                key={s.id}
                onClick={() => { setActiveId(s.id); setAdopted(false); }}
                style={{
                  padding: '10px 4px 8px', borderRadius: 12, cursor: 'pointer',
                  border: isActive ? `2px solid ${C.green}` : `1.5px solid ${C.border}`,
                  background: isActive ? '#dcfce7' : C.white,
                  transition: 'all 0.13s',
                  boxShadow: isActive ? `0 2px 8px rgba(22,163,74,0.18)` : 'none',
                }}
              >
                <div style={{ fontSize: 16, marginBottom: 4 }}>{s.icon}</div>
                <div style={{
                  fontSize: 10, fontWeight: 700, lineHeight: 1.35,
                  color: isActive ? C.greenDark : C.text,
                }}>{s.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 比較サマリー（短い箇条書き）────────────────────────── */}
      {altMetrics && summaryItems.length > 0 && (
        <div style={{
          marginTop: 10, marginBottom: 10,
          padding: '10px 14px', borderRadius: 12,
          background: '#f8fafc', border: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {summaryItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: 13, flexShrink: 0,
                color: item.type === 'good' ? C.green : item.type === 'bad' ? C.red : C.muted,
              }}>
                {item.type === 'good' ? '↑' : item.type === 'bad' ? '↓' : '＝'}
              </span>
              <span style={{
                fontSize: 12, fontWeight: item.type === 'neutral' ? 400 : 700,
                color: item.type === 'good' ? C.greenDark : item.type === 'bad' ? C.red : C.slate,
              }}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── 比較テーブル（指標 | 基準 | 比較案 | 差分）───────── */}
      {altMetrics ? (
        <>
          <div style={{ background: C.white, borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.border}` }}>
            {/* ヘッダー */}
            <div style={{
              display: 'grid', gridTemplateColumns: '4fr 3fr 3fr 2.5fr',
              background: '#f8fafc', borderBottom: `1px solid ${C.border}`,
              padding: '7px 10px',
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.muted }}>指標</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#4338ca', textAlign: 'center' }}>基準</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.green, textAlign: 'center' }}>{activeSc?.label}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textAlign: 'center' }}>差分</div>
            </div>

            {METRICS.map((m, idx) => {
              const bv = baseMetrics[m.key];
              const av = altMetrics[m.key];

              // 改善・悪化判定（alt列の色）
              let better = null;
              if (m.key === 'housingJudge') {
                const bo = bv?.order ?? -1; const ao = av?.order ?? -1;
                better = ao > bo ? true : ao < bo ? false : null;
              } else if (m.key === 'collapseAge') {
                if (bv !== null && av === null)      better = true;
                else if (bv === null && av !== null) better = false;
              } else if (m.higherBetter !== null && typeof bv === 'number' && typeof av === 'number') {
                const d = av - bv;
                if (Math.abs(d) >= 1) better = m.higherBetter ? d > 0 : d < 0;
              }
              const altColor = better === true ? C.green : better === false ? C.red : C.text;

              // 差分セル
              const diffInfo = m.showDiff ? getDiffText(bv, av, m.key, m.higherBetter) : null;

              return (
                <div key={m.key} style={{
                  display: 'grid', gridTemplateColumns: '4fr 3fr 3fr 2.5fr',
                  padding: '9px 10px', alignItems: 'center',
                  borderBottom: idx < METRICS.length - 1 ? '1px solid #f1f5f9' : 'none',
                  background: idx % 2 ? '#fafafa' : 'transparent',
                }}>
                  <div style={{ fontSize: 11, color: C.muted }}>{m.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, textAlign: 'center', color: m.key === 'housingJudge' ? bv?.color : C.text }}>
                    {fmtV(bv, m.key)}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, textAlign: 'center', color: m.key === 'housingJudge' ? av?.color : altColor }}>
                    {fmtV(av, m.key)}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    {diffInfo ? (
                      <span style={{
                        fontSize: diffInfo.noChange ? 9 : 10,
                        fontWeight: diffInfo.noChange ? 400 : 700,
                        color: diffInfo.noChange
                          ? '#9ca3af'
                          : diffInfo.isGood ? C.green : C.red,
                      }}>
                        {diffInfo.label}
                      </span>
                    ) : (
                      <span style={{ fontSize: 9, color: '#d1d5db' }}>—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── 「この案を採用」ボタン ──────────────────────────── */}
          <div style={{ marginTop: 12 }}>
            <button
              onClick={handleAdopt}
              disabled={adopted}
              style={{
                width: '100%',
                padding: '13px 20px', borderRadius: 999,
                border: `1.5px solid ${C.green}`,
                background: adopted ? C.greenBg : C.white,
                color: C.green,
                fontSize: 14, fontWeight: 700, cursor: adopted ? 'default' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {adopted ? '✓ 条件を反映しました' : 'この条件を採用する'}
            </button>
            {!adopted && (
              <div style={{ marginTop: 5, textAlign: 'center', fontSize: 10, color: C.muted }}>
                入力画面でさらに細かく調整できます
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{
          padding: '16px', textAlign: 'center', color: C.muted,
          fontSize: 12, background: '#fafafa',
          borderRadius: 12, border: `1px solid ${C.border}`,
        }}>
          上のシナリオを選んで比較
        </div>
      )}
    </div>
  );
};
