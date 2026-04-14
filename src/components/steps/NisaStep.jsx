// src/components/steps/NisaStep.jsx
import { NumberStepper, SectionTitle, Divider } from '../ui.jsx';
import { NISA_LIMITS, COLORS } from '../../constants.js';
import { fmtMan, safeNum } from '../../utils.js';

const NISA_MONTHLY_MAX = 30; // 万円/月（年360万円）

const st = {
  wrap: { padding: '16px 16px 8px' },
  lifetimeBar: {
    background: '#f5f3ff',
    border: '1px solid #ddd6fe',
    borderRadius: 10,
    padding: '12px 14px',
    marginBottom: 12,
  },
  barTitle: { fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 },
  track: {
    height: 14,
    background: '#e5e7eb',
    borderRadius: 7,
    overflow: 'hidden',
    marginBottom: 6,
  },
  fill: (pct) => ({
    height: '100%',
    width: `${Math.min(pct, 100)}%`,
    background: pct >= 100
      ? '#dc2626'
      : `linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%)`,
    borderRadius: 7,
    transition: 'width 0.3s ease',
  }),
  barMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    color: '#6b7280',
  },
  barUsed: {
    fontWeight: 700,
    color: '#8b5cf6',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    marginBottom: 6,
    alignItems: 'center',
  },
  summaryLabel: { color: '#6b7280' },
  summaryValue: { fontWeight: 700, color: '#4f46e5' },
  infoCard: {
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 12,
    color: '#92400e',
    lineHeight: 1.6,
    marginBottom: 12,
  },
};

const SummaryRow = ({ label, value }) => (
  <div style={st.summaryRow}>
    <span style={st.summaryLabel}>{label}</span>
    <span style={st.summaryValue}>{value}</span>
  </div>
);

export const NisaStep = ({ form, onChange, errors = {} }) => {
  const nisaMonthly     = safeNum(form.nisaMonthly, 0);
  const nisaCumContrib  = safeNum(form.nisaCumContrib, 0);
  const generalMonthly  = safeNum(form.generalInvestMonthly, 0);

  const lifetimeMax     = NISA_LIMITS.lifetimeMax;      // 1800万円
  const annualMax       = NISA_LIMITS.annualMax;         // 360万円
  const usedPct         = (nisaCumContrib / lifetimeMax) * 100;
  const remaining       = Math.max(0, lifetimeMax - nisaCumContrib);
  const annualContrib   = Math.min(nisaMonthly * 12, annualMax);
  const yearsToFull     = annualContrib > 0 ? Math.ceil(remaining / annualContrib) : null;

  return (
    <div style={st.wrap}>
      <SectionTitle icon="📈" title="NISA（つみたて投資枠・成長投資枠）" />

      {/* NISA累計残高と非課税枠 */}
      <div style={st.lifetimeBar}>
        <div style={st.barTitle}>非課税枠の利用状況（生涯1,800万円）</div>
        <div style={st.track}>
          <div style={st.fill(usedPct)} />
        </div>
        <div style={st.barMeta}>
          <span>使用済み: <span style={st.barUsed}>{fmtMan(nisaCumContrib)}万円</span></span>
          <span>残り: <span style={st.barUsed}>{fmtMan(remaining)}万円</span></span>
        </div>
        {usedPct >= 100 && (
          <div style={{ marginTop: 6, fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
            ! 生涯非課税枠（1,800万円）に達しています
          </div>
        )}
      </div>

      <NumberStepper
        label="NISA 月額積立額"
        value={nisaMonthly}
        onChange={(v) => onChange('nisaMonthly', Math.min(v, NISA_MONTHLY_MAX))}
        min={0}
        max={NISA_MONTHLY_MAX}
        step={0.5}
        unit="万円/月"
        decimal={1}
        help={`年間上限: ${annualMax}万円（月${NISA_MONTHLY_MAX}万円）`}
        error={errors.nisaMonthly}
      />

      <NumberStepper
        label="NISA 累計拠出済み額"
        value={nisaCumContrib}
        onChange={(v) => onChange('nisaCumContrib', Math.min(v, lifetimeMax))}
        min={0}
        max={lifetimeMax}
        step={10}
        unit="万円"
        help="これまでにNISAへ投資した合計額（残高ではなく投資元本）"
      />

      {nisaMonthly > 0 && remaining > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SummaryRow
            label="年間積立額"
            value={`${fmtMan(annualContrib)}万円/年`}
          />
          {yearsToFull && (
            <SummaryRow
              label="満額まであと"
              value={`約${yearsToFull}年`}
            />
          )}
        </div>
      )}

      <div style={st.infoCard}>
        新NISAは2024年〜。年360万円・生涯1,800万円まで非課税で投資可能。
        売却した投資枠は翌年以降に復活します（生涯枠は復活しません）。
      </div>

      <Divider label="一般投資（課税口座）" />

      <NumberStepper
        label="一般投資 月額積立額"
        value={generalMonthly}
        onChange={(v) => onChange('generalInvestMonthly', v)}
        min={0}
        max={100}
        step={0.5}
        unit="万円/月"
        decimal={1}
        help="NISA満額後などに課税口座で積み立てる金額"
      />
    </div>
  );
};
