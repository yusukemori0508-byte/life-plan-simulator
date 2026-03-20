// src/components/steps/BasicStep.jsx
import { NumberStepper, SectionTitle, Card } from '../ui.jsx';
import { MIN_AGE, MAX_AGE } from '../../constants.js';

const st = {
  wrap: { padding: '16px 16px 8px' },
  summaryCard: {
    background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
    border: '1px solid #667eea30',
    borderRadius: 12,
    padding: '14px 16px',
    marginTop: 16,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 8,
  },
  summaryItem: {
    textAlign: 'center',
    background: '#fff',
    borderRadius: 8,
    padding: '10px 6px',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: 800,
    color: '#4f46e5',
    lineHeight: 1,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#6b7280',
    lineHeight: 1.3,
  },
};

export const BasicStep = ({ form, onChange, errors = {} }) => {
  const currentAge   = Number(form.currentAge)   || 30;
  const retireAge    = Number(form.retirementAge) || 65;
  const lifespan     = Number(form.lifespan)      || 90;
  const workingYears = Math.max(0, retireAge - currentAge);
  const retireYears  = Math.max(0, lifespan - retireAge);
  const totalYears   = Math.max(0, lifespan - currentAge);

  return (
    <div style={st.wrap}>
      <SectionTitle icon="🎂" title="基本情報" />

      <NumberStepper
        label="現在の年齢"
        value={currentAge}
        onChange={(v) => onChange('currentAge', v)}
        min={MIN_AGE}
        max={80}
        unit="歳"
        error={errors.currentAge}
      />

      <NumberStepper
        label="退職予定年齢"
        value={retireAge}
        onChange={(v) => onChange('retirementAge', v)}
        min={40}
        max={80}
        unit="歳"
        error={errors.retirementAge}
        help="公的年金の受給は原則65歳から"
      />

      <NumberStepper
        label="想定寿命（シミュレーション終了年齢）"
        value={lifespan}
        onChange={(v) => onChange('lifespan', v)}
        min={60}
        max={MAX_AGE}
        unit="歳"
        error={errors.lifespan}
        help="長生きリスクに備えて長めに設定推奨"
      />

      {/* サマリーカード */}
      <div style={st.summaryCard}>
        <div style={st.summaryTitle}>シミュレーション概要</div>
        <div style={st.summaryGrid}>
          <div style={st.summaryItem}>
            <div style={st.summaryValue}>{workingYears}</div>
            <div style={st.summaryLabel}>就労<br />年数</div>
          </div>
          <div style={st.summaryItem}>
            <div style={st.summaryValue}>{retireYears}</div>
            <div style={st.summaryLabel}>老後<br />年数</div>
          </div>
          <div style={st.summaryItem}>
            <div style={st.summaryValue}>{totalYears}</div>
            <div style={st.summaryLabel}>合計<br />年数</div>
          </div>
        </div>
      </div>
    </div>
  );
};
