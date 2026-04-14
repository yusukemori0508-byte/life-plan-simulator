// src/components/steps/EventStep.jsx
import React from 'react';
import { NumberStepper, SectionTitle } from '../ui.jsx';
import { LIFE_EVENT_TEMPLATES } from '../../constants.js';
import { fmtMan, safeNum, genId } from '../../utils.js';

// ★ LIFE_EVENT_TEMPLATES の各要素は:
//   { id, label, icon, defaultAge, defaultCost }

// アイコン選択を廃止（iOS絵文字非対応のため）

const st = {
  wrap: { padding: '16px 16px 8px' },
  templateGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 },
  templateBtn: {
    background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10,
    padding: '10px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
  },
  templateIcon: { fontSize: 20, marginBottom: 4 },
  templateName: { fontSize: 12, fontWeight: 600, color: '#374151', lineHeight: 1.3 },
  templateCost: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  eventCard: {
    background: '#f9fafb', border: '1px solid #e5e7eb',
    borderRadius: 12, padding: '12px 14px', marginBottom: 10,
  },
  eventHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8, cursor: 'pointer',
  },
  eventLeft:  { display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  eventIcon:  { fontSize: 22, flexShrink: 0 },
  eventInfo:  { flex: 1, minWidth: 0 },
  eventLabel: { fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  eventMeta:  { fontSize: 11, color: '#6b7280', marginTop: 2 },
  deleteBtn:  { background: '#fee2e2', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, color: '#dc2626', cursor: 'pointer', flexShrink: 0 },
  iconPickerRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  iconBtn: (selected) => ({
    fontSize: 20, background: selected ? '#ede9fe' : '#fff',
    border: `2px solid ${selected ? '#8b5cf6' : '#e5e7eb'}`, borderRadius: 7,
    padding: '3px 5px', cursor: 'pointer',
  }),
  addCustomBtn: {
    width: '100%', padding: '10px', background: '#f3f4f6',
    border: '2px dashed #d1d5db', borderRadius: 10, fontSize: 13,
    color: '#6b7280', cursor: 'pointer', fontWeight: 500, marginTop: 8,
  },
  totalCard: {
    background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10,
    padding: '10px 14px', display: 'flex', justifyContent: 'space-between',
    fontSize: 14, fontWeight: 700, color: '#1d4ed8', marginTop: 12,
  },
};

const EventCard = ({ event, onChange, onDelete }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <div style={st.eventCard}>
      <div style={st.eventHeader} onClick={() => setOpen(!open)}>
        <div style={st.eventLeft}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: '#6b7280', flexShrink: 0 }} />
          <div style={st.eventInfo}>
            <div style={st.eventLabel}>{event.label || '（ラベル未設定）'}</div>
            <div style={st.eventMeta}>{event.age}歳 · {fmtMan(safeNum(event.cost, 0))}万円</div>
          </div>
        </div>
        <span style={{ marginLeft: 8, color: '#9ca3af', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
        <button style={st.deleteBtn} onClick={(e) => { e.stopPropagation(); onDelete(); }}>削除</button>
      </div>

      {open && (
        <>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>イベント名</div>
            <input
              type="text"
              value={event.label || ''}
              onChange={(e) => onChange('label', e.target.value)}
              placeholder="例: 車の買い替え"
              style={{
                width: '100%', padding: '8px 10px',
                border: '1px solid #d1d5db', borderRadius: 8,
                fontSize: 14, boxSizing: 'border-box',
              }}
            />
          </div>

          <NumberStepper
            label="発生年齢（本人）"
            value={safeNum(event.age, 40)}
            onChange={(v) => onChange('age', v)}
            min={18} max={100} unit="歳"
          />

          <NumberStepper
            label="費用"
            value={safeNum(event.cost, 0)}
            onChange={(v) => onChange('cost', v)}
            min={0} max={50000} step={10} unit="万円"
          />
        </>
      )}
    </div>
  );
};

export const EventStep = ({ form, onChange, errors = {} }) => {
  const lifeEvents = Array.isArray(form.lifeEvents) ? form.lifeEvents : [];
  const currentAge = safeNum(form.currentAge, 30);
  const totalCost  = lifeEvents.reduce((s, e) => s + safeNum(e.cost, 0), 0);
  const [addedId,  setAddedId]  = React.useState(null);
  const [hoverId,  setHoverId]  = React.useState(null);

  const handleAddTemplate = (tpl) => {
    const newEvent = {
      id:    genId(),
      icon:  tpl.icon,
      label: tpl.label,
      age:   tpl.defaultAge,
      cost:  tpl.defaultCost,
    };
    onChange('lifeEvents', [...lifeEvents, newEvent]);
    // フラッシュエフェクト: 500ms だけ追加済み状態を表示
    setAddedId(tpl.id);
    setTimeout(() => setAddedId(null), 500);
  };

  const handleAddCustom = () => {
    const newEvent = {
      id:    genId(),
      icon:  '●',
      label: '',
      age:   currentAge + 5,
      cost:  100,
    };
    onChange('lifeEvents', [...lifeEvents, newEvent]);
  };

  const handleChange = (id, field, value) => {
    onChange('lifeEvents', lifeEvents.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const handleDelete = (id) => {
    onChange('lifeEvents', lifeEvents.filter((e) => e.id !== id));
  };

  return (
    <div style={st.wrap}>
      <SectionTitle icon="🎯" title="ライフイベント" />

      {/* テンプレート */}
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>テンプレートから追加</div>
      <div style={st.templateGrid}>
        {LIFE_EVENT_TEMPLATES.map((tpl) => {
          const isAdded  = addedId === tpl.id;
          const isHover  = hoverId === tpl.id;
          return (
            <button
              key={tpl.id}
              style={{
                ...st.templateBtn,
                background: isAdded  ? '#d1fae5'
                          : isHover  ? '#eff6ff'
                          : '#f9fafb',
                border: `1px solid ${isAdded ? '#6ee7b7' : isHover ? '#93c5fd' : '#e5e7eb'}`,
                transform: isAdded ? 'scale(0.96)' : isHover ? 'translateY(-2px)' : 'none',
                boxShadow: isHover && !isAdded ? '0 4px 12px rgba(37,99,235,0.12)' : 'none',
              }}
              onClick={() => handleAddTemplate(tpl)}
              onMouseEnter={() => setHoverId(tpl.id)}
              onMouseLeave={() => setHoverId(null)}
              onTouchStart={() => setHoverId(tpl.id)}
              onTouchEnd={() => setTimeout(() => setHoverId(null), 150)}
            >
              <div style={st.templateIcon}>{isAdded ? '✓' : '+'}</div>
              <div style={{ ...st.templateName, color: isAdded ? '#065f46' : '#374151' }}>
                {isAdded ? '追加しました' : tpl.label}
              </div>
              {!isAdded && <div style={st.templateCost}>目安: {fmtMan(tpl.defaultCost)}万円</div>}
            </button>
          );
        })}
      </div>

      {/* 登録済みイベント */}
      {lifeEvents.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
            登録済みイベント ({lifeEvents.length}件)
          </div>
          {[...lifeEvents]
            .sort((a, b) => Number(a.age) - Number(b.age))
            .map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onChange={(field, value) => handleChange(event.id, field, value)}
                onDelete={() => handleDelete(event.id)}
              />
            ))}
        </>
      )}

      {/* カスタム追加 */}
      <button style={st.addCustomBtn} onClick={handleAddCustom}>
        ＋ カスタムイベントを追加
      </button>

      {/* 合計 */}
      {lifeEvents.length > 0 && (
        <div style={st.totalCard}>
          <span>イベント費用合計</span>
          <span>{fmtMan(totalCost)}万円</span>
        </div>
      )}
    </div>
  );
};
