// src/components/ui.jsx
import { useState } from 'react';
import { COLORS, DIAGNOSIS_LEVELS } from '../constants.js';

// ────────────────────────────────────────────────
// Button
// ────────────────────────────────────────────────
export function Button({ children, onClick, variant = 'primary', size = 'md', disabled = false, fullWidth = false, style: extraStyle = {} }) {
  const [hover, setHover] = useState(false);
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', borderRadius: 24, cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 700, lineHeight: 1,
    transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s, filter 0.15s',
    WebkitTapHighlightColor: 'transparent',
    width: fullWidth ? '100%' : undefined,
    opacity: disabled ? 0.55 : 1,
    transform: (!disabled && hover) ? 'translateY(-2px)' : 'none',
  };
  const sizes = {
    xs: { fontSize: 11, padding: '5px 12px', borderRadius: 16 },
    sm: { fontSize: 12, padding: '7px 14px', borderRadius: 18 },
    md: { fontSize: 14, padding: '10px 20px', borderRadius: 24 },
    lg: { fontSize: 16, padding: '13px 28px', borderRadius: 28 },
  };
  const hoverShadow = hover && !disabled;
  const variants = {
    primary:   { background: `linear-gradient(135deg, ${COLORS.primaryLight}, ${COLORS.primary})`,  color: '#fff', boxShadow: hoverShadow ? `0 8px 22px ${COLORS.primary}50` : `0 3px 10px ${COLORS.primary}40` },
    secondary: { background: `linear-gradient(135deg, ${COLORS.secondary}, #e8854a)`,               color: '#fff', boxShadow: hoverShadow ? `0 8px 22px ${COLORS.secondary}50` : `0 3px 10px ${COLORS.secondary}38` },
    success:   { background: `linear-gradient(135deg, ${COLORS.success}, ${COLORS.primary})`,       color: '#fff', boxShadow: hoverShadow ? `0 6px 18px ${COLORS.success}50` : `0 2px 8px ${COLORS.success}35` },
    danger:    { background: COLORS.danger,    color: '#fff' },
    outline:   { background: 'transparent', color: COLORS.primary, border: `2px solid ${COLORS.primary}`, borderRadius: 24 },
    ghost:     { background: 'transparent', color: COLORS.text },
    light:     { background: COLORS.bgLight, color: COLORS.text, border: `1.5px solid ${COLORS.border}` },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...base, ...sizes[size] ?? sizes.md, ...variants[variant] ?? variants.primary, ...extraStyle }}
    >
      {children}
    </button>
  );
}

// ────────────────────────────────────────────────
// Card
// ────────────────────────────────────────────────
export function Card({ children, padding = 16, shadow = 'sm', style: extra = {} }) {
  const shadows = {
    none: 'none',
    sm:   '0 1px 4px rgba(0,0,0,0.06)',
    md:   '0 2px 10px rgba(0,0,0,0.09)',
    lg:   '0 4px 20px rgba(0,0,0,0.12)',
  };
  return (
    <div style={{
      background: COLORS.bgWhite, borderRadius: 16, border: `1px solid ${COLORS.border}`,
      padding, boxShadow: shadows[shadow] ?? shadows.sm, ...extra,
    }}>
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────
// Input
// ────────────────────────────────────────────────
export function Input({ label, value, onChange, type = 'text', unit, hint, error, placeholder, disabled, style: extra = {} }) {
  return (
    <div style={{ marginBottom: 4, ...extra }}>
      {label && <label style={inputSt.label}>{label}{unit && <span style={inputSt.unit}>{unit}</span>}</label>}
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          ...inputSt.input,
          borderColor: error ? COLORS.danger : COLORS.border,
          background: disabled ? COLORS.bgLight : '#fff',
        }}
      />
      {error && <div style={inputSt.error}>{error}</div>}
      {!error && hint && <div style={inputSt.hint}>{hint}</div>}
    </div>
  );
}
const inputSt = {
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textMuted, marginBottom: 6 },
  unit:  { marginLeft: 4, fontSize: 11, fontWeight: 400, color: COLORS.textMuted },
  input: {
    display: 'block', width: '100%', boxSizing: 'border-box',
    border: `1.5px solid ${COLORS.border}`, borderRadius: 12,
    padding: '10px 12px', fontSize: 14, color: COLORS.text, outline: 'none',
    background: '#fffdf8',
  },
  hint:  { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  error: { fontSize: 11, color: COLORS.danger, marginTop: 4 },
};

// ────────────────────────────────────────────────
// Select
// ────────────────────────────────────────────────
export function Select({ label, value, onChange, options = [], hint, error, style: extra = {} }) {
  return (
    <div style={{ marginBottom: 4, ...extra }}>
      {label && <label style={inputSt.label}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <select
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
          style={{
            ...inputSt.input, appearance: 'none', WebkitAppearance: 'none',
            paddingRight: 32, cursor: 'pointer',
            borderColor: error ? COLORS.danger : COLORS.border,
          }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 10, color: COLORS.textMuted }}>▼</span>
      </div>
      {error && <div style={inputSt.error}>{error}</div>}
      {!error && hint && <div style={inputSt.hint}>{hint}</div>}
    </div>
  );
}

// ────────────────────────────────────────────────
// Toggle
// ────────────────────────────────────────────────
export function Toggle({ label, checked, onChange, hint, disabled, labelRight }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer' }}
        onClick={() => !disabled && onChange?.(!checked)}>
        {!labelRight && label && <span style={toggleSt.label}>{label}</span>}
        <div style={{ ...toggleSt.track, background: checked ? COLORS.primary : COLORS.border, flexShrink: 0 }}>
          <div style={{ ...toggleSt.thumb, transform: checked ? 'translateX(20px)' : 'translateX(2px)' }} />
        </div>
        {labelRight && label && <span style={toggleSt.label}>{label}</span>}
      </div>
      {hint && <div style={{ ...inputSt.hint, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}
const toggleSt = {
  label: { fontSize: 13, fontWeight: 600, color: COLORS.text, flex: 1 },
  track: { width: 44, height: 24, borderRadius: 12, transition: 'background 0.2s', position: 'relative' },
  thumb: { position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'transform 0.2s' },
};

// ────────────────────────────────────────────────
// NumberStepper
// ────────────────────────────────────────────────
export function NumberStepper({ label, value, onChange, min = 0, max = 999, step = 1, unit, hint, error }) {
  const v   = Number(value) || 0;
  const dec = step < 1 ? String(step).split('.')[1]?.length ?? 1 : 0;
  const fmt = (n) => dec > 0 ? n.toFixed(dec) : String(Math.round(n));

  const inc = () => { const n = Math.min(v + step, max); onChange?.(dec > 0 ? parseFloat(n.toFixed(dec)) : Math.round(n)); };
  const dec_ = () => { const n = Math.max(v - step, min); onChange?.(dec > 0 ? parseFloat(n.toFixed(dec)) : Math.round(n)); };

  return (
    <div style={{ marginBottom: 4 }}>
      {label && <label style={inputSt.label}>{label}{unit && <span style={inputSt.unit}>{unit}</span>}</label>}
      <div style={stepperSt.row}>
        <button onClick={dec_} disabled={v <= min} style={stepperSt.btn}>－</button>
        <div style={{ ...stepperSt.val, borderColor: error ? COLORS.danger : COLORS.border }}>
          <span style={stepperSt.num}>{fmt(v)}</span>
          {unit && <span style={stepperSt.unitInner}>{unit}</span>}
        </div>
        <button onClick={inc} disabled={v >= max} style={stepperSt.btn}>＋</button>
      </div>
      {error && <div style={inputSt.error}>{error}</div>}
      {!error && hint && <div style={inputSt.hint}>{hint}</div>}
    </div>
  );
}
const stepperSt = {
  row: { display: 'flex', alignItems: 'center', gap: 6 },
  btn: {
    width: 44, height: 44, borderRadius: 22, border: `1.5px solid ${COLORS.border}`,
    background: COLORS.bgLight, fontSize: 18, fontWeight: 700, color: COLORS.primary,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    WebkitTapHighlightColor: 'transparent', flexShrink: 0,
  },
  val: {
    flex: 1, height: 44, border: `1.5px solid ${COLORS.border}`, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    background: '#fffdf8',
  },
  num:       { fontSize: 16, fontWeight: 700, color: COLORS.text },
  unitInner: { fontSize: 11, color: COLORS.textMuted },
};

// ────────────────────────────────────────────────
// Badge
// ────────────────────────────────────────────────
export function Badge({ children, color = COLORS.primary, bg }) {
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 700,
      color, background: bg ?? `${color}15`,
      borderRadius: 20, padding: '3px 9px',
    }}>
      {children}
    </span>
  );
}

// ────────────────────────────────────────────────
// Alert
// ────────────────────────────────────────────────
const ALERT_PATHS = {
  info:    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
  success: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  warning: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
  error:   'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
};
export function Alert({ type = 'info', title, children }) {
  const types = {
    info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
    success: { bg: '#f0fdf4', border: '#a7f3d0', color: '#065f46' },
    warning: { bg: '#fffbeb', border: '#fde68a', color: '#92400e' },
    error:   { bg: '#fef2f2', border: '#fecaca', color: '#991b1b' },
  };
  const t = types[type] ?? types.info;
  return (
    <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <svg width={14} height={14} viewBox="0 0 24 24" fill={t.color} style={{ flexShrink: 0, marginTop: 1 }}><path d={ALERT_PATHS[type] ?? ALERT_PATHS.info} /></svg>
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontSize: 13, fontWeight: 700, color: t.color, marginBottom: 3 }}>{title}</div>}
        <div style={{ fontSize: 12, color: t.color, lineHeight: 1.5 }}>{children}</div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// SectionTitle
// ────────────────────────────────────────────────
export function SectionTitle({ children, sub, icon }) {
  return (
    <div style={{ marginBottom: 10, marginTop: 4, paddingLeft: 10, borderLeft: `3px solid ${COLORS.primary}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>{children}</span>
      </div>
      {sub && <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ────────────────────────────────────────────────
// Divider
// ────────────────────────────────────────────────
export function Divider({ label }) {
  if (label) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 10px' }}>
        <div style={{ flex: 1, height: 1, background: COLORS.border }} />
        <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: COLORS.border }} />
      </div>
    );
  }
  return <div style={{ height: 1, background: COLORS.border, margin: '14px 0 10px' }} />;
}

// ────────────────────────────────────────────────
// TabBar
// ────────────────────────────────────────────────
export function TabBar({ tabs = [], activeTab, onTabChange }) {
  return (
    <div style={{
      display: 'flex', overflowX: 'auto', background: '#fffdf8',
      borderBottom: `1.5px solid ${COLORS.border}`, scrollbarWidth: 'none',
      msOverflowStyle: 'none', position: 'sticky', top: 46, zIndex: 90,
    }}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange?.(tab.id)}
            style={{
              flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              padding: '8px 12px', border: 'none',
              background: isActive ? '#e8f5ee' : 'none',
              cursor: 'pointer',
              borderBottom: isActive ? `2.5px solid ${COLORS.primary}` : '2.5px solid transparent',
              color: isActive ? COLORS.primary : COLORS.textMuted,
              WebkitTapHighlightColor: 'transparent',
              minWidth: 56,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, whiteSpace: 'nowrap' }}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────
// ProgressRing
// ────────────────────────────────────────────────
export function ProgressRing({ score, size = 80, strokeWidth = 8, rankInfo }) {
  const r    = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = Math.max(0, Math.min(100, Number(score)));
  const dash = circ * (pct / 100);
  const color = rankInfo?.color ?? COLORS.primary;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COLORS.border} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.22, fontWeight: 800, color, lineHeight: 1 }}>{pct}</span>
        {rankInfo && <span style={{ fontSize: size * 0.14, fontWeight: 700, color, lineHeight: 1 }}>{rankInfo.rank}</span>}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// FormRow
// ────────────────────────────────────────────────
export function FormRow({ label, sub, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 0' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// ────────────────────────────────────────────────
// InfoChip
// ────────────────────────────────────────────────
export function InfoChip({ label, value, color = COLORS.primary, bg, icon }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: bg ?? `${color}12`, borderRadius: 20,
      padding: '4px 10px',
    }}>
      {icon && <span style={{ fontSize: 12 }}>{icon}</span>}
      <span style={{ fontSize: 11, color: COLORS.textMuted }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

// ────────────────────────────────────────────────
// EmptyState
// ────────────────────────────────────────────────
export function EmptyState({ icon, title, sub, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px', gap: 10 }}>
      {icon && <span style={{ fontSize: 40 }}>{icon}</span>}
      {title && <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>{title}</div>}
      {sub   && <div style={{ fontSize: 12, color: COLORS.textMuted, textAlign: 'center' }}>{sub}</div>}
      {action}
    </div>
  );
}

// ────────────────────────────────────────────────
// DiagnosisCard
// ────────────────────────────────────────────────
export function DiagnosisCard({ diagnosis }) {
  const lv = DIAGNOSIS_LEVELS[diagnosis?.level] ?? DIAGNOSIS_LEVELS.good;
  return (
    <div style={{
      background: lv.bg, border: `1px solid ${lv.border}`, borderRadius: 10,
      padding: '10px 12px', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: lv.color, flexShrink: 0, marginTop: 3 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: lv.color, background: `${lv.color}18`, borderRadius: 10, padding: '2px 7px' }}>
              {lv.label}
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: lv.color, lineHeight: 1.4, marginBottom: 3 }}>{diagnosis?.title}</div>
          {diagnosis?.detail && <div style={{ fontSize: 11, color: lv.color, lineHeight: 1.5, opacity: 0.85 }}>{diagnosis.detail}</div>}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// AdviceCard
// ────────────────────────────────────────────────
export function AdviceCard({ advice }) {
  return <AdviceCardInner advice={advice} />;
}

export function AdviceCardInner({ advice }) {
  const [open, setOpen] = useState(false);
  const a = advice;
  const diffAsset = (a.finalAssetAfter ?? 0) - (a.finalAssetBefore ?? 0);
  const depletionImproved = a.depletionBefore && !a.depletionAfter;

  // 成長レベルを改善効果から算出
  const growthLevel = diffAsset >= 500
    ? { label: '大きな改善', color: '#2d7a52', bg: '#e0f5e8', border: '#a0d8ba' }
    : diffAsset >= 100
    ? { label: 'しっかり改善', color: '#4CAF7A', bg: '#edfaf3', border: '#b8e8cf' }
    : { label: '小さな改善', color: '#6FCF97', bg: '#f0fbf5', border: '#c8eedc' };

  return (
    <div style={{
      background: COLORS.bgWhite, border: `1.5px solid ${COLORS.border}`,
      borderRadius: 18, marginBottom: 12, overflow: 'hidden',
    }}>
      {/* ヘッダー */}
      <div style={{ padding: '14px 16px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
        onClick={() => setOpen((v) => !v)}>
        {/* 成長レベルタグ */}
        <div style={{ marginBottom: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 800,
            color: growthLevel.color,
            background: growthLevel.bg,
            border: `1px solid ${growthLevel.border}`,
            borderRadius: 12, padding: '3px 9px',
          }}>
            {growthLevel.label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: '#4CAF7A', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, lineHeight: 1.3, marginBottom: 4 }}>{a.title}</div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.4 }}>{a.summary}</div>
          </div>
          <span style={{ fontSize: 10, color: COLORS.textMuted, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
        </div>
        {diffAsset > 0 && (
          <div style={{ marginTop: 8, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#4CAF7A', background: '#edfaf3', border: '1px solid #b8e8cf', borderRadius: 12, padding: '3px 9px' }}>
              +{Math.round(diffAsset).toLocaleString()}万円
            </span>
            {depletionImproved && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#2d7a52', background: '#e0f5e8', border: '1px solid #a0d8ba', borderRadius: 12, padding: '3px 9px' }}>
                枯渇リスク解消
              </span>
            )}
          </div>
        )}
      </div>

      {/* 展開部分 */}
      {open && (
        <div style={{ borderTop: `1px solid ${COLORS.border}`, background: '#f5faf5', padding: '12px 14px' }}>
          {a.description && <p style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6, margin: '0 0 10px' }}>{a.description}</p>}
          {a.changes?.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 8, border: `1px solid ${COLORS.border}`, padding: '8px 10px', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, marginBottom: 6 }}>変更内容</div>
              {a.changes.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: COLORS.textMuted, flex: 1 }}>{c.label}</span>
                  <span style={{ color: '#dc2626', fontWeight: 600 }}>{c.before}</span>
                  <span style={{ color: COLORS.textMuted }}>→</span>
                  <span style={{ color: COLORS.success, fontWeight: 600 }}>{c.after}</span>
                </div>
              ))}
            </div>
          )}
          {/* 効果比較 */}
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 1, background: '#fff', borderRadius: 8, border: `1px solid ${COLORS.border}`, padding: '8px' }}>
              <div style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 3 }}>現在の最終資産</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: (a.finalAssetBefore ?? 0) < 0 ? '#dc2626' : COLORS.text }}>
                {Math.round(a.finalAssetBefore ?? 0).toLocaleString()}万円
              </div>
            </div>
            <div style={{ flex: 1, background: '#fff', borderRadius: 8, border: `1px solid ${COLORS.success}40`, padding: '8px' }}>
              <div style={{ fontSize: 10, color: COLORS.success, marginBottom: 3 }}>改善後の最終資産</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.success }}>
                {Math.round(a.finalAssetAfter ?? 0).toLocaleString()}万円
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
