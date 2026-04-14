// src/components/steps/HousingStep.jsx
import { Select, NumberStepper, SectionTitle, Alert } from '../ui.jsx';
import { COLORS } from '../../constants.js';
import {
  calcMonthlyMortgage,
  calcLoanAmount,
  calcMortgageIncomeRatio,
  fmtMan,
  safeNum,
} from '../../utils.js';

const MORTGAGE_RATE_OPTIONS = [
  { value: '0.5',  label: '0.5%（変動・最低水準）' },
  { value: '0.7',  label: '0.7%（変動・低め）' },
  { value: '1.0',  label: '1.0%（変動・標準）' },
  { value: '1.3',  label: '1.3%（変動・やや高め）' },
  { value: '1.5',  label: '1.5%（固定10年）' },
  { value: '1.8',  label: '1.8%（フラット35等）' },
  { value: '2.0',  label: '2.0%（固定・標準）' },
  { value: '2.5',  label: '2.5%（固定・高め）' },
  { value: '3.0',  label: '3.0%（将来上昇リスク）' },
];

const MORTGAGE_TERM_OPTIONS = [
  { value: '20', label: '20年' },
  { value: '25', label: '25年' },
  { value: '30', label: '30年' },
  { value: '35', label: '35年（最長）' },
];

const HOUSING_TYPE_OPTIONS = [
  { value: 'rent',           label: '賃貸' },
  { value: 'own',            label: '持ち家（すでに購入済み）' },
  { value: 'future_purchase', label: '将来購入予定' },
];

const st = {
  wrap: { padding: '16px 16px 8px' },
  loanCard: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 10,
    padding: '12px 14px',
    marginTop: 12,
    marginBottom: 12,
  },
  loanRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    marginBottom: 6,
    alignItems: 'center',
  },
  loanLabel: { color: '#6b7280' },
  loanValue: { fontWeight: 700, color: '#059669' },
  loanValueRed: { fontWeight: 700, color: '#dc2626' },
};

export const HousingStep = ({ form, onChange, errors = {} }) => {
  const housingType   = form.housingType ?? 'rent';
  const income        = safeNum(form.selfIncome, 0) + safeNum(form.spouseIncome, 0);
  const propertyPrice = safeNum(form.propertyPrice, 0);
  const downPayment   = safeNum(form.downPayment, 0);
  const mortgageRate  = safeNum(form.mortgageRate, 1.0);
  const mortgageTerm  = safeNum(form.mortgageTerm, 35);

  const loanAmount    = calcLoanAmount(propertyPrice, downPayment);
  const monthlyPay    = loanAmount > 0 ? calcMonthlyMortgage(loanAmount, mortgageRate, mortgageTerm) : 0;
  const annualPay     = monthlyPay * 12;
  const totalRepay    = monthlyPay * mortgageTerm * 12;
  const totalInterest = totalRepay - loanAmount;
  const incomeRatio   = income > 0 ? calcMortgageIncomeRatio(annualPay, income) : 0;

  const showMortgage = housingType === 'own' || housingType === 'future_purchase';

  return (
    <div style={st.wrap}>
      <SectionTitle icon="🏠" title="住居" />

      <Select
        label="住居タイプ"
        value={housingType}
        onChange={(v) => onChange('housingType', v)}
        options={HOUSING_TYPE_OPTIONS}
      />

      {housingType === 'rent' && (
        <NumberStepper
          label="月額家賃"
          value={safeNum(form.monthlyRent, 0)}
          onChange={(v) => onChange('monthlyRent', v)}
          min={0}
          max={100}
          step={0.5}
          unit="万円/月"
          decimal={1}
          error={errors.monthlyRent}
        />
      )}

      {showMortgage && (
        <>
          {housingType === 'future_purchase' && (
            <NumberStepper
              label="購入予定年齢（本人）"
              value={safeNum(form.purchaseAge, 35)}
              onChange={(v) => onChange('purchaseAge', v)}
              min={safeNum(form.currentAge, 30)}
              max={70}
              unit="歳"
            />
          )}

          <NumberStepper
            label="物件価格"
            value={propertyPrice}
            onChange={(v) => onChange('propertyPrice', v)}
            min={0}
            max={20000}
            step={100}
            unit="万円"
            error={errors.propertyPrice}
          />

          <NumberStepper
            label="頭金"
            value={downPayment}
            onChange={(v) => onChange('downPayment', v)}
            min={0}
            max={propertyPrice}
            step={50}
            unit="万円"
          />

          <Select
            label="ローン金利（年利）"
            value={String(mortgageRate)}
            onChange={(v) => onChange('mortgageRate', Number(v))}
            options={MORTGAGE_RATE_OPTIONS}
          />

          <Select
            label="返済期間"
            value={String(mortgageTerm)}
            onChange={(v) => onChange('mortgageTerm', Number(v))}
            options={MORTGAGE_TERM_OPTIONS}
          />

          {/* ローン概算 */}
          {loanAmount > 0 && (
            <div style={st.loanCard}>
              <div style={st.loanRow}>
                <span style={st.loanLabel}>借入額</span>
                <span style={st.loanValue}>{fmtMan(loanAmount)}万円</span>
              </div>
              <div style={st.loanRow}>
                <span style={st.loanLabel}>月額返済</span>
                <span style={st.loanValue}>{fmtMan(monthlyPay)}万円/月</span>
              </div>
              <div style={st.loanRow}>
                <span style={st.loanLabel}>年間返済</span>
                <span style={st.loanValue}>{fmtMan(annualPay)}万円/年</span>
              </div>
              <div style={st.loanRow}>
                <span style={st.loanLabel}>総返済額</span>
                <span style={st.loanValue}>{fmtMan(totalRepay)}万円</span>
              </div>
              <div style={st.loanRow}>
                <span style={st.loanLabel}>うち利息</span>
                <span style={st.loanValue}>{fmtMan(totalInterest)}万円</span>
              </div>
              {income > 0 && (
                <div style={st.loanRow}>
                  <span style={st.loanLabel}>返済負担率</span>
                  <span style={incomeRatio > 30 ? st.loanValueRed : st.loanValue}>
                    {incomeRatio.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          )}

          {incomeRatio > 35 && (
            <Alert type="error" icon="🚨">
              返済負担率が{incomeRatio.toFixed(0)}%と高めです。一般的な目安は25%以下です。
              物件価格や頭金の見直しをご検討ください。
            </Alert>
          )}
          {incomeRatio > 25 && incomeRatio <= 35 && (
            <Alert type="warning" icon="⚠️">
              返済負担率が{incomeRatio.toFixed(0)}%です。
              生活費との兼ね合いに注意しましょう。
            </Alert>
          )}
        </>
      )}
    </div>
  );
};
