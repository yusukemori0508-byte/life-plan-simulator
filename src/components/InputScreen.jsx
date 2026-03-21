// src/components/InputScreen.jsx
// 入力画面 — 7セクション構成
// 基本情報 / 収入 / 支出 / 資産 / 借入 / ライフイベント / 住宅購入

import React from 'react';
import { useAppStore } from '../store/useAppStore.jsx';
import { calcInitialGauge } from '../gaugeCalc.js';

// ─────────────────────────────────────────────────────────────
// カラー
// ─────────────────────────────────────────────────────────────
const C = {
  green:     '#22c55e',
  greenDark: '#16a34a',
  greenBg:   '#f0fdf4',
  amber:     '#f59e0b',
  red:       '#ef4444',
  text:      '#111827',
  textMuted: '#6b7280',
  border:    '#e5e7eb',
  bg:        '#f9fafb',
  white:     '#ffffff',
};

// ─────────────────────────────────────────────────────────────
// 共通スタイル
// ─────────────────────────────────────────────────────────────
const S = {
  section: {
    background:   C.white,
    borderRadius: 20,
    padding:      '20px 18px',
    marginBottom: 12,
    boxShadow:    '0 1px 4px rgba(0,0,0,0.05)',
    border:       `1px solid ${C.border}`,
  },
  sectionTitle: {
    fontSize:      11,
    fontWeight:    800,
    color:         C.textMuted,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    marginBottom:  16,
    display:       'flex',
    alignItems:    'center',
    gap:           6,
  },
  row: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '10px 0',
    borderBottom:   `1px solid ${C.border}`,
  },
  rowLast: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '10px 0',
  },
  label: {
    fontSize:   14,
    fontWeight: 600,
    color:      C.text,
    flex:       1,
  },
  labelSub: {
    fontSize:    11,
    color:       C.textMuted,
    marginTop:   2,
  },
  unit: {
    fontSize: 12,
    color:    C.textMuted,
    marginLeft: 3,
  },
};

// ─────────────────────────────────────────────────────────────
// NumberStepper — ＋／－ で整数を増減（タップで直接入力可）
// ─────────────────────────────────────────────────────────────
const NumberStepper = ({ value, onChange, min = 0, max = 9999, step = 1, format = (v) => v, unit = '' }) => {
  const [editing, setEditing] = React.useState(false);
  const [draft,   setDraft]   = React.useState('');

  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));

  const startEdit = () => { setDraft(String(value)); setEditing(true); };
  const commitEdit = () => {
    const n = parseInt(draft, 10);
    if (!isNaN(n)) {
      const clamped = Math.max(min, Math.min(max, n));
      onChange(Math.round(clamped / step) * step);
    }
    setEditing(false);
  };

  const btnStyle = (disabled) => ({
    width: 34, height: 34, borderRadius: '50%',
    border: `1.5px solid ${disabled ? C.border : C.greenDark}`,
    background: disabled ? C.bg : C.greenBg,
    color: disabled ? C.textMuted : C.greenDark,
    fontSize: 18, fontWeight: 700,
    cursor: disabled ? 'default' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    lineHeight: 1, flexShrink: 0,
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button style={btnStyle(value <= min)} onClick={dec} disabled={value <= min}>−</button>
      <div style={{ textAlign: 'center', minWidth: 56 }}>
        {editing ? (
          <input
            type="number" value={draft} min={min} max={max} step={step} autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            style={{
              width: 60, fontSize: 18, fontWeight: 700, color: C.greenDark,
              border: `1.5px solid ${C.greenDark}`, borderRadius: 8,
              textAlign: 'center', outline: 'none', background: C.white,
              padding: '2px 4px', MozAppearance: 'textfield',
            }}
          />
        ) : (
          <button
            onClick={startEdit}
            style={{
              background: 'none', border: 'none', cursor: 'text', padding: '2px 4px',
              borderRadius: 6, minWidth: 52,
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{format(value)}</span>
            {unit && <span style={S.unit}>{unit}</span>}
          </button>
        )}
      </div>
      <button style={btnStyle(value >= max)} onClick={inc} disabled={value >= max}>＋</button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SliderRow — ラベル + 全幅スライダー + タップ直接入力
// ─────────────────────────────────────────────────────────────
const SliderRow = ({ label, sub, value, onChange, min = 0, max = 100, step = 1, format = (v) => v, unit = '', color = C.greenDark, last = false }) => {
  const [editing, setEditing] = React.useState(false);
  const [draft,   setDraft]   = React.useState('');

  const startEdit = () => { setDraft(String(value)); setEditing(true); };
  const commitEdit = () => {
    const n = parseFloat(draft.replace(/,/g, ''));
    if (!isNaN(n)) {
      const decimals = String(step).includes('.') ? String(step).split('.')[1].length : 0;
      const clamped  = Math.max(min, Math.min(max, n));
      const snapped  = parseFloat((Math.round(clamped / step) * step).toFixed(decimals));
      onChange(snapped);
    }
    setEditing(false);
  };

  return (
    <div style={{ padding: '12px 0', borderBottom: last ? 'none' : `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ flex: 1, paddingRight: 12 }}>
          <div style={S.label}>{label}</div>
          {sub && <div style={S.labelSub}>{sub}</div>}
        </div>
        {editing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="number" value={draft} min={min} max={max} step={step} autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              style={{
                width: 72, padding: '3px 6px', fontSize: 18, fontWeight: 700, color,
                border: `1.5px solid ${color}`, borderRadius: 8,
                textAlign: 'right', outline: 'none', background: '#fff',
                MozAppearance: 'textfield',
              }}
            />
            <span style={{ ...S.unit, fontSize: 13 }}>{unit}</span>
          </div>
        ) : (
          <button
            onClick={startEdit}
            style={{
              background: `${color}12`, border: `1.5px solid ${color}40`,
              borderRadius: 10, padding: '4px 10px', cursor: 'pointer',
              display: 'flex', alignItems: 'baseline', gap: 3,
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1 }}>{format(value)}</span>
            <span style={{ ...S.unit, fontSize: 12 }}>{unit}</span>
          </button>
        )}
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: color, cursor: 'pointer', display: 'block' }}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// AgeSelector — null = 「予定なし」/ 数値 = 年齢スライダー
// ─────────────────────────────────────────────────────────────
const AgeSelector = ({ label, sub, value, onChange, minAge, maxAge, currentAge, last = false }) => {
  const enabled = value !== null && value !== undefined;
  return (
    <div style={{ padding: '12px 0', borderBottom: last ? 'none' : `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: enabled ? 10 : 0 }}>
        <div style={{ flex: 1, paddingRight: 12 }}>
          <div style={S.label}>{label}</div>
          {sub && <div style={S.labelSub}>{sub}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {enabled && (
            <div>
              <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{value}</span>
              <span style={S.unit}>歳</span>
            </div>
          )}
          <button
            onClick={() => onChange(enabled ? null : (currentAge + 5))}
            style={{
              padding: '4px 12px', borderRadius: 999,
              border: `1.5px solid ${enabled ? C.greenDark : C.border}`,
              background: enabled ? C.greenBg : C.bg,
              color: enabled ? C.greenDark : C.textMuted,
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {enabled ? '予定あり ✓' : '予定なし'}
          </button>
        </div>
      </div>
      {enabled && (
        <input
          type="range" min={minAge} max={maxAge} step={1} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ width: '100%', accentColor: C.greenDark, cursor: 'pointer', display: 'block' }}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// ChildRow — 子どもごとの「すでにいる／これから」設定
// ─────────────────────────────────────────────────────────────
const ORDINAL = ['一', '二', '三', '四'];

const ChildRow = ({ index, value, onChange, currentAge, last = false }) => {
  const mode = value === null ? 'none'
    : value <= currentAge ? 'past'
    : 'future';
  const childCurrentAge = mode === 'past' ? currentAge - value : null;

  const tagBtn = (key, label) => {
    const active = mode === key;
    return (
      <button
        key={key}
        onClick={() => {
          if (active) { onChange(null); return; }
          onChange(key === 'past' ? currentAge - 3 : currentAge + 3);
        }}
        style={{
          padding: '4px 11px', borderRadius: 999,
          border: `1.5px solid ${active ? C.greenDark : C.border}`,
          background: active ? C.greenBg : C.white,
          color: active ? C.greenDark : C.textMuted,
          fontSize: 11, fontWeight: 700, cursor: 'pointer',
        }}
      >
        {active ? '✓ ' : ''}{label}
      </button>
    );
  };

  return (
    <div style={{ padding: '12px 0 14px', borderBottom: last ? 'none' : `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: mode !== 'none' ? 12 : 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>第{ORDINAL[index]}子</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {tagBtn('past',   'すでにいる')}
          {tagBtn('future', 'これから')}
        </div>
      </div>
      {mode === 'past' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, color: C.textMuted }}>現在の年齢</div>
          <NumberStepper
            value={childCurrentAge}
            onChange={(age) => onChange(Math.max(0, currentAge - age))}
            min={0} max={currentAge - 1}
            format={(v) => `${v}歳`}
          />
        </div>
      )}
      {mode === 'future' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: C.textMuted }}>誕生予定（あなたが）</div>
            <div>
              <span style={{ fontSize: 16, fontWeight: 700, color: C.greenDark }}>{value}</span>
              <span style={S.unit}>歳のとき</span>
            </div>
          </div>
          <input
            type="range" min={currentAge + 1} max={55} step={1} value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            style={{ width: '100%', accentColor: C.greenDark, cursor: 'pointer', display: 'block' }}
          />
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// calcMonthlyPayment — 元利均等返済（万円/月）
// ─────────────────────────────────────────────────────────────
const calcMonthlyPayment = (loanMan, ratePercent, termYears) => {
  if (loanMan <= 0 || termYears <= 0) return 0;
  const r = ratePercent / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return Math.round((loanMan / n) * 100) / 100;
  const payment = loanMan * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  return Math.round(payment * 100) / 100;
};

// ─────────────────────────────────────────────────────────────
// ExpenseDetailAccordion — 支出13カテゴリの詳細設定
// ─────────────────────────────────────────────────────────────
const EXP_CATEGORIES = [
  { key: 'expHousing',       label: '住居費',     sub: '家賃など（ローン除く）', unit: '万円/月', max: 30,  step: 0.1 },
  { key: 'expUtilities',     label: '光熱費',     sub: '電気・ガス・水道',       unit: '万円/月', max: 10,  step: 0.1 },
  { key: 'expCommunication', label: '通信費',     sub: 'スマホ・ネット',         unit: '万円/月', max: 5,   step: 0.1 },
  { key: 'expInsurance',     label: '保険料',     sub: '生命・医療・火災等',     unit: '万円/月', max: 10,  step: 0.1 },
  { key: 'expFood',          label: '食費',       sub: '外食含む',               unit: '万円/月', max: 20,  step: 0.1 },
  { key: 'expDaily',         label: '日用品',     sub: '消耗品・雑費',           unit: '万円/月', max: 5,   step: 0.1 },
  { key: 'expSocial',        label: '交際費',     sub: '飲食・贈答',             unit: '万円/月', max: 10,  step: 0.1 },
  { key: 'expEntertainment', label: '娯楽・趣味', sub: 'サブスク・旅行',         unit: '万円/月', max: 15,  step: 0.1 },
  { key: 'expClothing',      label: '衣服・美容', sub: '被服・美容院等',         unit: '万円/月', max: 10,  step: 0.1 },
  { key: 'expChildcare',     label: '保育・教育', sub: '習い事・塾等（月次）',   unit: '万円/月', max: 15,  step: 0.1 },
  { key: 'expCarMaint',      label: '車維持費',   sub: '保険・駐車・燃料等',     unit: '万円/月', max: 10,  step: 0.1 },
  { key: 'expMedical',       label: '医療費',     sub: '通院・薬代',             unit: '万円/月', max: 5,   step: 0.1 },
  { key: 'expAnnualExtra',   label: '年間臨時支出', sub: '家電・旅行・冠婚葬祭', unit: '万円/年', max: 200, step: 5,  isAnnual: true },
];

const calcExpTotal = (form) => {
  const monthly = EXP_CATEGORIES.filter(c => !c.isAnnual)
    .reduce((sum, c) => sum + (form[c.key] ?? 0), 0);
  const annual = (form.expAnnualExtra ?? 20) / 12;
  return Math.round((monthly + annual) * 10) / 10;
};

const ExpenseDetailAccordion = ({ form, setForm }) => {
  const [open, setOpen] = React.useState(false);
  const [editingKey, setEditingKey] = React.useState(null);
  const [draft, setDraft]           = React.useState('');
  const total = calcExpTotal(form);
  // カテゴリ合計とメインスライダーのズレを検出（0.2万円以上ズレたら警告）
  const hasMismatch = Math.abs(total - (form.monthlyExpense ?? 0)) >= 0.2;

  const commitDraft = (cat) => {
    const n = parseFloat(draft);
    if (!isNaN(n) && n >= 0 && n <= cat.max) {
      const rounded = Math.round(n * 10) / 10;
      setForm(prev => {
        const next = { ...prev, [cat.key]: rounded };
        next.monthlyExpense = calcExpTotal(next);
        return next;
      });
    }
    setEditingKey(null);
  };

  // カテゴリ合計でmonthlyExpenseを上書き
  const applyTotal = (e) => {
    e.stopPropagation();
    setForm(prev => ({ ...prev, monthlyExpense: total }));
  };

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', padding: '8px 14px', borderRadius: 10,
          border: `1.5px solid ${hasMismatch ? '#f59e0b' : C.border}`,
          background: hasMismatch ? '#fffbeb' : C.bg,
          color: C.textMuted, fontSize: 12, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 10,
        }}
      >
        <span>
          {hasMismatch ? '⚠️ ' : ''}カテゴリ別入力（合計 {total}万円/月）
        </span>
        <span style={{ fontSize: 13 }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* ズレ警告バナー */}
      {hasMismatch && (
        <div style={{
          marginTop: 6, padding: '8px 12px', borderRadius: 8,
          background: '#fffbeb', border: '1px solid #fcd34d',
          fontSize: 11, color: '#92400e', lineHeight: 1.5,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <span>
            カテゴリ合計（{total}万円）と月生活費（{form.monthlyExpense}万円）が異なります。<br />
            現在のシミュレーションは <strong>{form.monthlyExpense}万円</strong> で計算中。
          </span>
          <button
            onClick={applyTotal}
            style={{
              flexShrink: 0, padding: '5px 10px', borderRadius: 6,
              background: '#f59e0b', color: '#fff', border: 'none',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {total}万円を採用
          </button>
        </div>
      )}

      {open && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {EXP_CATEGORIES.map((cat, idx) => {
            const val = form[cat.key] ?? 0;
            const isLast = idx === EXP_CATEGORIES.length - 1;
            const isEditing = editingKey === cat.key;
            const displayVal = val % 1 === 0 ? val : val.toFixed(1);
            const unitLabel = cat.isAnnual ? '万円/年' : '万円/月';
            return (
              <div key={cat.key} style={{
                padding: '10px 0',
                borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{cat.label}</span>
                    <span style={{ fontSize: 10, color: C.textMuted, marginLeft: 6 }}>{cat.sub}</span>
                  </div>
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                      <input
                        type="number" autoFocus
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onBlur={() => commitDraft(cat)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') e.target.blur();
                          if (e.key === 'Escape') setEditingKey(null);
                        }}
                        style={{
                          width: 64, textAlign: 'right', fontSize: 14, fontWeight: 700,
                          color: C.greenDark, border: `1.5px solid ${C.greenDark}`,
                          borderRadius: 6, padding: '2px 4px', outline: 'none', background: C.greenBg,
                        }}
                      />
                      <span style={{ fontSize: 11, color: C.textMuted }}>{unitLabel}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setDraft(String(displayVal)); setEditingKey(cat.key); }}
                      style={{ fontSize: 14, fontWeight: 700, color: C.greenDark, background: 'none',
                        border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline dotted' }}
                    >
                      {displayVal}<span style={S.unit}>{unitLabel}</span>
                    </button>
                  )}
                </div>
                <input
                  type="range" min={0} max={cat.max} step={cat.step} value={val}
                  onChange={(e) => {
                    const newVal = Number(e.target.value);
                    setForm(prev => {
                      const next = { ...prev, [cat.key]: newVal };
                      next.monthlyExpense = calcExpTotal(next);
                      return next;
                    });
                  }}
                  style={{ width: '100%', accentColor: C.greenDark, cursor: 'pointer', display: 'block' }}
                />
              </div>
            );
          })}

          {/* 合計プレビュー */}
          <div style={{
            marginTop: 8, padding: '10px 14px', borderRadius: 10,
            background: `${C.greenDark}08`, border: `1px solid ${C.greenDark}20`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>カテゴリ合計</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: C.greenDark }}>{total}<span style={{ fontSize: 12, fontWeight: 600, marginLeft: 3 }}>万円/月</span></span>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// ExistingLoansSection — 既存借入・固定返済の入力
// ─────────────────────────────────────────────────────────────
const LOAN_TYPE_OPTIONS = [
  { id: 'mortgage',  label: '住宅ローン', icon: '🏠' },
  { id: 'car',       label: '車ローン',   icon: '🚗' },
  { id: 'education', label: '奨学金',     icon: '🎓' },
  { id: 'card',      label: 'カード',     icon: '💳' },
  { id: 'other',     label: 'その他',     icon: '📋' },
];

const LoanRow = ({ loan, onUpdate, onRemove, currentAge }) => {
  const annualCost = (loan.monthlyPayment ?? 0) * 12;
  const remaining  = Math.max(0, (loan.endAge ?? currentAge) - currentAge);

  const [editing, setEditing] = React.useState(false);
  const [draft,   setDraft]   = React.useState('');

  const startEdit = () => { setDraft(String(loan.monthlyPayment ?? 0)); setEditing(true); };
  const commitEdit = () => {
    const n = parseFloat(draft.replace(/,/g, ''));
    if (!isNaN(n)) onUpdate('monthlyPayment', Math.max(0, Math.min(100, Math.round(n * 10) / 10)));
    setEditing(false);
  };

  return (
    <div style={{
      background: '#f9fafb', borderRadius: 14, padding: '14px 14px',
      border: `1px solid ${C.border}`, marginBottom: 10,
    }}>
      {/* タイプ選択 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          {LOAN_TYPE_OPTIONS.map(opt => {
            const active = loan.type === opt.id;
            return (
              <button key={opt.id} onClick={() => onUpdate('type', opt.id)} style={{
                padding: '3px 10px', borderRadius: 999,
                border: `1.5px solid ${active ? C.greenDark : C.border}`,
                background: active ? C.greenBg : C.white,
                color: active ? C.greenDark : C.textMuted,
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}>
                {opt.icon} {opt.label}
              </button>
            );
          })}
        </div>
        <button onClick={onRemove} style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          border: `1.5px solid ${C.border}`, background: C.white,
          color: C.textMuted, fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 8,
        }}>×</button>
      </div>

      {/* 毎月返済額 */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>毎月返済額</div>
          {editing ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <input
                type="number" value={draft} min={0} max={100} step={0.1} autoFocus
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                style={{
                  width: 64, padding: '3px 6px', fontSize: 16, fontWeight: 700,
                  color: C.greenDark, border: `1.5px solid ${C.greenDark}`,
                  borderRadius: 8, textAlign: 'right', outline: 'none', background: C.white,
                  MozAppearance: 'textfield',
                }}
              />
              <span style={{ fontSize: 12, color: C.textMuted }}>万円/月</span>
            </div>
          ) : (
            <button onClick={startEdit} style={{
              background: `${C.greenDark}10`, border: `1.5px solid ${C.greenDark}30`,
              borderRadius: 8, padding: '3px 10px', cursor: 'pointer',
              display: 'flex', alignItems: 'baseline', gap: 3,
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: C.greenDark }}>{loan.monthlyPayment ?? 0}</span>
              <span style={{ fontSize: 11, color: C.textMuted }}>万円/月</span>
            </button>
          )}
        </div>
        <input
          type="range" min={0} max={50} step={0.1}
          value={loan.monthlyPayment ?? 0}
          onChange={(e) => onUpdate('monthlyPayment', Number(e.target.value))}
          style={{ width: '100%', accentColor: C.greenDark, cursor: 'pointer', display: 'block', marginBottom: 2 }}
        />
        <div style={{ fontSize: 11, color: C.textMuted, textAlign: 'right' }}>
          年間 {annualCost.toFixed(0)}万円
        </div>
      </div>

      {/* 返済終了年齢 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>
            返済終了年齢
            <span style={{ fontSize: 10, color: C.textMuted, marginLeft: 6 }}>（残り{remaining}年）</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
            {loan.endAge ?? currentAge + 5}<span style={{ fontSize: 11, color: C.textMuted, marginLeft: 2 }}>歳</span>
          </div>
        </div>
        <input
          type="range" min={currentAge} max={80} step={1}
          value={loan.endAge ?? currentAge + 5}
          onChange={e => onUpdate('endAge', Number(e.target.value))}
          style={{ width: '100%', accentColor: C.greenDark, cursor: 'pointer', display: 'block' }}
        />
      </div>
    </div>
  );
};

const ExistingLoansSection = ({ loans, setLoans, currentAge }) => {
  const totalMonthly = loans.reduce((sum, l) => sum + (l.monthlyPayment ?? 0), 0);
  const addLoan = () => {
    const id = `loan_${Date.now()}`;
    setLoans(prev => [...prev, { id, type: 'other', monthlyPayment: 5, endAge: currentAge + 10 }]);
  };
  const removeLoan = (id) => setLoans(prev => prev.filter(l => l.id !== id));
  const updateLoan = (id, key, value) =>
    setLoans(prev => prev.map(l => l.id === id ? { ...l, [key]: value } : l));

  return (
    <div style={{ ...S.section, marginBottom: 12 }}>
      <div style={{ ...S.sectionTitle, marginBottom: loans.length > 0 ? 12 : 0 }}>
        💳 現在の借入・固定返済
        {totalMonthly > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: C.textMuted, fontWeight: 600 }}>
            合計 {totalMonthly.toFixed(1)}万円/月
          </span>
        )}
      </div>
      {loans.length === 0 && (
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10, lineHeight: 1.6 }}>
          住宅ローン・車ローン・奨学金など、現在返済中の借入があれば入力してください。
        </div>
      )}
      {loans.map(loan => (
        <LoanRow
          key={loan.id} loan={loan}
          onUpdate={(key, val) => updateLoan(loan.id, key, val)}
          onRemove={() => removeLoan(loan.id)}
          currentAge={currentAge}
        />
      ))}
      <button onClick={addLoan} style={{
        width: '100%', padding: '10px', borderRadius: 12,
        border: `1.5px dashed ${C.border}`, background: 'transparent',
        color: C.textMuted, fontSize: 13, fontWeight: 700, cursor: 'pointer',
      }}>
        ＋ 借入を追加
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// CarSection — 車の保有・買替周期型入力
// ─────────────────────────────────────────────────────────────
const CAR_CYCLES = [5, 7, 10];

const CarSection = ({ form, setForm, currentAge, last = false }) => {
  const enabled  = !!(form.carOwnership);
  const set      = (key) => (val) => setForm(prev => ({ ...prev, [key]: val }));
  const firstAge = form.carFirstAge ?? currentAge + 2;
  const cycle    = form.carReplaceCycle ?? 7;
  const price    = form.carPrice ?? 250;
  const payType  = form.carPaymentType ?? 'cash';
  const retireAge = form.retirementAge ?? 65;

  const [editingAge, setEditingAge]     = React.useState(false);
  const [draftAge, setDraftAge]         = React.useState('');
  const [editingPrice, setEditingPrice] = React.useState(false);
  const [draftPrice, setDraftPrice]     = React.useState('');

  const buyAges = [];
  if (enabled && firstAge > 0) {
    for (let a = firstAge; a <= retireAge && buyAges.length < 4; a += cycle) buyAges.push(a);
  }

  return (
    <div style={{ padding: '12px 0', borderBottom: last ? 'none' : `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: enabled ? 12 : 0 }}>
        <div style={{ flex: 1 }}>
          <div style={S.label}>車の保有</div>
          <div style={S.labelSub}>マイカー・買替周期で管理</div>
        </div>
        <button
          onClick={() => setForm(prev => ({
            ...prev,
            carOwnership: !enabled,
            carFirstAge: !enabled ? (prev.carFirstAge ?? currentAge + 2) : null,
          }))}
          style={{
            padding: '4px 12px', borderRadius: 999,
            border: `1.5px solid ${enabled ? C.greenDark : C.border}`,
            background: enabled ? C.greenBg : C.bg,
            color: enabled ? C.greenDark : C.textMuted,
            fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
          }}
        >
          {enabled ? '保有する ✓' : '保有しない'}
        </button>
      </div>

      {enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 最初の購入年齢 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>最初の購入予定年齢</div>
              {editingAge ? (
                <input
                  type="number" autoFocus
                  value={draftAge}
                  onChange={e => setDraftAge(e.target.value)}
                  onBlur={() => {
                    const n = parseInt(draftAge, 10);
                    if (!isNaN(n) && n > currentAge && n <= 60) set('carFirstAge')(n);
                    setEditingAge(false);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') e.target.blur();
                    if (e.key === 'Escape') { setEditingAge(false); }
                  }}
                  style={{ width: 64, textAlign: 'right', fontSize: 15, fontWeight: 700, color: C.greenDark,
                    border: `1.5px solid ${C.greenDark}`, borderRadius: 6, padding: '2px 4px',
                    outline: 'none', background: C.greenBg }}
                />
              ) : (
                <button onClick={() => { setDraftAge(String(firstAge)); setEditingAge(true); }}
                  style={{ fontSize: 15, fontWeight: 700, color: C.greenDark, background: 'none',
                    border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline dotted' }}>
                  {firstAge}<span style={S.unit}>歳</span>
                </button>
              )}
            </div>
            <input type="range" min={currentAge + 1} max={60} step={1} value={firstAge}
              onChange={e => set('carFirstAge')(Number(e.target.value))}
              style={{ width: '100%', accentColor: C.greenDark, cursor: 'pointer', display: 'block' }}
            />
          </div>

          {/* 買替周期 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>買替周期</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {CAR_CYCLES.map(c => {
                const active = cycle === c;
                return (
                  <button key={c} onClick={() => set('carReplaceCycle')(c)} style={{
                    padding: '4px 14px', borderRadius: 999,
                    border: `1.5px solid ${active ? C.greenDark : C.border}`,
                    background: active ? C.greenBg : C.white,
                    color: active ? C.greenDark : C.textMuted,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}>{c}年</button>
                );
              })}
            </div>
          </div>

          {/* 1台あたりの費用 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>1台あたりの費用</div>
              {editingPrice ? (
                <input
                  type="number" autoFocus
                  value={draftPrice}
                  onChange={e => setDraftPrice(e.target.value)}
                  onBlur={() => {
                    const n = parseInt(draftPrice, 10);
                    if (!isNaN(n) && n >= 50 && n <= 800) set('carPrice')(n);
                    setEditingPrice(false);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') e.target.blur();
                    if (e.key === 'Escape') { setEditingPrice(false); }
                  }}
                  style={{ width: 72, textAlign: 'right', fontSize: 15, fontWeight: 700, color: C.greenDark,
                    border: `1.5px solid ${C.greenDark}`, borderRadius: 6, padding: '2px 4px',
                    outline: 'none', background: C.greenBg }}
                />
              ) : (
                <button onClick={() => { setDraftPrice(String(price)); setEditingPrice(true); }}
                  style={{ fontSize: 15, fontWeight: 700, color: C.greenDark, background: 'none',
                    border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline dotted' }}>
                  {price.toLocaleString()}<span style={S.unit}>万円</span>
                </button>
              )}
            </div>
            <input type="range" min={50} max={800} step={10} value={price}
              onChange={e => set('carPrice')(Number(e.target.value))}
              style={{ width: '100%', accentColor: C.greenDark, cursor: 'pointer', display: 'block' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.textMuted, marginTop: 2 }}>
              <span>50万（軽中古）</span><span>250万（普通車）</span><span>800万（高級車）</span>
            </div>
          </div>

          {/* 支払方法 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>支払方法</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ id: 'cash', label: '現金一括' }, { id: 'loan', label: 'ローン' }].map(opt => {
                const active = payType === opt.id;
                return (
                  <button key={opt.id} onClick={() => set('carPaymentType')(opt.id)} style={{
                    padding: '4px 14px', borderRadius: 999,
                    border: `1.5px solid ${active ? C.greenDark : C.border}`,
                    background: active ? C.greenBg : C.white,
                    color: active ? C.greenDark : C.textMuted,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}>{opt.label}</button>
                );
              })}
            </div>
          </div>

          {/* 購入タイミングプレビュー */}
          {buyAges.length > 0 && (
            <div style={{
              padding: '8px 12px', borderRadius: 10,
              background: `${C.greenDark}08`, border: `1px solid ${C.greenDark}20`,
              fontSize: 11, color: C.textMuted,
            }}>
              <span style={{ fontWeight: 700, color: C.greenDark, marginRight: 6 }}>購入予定</span>
              {buyAges.map((a, idx) => (
                <span key={a} style={{ marginRight: 6 }}>{a}歳（{price}万）{idx < buyAges.length - 1 ? '→' : ''}</span>
              ))}
              {buyAges.length === 4 && <span>…</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// HousingSection — 7セクション版（ボーナス返済なし、維持費詳細追加）
// ─────────────────────────────────────────────────────────────
const HousingSection = ({ form, setForm, currentAge }) => {
  const enabled     = form.housingPurchaseAge !== null && form.housingPurchaseAge !== undefined;
  const [showAdv, setShowAdv] = React.useState(false);
  const set         = (key) => (val) => setForm(prev => ({ ...prev, [key]: val }));

  const [editingProp, setEditingProp]   = React.useState(false);
  const [draftProp, setDraftProp]       = React.useState('');
  const [editingDown, setEditingDown]   = React.useState(false);
  const [draftDown, setDraftDown]       = React.useState('');

  const housingStyle = form.housingStyle ?? 'mansion';
  const propPrice    = form.propertyPrice ?? 3500;
  const downPay      = Math.min(form.downPayment ?? 350, Math.floor(propPrice * 0.5));
  const mRate        = form.mortgageRate ?? 1.0;
  const mTerm        = form.mortgageTerm ?? 35;
  const loanAmt      = Math.max(0, propPrice - downPay);
  const monthly      = calcMonthlyPayment(loanAmt, mRate, mTerm);
  const totalInc     = (form.selfIncome ?? 0) + (form.spouseIncome ?? 0);
  const monthlyInc   = totalInc / 12;
  const burdenRate   = monthlyInc > 0 ? (monthly / monthlyInc * 100) : 0;
  const burdenColor  = burdenRate > 25 ? C.red : burdenRate > 20 ? C.amber : C.greenDark;
  const burdenLabel  = burdenRate > 25 ? '重い' : burdenRate > 20 ? '注意' : '適正';

  const miscRate    = form.miscCostRate ?? 5;
  const mgmtFee     = form.managementFee ?? 2.5;
  const propTax     = form.propertyTax ?? 15;
  const parkFee     = form.parkingFee ?? 0;
  const maintMonthly = (housingStyle === 'mansion' ? mgmtFee : 0) + parkFee + (propTax / 12);

  if (!enabled) {
    return (
      <div style={{ padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <div style={S.label}>住宅購入</div>
            <div style={S.labelSub}>マンション・一戸建て</div>
          </div>
          <button
            onClick={() => setForm(prev => ({
              ...prev,
              housingPurchaseAge: currentAge + 5,
              propertyPrice:  prev.propertyPrice  ?? 3500,
              downPayment:    prev.downPayment    ?? 350,
              mortgageRate:   prev.mortgageRate   ?? 1.0,
              mortgageTerm:   prev.mortgageTerm   ?? 35,
              mortgageType:   prev.mortgageType   ?? 'variable',
            }))}
            style={{
              padding: '4px 12px', borderRadius: 999,
              border: `1.5px solid ${C.border}`, background: C.bg,
              color: C.textMuted, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            予定なし
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
      {/* ── ヘッダー: ラベル + 購入年齢 + トグル ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={S.label}>住宅購入</div>
          <div style={S.labelSub}>マンション・一戸建て</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{form.housingPurchaseAge}</span>
            <span style={S.unit}>歳</span>
          </div>
          <button onClick={() => set('housingPurchaseAge')(null)} style={{
            padding: '4px 12px', borderRadius: 999,
            border: `1.5px solid ${C.greenDark}`, background: C.greenBg,
            color: C.greenDark, fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>予定あり ✓</button>
        </div>
      </div>

      {/* 購入年齢スライダー */}
      <input type="range" min={currentAge + 1} max={65} step={1}
        value={form.housingPurchaseAge}
        onChange={e => set('housingPurchaseAge')(Number(e.target.value))}
        style={{ width: '100%', accentColor: C.greenDark, cursor: 'pointer', display: 'block', marginBottom: 14 }}
      />

      {/* 住宅タイプ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>住宅タイプ</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[{ id: 'mansion', label: 'マンション' }, { id: 'kodate', label: '一戸建て' }].map(opt => {
            const active = housingStyle === opt.id;
            return (
              <button key={opt.id} onClick={() => set('housingStyle')(opt.id)} style={{
                padding: '4px 14px', borderRadius: 999,
                border: `1.5px solid ${active ? C.greenDark : C.border}`,
                background: active ? C.greenBg : C.white,
                color: active ? C.greenDark : C.textMuted,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>{opt.label}</button>
            );
          })}
        </div>
      </div>

      {/* 住宅価格 + 頭金（横並び） */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted }}>想定住宅価格</div>
            {editingProp ? (
              <input
                type="number" autoFocus
                value={draftProp}
                onChange={e => setDraftProp(e.target.value)}
                onBlur={() => {
                  const n = parseInt(draftProp, 10);
                  if (!isNaN(n) && n >= 500 && n <= 12000) set('propertyPrice')(n);
                  setEditingProp(false);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') e.target.blur();
                  if (e.key === 'Escape') { setEditingProp(false); }
                }}
                style={{ width: 80, textAlign: 'right', fontSize: 14, fontWeight: 700, color: C.text,
                  border: `1.5px solid ${C.greenDark}`, borderRadius: 6, padding: '2px 4px',
                  outline: 'none', background: C.greenBg }}
              />
            ) : (
              <button onClick={() => { setDraftProp(String(propPrice)); setEditingProp(true); }}
                style={{ fontSize: 14, fontWeight: 700, color: C.text, background: 'none',
                  border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline dotted' }}>
                {propPrice.toLocaleString()}<span style={S.unit}>万円</span>
              </button>
            )}
          </div>
          <input type="range" min={500} max={12000} step={100}
            value={propPrice}
            onChange={e => set('propertyPrice')(Number(e.target.value))}
            style={{ width: '100%', accentColor: C.greenDark, cursor: 'pointer', display: 'block' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted }}>頭金</div>
            {editingDown ? (
              <input
                type="number" autoFocus
                value={draftDown}
                onChange={e => setDraftDown(e.target.value)}
                onBlur={() => {
                  const n = parseInt(draftDown, 10);
                  const maxDown = Math.floor(propPrice * 0.5);
                  if (!isNaN(n) && n >= 0 && n <= maxDown) set('downPayment')(n);
                  setEditingDown(false);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') e.target.blur();
                  if (e.key === 'Escape') { setEditingDown(false); }
                }}
                style={{ width: 80, textAlign: 'right', fontSize: 14, fontWeight: 700, color: C.text,
                  border: `1.5px solid ${C.greenDark}`, borderRadius: 6, padding: '2px 4px',
                  outline: 'none', background: C.greenBg }}
              />
            ) : (
              <button onClick={() => { setDraftDown(String(downPay)); setEditingDown(true); }}
                style={{ fontSize: 14, fontWeight: 700, color: C.text, background: 'none',
                  border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline dotted' }}>
                {downPay.toLocaleString()}<span style={S.unit}>万円</span>
              </button>
            )}
          </div>
          <input type="range" min={0} max={Math.max(100, Math.floor(propPrice * 0.5))} step={50}
            value={downPay}
            onChange={e => set('downPayment')(Number(e.target.value))}
            style={{ width: '100%', accentColor: C.greenDark, cursor: 'pointer', display: 'block' }}
          />
        </div>
      </div>

      {/* 月返済プレビューバナー */}
      <div style={{
        padding: '10px 14px', borderRadius: 12,
        background: `${burdenColor}10`, border: `1.5px solid ${burdenColor}40`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
      }}>
        <div>
          <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, marginBottom: 2 }}>
            借入額 {loanAmt.toLocaleString()}万 の月返済（概算）
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: burdenColor, lineHeight: 1 }}>
            {monthly.toFixed(1)}<span style={{ fontSize: 12, fontWeight: 600, marginLeft: 2 }}>万円/月</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 600 }}>返済負担率</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: burdenColor, lineHeight: 1 }}>
            {monthlyInc > 0 ? `${Math.round(burdenRate)}%` : '—'}
          </div>
          <div style={{ fontSize: 10, color: burdenColor, fontWeight: 700 }}>{burdenLabel}</div>
        </div>
      </div>

      {/* 住宅購入プラン 簡易チェック */}
      {(() => {
        const currentAge_ = form.currentAge ?? 30;
        const purchaseAge_ = form.housingPurchaseAge ?? currentAge_ + 5;
        const savings_  = form.currentSavings ?? 0;
        const netInc    = ((form.selfIncome ?? 0) + (form.spouseIncome ?? 0)) * 0.8 / 12;
        const exp_      = (form.monthlyExpense ?? 0) + (form.monthlyInvestment ?? 0);
        const monthlySurplus = netInc - exp_;
        const yearsUntil = Math.max(0, purchaseAge_ - currentAge_);
        const savingsAt  = Math.round(savings_ - downPay + yearsUntil * 12 * monthlySurplus);
        const min5       = Math.round(savingsAt + 5 * 12 * (monthlySurplus - monthly));
        const isDanger   = burdenRate > 25 || savingsAt < 0 || min5 < 0;
        const isCaution  = !isDanger && (burdenRate > 20 || savingsAt < 200 || min5 < 200);
        const judgment   = isDanger ? '危険' : isCaution ? '慎重' : '安全';
        const jColor     = isDanger ? C.red : isCaution ? C.amber : C.green;
        const jDark      = isDanger ? '#dc2626' : isCaution ? '#b45309' : C.greenDark;
        const jBg        = isDanger ? '#fef2f2' : isCaution ? '#fffbeb' : C.greenBg;
        return (
          <div style={{
            padding: '10px 14px', borderRadius: 12, marginBottom: 10,
            background: jBg, border: `1.5px solid ${jColor}40`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted }}>住宅購入プランの簡易判定</div>
              <div style={{
                fontSize: 12, fontWeight: 900, color: jDark,
                padding: '2px 10px', borderRadius: 999,
                background: 'rgba(255,255,255,0.7)', border: `1.5px solid ${jColor}50`,
              }}>{judgment}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: C.textMuted, fontWeight: 600, marginBottom: 2 }}>購入時残貯蓄（概算）</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: savingsAt < 0 ? '#dc2626' : savingsAt < 200 ? '#b45309' : jDark }}>
                  {savingsAt < 0 ? `−${Math.abs(savingsAt).toLocaleString()}` : savingsAt.toLocaleString()}万
                </div>
              </div>
              <div style={{ width: 1, background: `${jColor}30` }} />
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: C.textMuted, fontWeight: 600, marginBottom: 2 }}>購入後5年最低資産（概算）</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: min5 < 0 ? '#dc2626' : min5 < 200 ? '#b45309' : jDark }}>
                  {min5 < 0 ? `−${Math.abs(min5).toLocaleString()}` : min5.toLocaleString()}万
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 詳細設定アコーディオン */}
      <button
        onClick={() => setShowAdv(v => !v)}
        style={{
          width: '100%', padding: '8px 14px', borderRadius: 10,
          border: `1.5px solid ${C.border}`, background: C.bg,
          color: C.textMuted, fontSize: 12, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span>詳細設定（金利・維持費・諸費用）</span>
        <span style={{ fontSize: 13 }}>{showAdv ? '▲' : '▼'}</span>
      </button>

      {showAdv && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* 金利 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
                金利 <span style={{ fontSize: 10, color: C.textMuted }}>（年利）</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{mRate.toFixed(1)}<span style={S.unit}>%</span></div>
            </div>
            <input type="range" min={0.1} max={5.0} step={0.1} value={mRate}
              onChange={e => set('mortgageRate')(Number(e.target.value))}
              style={{ width: '100%', accentColor: C.greenDark, cursor: 'pointer', display: 'block' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.textMuted, marginTop: 2 }}>
              <span>0.1% 変動低め</span><span>1.5% 固定目安</span><span>5.0%</span>
            </div>
          </div>

          {/* 借入年数 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>借入年数</div>
            <NumberStepper value={mTerm} onChange={set('mortgageTerm')} min={10} max={50} step={1} format={v => `${v}年`} />
          </div>

          {/* 金利タイプ */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>金利タイプ</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ id: 'variable', label: '変動' }, { id: 'fixed', label: '固定' }].map(opt => {
                const active = (form.mortgageType ?? 'variable') === opt.id;
                return (
                  <button key={opt.id} onClick={() => set('mortgageType')(opt.id)} style={{
                    padding: '4px 14px', borderRadius: 999,
                    border: `1.5px solid ${active ? C.greenDark : C.border}`,
                    background: active ? C.greenBg : C.white,
                    color: active ? C.greenDark : C.textMuted,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}>{opt.label}</button>
                );
              })}
            </div>
          </div>

          {/* 購入諸費用率 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>購入諸費用率</span>
                <span style={{ fontSize: 10, color: C.textMuted, marginLeft: 6 }}>登記・仲介・税など</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                {miscRate}% <span style={{ fontSize: 11, color: C.textMuted }}>（{Math.round(propPrice * miscRate / 100)}万円）</span>
              </div>
            </div>
            <input type="range" min={2} max={10} step={0.5} value={miscRate}
              onChange={e => set('miscCostRate')(Number(e.target.value))}
              style={{ width: '100%', accentColor: C.greenDark, cursor: 'pointer', display: 'block' }}
            />
          </div>

          {/* 管理費・修繕積立（マンションのみ） */}
          {housingStyle === 'mansion' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>管理費・修繕積立</span>
                  <span style={{ fontSize: 10, color: C.textMuted, marginLeft: 6 }}>マンション月次コスト</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{mgmtFee}<span style={S.unit}>万円/月</span></div>
              </div>
              <input type="range" min={0.5} max={8} step={0.5} value={mgmtFee}
                onChange={e => set('managementFee')(Number(e.target.value))}
                style={{ width: '100%', accentColor: C.greenDark, cursor: 'pointer', display: 'block' }}
              />
            </div>
          )}

          {/* 固定資産税 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>固定資産税</span>
                <span style={{ fontSize: 10, color: C.textMuted, marginLeft: 6 }}>年額</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{propTax}<span style={S.unit}>万円/年</span></div>
            </div>
            <input type="range" min={5} max={60} step={1} value={propTax}
              onChange={e => set('propertyTax')(Number(e.target.value))}
              style={{ width: '100%', accentColor: C.greenDark, cursor: 'pointer', display: 'block' }}
            />
          </div>

          {/* 駐車場代 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>駐車場代</span>
                <span style={{ fontSize: 10, color: C.textMuted, marginLeft: 6 }}>月額（0=なし）</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                {parkFee === 0 ? 'なし' : `${parkFee}万円/月`}
              </div>
            </div>
            <input type="range" min={0} max={5} step={0.5} value={parkFee}
              onChange={e => set('parkingFee')(Number(e.target.value))}
              style={{ width: '100%', accentColor: C.greenDark, cursor: 'pointer', display: 'block' }}
            />
          </div>

          {/* 年間維持費サマリー */}
          <div style={{
            padding: '8px 12px', borderRadius: 10,
            background: `${C.greenDark}08`, border: `1px solid ${C.greenDark}20`,
            fontSize: 11, color: C.textMuted,
          }}>
            <div style={{ fontWeight: 700, color: C.greenDark, marginBottom: 4 }}>年間維持費の概算</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>月額コスト（{maintMonthly.toFixed(1)}万円/月）</span>
              <span style={{ fontWeight: 700, color: C.text }}>{(maintMonthly * 12).toFixed(0)}万円/年</span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MiniGauge — 常時表示の余裕度バー
// ─────────────────────────────────────────────────────────────
const MiniGauge = ({ gauge, message }) => {
  const color = gauge >= 80 ? C.green : gauge >= 50 ? C.amber : C.red;
  return (
    <div style={{
      background: C.white, borderRadius: 16, padding: '14px 18px',
      border: `1.5px solid ${color}30`, marginBottom: 12,
      display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: `0 2px 12px ${color}18`,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '0.08em', marginBottom: 6 }}>
          生活安全度
        </div>
        <div style={{ height: 8, background: '#f0f0f0', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${gauge}%`, borderRadius: 99, background: color,
            transition: 'width 0.5s cubic-bezier(0.34,1.2,0.64,1)',
          }} />
        </div>
        <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 6 }}>{message}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{gauge}</div>
        <div style={{ fontSize: 10, color: C.textMuted }}>/ 100</div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// ライフタイプ定義
// ─────────────────────────────────────────────────────────────
const LIFE_TYPE_OPTS = [
  { id: 'single', label: '一人暮らし', icon: '🌱' },
  { id: 'couple', label: '共働き',     icon: '🌿' },
  { id: 'family', label: '子育て中',   icon: '🍃' },
];

// ─────────────────────────────────────────────────────────────
// InputScreen
// ─────────────────────────────────────────────────────────────
export const InputScreen = ({ onBack, onNext }) => {
  const { state, actions } = useAppStore();
  const [form, setForm] = React.useState(() => {
    const base = { ...state.profileData };
    if (!Array.isArray(base.childAges)) {
      base.childAges = [base.firstChildAge ?? null, null, null, null];
    }
    return base;
  });

  // ── 比較案採用トースト ─────────────────────────────────────
  const [adoptedMsg, setAdoptedMsg] = React.useState(() => {
    const msg = window.__scenarioAdoptedMsg ?? null;
    window.__scenarioAdoptedMsg = null;
    return msg;
  });
  React.useEffect(() => {
    if (!adoptedMsg) return;
    const t = setTimeout(() => setAdoptedMsg(null), 5000);
    return () => clearTimeout(t);
  }, [adoptedMsg]);

  const gaugeResult = React.useMemo(() => calcInitialGauge(form), [form]);
  const set         = (key) => (val) => setForm(prev => ({ ...prev, [key]: val }));
  const setLoans    = (updater) => setForm(prev => ({
    ...prev,
    existingLoans: typeof updater === 'function' ? updater(prev.existingLoans ?? []) : updater,
  }));
  const currentAge  = form.currentAge ?? 30;

  const setChildAge = (idx, val) => setForm(prev => {
    const childAges = [...(prev.childAges ?? [null, null, null, null])];
    childAges[idx] = val;
    return { ...prev, childAges, firstChildAge: childAges[0] };
  });

  const handleNext = () => {
    const toSave = { ...form, firstChildAge: form.childAges?.[0] ?? null };
    actions.setProfile(toSave);
    actions.setGauge(gaugeResult.gauge);
    if (typeof onNext === 'function') onNext();
    else actions.setScreen('simulation');
  };

  const handleBack = () => {
    if (typeof onBack === 'function') onBack();
    else actions.setScreen('home');
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif' }}>
      <style>{`
        input[type=range] { -webkit-appearance: none; appearance: none; height: 5px; border-radius: 99px; background: #e5e7eb; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%; background: #16a34a; border: 3px solid #fff; box-shadow: 0 1px 6px rgba(0,0,0,0.22); cursor: pointer; transition: transform 0.1s; }
        input[type=range]::-webkit-slider-thumb:active { transform: scale(1.15); }
        input[type=range]::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: #16a34a; border: 3px solid #fff; box-shadow: 0 1px 6px rgba(0,0,0,0.22); cursor: pointer; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
      `}</style>

      {/* ── ヘッダー ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(249,250,251,0.96)', backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)', borderBottom: `1px solid ${C.border}`,
        padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={handleBack} style={{
          width: 36, height: 36, borderRadius: '50%',
          border: `1.5px solid ${C.border}`, background: C.white,
          fontSize: 15, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: C.textMuted,
        }}>←</button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>ライフプラン入力</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>入力するほど精度が上がります</div>
        </div>
      </div>

      {/* ── 比較案採用トースト（fixed で常に可視） ── */}
      {adoptedMsg && (
        <div style={{
          position: 'fixed', bottom: 'calc(90px + env(safe-area-inset-bottom, 0px))',
          left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, whiteSpace: 'nowrap',
          background: '#15803d', color: '#fff',
          padding: '10px 22px', borderRadius: 999,
          fontSize: 12, fontWeight: 700,
          boxShadow: '0 4px 16px rgba(21,128,61,0.35)',
          letterSpacing: '0.02em',
          animation: 'toastIn 0.25s ease',
        }}>
          ✓ {adoptedMsg}
        </div>
      )}
      <style>{`@keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>

      {/* ── スクロールエリア ── */}
      <div style={{ padding: '16px 16px 120px', maxWidth: 480, margin: '0 auto' }}>

        {/* 説明文 */}
        <div style={{
          fontSize: 13, color: C.text, fontWeight: 600,
          lineHeight: 1.65, marginBottom: 6, paddingLeft: 2,
        }}>
          ライフプラン入力
        </div>
        <div style={{
          fontSize: 12, color: C.textMuted, fontWeight: 500,
          lineHeight: 1.6, marginBottom: 14, paddingLeft: 2,
        }}>
          住宅購入・教育費・老後まで、あなたの家計が耐えられるかを確認します。
        </div>

        {/* 軽い案内（スコアは入力後に表示） */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          fontSize: 11, color: C.textMuted, fontWeight: 500,
          background: '#f8fafc', borderRadius: 10,
          padding: '8px 14px', marginBottom: 14,
          border: `1px solid ${C.border}`,
        }}>
          <span style={{ fontSize: 13 }}>📊</span>
          <span>収入・支出を入力すると、家計安全度が自動で更新されます</span>
        </div>

        {/* ══ セクション① 基本情報 ═══════════════════════════════ */}
        <div style={S.section}>
          <div style={S.sectionTitle}>👤 基本情報</div>

          {/* 現在の年齢 */}
          <div style={S.row}>
            <div style={{ flex: 1 }}>
              <div style={S.label}>現在の年齢</div>
            </div>
            <NumberStepper value={form.currentAge} onChange={set('currentAge')} min={18} max={60} format={v => `${v}歳`} />
          </div>

          {/* ライフタイプ */}
          <div style={S.rowLast}>
            <div style={{ flex: 1 }}>
              <div style={S.label}>ライフスタイル</div>
              <div style={S.labelSub}>現在の生活状況</div>
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {LIFE_TYPE_OPTS.map(opt => {
                const active = (form.lifeType ?? 'couple') === opt.id;
                return (
                  <button key={opt.id} onClick={() => set('lifeType')(opt.id)} style={{
                    padding: '5px 10px', borderRadius: 999,
                    border: `1.5px solid ${active ? C.greenDark : C.border}`,
                    background: active ? C.greenBg : C.white,
                    color: active ? C.greenDark : C.textMuted,
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  }}>
                    {opt.icon} {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ══ セクション② 収入 ═══════════════════════════════════ */}
        <div style={S.section}>
          <div style={S.sectionTitle}>💼 収入</div>

          <SliderRow label="本人年収" value={form.selfIncome} onChange={set('selfIncome')}
            min={100} max={1500} step={10} format={v => v.toLocaleString()} unit="万円/年" />

          <SliderRow label="配偶者年収" sub="0万円 = 配偶者なし or 専業主婦"
            value={form.spouseIncome} onChange={set('spouseIncome')}
            min={0} max={1000} step={10}
            format={v => v === 0 ? 'なし' : v.toLocaleString()}
            unit={form.spouseIncome > 0 ? '万円/年' : ''}
            color={form.spouseIncome > 0 ? C.greenDark : C.textMuted} />

          {form.spouseIncome > 0 && (
            <SliderRow label="配偶者復職年齢" sub="育休・離職からの復帰予定"
              value={form.spouseReturnAge ?? currentAge + 3} onChange={set('spouseReturnAge')}
              min={currentAge} max={60} step={1} format={v => `${v}歳`} />
          )}

          <SliderRow label="年収上昇率" sub="毎年の昇給率（目安1〜2%）"
            value={form.incomeGrowthRate} onChange={set('incomeGrowthRate')}
            min={0} max={5} step={0.1} format={v => v.toFixed(1)} unit="%/年" last />
        </div>

        {/* ══ セクション③ 支出 ════════════════════════════════════ */}
        <div style={S.section}>
          <div style={S.sectionTitle}>🧾 支出</div>

          <SliderRow label="月生活費（合計）" sub="家賃・食費・光熱費など（ローン返済は除く）"
            value={form.monthlyExpense} onChange={set('monthlyExpense')}
            min={5} max={60} step={1} format={v => v.toLocaleString()} unit="万円/月"
            color={form.monthlyExpense > 30 ? C.red : C.greenDark} />

          {/* 子ども人数 */}
          <div style={S.row}>
            <div style={{ flex: 1 }}>
              <div style={S.label}>子どもの人数</div>
              <div style={S.labelSub}>0人 = 子ども予定なし</div>
            </div>
            <NumberStepper
              value={form.numChildren} min={0} max={4}
              format={v => v === 0 ? 'なし' : `${v}人`}
              onChange={v => setForm(prev => {
                const childAges = [...(prev.childAges ?? [null, null, null, null])];
                if (v > prev.numChildren && childAges[v - 1] === null) {
                  childAges[v - 1] = currentAge + 3;
                }
                return { ...prev, numChildren: v, childAges, firstChildAge: childAges[0] };
              })}
            />
          </div>

          {/* 子どもごとの年齢設定 */}
          {Array.from({ length: form.numChildren }).map((_, i) => (
            <ChildRow
              key={i} index={i}
              value={form.childAges?.[i] ?? null}
              onChange={val => setChildAge(i, val)}
              currentAge={currentAge}
              last={i === form.numChildren - 1}
            />
          ))}

          {/* 教育方針 */}
          <div style={S.rowLast}>
            <div style={{ flex: 1 }}>
              <div style={S.label}>教育方針</div>
              <div style={S.labelSub}>子1人あたりの総費用目安</div>
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 210 }}>
              {[
                { id: 'public',  label: '公立中心', note: '〜800万' },
                { id: 'mix_pub', label: '大学私立', note: '〜1,200万' },
                { id: 'mix_pri', label: '中高私立', note: '〜1,800万' },
                { id: 'private', label: '全私立',   note: '〜2,500万' },
              ].map(opt => {
                const active = form.educationPlan === opt.id;
                return (
                  <button key={opt.id} onClick={() => set('educationPlan')(opt.id)} style={{
                    padding: '5px 9px', borderRadius: 999,
                    border: `1.5px solid ${active ? C.greenDark : C.border}`,
                    background: active ? C.greenBg : C.white,
                    color: active ? C.greenDark : C.textMuted,
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  }}>
                    <div>{opt.label}</div>
                    <div style={{ fontSize: 9, opacity: 0.7 }}>{opt.note}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 支出詳細アコーディオン */}
          <ExpenseDetailAccordion form={form} setForm={setForm} />
        </div>

        {/* ── 家計安全度チェック（基本情報・収入・支出入力後に表示） ── */}
        {(() => {
          const g     = gaugeResult;
          const score = g.adjustedGauge ?? g.gauge;
          const col   = score >= 80 ? C.green : score >= 60 ? '#65a30d' : score >= 40 ? C.amber : C.red;
          const hasCorrBrk = g.baseGauge != null && g.baseGauge !== score && (g.corrections?.length ?? 0) > 0;
          return (
            <div style={{
              background: C.white, borderRadius: 16,
              padding: '16px 18px', marginBottom: 12,
              border: `1.5px solid ${col}28`,
              boxShadow: `0 2px 10px ${col}12`,
            }}>
              {/* ヘッダー行 */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '0.08em', marginBottom: 6 }}>
                    現在の家計安全度
                  </div>
                  {/* バー */}
                  <div style={{ height: 7, background: '#f0f0f0', borderRadius: 99, overflow: 'hidden', marginBottom: 7 }}>
                    <div style={{
                      height: '100%', width: `${score}%`, borderRadius: 99, background: col,
                      transition: 'width 0.55s cubic-bezier(0.34,1.2,0.64,1)',
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: col, fontWeight: 600, lineHeight: 1.5 }}>{g.message}</div>
                </div>
                {/* スコア + バッジ */}
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 36, fontWeight: 900, color: col, lineHeight: 1 }}>{score}</div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, marginTop: 4,
                    padding: '2px 9px', borderRadius: 999,
                    background: g.status?.bg ?? '#f0fdf4',
                    color: g.status?.color ?? col,
                    border: `1px solid ${col}30`,
                  }}>
                    {g.status?.label}
                  </div>
                </div>
              </div>

              {/* 補正ブレイクダウン（ある場合のみ） */}
              {hasCorrBrk && (
                <div style={{
                  marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`,
                  display: 'flex', flexWrap: 'wrap', gap: 6,
                }}>
                  <span style={{ fontSize: 10, color: C.textMuted, width: '100%', marginBottom: 2 }}>
                    ベース {g.baseGauge} → 補正後 {score}（−{g.dampedTotal}点）
                  </span>
                  {g.corrections.map(c => (
                    <span key={c.key} style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 999,
                      background: '#fff7ed', color: '#92400e',
                      border: '1px solid #fde68a',
                    }}>
                      {c.icon} {c.label} −{c.pts}点
                    </span>
                  ))}
                </div>
              )}

              {/* フッターノート */}
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 8 }}>
                ✏️ 収入・支出・住宅計画の入力値をもとに自動計算されます
              </div>
            </div>
          );
        })()}

        {/* ══ セクション④ 資産 ════════════════════════════════════ */}
        <div style={S.section}>
          <div style={S.sectionTitle}>📈 資産・投資</div>

          <SliderRow label="現在の貯蓄" sub="預金・現金の合計"
            value={form.currentSavings} onChange={set('currentSavings')}
            min={0} max={3000} step={10} format={v => v.toLocaleString()} unit="万円" />

          <SliderRow label="毎月の投資額" sub="NISA・積立投資など"
            value={form.monthlyInvestment} onChange={set('monthlyInvestment')}
            min={0} max={30} step={0.1}
            format={v => v === 0 ? '0' : v % 1 === 0 ? String(v) : v.toFixed(1)}
            unit="万円/月" />

          <SliderRow label="想定利回り" sub="年平均リターン（NISA・インデックス目安5%）"
            value={form.investmentReturn} onChange={set('investmentReturn')}
            min={0} max={12} step={0.5}
            format={v => v.toFixed(1)} unit="%/年"
            color={form.investmentReturn >= 8 ? C.amber : C.greenDark}
            last />
        </div>

        {/* ══ セクション⑤ 借入・固定返済 ══════════════════════════ */}
        <ExistingLoansSection
          loans={form.existingLoans ?? []}
          setLoans={setLoans}
          currentAge={currentAge}
        />

        {/* ══ セクション⑥ ライフイベント ══════════════════════════ */}
        <div style={S.section}>
          <div style={S.sectionTitle}>📅 ライフイベント</div>

          <CarSection form={form} setForm={setForm} currentAge={currentAge} />

          <AgeSelector label="転職" sub="キャリアチェンジの予定年齢"
            value={form.jobChangeAge} onChange={set('jobChangeAge')}
            minAge={currentAge + 1} maxAge={65} currentAge={currentAge}
            last />
        </div>

        {/* ══ セクション⑦ 住宅購入 ══════════════════════════════ */}
        <div style={S.section}>
          <div style={S.sectionTitle}>🏠 住宅購入</div>

          <HousingSection form={form} setForm={setForm} currentAge={currentAge} />
        </div>


      </div>

      {/* ── 固定フッターボタン ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '14px 20px 32px',
        background: 'rgba(249,250,251,0.96)', backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)', borderTop: `1px solid ${C.border}`,
      }}>
        <button onClick={handleNext} style={{
          width: '100%', maxWidth: 440, display: 'block', margin: '0 auto',
          padding: '17px', borderRadius: 999, border: 'none',
          background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`,
          color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
          letterSpacing: '0.08em', boxShadow: `0 8px 24px ${C.green}40`,
        }}>
          シミュレーションを開始する
        </button>
      </div>
    </div>
  );
};
