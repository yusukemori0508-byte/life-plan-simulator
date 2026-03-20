// src/components/steps/FamilyStep.jsx
import { Toggle, NumberStepper, Select, SectionTitle, Divider } from '../ui.jsx';
import { EDUCATION_PRESETS, COLORS } from '../../constants.js';
import { calcTotalEducationCostPerChild, fmtMan, genId, safeNum } from '../../utils.js';

// ★ EDUCATION_PRESETS は配列: [{ id, label, icon, description, settings, totalEstimate }, ...]

const CHILD_ICONS = ['👦', '👧', '🧒', '👼', '🐣', '⭐'];

const st = {
  wrap: { padding: '16px 16px 8px' },
  childCard: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: '14px',
    marginBottom: 12,
  },
  childHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  childTitle: { fontSize: 14, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 },
  deleteBtn:  { background: '#fee2e2', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 12, color: '#dc2626', cursor: 'pointer' },
  iconPicker: { display: 'flex', gap: 6, marginBottom: 10 },
  iconBtn: (selected) => ({
    fontSize: 22,
    background: selected ? '#ede9fe' : '#fff',
    border: `2px solid ${selected ? '#8b5cf6' : '#e5e7eb'}`,
    borderRadius: 8,
    padding: '4px 6px',
    cursor: 'pointer',
  }),
  eduCostBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: '#dbeafe', borderRadius: 8, padding: '4px 10px',
    fontSize: 12, color: '#1d4ed8', marginTop: 8, fontWeight: 600,
  },
  addBtn: {
    width: '100%', padding: '10px',
    background: '#f3f4f6', border: '2px dashed #d1d5db', borderRadius: 10,
    fontSize: 13, color: '#6b7280', cursor: 'pointer', fontWeight: 500,
  },
};

const ChildCard = ({ child, index, onChange, onDelete }) => {
  const presetId  = child.educationPreset || 'public';
  const childAge  = safeNum(child.currentAge, 0);

  // ★ 修正: calcTotalEducationCostPerChild(childCurrentAge, presetId) の正しい順序
  const totalCost = calcTotalEducationCostPerChild(childAge, presetId);

  // ★ EDUCATION_PRESETS は配列なので .map() でオプション生成
  const eduOptions = EDUCATION_PRESETS.map((p) => ({ value: p.id, label: p.label }));

  return (
    <div style={st.childCard}>
      <div style={st.childHeader}>
        <div style={st.childTitle}>
          <span>{child.icon || '👦'}</span>
          <span>子ども {index + 1}</span>
        </div>
        <button style={st.deleteBtn} onClick={onDelete}>削除</button>
      </div>

      {/* アイコン選択 */}
      <div style={st.iconPicker}>
        {CHILD_ICONS.map((ic) => (
          <button key={ic} style={st.iconBtn(child.icon === ic)} onClick={() => onChange('icon', ic)}>
            {ic}
          </button>
        ))}
      </div>

      <NumberStepper
        label="現在の年齢"
        value={childAge}
        onChange={(v) => onChange('currentAge', v)}
        min={0}
        max={22}
        unit="歳"
        help="0歳 = 出生前（今後生まれる予定）"
      />

      {/* ★ EDUCATION_PRESETS 配列から生成したオプションを使用 */}
      <Select
        label="教育コース"
        value={presetId}
        onChange={(v) => onChange('educationPreset', v)}
        options={eduOptions}
      />

      <div style={st.eduCostBadge}>
        📚 推定教育費合計: {fmtMan(totalCost)}万円
      </div>
    </div>
  );
};

export const FamilyStep = ({ form, onChange, errors = {} }) => {
  const children = Array.isArray(form.children) ? form.children : [];

  const handleAddChild = () => {
    const newChild = { id: genId(), currentAge: 0, educationPreset: 'public', icon: '👦' };
    onChange('children', [...children, newChild]);
  };

  const handleChildChange = (id, field, value) => {
    onChange('children', children.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const handleDeleteChild = (id) => {
    onChange('children', children.filter((c) => c.id !== id));
  };

  return (
    <div style={st.wrap}>
      {/* 配偶者 */}
      <SectionTitle icon="💑" title="配偶者" />

      <Toggle
        label="配偶者がいる"
        checked={!!form.hasSpouse}
        onChange={(v) => onChange('hasSpouse', v)}
      />

      {form.hasSpouse && (
        <>
          <NumberStepper
            label="配偶者の現在の年齢"
            value={safeNum(form.spouseAge, 28)}
            onChange={(v) => onChange('spouseAge', v)}
            min={18}
            max={80}
            unit="歳"
            error={errors.spouseAge}
          />

          <Toggle
            label="配偶者は現在就労中"
            checked={!!form.spouseIsWorking}
            onChange={(v) => onChange('spouseIsWorking', v)}
          />

          {form.spouseIsWorking ? (
            <NumberStepper
              label="配偶者の年収"
              value={safeNum(form.spouseIncome, 0)}
              onChange={(v) => onChange('spouseIncome', v)}
              min={0}
              max={3000}
              step={10}
              unit="万円"
              error={errors.spouseIncome}
            />
          ) : (
            <>
              <NumberStepper
                label="配偶者が職場復帰する年齢（配偶者の年齢基準）"
                value={safeNum(form.spouseReturnToWorkAge, 35)}
                onChange={(v) => onChange('spouseReturnToWorkAge', v)}
                min={18}
                max={70}
                unit="歳"
                help="シミュレーションは配偶者の年齢で判定します"
              />
              <NumberStepper
                label="職場復帰後の配偶者年収"
                value={safeNum(form.spouseReturnToWorkIncome, 0)}
                onChange={(v) => onChange('spouseReturnToWorkIncome', v)}
                min={0}
                max={2000}
                step={10}
                unit="万円"
              />
            </>
          )}
        </>
      )}

      <Divider />

      {/* 子ども */}
      <SectionTitle icon="👶" title="子ども" />

      {children.map((child, i) => (
        <ChildCard
          key={child.id || i}
          child={child}
          index={i}
          onChange={(field, value) => handleChildChange(child.id, field, value)}
          onDelete={() => handleDeleteChild(child.id)}
        />
      ))}

      <button style={st.addBtn} onClick={handleAddChild}>
        ＋ 子どもを追加
      </button>
    </div>
  );
};
