// src/components/steps/ExpenseStep.jsx
import { NumberStepper, SectionTitle, Divider } from '../ui.jsx';
import { COLORS } from '../../constants.js';
import { fmtMan, safeNum } from '../../utils.js';

const st = {
  wrap: { padding: '16px 16px 8px' },
  assetBar: {
    marginTop: 12,
    marginBottom: 16,
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: '12px 14px',
  },
  barTitle: { fontSize: 12, color: '#6b7280', marginBottom: 8, fontWeight: 600 },
  barTrack: {
    height: 16,
    background: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
    display: 'flex',
    marginBottom: 8,
  },
  barLegend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px 12px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 11,
    color: '#374151',
  },
  legendDot: (color) => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
  }),
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 14,
    fontWeight: 700,
    color: '#111827',
    marginTop: 10,
    paddingTop: 10,
    borderTop: '1px solid #e5e7eb',
  },
  investNote: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
};

const ASSET_COLORS = {
  emergency: '#f59e0b',
  cash:      COLORS.primary,
  invest:    COLORS.secondary,
  nisa:      COLORS.success,
  ideco:     '#f97316',
};

const AssetBar = ({ cash, emergencyFund, investment, nisa, ideco }) => {
  const total = cash + emergencyFund + investment + nisa + ideco;
  if (total <= 0) return null;

  const segments = [
    { key: 'emergency', label: '緊急予備',   value: emergencyFund, color: ASSET_COLORS.emergency },
    { key: 'cash',      label: '現金・預金', value: cash,          color: ASSET_COLORS.cash },
    { key: 'invest',    label: '一般投資',   value: investment,    color: ASSET_COLORS.invest },
    { key: 'nisa',      label: 'NISA',        value: nisa,          color: ASSET_COLORS.nisa },
    { key: 'ideco',     label: 'iDeCo',       value: ideco,         color: ASSET_COLORS.ideco },
  ].filter((s) => s.value > 0);

  return (
    <div style={st.assetBar}>
      <div style={st.barTitle}>現在の資産内訳</div>
      <div style={st.barTrack}>
        {segments.map((s) => (
          <div
            key={s.key}
            style={{
              width: `${(s.value / total) * 100}%`,
              background: s.color,
              minWidth: s.value > 0 ? 2 : 0,
            }}
          />
        ))}
      </div>
      <div style={st.barLegend}>
        {segments.map((s) => (
          <div key={s.key} style={st.legendItem}>
            <div style={st.legendDot(s.color)} />
            <span>{s.label}: {fmtMan(s.value)}万</span>
          </div>
        ))}
      </div>
      <div style={st.totalRow}>
        <span>合計資産</span>
        <span>{fmtMan(total)}万円</span>
      </div>
    </div>
  );
};

export const ExpenseStep = ({ form, onChange, errors = {} }) => {
  const monthlyExpense      = safeNum(form.monthlyExpense, 20);
  const retireMonthlyExpense = safeNum(form.retireMonthlyExpense, 15);
  const emergencyFund       = safeNum(form.emergencyFund, 0);
  const currentCash         = safeNum(form.currentCash, 0);
  const currentInvestment   = safeNum(form.currentInvestment, 0);
  const currentNisa         = safeNum(form.currentNisa, 0);
  const currentIdeco        = safeNum(form.currentIdeco, 0);

  const investableCash = Math.max(0, currentCash - emergencyFund);

  return (
    <div style={st.wrap}>
      <SectionTitle icon="💸" title="生活費" />

      <NumberStepper
        label="現役時の月間生活費"
        value={monthlyExpense}
        onChange={(v) => onChange('monthlyExpense', v)}
        min={5}
        max={100}
        step={0.5}
        unit="万円/月"
        decimal={1}
        help="家賃・住宅ローン以外の生活費"
        error={errors.monthlyExpense}
      />

      <NumberStepper
        label="老後の月間生活費"
        value={retireMonthlyExpense}
        onChange={(v) => onChange('retireMonthlyExpense', v)}
        min={5}
        max={80}
        step={0.5}
        unit="万円/月"
        decimal={1}
        help="退職後の月間支出（一般的に現役時の70〜80%）"
      />

      <Divider label="緊急予備資金" />

      <NumberStepper
        label="緊急予備資金（シミュレーション対象外）"
        value={emergencyFund}
        onChange={(v) => onChange('emergencyFund', v)}
        min={0}
        max={500}
        step={10}
        unit="万円"
        help="生活費3〜6ヶ月分が目安。投資せず確保しておく額"
      />

      <Divider label="現在の資産" />

      <NumberStepper
        label="現金・預貯金（合計）"
        value={currentCash}
        onChange={(v) => onChange('currentCash', v)}
        min={0}
        max={50000}
        step={10}
        unit="万円"
        error={errors.currentCash}
      />

      {investableCash > 0 && (
        <div style={st.investNote}>
          💡 緊急予備資金を差し引いた運用可能な現金: {fmtMan(investableCash)}万円
        </div>
      )}

      <NumberStepper
        label="一般投資（株・投信など）"
        value={currentInvestment}
        onChange={(v) => onChange('currentInvestment', v)}
        min={0}
        max={50000}
        step={10}
        unit="万円"
      />

      <NumberStepper
        label="NISA残高（現在）"
        value={currentNisa}
        onChange={(v) => onChange('currentNisa', v)}
        min={0}
        max={1800}
        step={10}
        unit="万円"
      />

      <NumberStepper
        label="iDeCo残高（現在）"
        value={currentIdeco}
        onChange={(v) => onChange('currentIdeco', v)}
        min={0}
        max={5000}
        step={10}
        unit="万円"
      />

      <AssetBar
        cash={investableCash}
        emergencyFund={emergencyFund}
        investment={currentInvestment}
        nisa={currentNisa}
        ideco={currentIdeco}
      />
    </div>
  );
};
