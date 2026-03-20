// src/components/steps/ResultStep.jsx
import React from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { TabBar, ProgressRing, DiagnosisCard, AdviceCard } from '../ui.jsx';
import { RESULT_TABS, COLORS } from '../../constants.js';
import { runAllScenarios, calcSummaryStats, calcPensionEstimates } from '../../simulation.js';
import { generateDiagnosis, generateAdvice, calcLifePlanScore, getScoreRank } from '../../advice.js';
import { fmtMan, fmtManSign, fmtPct, safeNum } from '../../utils.js';

// ── Y軸フォーマッタ ──────────────────────
const fmtY = (v) => {
  const abs = Math.abs(v);
  if (abs >= 10000) return `${(v / 10000).toFixed(1)}億`;
  if (abs >= 1000)  return `${(v / 1000).toFixed(0)}千万`;
  if (abs >= 100)   return `${(v / 100).toFixed(0)}百万`;
  return `${v}万`;
};

// ── KPIカード ────────────────────────────
const KpiCard = ({ icon, label, value, sub, color = COLORS.primary }) => (
  <div style={{
    background: '#fffdf8',
    border: `1px solid ${COLORS.border}`,
    borderRadius: 16,
    padding: '14px 14px 12px',
    borderLeft: `4px solid ${color}`,
    boxShadow: `0 2px 8px ${color}15`,
  }}>
    <div style={{ fontSize: 22, marginBottom: 5 }}>{icon}</div>
    <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 5, fontWeight: 500 }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 5 }}>{sub}</div>}
  </div>
);

// ── 情報行 ───────────────────────────────
const InfoRow = ({ label, value, color = COLORS.text }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${COLORS.border}`, fontSize: 13 }}>
    <span style={{ color: COLORS.textMuted }}>{label}</span>
    <span style={{ fontWeight: 600, color }}>{value}</span>
  </div>
);

// ──────────────────────────────────────────
// サマリータブ
// ──────────────────────────────────────────
const SummaryTab = ({ rows, stats, form, diagnosis, score, rank, adviceList }) => {
  const retireRow = rows.find((r) => r.isRetired) || rows[rows.length - 1];
  const finalRow  = rows[rows.length - 1];
  const pension   = calcPensionEstimates(form);

  return (
    <div style={{ padding: '16px 16px 8px' }}>
      {/* スコア */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
        background: 'linear-gradient(135deg, #f0faf4 0%, #e8f5ee 100%)',
        borderRadius: 20, padding: '16px 18px',
        border: `1.5px solid ${COLORS.border}`,
      }}>
        <ProgressRing score={score} rank={rank} size={90} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600, marginBottom: 3 }}>🌳 ライフプランスコア</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: rank.color, lineHeight: 1 }}>{rank.label}</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 6, lineHeight: 1.5 }}>
            {score >= 80 ? '🎉 素晴らしい計画です！木がしっかり育っています。' :
             score >= 60 ? '🌿 概ね良好。さらに伸ばせる余地があります。' :
             score >= 40 ? '🌱 いくつかリスクがあります。改善提案を確認してみましょう。' :
             '⚠️ 早急な対策が必要です。改善提案を参照してください。'}
          </div>
        </div>
      </div>

      {/* KPI グリッド */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <KpiCard
          icon="🏦"
          label="退職時総資産"
          value={`${fmtMan(stats.retirementAsset)}万`}
          color={stats.retirementAsset >= 0 ? COLORS.primary : '#dc2626'}
        />
        <KpiCard
          icon="📊"
          label={`${safeNum(form.lifespan, 90)}歳時総資産`}
          value={`${fmtMan(stats.finalAsset)}万`}
          color={stats.finalAsset >= 0 ? COLORS.success : '#dc2626'}
        />
        <KpiCard
          icon="🏖️"
          label="年金月額（概算）"
          value={`${pension.totalMonthly}万/月`}
          color={COLORS.warning}
          sub="本人+配偶者合計"
        />
        <KpiCard
          icon="⚠️"
          label="資産枯渇年齢"
          value={stats.depletionAge ? `${stats.depletionAge}歳` : '枯渇なし'}
          color={stats.depletionAge ? '#dc2626' : COLORS.success}
        />
      </div>

      {/* 詳細数値 */}
      <div style={{ background: '#f3f8f3', borderRadius: 14, padding: '12px 14px', marginBottom: 16, border: `1px solid ${COLORS.border}` }}>
        <InfoRow label="退職時の現金・預金"   value={`${fmtMan(retireRow?.cash ?? 0)}万円`} />
        <InfoRow label="退職時のNISA残高"      value={`${fmtMan(retireRow?.nisa ?? 0)}万円`} />
        <InfoRow label="総教育費"              value={`${fmtMan(stats.totalEduCost)}万円`} />
        <InfoRow label="住宅ローン総支払額"    value={`${fmtMan(stats.totalMortgagePay)}万円`} />
        <InfoRow label="iDeCo節税総額（概算）" value={`${fmtMan(stats.totalIdecoTaxSaving)}万円`} color={COLORS.success} />
      </div>

      {/* 診断トップ5 */}
      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
        📋 診断結果
      </div>
      {diagnosis.slice(0, 5).map((d) => (
        <DiagnosisCard key={d.id} diagnosis={d} />
      ))}
    </div>
  );
};

// ──────────────────────────────────────────
// 資産推移タブ
// ──────────────────────────────────────────
const AssetsTab = ({ rows }) => {
  const data = rows.filter((_, i) => i % 1 === 0).map((r) => ({
    age: r.age,
    現預金:   Math.max(0, r.cash),
    一般投資: Math.max(0, r.investment),
    NISA:     Math.max(0, r.nisa),
    iDeCo:    Math.max(0, r.ideco),
    合計:     Math.max(0, r.totalAssets),
  }));

  const AssetTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s, p) => s + (p.value || 0), 0);
    return (
      <div style={{ background: '#fffdf8', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '10px 12px', fontSize: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}歳</div>
        {payload.map((p) => (
          <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: p.color }}>
            <span>{p.name}</span>
            <span style={{ fontWeight: 600 }}>{fmtMan(p.value)}万</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 4, paddingTop: 4, fontWeight: 700 }}>
          合計: {fmtMan(total)}万円
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '16px 0 8px' }}>
      <div style={{ fontSize: 13, color: '#6b7280', padding: '0 16px 8px' }}>
        資産推移（積み上げ表示）
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="age" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}歳`} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtY} width={52} />
          <Tooltip content={<AssetTip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="現預金"   stackId="1" stroke={COLORS.primary}  fill={COLORS.primary}  fillOpacity={0.7} />
          <Area type="monotone" dataKey="一般投資" stackId="1" stroke={COLORS.secondary} fill={COLORS.secondary} fillOpacity={0.7} />
          <Area type="monotone" dataKey="NISA"     stackId="1" stroke={COLORS.success}  fill={COLORS.success}  fillOpacity={0.7} />
          <Area type="monotone" dataKey="iDeCo"    stackId="1" stroke="#f97316"         fill="#f97316"         fillOpacity={0.7} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ──────────────────────────────────────────
// 収支推移タブ
// ──────────────────────────────────────────
const CashflowTab = ({ rows }) => {
  const data = rows.map((r) => ({
    age:   r.age,
    収入:  Math.round(r.totalIncome / 1),
    支出:  -Math.round(r.totalExpense / 1),
    収支:  Math.round(r.cashflow / 1),
  }));

  const CfTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: '#fffdf8', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '10px 12px', fontSize: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}歳</div>
        {payload.map((p) => (
          <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: p.color }}>
            <span>{p.name}</span>
            <span style={{ fontWeight: 600 }}>{fmtManSign(p.value)}万</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: '16px 0 8px' }}>
      <div style={{ fontSize: 13, color: '#6b7280', padding: '0 16px 8px' }}>
        年間収支推移
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="age" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}歳`} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtY} width={52} />
          <Tooltip content={<CfTip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" />
          <Bar dataKey="収入" fill={COLORS.primary}   fillOpacity={0.75} />
          <Bar dataKey="支出" fill="#f87171"           fillOpacity={0.75} />
          <Line type="monotone" dataKey="収支" stroke={COLORS.warning} strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ──────────────────────────────────────────
// 教育費タブ
// ──────────────────────────────────────────
const EducationTab = ({ rows, form }) => {
  const eduRows = rows.filter((r) => r.eduCost > 0);
  const data = rows.map((r) => ({ age: r.age, 教育費: r.eduCost }));

  if (eduRows.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
        <div>教育費が発生するイベントがありません</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 0 8px' }}>
      <div style={{ fontSize: 13, color: '#6b7280', padding: '0 16px 8px' }}>
        年間教育費
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="age" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}歳`} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtY} width={52} />
          <Tooltip formatter={(v) => [`${fmtMan(v)}万円`, '教育費']} labelFormatter={(v) => `${v}歳`} />
          <Bar dataKey="教育費" fill={COLORS.warning} fillOpacity={0.8} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div style={{ padding: '12px 16px' }}>
        {eduRows.map((r) => (
          <div key={r.age} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
            <span style={{ color: '#6b7280' }}>{r.age}歳時</span>
            <span style={{ fontWeight: 600 }}>{fmtMan(r.eduCost)}万円</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14, fontWeight: 700, color: COLORS.warning }}>
          <span>合計教育費</span>
          <span>{fmtMan(eduRows.reduce((s, r) => s + r.eduCost, 0))}万円</span>
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────
// 詳細表タブ
// ──────────────────────────────────────────
const DetailTab = ({ rows }) => {
  const cols = [
    { key: 'age',          label: '年齢',      fmt: (v) => `${v}歳` },
    { key: 'totalIncome',  label: '収入',      fmt: fmtMan },
    { key: 'totalExpense', label: '支出',      fmt: fmtMan },
    { key: 'cashflow',     label: '収支',      fmt: fmtManSign, color: (v) => v >= 0 ? COLORS.success : '#dc2626' },
    { key: 'cash',         label: '現預金',    fmt: fmtMan },
    { key: 'nisa',         label: 'NISA',       fmt: fmtMan },
    { key: 'investment',   label: '投資',      fmt: fmtMan },
    { key: 'ideco',        label: 'iDeCo',     fmt: fmtMan },
    { key: 'totalAssets',  label: '総資産',    fmt: fmtMan, color: (v) => v >= 0 ? COLORS.primary : '#dc2626' },
  ];

  return (
    <div style={{ overflowX: 'auto', padding: '0 0 8px' }}>
      <table style={{ minWidth: 620, borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
        <thead>
          <tr style={{ background: '#e8f5ee', position: 'sticky', top: 0 }}>
            {cols.map((c) => (
              <th key={c.key} style={{ padding: '8px 8px', textAlign: 'right', color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '2px solid #e5e7eb' }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.age}
              style={{
                background: row.isRetired ? '#fefce8' : '#fff',
                borderBottom: '1px solid #f3f4f6',
              }}
            >
              {cols.map((c) => {
                const val = row[c.key];
                const color = c.color ? c.color(val) : '#111827';
                return (
                  <td key={c.key} style={{ padding: '6px 8px', textAlign: 'right', color, fontWeight: c.key === 'totalAssets' || c.key === 'cashflow' ? 700 : 400 }}>
                    {c.fmt(val)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 11, color: '#9ca3af', padding: '8px 16px' }}>
        ※ 黄色背景行は退職後。単位: 万円。
      </div>
    </div>
  );
};

// ──────────────────────────────────────────
// シナリオ比較タブ
// ──────────────────────────────────────────
const ScenarioTab = ({ allScenarios, form }) => {
  const scenarios = {
    pessimistic: { label: '悲観シナリオ', color: '#ef4444' },
    standard:    { label: '標準シナリオ', color: COLORS.primary },
    optimistic:  { label: '楽観シナリオ', color: COLORS.success },
  };

  const data = allScenarios.standard.map((r, i) => ({
    age: r.age,
    悲観: allScenarios.pessimistic[i]?.totalAssets ?? 0,
    標準: r.totalAssets,
    楽観: allScenarios.optimistic[i]?.totalAssets ?? 0,
  }));

  return (
    <div style={{ padding: '16px 0 8px' }}>
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', flexWrap: 'wrap' }}>
        {Object.entries(scenarios).map(([k, s]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
            <div style={{ width: 12, height: 3, background: s.color, borderRadius: 2 }} />
            <span style={{ color: '#374151' }}>{s.label}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="age" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}歳`} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtY} width={52} />
          <Tooltip formatter={(v, name) => [`${fmtMan(v)}万円`, name]} labelFormatter={(v) => `${v}歳`} />
          <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" />
          <Line type="monotone" dataKey="悲観" stroke={scenarios.pessimistic.color} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="標準" stroke={scenarios.standard.color}    strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="楽観" stroke={scenarios.optimistic.color}  strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>

      {/* シナリオ比較表 */}
      <div style={{ padding: '12px 16px 0' }}>
        {Object.entries(scenarios).map(([key, s]) => {
          const rows = allScenarios[key];
          const stats = calcSummaryStats(rows, form);
          return (
            <div key={key} style={{ background: '#f5faf5', border: `1px solid ${s.color}30`, borderLeft: `4px solid ${s.color}`, borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: s.color, marginBottom: 6 }}>{s.label}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 12 }}>
                <span style={{ color: '#6b7280' }}>退職時総資産</span>
                <span style={{ fontWeight: 600 }}>{fmtMan(stats.retirementAsset)}万円</span>
                <span style={{ color: '#6b7280' }}>最終総資産</span>
                <span style={{ fontWeight: 600 }}>{fmtMan(stats.finalAsset)}万円</span>
                <span style={{ color: '#6b7280' }}>資産枯渇</span>
                <span style={{ fontWeight: 600, color: stats.depletionAge ? '#dc2626' : COLORS.success }}>
                  {stats.depletionAge ? `${stats.depletionAge}歳` : 'なし'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────
// 改善提案タブ
// ──────────────────────────────────────────
const AdviceTab = ({ score, rank, adviceList, diagnosis }) => (
  <div style={{ padding: '16px 16px 8px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 14px', background: `${rank.bg}`, border: `1px solid ${rank.border}`, borderRadius: 12 }}>
      <div style={{ fontSize: 36, fontWeight: 900, color: rank.color }}>{rank.rank}</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: rank.color }}>{rank.label}</div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>ライフプランスコア: {score}/100</div>
      </div>
    </div>

    {adviceList.length > 0 ? (
      <>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
          💡 改善できる項目
        </div>
        {adviceList.map((a) => <AdviceCard key={a.id} advice={a} />)}
      </>
    ) : (
      <div style={{ textAlign: 'center', padding: '24px 0', color: '#6b7280', fontSize: 14 }}>
        🎉 現在の計画は最適です！
      </div>
    )}

    <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
      📋 全診断項目
    </div>
    {diagnosis.map((d) => <DiagnosisCard key={d.id} diagnosis={d} />)}
  </div>
);

// ──────────────────────────────────────────
// メインコンポーネント
// ──────────────────────────────────────────
export const ResultStep = ({ form }) => {
  const [activeTab, setActiveTab] = React.useState('summary');

  const { allScenarios, stdRows, stats, diagnosis, score, rank, adviceList } = React.useMemo(() => {
    const allScenarios = runAllScenarios(form);
    const stdRows      = allScenarios.standard;
    const stats        = calcSummaryStats(stdRows, form);
    const diagnosis    = generateDiagnosis(stdRows, form, stats);
    const score        = calcLifePlanScore(diagnosis, stats, form);
    const rank         = getScoreRank(score);
    const adviceList   = generateAdvice(form, stdRows, stats);
    return { allScenarios, stdRows, stats, diagnosis, score, rank, adviceList };
  }, [form]);

  const tabContent = {
    summary:   <SummaryTab   rows={stdRows}      stats={stats}       form={form} diagnosis={diagnosis} score={score} rank={rank} adviceList={adviceList} />,
    assets:    <AssetsTab    rows={stdRows} />,
    cashflow:  <CashflowTab  rows={stdRows} />,
    education: <EducationTab rows={stdRows}       form={form} />,
    detail:    <DetailTab    rows={stdRows} />,
    scenario:  <ScenarioTab  allScenarios={allScenarios} form={form} />,
    advice:    <AdviceTab    score={score}        rank={rank}         adviceList={adviceList} diagnosis={diagnosis} />,
  };

  return (
    <div style={{ paddingBottom: 16 }}>
      <TabBar
        tabs={RESULT_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      {tabContent[activeTab]}
    </div>
  );
};
