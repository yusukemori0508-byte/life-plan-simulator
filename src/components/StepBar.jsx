// src/components/StepBar.jsx
import { STEPS, COLORS } from '../constants.js';

const st = {
  topBar: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: '#fffdf8',
    borderBottom: '1px solid #cde5d4',
    padding: '10px 16px 8px',
    boxShadow: '0 1px 6px rgba(61,139,92,0.08)',
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#2a3d30',
    marginBottom: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  stepNum: {
    fontSize: 11,
    color: '#6b8c78',
    fontWeight: 500,
  },
  dots: {
    display: 'flex',
    gap: 4,
    marginBottom: 7,
    alignItems: 'center',
  },
  dot: (active, done) => ({
    width: active ? 22 : done ? 14 : 8,
    height: done ? 14 : 8,
    borderRadius: 999,
    background: done ? '#4a9e6b' : active ? '#e8854a' : '#cde5d4',
    transition: 'all 0.25s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 9,
    color: '#fff',
    fontWeight: 700,
  }),
  progressBar: {
    height: 4,
    background: '#e8f5ee',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: (pct) => ({
    height: '100%',
    width: `${pct}%`,
    background: `linear-gradient(90deg, #4a9e6b 0%, #e8854a 100%)`,
    borderRadius: 2,
    transition: 'width 0.4s ease',
  }),
  errorBanner: {
    marginTop: 8,
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 10,
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
  },
  errorIcon: { fontSize: 14, flexShrink: 0 },
  errorText: { fontSize: 12, color: '#dc2626', lineHeight: 1.5 },
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 200,
    background: '#fffdf8',
    borderTop: '1.5px solid #cde5d4',
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 -2px 10px rgba(61,139,92,0.1)',
    maxWidth: 720,
    margin: '0 auto',
  },
  navBtn: (variant, isLast) => ({
    padding: '10px 22px',
    borderRadius: 24,
    border: variant === 'secondary' ? '1.5px solid #cde5d4' : 'none',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.15s',
    background: variant === 'primary'
      ? isLast
        ? `linear-gradient(135deg, #e8854a 0%, #c5664a 100%)`
        : `linear-gradient(135deg, #4a9e6b 0%, #2d6b46 100%)`
      : '#f3f8f3',
    color: variant === 'primary' ? '#fff' : '#6b8c78',
    opacity: 1,
    boxShadow: variant === 'primary'
      ? isLast
        ? '0 3px 10px rgba(232,133,74,0.35)'
        : '0 3px 10px rgba(74,158,107,0.35)'
      : 'none',
  }),
  navCenter: {
    fontSize: 11,
    color: '#6b8c78',
    textAlign: 'center',
    fontWeight: 500,
  },
  spacer: {
    height: 72,
  },
};

export const StepBar = ({ currentStep, onNext, onPrev, canProceed, errors = [] }) => {
  const step = STEPS[currentStep];
  const totalSteps = STEPS.length;
  const pct = Math.round(((currentStep + 1) / totalSteps) * 100);
  // StepBar は result step では非表示のため、最終入力ステップ（result の1つ前）を isLast とする
  const isLast = currentStep === totalSteps - 2;
  const isFirst = currentStep === 0;

  return (
    <>
      {/* トップバー */}
      <div style={st.topBar}>
        <div style={st.stepTitle}>
          <span>{step?.label || ''}</span>
          <span style={st.stepNum}>
            ({currentStep + 1}/{totalSteps})
          </span>
        </div>

        {/* ステップドット */}
        <div style={st.dots}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={st.dot(i === currentStep, i < currentStep)}>
              {i < currentStep ? '✓' : ''}
            </div>
          ))}
        </div>

        {/* プログレスバー */}
        <div style={st.progressBar}>
          <div style={st.progressFill(pct)} />
        </div>

        {/* エラー表示 */}
        {errors.length > 0 && (
          <div style={st.errorBanner}>
            <span style={st.errorIcon}>!</span>
            <div style={st.errorText}>
              {errors.map((e, i) => (
                <div key={i}>{e}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ボトムナビ */}
      <div style={st.bottomNav}>
        <button
          style={st.navBtn('secondary', false)}
          onClick={onPrev}
        >
          {isFirst ? '最初へ' : '← 前へ'}
        </button>

        <div style={st.navCenter}>
          {step?.description || ''}
        </div>

        <button
          style={{
            ...st.navBtn('primary', isLast),
            opacity: (!canProceed && !isLast) ? 0.55 : 1,
          }}
          onClick={onNext}
          disabled={!canProceed && !isLast}
        >
          {isLast ? '結果を見る' : '次へ →'}
        </button>
      </div>

    </>
  );
};
