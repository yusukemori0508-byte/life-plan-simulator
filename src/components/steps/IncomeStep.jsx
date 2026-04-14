// src/components/steps/IncomeStep.jsx
import { Toggle, NumberStepper, Select, SectionTitle, Divider } from '../ui.jsx';
import { IDECO_MONTHLY_LIMITS } from '../../constants.js';
import {
  calcNetIncome,
  calcIdecoAnnualTaxSaving,
  estimatePension,
  fmtMan,
  safeNum,
} from '../../utils.js';

const INCOME_GROWTH_OPTIONS = [
  { value: '0',   label: '0%（昇給なし）' },
  { value: '0.5', label: '0.5%（微増）' },
  { value: '1.0', label: '1.0%（標準）' },
  { value: '1.5', label: '1.5%（やや高め）' },
  { value: '2.0', label: '2.0%（高め）' },
  { value: '3.0', label: '3.0%（高成長）' },
];

// ★ 修正: 小数値の文字列をオプション値として使用（0.20 → "0.2" のマッチングのため）
const IDECO_TAX_RATE_OPTIONS = [
  { value: '0',    label: '0%（課税なし）' },
  { value: '0.05', label: '5%（低所得）' },
  { value: '0.10', label: '10%' },
  { value: '0.20', label: '20%（標準）' },
  { value: '0.23', label: '23%' },
  { value: '0.33', label: '33%' },
  { value: '0.40', label: '40%' },
  { value: '0.45', label: '45%（最高税率）' },
];

// ★ 修正: 小数値の文字列をオプション値として使用
const IDECO_RECEIVE_TAX_RATE_OPTIONS = [
  { value: '0',    label: '0%（退職所得控除内）' },
  { value: '0.05', label: '5%（小額）' },
  { value: '0.10', label: '10%' },
  { value: '0.15', label: '15%（目安）' },
  { value: '0.20', label: '20%' },
];

const st = {
  wrap: { padding: '16px 16px 8px' },
  infoCard: {
    background: '#f0fdf4', border: '1px solid #bbf7d0',
    borderRadius: 10, padding: '12px 14px', marginBottom: 12,
  },
  infoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, fontSize: 13 },
  infoLabel: { color: '#6b7280' },
  infoValue:  { fontWeight: 700, color: '#059669' },
  idecoCard: {
    background: '#fffbeb', border: '1px solid #fde68a',
    borderRadius: 10, padding: '12px 14px', marginBottom: 12,
  },
  idecoRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 },
  pensionCard: {
    background: '#eff6ff', border: '1px solid #bfdbfe',
    borderRadius: 10, padding: '12px 14px', marginBottom: 12,
  },
};

export const IncomeStep = ({ form, onChange, errors = {} }) => {
  const income     = safeNum(form.selfIncome, 0);
  const isSelf     = !!form.isSelfEmployed;
  const currentAge = safeNum(form.currentAge, 30);
  const retireAge  = safeNum(form.retirementAge, 65);

  const idecoLimit   = isSelf ? IDECO_MONTHLY_LIMITS.selfEmployed : IDECO_MONTHLY_LIMITS.employee;
  const idecoMonthly = Math.min(safeNum(form.idecoMonthly, 0), idecoLimit);

  // ★ 修正: idecoTaxRate は小数値（0.20 = 20%）で保存されている
  const idecoTaxRate = safeNum(form.idecoTaxRate, 0.20);
  const taxSaving    = calcIdecoAnnualTaxSaving(idecoMonthly, idecoTaxRate);

  const netIncome = income > 0 ? calcNetIncome(income, isSelf) : 0;

  const pension = estimatePension({
    annualIncome:   income,
    currentAge,
    retirementAge:  retireAge,
    isSelfEmployed: isSelf,
  });

  return (
    <div style={st.wrap}>
      <SectionTitle icon="💰" title="収入" />

      <NumberStepper
        label="年収（税込み）"
        value={income}
        onChange={(v) => onChange('selfIncome', v)}
        min={0}
        max={5000}
        step={10}
        unit="万円"
        error={errors.selfIncome}
      />

      {/* 手取り概算 */}
      {income > 0 && (
        <div style={st.infoCard}>
          <div style={st.infoRow}>
            <span style={st.infoLabel}>手取り概算</span>
            <span style={st.infoValue}>{fmtMan(netIncome)}万円/年</span>
          </div>
          <div style={st.infoRow}>
            <span style={st.infoLabel}>月額換算</span>
            <span style={st.infoValue}>{fmtMan(Math.round(netIncome / 12))}万円/月</span>
          </div>
        </div>
      )}

      <Toggle
        label="自営業・フリーランス"
        checked={isSelf}
        onChange={(v) => onChange('isSelfEmployed', v)}
      />

      <Select
        label="年収増加率（昇給率）"
        value={String(safeNum(form.incomeGrowthRate, 1.0))}
        onChange={(v) => onChange('incomeGrowthRate', Number(v))}
        options={INCOME_GROWTH_OPTIONS}
        help="毎年の収入増加の目安（48歳以降は緩やかに逓減）"
      />

      <Divider label="iDeCo（個人型確定拠出年金）" />

      <NumberStepper
        label="iDeCo 月額掛金"
        value={idecoMonthly}
        onChange={(v) => onChange('idecoMonthly', Math.min(v, idecoLimit))}
        min={0}
        max={idecoLimit}
        step={0.1}
        unit="万円/月"
        decimal={1}
        help={`上限: ${idecoLimit}万円/月（${isSelf ? '自営業' : '会社員'}）`}
      />

      {idecoMonthly > 0 && (
        <div style={st.idecoCard}>
          <div style={st.idecoRow}>
            <span style={{ color: '#92400e' }}>年間掛金</span>
            <span style={{ fontWeight: 700 }}>{fmtMan(idecoMonthly * 12)}万円</span>
          </div>
          <div style={st.idecoRow}>
            <span style={{ color: '#92400e' }}>年間節税額（概算）</span>
            <span style={{ fontWeight: 700, color: '#059669' }}>▲{fmtMan(taxSaving)}万円</span>
          </div>
        </div>
      )}

      {/* ★ 修正: value は小数文字列 ("0.20")、onChange はそのまま Number に変換 */}
      <Select
        label="所得税+住民税率（iDeCo節税計算用）"
        value={String(idecoTaxRate)}
        onChange={(v) => onChange('idecoTaxRate', Number(v))}
        options={IDECO_TAX_RATE_OPTIONS}
      />

      {/* ★ 修正: value は小数文字列、onChange はそのまま Number に変換（/100 は不要） */}
      <Select
        label="iDeCo受取時の実効税率"
        value={String(safeNum(form.idecoReceiveTaxRate, 0))}
        onChange={(v) => onChange('idecoReceiveTaxRate', Number(v))}
        options={IDECO_RECEIVE_TAX_RATE_OPTIONS}
        help="退職所得控除を超えた場合の課税率"
      />

      <Divider label="年金概算（参考）" />

      <div style={st.pensionCard}>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
          現在の設定での年金受給額（65歳以降）
        </div>
        <div style={st.infoRow}>
          <span style={st.infoLabel}>月額概算</span>
          <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{pension.monthly}万円/月</span>
        </div>
        <div style={st.infoRow}>
          <span style={st.infoLabel}>年額概算</span>
          <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{fmtMan(pension.annual)}万円/年</span>
        </div>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
          * 試算値。実際の年金は日本年金機構で確認ください。
        </div>
      </div>
    </div>
  );
};
