// src/components/ResultScreen.jsx
// 結果画面 — MVP 安全判定 4 指標を表示
//
// 表示する 4 指標（MVP）:
//   1. 生活余裕度ゲージ（安全判定スコア）
//   2. 資金ショート年齢（破綻なし or XX歳で枯渇）
//   3. 最低資産年齢 / 最低資産額
//   4. 住宅購入リスク警告（住宅予定がある場合のみ）
//
// 将来拡張スロット（コメントで場所を確保済み）:
//   - 多軸スコアカード
//   - 破綻確率シミュレーション
//   - 改善提案パネル

import React from 'react';
import { useAppStore } from '../store/useAppStore.jsx';
import { runFullSimulation } from '../simulationEngine.js';
import { gaugeToColor, gaugeToGradient } from '../gaugeCalc.js';
import { FinanceChart } from './FinanceChart.jsx';
import { ScenarioComparison } from './ScenarioComparison.jsx';

// ─────────────────────────────────────────────────────────────
// カラー定数
// ─────────────────────────────────────────────────────────────
const C = {
  bg:         '#f4f7f4',
  white:      '#ffffff',
  text:       '#111827',
  textMuted:  '#6b7280',
  border:     '#e5e7eb',
  green:      '#22c55e',
  greenDark:  '#16a34a',
  greenBg:    '#f0fdf4',
  amber:      '#f59e0b',
  amberBg:    '#fffbeb',
  red:        '#ef4444',
  redBg:      '#fef2f2',
  redDark:    '#dc2626',
  teal:       '#0891b2',
  tealBg:     '#ecfeff',
};

// ─────────────────────────────────────────────────────────────
// SVGアイコン（補正タグ用）
// ─────────────────────────────────────────────────────────────
const RS_PATHS = {
  house:      "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  graduation: "M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z",
  car:        "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z",
};
const EMOJI_RS = { '🏠': 'house', '🎓': 'graduation', '🚗': 'car' };
const RIcon = ({ emoji, size = 12, color = '#92400e' }) => {
  const key = EMOJI_RS[emoji];
  if (!key) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ display: 'block', flexShrink: 0 }}>
      <path d={RS_PATHS[key]} />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// 数値フォーマット
// ─────────────────────────────────────────────────────────────
const fmtAsset = (n) => {
  if (n == null) return '—';
  const abs = Math.abs(Math.round(n));
  if (abs >= 10000) return `${n < 0 ? '−' : '+'}${(abs / 10000).toFixed(1)}億円`;
  return `${n < 0 ? '−' : '+'}${abs.toLocaleString()}万円`;
};

const fmtAssetAbs = (n) => {
  if (n == null) return '—';
  const abs = Math.abs(Math.round(n));
  return `${abs.toLocaleString()}万円`;
};

// ─────────────────────────────────────────────────────────────
// ゲージバー
// ─────────────────────────────────────────────────────────────
const GaugeBar = ({ gauge, color, gradient }) => (
  <div style={{ width: '100%' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: '0.06em' }}>家計安全度</span>
      <span style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{gauge}</span>
    </div>
    <div style={{
      height: 10, borderRadius: 99, background: '#e9ecef', overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        width:  `${gauge}%`,
        borderRadius: 99,
        background: gradient,
        transition: 'width 1s cubic-bezier(0.22,1,0.36,1)',
      }} />
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.textMuted, marginTop: 3 }}>
      <span>0</span><span>要見直し</span><span>要注意</span><span>概ね安定</span><span>安全圏</span><span>100</span>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// セクションカード共通
// ─────────────────────────────────────────────────────────────
const Card = ({ children, style }) => (
  <div style={{
    background:    C.white,
    borderRadius:  20,
    padding:       '20px',
    border:        `1px solid ${C.border}`,
    marginBottom:  12,
    ...style,
  }}>
    {children}
  </div>
);

const CardLabel = ({ children, color = C.textMuted }) => (
  <div style={{
    fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
    color, marginBottom: 10,
  }}>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────
// AccordionSection — Stage3用折りたたみセクション
// ─────────────────────────────────────────────────────────────
const ACCORD_GREEN = '#2EAB6E';

const ACCORD_ICON_PATHS = {
  'chart.bar.fill':            'M4 4h4v16H4zm6 5h4v11h-4zm6-3h4v14h-4z',
  'arrow.trend.up':            'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z',
  'house.fill':                'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  'chart.line.uptrend.xyaxis': 'M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z',
  'arrow.left.arrow.right':    'M9.01 14H2v2h7.01v3L13 15l-3.99-4v3zm5.98-1v-3H22V8h-7.01V5L11 9l3.99 4z',
  'person.2.fill':             'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
};

const AccordionIcon = ({ name }) => {
  if (name === 'yensign.circle') {
    return (
      <svg width={18} height={18} viewBox="0 0 24 24" fill={ACCORD_GREEN} style={{ flexShrink: 0 }}>
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8z" />
        <path d="M13.8 7.5h-1.3L11 10.3l-1.8-2.8H7.8l2.4 3.5H8.5V12h2.2v.8H8.5V14h2.2V16.5H12V14h2.2v-1.2H12V12h2.2v-1.2h-1.7l2.3-3.3z" />
      </svg>
    );
  }
  const d = ACCORD_ICON_PATHS[name];
  if (!d) return null;
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill={ACCORD_GREEN} style={{ flexShrink: 0 }}>
      <path d={d} />
    </svg>
  );
};

const AccordionSection = ({ title, icon, children }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{
      background: '#ffffff', borderRadius: 12, marginBottom: 6,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '13px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        {icon && <AccordionIcon name={icon} />}
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.text }}>{title}</span>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
          stroke={C.textMuted} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px' }}>
          {children}
        </div>
      )}
    </div>
  );
};


// ─────────────────────────────────────────────────────────────
// ResultScreen
// ─────────────────────────────────────────────────────────────
export const ResultScreen = ({ onBack, onRestart }) => {
  const { state, actions } = useAppStore();
  const { profileData, selectedChoices, resultData } = state;

  // resultData がストアにあればそれを使い、なければここで計算
  const result = React.useMemo(() => {
    if (resultData && resultData.safetySummary) return resultData;
    return runFullSimulation(profileData, selectedChoices);
  }, [resultData, profileData, selectedChoices]);

  const s       = result.safetySummary;
  const color   = gaugeToColor(s.gauge);
  const gradient = gaugeToGradient(s.gauge);

  React.useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const [saveMsg, setSaveMsg] = React.useState('');
  const [shareMsg, setShareMsg] = React.useState('');

  const handleSave = () => {
    try {
      const payload = {
        profileData,
        selectedChoices,
        resultData: result,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('miraiTreeLastResult', JSON.stringify(payload));
      setSaveMsg('保存しました');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch {
      setSaveMsg('保存に失敗しました');
      setTimeout(() => setSaveMsg(''), 2000);
    }
  };

  const handleShare = async () => {
    const gauge = s.gauge ?? 0;
    const nickname = profileData.nickname || '';
    const text = [
      `【ライフプランシミュレーション結果】`,
      nickname ? `${nickname}さんの家計安全度` : '家計安全度',
      `スコア: ${gauge}/100（${s.status?.label ?? ''}）`,
      `退職時資産: ${result.summary?.retirementAsset ?? '—'}万円`,
      `\nMirai Tree で診断 → https://mirai-tree.app`,
    ].join('\n');
    // Web Share API（モバイル優先）
    if (navigator.share) {
      try {
        await navigator.share({ title: 'ライフプランシミュレーション結果', text });
      } catch {
        // キャンセル — 何もしない
      }
      return;
    }
    // クリップボードコピー（デスクトップ）
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      // clipboard API 非対応 → execCommand フォールバック
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        copied = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        // do nothing
      }
    }
    if (copied) {
      setShareMsg('コピーしました');
      setTimeout(() => setShareMsg(''), 2000);
    } else {
      setShareMsg('コピー失敗');
      setTimeout(() => setShareMsg(''), 2000);
    }
  };

  const [revealed, setRevealed] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 200);
    return () => clearTimeout(t);
  }, []);

  // 4指標安全判定（simulationEngine で計算済み）
  const indicators = result.fourIndicators;
  const hs = indicators?.householdSafety;   // 家計安全度
  const lc = indicators?.livingContinuity;  // 生活継続性
  const lr = indicators?.longTermRisk;      // 長期破綻リスク
  const hj = indicators?.housingJudgment;   // 住宅購入判定

  const handleBack = () => {
    if (typeof onBack === 'function') onBack();
    else actions.setScreen('simulation');
  };
  const handleRestart = () => {
    if (typeof onRestart === 'function') onRestart();
    else actions.setScreen('input');
  };

  return (
    <div style={{
      minHeight:  '100vh',
      background: C.bg,
      fontFamily: "'Noto Sans JP', -apple-system, 'Apple Color Emoji', sans-serif",
      paddingBottom: 40,
    }}>
      <style>{`
        @keyframes rsReveal {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rs-card { animation: rsReveal 0.55s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      {/* ── ヘッダー ───────────────────────────────────────────── */}
      <div style={{
        position:       'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background:     'rgba(244,247,244,0.97)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom:   `1px solid ${C.border}`,
        paddingTop:     'env(safe-area-inset-top, 0px)',
      }}>
        <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handleBack} style={{
            width: 36, height: 36, borderRadius: '50%',
            border: `1.5px solid ${C.border}`, background: C.white,
            fontSize: 15, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: C.textMuted,
          }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>安全判定レポート</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>シミュレーション完了</div>
          </div>
        </div>
      </div>

      {/* ── メインコンテンツ ─────────────────────────────────── */}
      <div style={{ padding: '16px', maxWidth: 480, margin: '0 auto', paddingTop: 'calc(84px + env(safe-area-inset-top, 0px))' }}>

        {/* ══ Stage 1: ファーストビュー（スコアと一言だけ）══════ */}
        {hs && (
          <div className="rs-card" style={{
            background: `linear-gradient(145deg, ${hs.color}14, ${hs.color}06)`,
            borderRadius: 24, padding: '14px 20px 18px', marginBottom: 14,
            border: `1.5px solid ${hs.color}40`, animationDelay: '0.05s',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.10em', marginBottom: 8, textAlign: 'center' }}>
              家計安全度
            </div>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 72, fontWeight: 900, color: hs.color, lineHeight: 1 }}>{hs.score}</span>
              <span style={{ fontSize: 18, color: C.textMuted, fontWeight: 600 }}> / 100</span>
            </div>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{
                display: 'inline-block', padding: '4px 16px', borderRadius: 999,
                background: hs.bg, color: hs.color,
                fontSize: 13, fontWeight: 800, letterSpacing: '0.04em',
                border: `1.5px solid ${hs.color}40`, marginBottom: 8,
              }}>
                {hs.status}
              </div>
              <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7, textAlign: 'left' }}>
                {hs.message}
              </div>
            </div>
            <div style={{ height: 10, borderRadius: 99, background: '#e9ecef', overflow: 'hidden', marginBottom: 6 }}>
              <div style={{
                height: '100%', width: `${hs.score}%`, borderRadius: 99,
                background: hs.score >= 80
                  ? 'linear-gradient(90deg, #bbf7d0, #22c55e)'
                  : hs.score >= 65
                  ? 'linear-gradient(90deg, #d9f99d, #84cc16)'
                  : hs.score >= 50
                  ? 'linear-gradient(90deg, #fef9c3, #f59e0b)'
                  : 'linear-gradient(90deg, #fee2e2, #ef4444)',
                transition: 'width 1s cubic-bezier(0.22,1,0.36,1)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.textMuted }}>
              <span>0</span><span>要見直し</span><span>要注意</span><span>概ね安定</span><span>安全圏</span><span>100</span>
            </div>
            {/* ══ 保存・共有ボタン（スコアカード内） ══ */}
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={handleSave} style={{
                flex: 1, padding: '10px 8px', borderRadius: 10,
                border: `1.5px solid ${hs.color}40`, background: `${hs.color}10`,
                fontSize: 13, fontWeight: 700, color: hs.color, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                {saveMsg || 'プランを保存'}
              </button>
              <button onClick={handleShare} style={{
                flex: 1, padding: '10px 8px', borderRadius: 10,
                border: `1.5px solid ${hs.color}40`, background: `${hs.color}10`,
                fontSize: 13, fontWeight: 700, color: hs.color, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                {shareMsg || '↑ 結果を共有'}
              </button>
            </div>
          </div>
        )}

        {/* ══ Stage 2: 主要指標 4枚 ══════════════════════════════ */}
        <div className="rs-card" style={{ animationDelay: '0.10s', padding: '14px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 10, letterSpacing: '0.06em' }}>主要指標</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* 退職時資産 */}
            {lr && (
              <div style={{
                padding: '12px 14px', borderRadius: 14,
                background: lr.retirementAsset >= 0 ? C.greenBg : C.redBg,
                border: `1px solid ${lr.retirementAsset >= 0 ? '#bbf7d0' : '#fecaca'}`,
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, marginBottom: 4 }}>退職時資産</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: lr.retirementAsset >= 0 ? C.greenDark : C.redDark, lineHeight: 1.2, marginBottom: 2 }}>
                  {lr.retirementAsset != null ? `${lr.retirementAsset < 0 ? '−' : ''}${Math.round(Math.abs(lr.retirementAsset)).toLocaleString()}万` : '—'}
                </div>
                <div style={{ fontSize: 10, color: C.textMuted }}>{profileData.retirementAge ?? 65}歳時点</div>
              </div>
            )}
            {/* 年間収支 */}
            {hs && (
              <div style={{
                padding: '12px 14px', borderRadius: 14,
                background: hs.annualSurplus >= 0 ? C.greenBg : C.redBg,
                border: `1px solid ${hs.annualSurplus >= 0 ? '#bbf7d0' : '#fecaca'}`,
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, marginBottom: 4 }}>年間収支</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: hs.annualSurplus >= 0 ? C.greenDark : C.redDark, lineHeight: 1.2, marginBottom: 2 }}>
                  {hs.annualSurplus != null ? `${hs.annualSurplus >= 0 ? '+' : ''}${Math.round(hs.annualSurplus)}万` : '—'}
                </div>
                <div style={{ fontSize: 10, color: C.textMuted }}>/ 年（年間余剰）</div>
              </div>
            )}
            {/* 防衛資金 */}
            {hs && (
              <div style={{
                padding: '12px 14px', borderRadius: 14,
                background: hs.emergencyMonths >= 6 ? C.greenBg : hs.emergencyMonths >= 3 ? C.amberBg : C.redBg,
                border: `1px solid ${hs.emergencyMonths >= 6 ? '#bbf7d0' : hs.emergencyMonths >= 3 ? '#fde68a' : '#fecaca'}`,
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, marginBottom: 4 }}>防衛資金</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: hs.emergencyMonths >= 6 ? C.greenDark : hs.emergencyMonths >= 3 ? '#b45309' : C.redDark, lineHeight: 1.2, marginBottom: 2 }}>
                  {hs.emergencyMonths != null ? `${(Math.round(hs.emergencyMonths * 10) / 10)}ヶ月` : '—'}
                </div>
                <div style={{ fontSize: 10, color: C.textMuted }}>現在の貯蓄残高</div>
              </div>
            )}
            {/* 住宅判定 */}
            <div style={{
              padding: '12px 14px', borderRadius: 14,
              background: hj ? hj.bg : '#f9fafb',
              border: `1px solid ${hj ? hj.color + '40' : C.border}`,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, marginBottom: 4 }}>住宅判定</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: hj ? hj.color : C.textMuted, lineHeight: 1.2, marginBottom: 2 }}>
                {hj?.label ?? (s.housingDetail ? '—' : 'なし')}
              </div>
              <div style={{ fontSize: 10, color: C.textMuted }}>
                {s.housingDetail ? `${s.housingDetail.purchaseAge}歳購入予定` : '購入計画なし'}
              </div>
            </div>
          </div>
        </div>

        {/* ── ギャップ説明（低スコアだが長期破綻なし） ── */}
        {hs && lr && hs.score < 65 && lr.risk === 'none' && (
          <div className="rs-card" style={{
            padding: '12px 16px', borderRadius: 14, marginBottom: 12,
            background: '#f0f9ff', border: '1px solid #bae6fd',
            fontSize: 11, color: '#0369a1', lineHeight: 1.75,
            animationDelay: '0.22s',
          }}>
            <strong>家計安全度は「{hs.status}」ですが、長期破綻リスクは「なし」です。</strong><br />
            余裕は薄めですが、現時点では長期の資金ショートは見込まれていません。
            現在の積立・年金収入で{profileData.lifespan ?? 90}歳まで持ちこたえられる見通しです。
            支出見直しや積立増額で家計効率を改善すると、老後資産はさらに増えます。
          </div>
        )}

        {/* ══ Stage 3: 詳細アコーディオン ══════════════════════ */}
        <div style={{ background: '#F3F4F6', borderRadius: 16, padding: '10px 10px 4px', marginBottom: 12 }}>

        {/* 採点内訳 */}
        {hs && (
          <AccordionSection title="採点内訳（各25点満点）" icon="chart.bar.fill">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {[
                { label: '毎月収支余力',    sub: `年間余剰 ${Math.round(hs.annualSurplus)}万円`,                     score: hs.scoreA },
                { label: '貯蓄バッファ',    sub: `現在の貯蓄 ${Math.round(hs.emergencyMonths * 10) / 10}ヶ月分`,     score: hs.scoreB },
                { label: '大型イベント耐性', sub: `現役期間最低 ${Math.round(hs.minAssetMonths * 10) / 10}ヶ月分`,   score: hs.scoreC },
                { label: '老後余力',        sub: lr?.collapseAge == null ? '枯渇なし（90歳まで維持）' : `${lr.collapseAge}歳で枯渇`, score: hs.scoreD },
              ].map(item => {
                const itemColor = item.score >= 20 ? '#16a34a' : item.score >= 12 ? '#65a30d' : item.score >= 8 ? '#d97706' : '#dc2626';
                return (
                  <div key={item.label} style={{
                    padding: '10px 12px', background: `${hs.color}08`,
                    borderRadius: 12, border: `1px solid ${hs.color}20`,
                  }}>
                    <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2, fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 6, lineHeight: 1.4 }}>{item.sub}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                      <span style={{ fontSize: 22, fontWeight: 900, color: itemColor, lineHeight: 1 }}>{item.score}</span>
                      <span style={{ fontSize: 10, color: C.textMuted }}>/25</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {(hs.plusFactors?.length > 0 || hs.minusFactors?.length > 0 || (s.corrections && s.corrections.length > 0)) && (
              <div style={{ paddingTop: 10, borderTop: `1px solid ${hs.color}20` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em', marginBottom: 10 }}>スコア影響要因</div>
                {hs.plusFactors?.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>▲ 安定要因</div>
                    {hs.plusFactors.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#15803d', marginBottom: 3 }}>
                        <span>✓</span><span>{f.text}</span>
                      </div>
                    ))}
                  </div>
                )}
                {hs.minusFactors?.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#b45309', marginBottom: 4 }}>▼ 影響要因（資産の谷）</div>
                    {hs.minusFactors.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#92400e', marginBottom: 3 }}>
                        <span>!</span><span>{f.text}</span>
                      </div>
                    ))}
                  </div>
                )}
                {s.corrections && s.corrections.length > 0 && (
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#b45309', marginBottom: 4 }}>▼ 大型イベントの影響</div>
                    {s.corrections.map((c) => (
                      <div key={c.key} style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.20)', marginBottom: 4 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <RIcon emoji={c.icon} size={12} color="#92400e" />
                          {c.label}
                        </div>
                        {c.items.map((item, i) => (
                          <div key={i} style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.4 }}>· {item}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </AccordionSection>
        )}

        {/* 収支の詳細 */}
        {s.explanationReasons && s.explanationReasons.length > 0 && (
          <AccordionSection title="収支の詳細" icon="yensign.circle">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {s.explanationReasons.map((r, i) => {
                const parts = r.text.split(/—|―/);
                const headline = parts[0]?.trim() ?? r.text;
                const detail = parts[1]?.trim() ?? null;
                const isSafe = r.type === 'safe';
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '8px 12px', borderRadius: 10,
                    background: isSafe ? C.greenBg : C.amberBg,
                    border: `1px solid ${isSafe ? C.green + '60' : C.amber + '60'}`,
                  }}>
                    <span style={{ fontSize: 13, flexShrink: 0, marginTop: 2, color: isSafe ? C.greenDark : '#b45309' }}>
                      {isSafe ? '✓' : '!'}
                    </span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.4, color: isSafe ? C.greenDark : '#78350f' }}>{headline}</div>
                      {detail && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, lineHeight: 1.4 }}>{detail}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 10, lineHeight: 1.6 }}>
              * 収入は手取り概算（所得税・社会保険控除後）、支出には月1.5万円の臨時支出バッファを含みます。老後の生活費は現役時の約82%で試算しています
            </div>
          </AccordionSection>
        )}

        {/* 長期見通し */}
        {lr && lc && (
          <AccordionSection title="長期見通し" icon="arrow.trend.up">
            {(() => {
              const riskColor  = lr.risk === 'none' ? C.greenDark : lr.risk === 'high' ? C.redDark : '#b45309';
              const riskBg     = lr.risk === 'none' ? C.greenBg   : lr.risk === 'high' ? C.redBg   : C.amberBg;
              const riskBorder = lr.risk === 'none' ? '#bbf7d0'   : lr.risk === 'high' ? '#fecaca' : '#fde68a';
              const riskIcon   = lr.risk === 'none' ? '✓'         : '!';
              return (
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, background: riskBg, borderRadius: 14, padding: '14px 12px', border: `1.5px solid ${riskBorder}` }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: C.textMuted, letterSpacing: '0.08em', marginBottom: 8 }}>長期破綻リスク</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: riskColor }}>{riskIcon}</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: riskColor, lineHeight: 1 }}>{lr.label}</div>
                    </div>
                    <div style={{ fontSize: 10, color: riskColor, fontWeight: 600, lineHeight: 1.5, marginBottom: 8 }}>{lr.desc}</div>
                    <div style={{ marginTop: 8, padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.55)', border: `1px solid ${riskBorder}` }}>
                      <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>退職時（{profileData.retirementAge ?? 65}歳）資産</div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: lr.retirementAsset >= 0 ? C.greenDark : C.redDark }}>{fmtAsset(lr.retirementAsset)}</div>
                    </div>
                  </div>
                  <div style={{ flex: 1, background: lc.bg, borderRadius: 14, padding: '14px 12px', border: `1.5px solid ${lc.border}` }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: C.textMuted, letterSpacing: '0.08em', marginBottom: 8 }}>生活継続性</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <div style={{ width: 24, height: 24, flexShrink: 0 }} />
                      <div style={{ fontSize: 18, fontWeight: 900, color: lc.color, lineHeight: 1 }}>{lc.level}</div>
                    </div>
                    <div style={{ fontSize: 10, color: lc.color, fontWeight: 600, lineHeight: 1.5, marginBottom: 6 }}>
                      {lc.reasons.length > 0 ? lc.reasons[0] : '足元の収支・防衛資金は安定しています'}
                    </div>
                    <div style={{ marginTop: 8, padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.55)', border: `1px solid ${lc.border}` }}>
                      <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>スコア</div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: lc.color }}>{lc.score}<span style={{ fontSize: 10, fontWeight: 400, color: C.textMuted }}>/100</span></div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </AccordionSection>
        )}

        {/* 住宅購入詳細 */}
        {s.housingDetail && (() => {
          const h = s.housingDetail;
          const purchaseSeverity = h.savingsAtPurchase === null ? 'unknown' : h.savingsAtPurchase < 0 ? 'danger' : h.savingsAtPurchase < 200 ? 'warn' : 'ok';
          const post5Severity = h.minAssetPost5 === null ? 'unknown' : h.minAssetPost5 < 0 ? 'danger' : h.minAssetPost5 < 200 ? 'warn' : 'ok';
          const severityColor = (sev) => sev === 'danger' ? C.redDark : sev === 'warn' ? '#b45309' : C.greenDark;
          const severityBg = (sev) => sev === 'danger' ? C.redBg : sev === 'warn' ? C.amberBg : C.greenBg;
          return (
            <AccordionSection title={`住宅購入詳細（${h.purchaseAge}歳購入予定）`} icon="house.fill">
              {h.loanAmount > 0 && (
                <div style={{
                  padding: '10px 14px', borderRadius: 12, marginBottom: 12,
                  background: h.repaymentBurdenSeverity === 'danger' ? C.redBg : h.repaymentBurdenSeverity === 'warn' ? C.amberBg : '#f0fdf4',
                  border: `1px solid ${h.repaymentBurdenSeverity === 'danger' ? C.red + '50' : h.repaymentBurdenSeverity === 'warn' ? C.amber + '50' : C.green + '50'}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                }}>
                  <div>
                    <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, marginBottom: 3 }}>
                      借入額 {Math.round(h.loanAmount).toLocaleString()}万円 / {h.mortgageTerm}年 / {h.mortgageRate}%
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 22, fontWeight: 900, color: severityColor(h.repaymentBurdenSeverity), lineHeight: 1 }}>
                        {h.monthlyPayment != null ? h.monthlyPayment.toFixed(1) : '—'}
                      </span>
                      <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>万円/月</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, marginBottom: 3 }}>返済負担率</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: severityColor(h.repaymentBurdenSeverity), lineHeight: 1 }}>
                      {h.repaymentBurden != null ? `${Math.round(h.repaymentBurden)}%` : '—'}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: severityColor(h.repaymentBurdenSeverity) }}>
                      {h.repaymentBurdenSeverity === 'danger' ? '重い' : h.repaymentBurdenSeverity === 'warn' ? '要注意' : '適正'}
                    </div>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1, padding: '12px 14px', borderRadius: 14, background: severityBg(purchaseSeverity), border: `1px solid ${severityColor(purchaseSeverity)}30` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, marginBottom: 5 }}>購入年末残高</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: severityColor(purchaseSeverity), lineHeight: 1 }}>
                    {h.savingsAtPurchase !== null ? `${Math.round(h.savingsAtPurchase).toLocaleString()}万` : '—'}
                  </div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>{h.purchaseAge}歳末（頭金・ローン込み）</div>
                </div>
                <div style={{ flex: 1, padding: '12px 14px', borderRadius: 14, background: severityBg(post5Severity), border: `1px solid ${severityColor(post5Severity)}30` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, marginBottom: 5 }}>購入年含む5年間の最低資産</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: severityColor(post5Severity), lineHeight: 1 }}>
                    {h.minAssetPost5 !== null ? `${Math.round(h.minAssetPost5).toLocaleString()}万` : '—'}
                  </div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>購入年〜5年後の谷</div>
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 12, marginBottom: 10,
                background: h.hasDownPayment ? C.greenBg : C.redBg,
                border: `1px solid ${h.hasDownPayment ? C.green : C.red}30`,
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: h.hasDownPayment ? C.greenDark : C.redDark }}>
                    頭金準備水準（物件価格の10%比較）
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                    {`最低目安 ${h.downPaymentTarget.toLocaleString()}万円　`}
                    {h.assetsBeforePurchase != null && Math.round(h.assetsBeforePurchase) !== Math.round(h.savings)
                      ? `購入時見込み ${Math.round(h.assetsBeforePurchase).toLocaleString()}万円`
                      : `現在 ${h.savings.toLocaleString()}万円`}
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: h.hasDownPayment ? C.greenDark : C.redDark, flexShrink: 0 }}>
                  {h.hasDownPayment ? '準備OK' : `${h.downPaymentShortfall.toLocaleString()}万不足`}
                </div>
              </div>
              {hj && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                    {[
                      { label: 'A 返済比率', rating: hj.ratingA, detail: hj.repaymentBurden != null ? `${Math.round(hj.repaymentBurden)}%` : '—' },
                      { label: 'B 頭金余力', rating: hj.ratingB, detail: `購入年末に${Math.round(hj.savingsMonths * 10) / 10}ヶ月分の資産` },
                      { label: 'C 購入後5年最低資産', rating: hj.ratingC, detail: hj.minAssetPost5 != null ? `最低${Math.round(hj.minAssetPost5)}万円` : '—' },
                    ].map(axis => {
                      const rc = axis.rating === 'good' ? C.greenDark : axis.rating === 'ok' ? '#65a30d' : axis.rating === 'caution' ? '#b45309' : axis.rating === 'bad' ? C.redDark : C.textMuted;
                      const rbg = axis.rating === 'good' ? C.greenBg : axis.rating === 'ok' ? '#f7fee7' : axis.rating === 'caution' ? C.amberBg : axis.rating === 'bad' ? C.redBg : '#f9fafb';
                      const rlabel = axis.rating === 'good' ? '良好' : axis.rating === 'ok' ? '許容' : axis.rating === 'caution' ? '慎重' : axis.rating === 'bad' ? '厳しい' : '—';
                      return (
                        <div key={axis.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, background: rbg, border: `1px solid ${rc}30` }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{axis.label}</div>
                            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{axis.detail}</div>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 900, color: rc, padding: '3px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.6)', border: `1.5px solid ${rc}50`, flexShrink: 0 }}>{rlabel}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 12, background: hj.bg, border: `1.5px solid ${hj.color}40` }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>住宅購入プラン総合判定</span>
                      <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>返済比率・頭金余力・購入後5年資産の3軸で評価</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 900, color: hj.color, padding: '4px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.7)', border: `1.5px solid ${hj.color}50`, flexShrink: 0 }}>{hj.label}</span>
                  </div>
                </div>
              )}
              {h.existingLoanOverlap && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 12px', borderRadius: 10, marginBottom: 10, background: C.white, border: `1px solid ${C.amber}40` }}>
                  <span style={{ color: C.amber, fontSize: 13, flexShrink: 0, marginTop: 1 }}>!</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#78350f' }}>既存借入と住宅ローンが重複</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>月 {h.existingLoanOverlap.toFixed(1)}万円の既存返済がある状態でローンが始まります</div>
                  </div>
                </div>
              )}
              {h.nearbyEducation && h.nearbyEducation.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 12px', borderRadius: 10, marginBottom: 10, background: C.white, border: `1px solid ${C.amber}40` }}>
                  <span style={{ color: C.amber, fontSize: 13, flexShrink: 0, marginTop: 1 }}>!</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#78350f' }}>教育費イベントと購入時期が近接</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                      {h.nearbyEducation.map(e => `${e.label}（${e.age}歳）`).join(' / ')} — 住宅ローン開始と教育費が重なります
                    </div>
                  </div>
                </div>
              )}
              {(h.nearbyChildren.length > 0 || h.spouseNotYetReturned) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 10 }}>
                  {h.nearbyChildren.map((child) => (
                    <div key={child.index} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 12px', borderRadius: 10, background: C.white, border: `1px solid ${C.amber}40` }}>
                      <span style={{ color: C.amber, fontSize: 13, flexShrink: 0, marginTop: 1 }}>!</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#78350f' }}>第{child.index}子の出産予定と住宅購入が近い</div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                          出産予定 {child.birthAge}歳 / 住宅購入 {h.purchaseAge}歳（{Math.abs(child.diff)}年差）
                          {child.diff < 0 ? ' — 出産後すぐにローン開始' : ' — ローン返済中に出産'}
                        </div>
                      </div>
                    </div>
                  ))}
                  {h.spouseNotYetReturned && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 12px', borderRadius: 10, background: C.white, border: `1px solid ${C.amber}40` }}>
                      <span style={{ color: C.amber, fontSize: 13, flexShrink: 0, marginTop: 1 }}>!</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#78350f' }}>配偶者が復職前にローン開始</div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                          住宅購入 {h.purchaseAge}歳 / 配偶者復職予定 {h.spouseReturnAge}歳 — 復職まで世帯収入が少ない状態でローンが始まります
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {(() => {
                const isDanger = h.repaymentBurdenSeverity === 'danger' || (h.minAssetPost5 !== null && h.minAssetPost5 < 0) || (h.savingsAtPurchase !== null && h.savingsAtPurchase < 0);
                const footerLabel = isDanger ? 'danger' : hj?.label ?? '無理のない範囲';
                const footerBg = footerLabel === 'danger' ? C.redBg : footerLabel === '条件見直し推奨' ? C.amberBg : footerLabel === '慎重に確認' ? '#fffbeb' : 'rgba(255,255,255,0.55)';
                const footerBorder = footerLabel === 'danger' ? C.red + '40' : footerLabel === '条件見直し推奨' ? C.amber + '40' : footerLabel === '慎重に確認' ? C.amber + '30' : 'transparent';
                const footerColor = footerLabel === 'danger' ? C.redDark : footerLabel === '条件見直し推奨' ? '#92400e' : footerLabel === '慎重に確認' ? '#a16207' : C.greenDark;
                const footerText = footerLabel === 'danger'
                  ? '購入後の生活余力が不足しています。価格・時期・頭金を見直してください。このプランのままでは家計が圧迫され、緊急支出に対応できない可能性があります。'
                  : footerLabel === '条件見直し推奨'
                  ? '一部の条件で余力が不足しています。購入時期・物件価格・頭金を再検討することをおすすめします。'
                  : footerLabel === '慎重に確認'
                  ? '概ね問題ありませんが留意点があります。購入後の支出バランスを事前に確認しておきましょう。'
                  : '資金的な準備は概ね整っています。購入後も生活余力を確保しながら進めましょう。';
                return (
                  <div style={{ fontSize: 11, lineHeight: 1.7, padding: '10px 12px', borderRadius: 10, background: footerBg, border: `1px solid ${footerBorder}`, color: footerColor, marginBottom: 10 }}>
                    {footerText}
                  </div>
                );
              })()}
              <div style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.7, padding: '8px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                この試算では、<strong>住宅購入後は家賃を0</strong>として、代わりに月返済額・管理費・固定資産税・維持費を支出に反映しています。購入前は現在の住居費（家賃）を支出に含めて計算しています。
              </div>
            </AccordionSection>
          );
        })()}

        {/* 資産推移グラフ */}
        <AccordionSection title="資産推移グラフ" icon="chart.line.uptrend.xyaxis">
          <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 8, lineHeight: 1.5 }}>
            「資産」タブは<strong>総金融資産（現預金＋投資・NISA残高の合計）</strong>を表示。不動産価値・住宅ローン残債は含みません。
          </div>
          <FinanceChart
            rows={result.rows}
            rowsNoPension={result.rowsNoPension}
            profile={profileData}
            minAssetInfo={result.minAsset}
            pensionInfo={result.pensionInfo}
          />
          <div style={{ marginTop: 10, padding: '9px 12px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 10, color: C.textMuted, lineHeight: 1.7 }}>
            <span style={{ fontWeight: 700, color: '#374151' }}>退職後（{profileData.retirementAge ?? 65}歳以降）の資産グラフについて</span><br />
            退職後は積立が停止し、<strong>資産の取り崩しフェーズ</strong>に移行します。NISA等の投資資産は引き続き年5%前後（標準シナリオ）で運用継続しますが、年金収入と生活費の差額を資産で補填するため、残高は徐々に減少します。年金収入の効果は「年金あり/なし」トグルで確認できます。
          </div>
        </AccordionSection>

        {/* 住宅プラン比較 */}
        <AccordionSection title="住宅購入プラン比較" icon="arrow.left.arrow.right">
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 12, lineHeight: 1.6 }}>
            購入時期・頭金・価格を変えると家計がどう変わるかを確認できます。
          </div>
          <ScenarioComparison
            profileData={profileData}
            selectedChoices={selectedChoices}
          />
        </AccordionSection>

        {/* 年金の詳細 */}
        {result.pensionInfo && result.pensionInfo.totalMonthly > 0 && (
          <AccordionSection title="年金の詳細" icon="person.2.fill">
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1, padding: '10px 12px', borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 2, fontWeight: 600 }}>本人の推定年金</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#15803d' }}>
                  約{Math.round(result.pensionInfo.selfAnnual / 12 * 10) / 10}<span style={{ fontSize: 10, fontWeight: 500, color: '#6b7280' }}>万/月</span>
                </div>
                <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 1 }}>年{result.pensionInfo.selfAnnual}万円</div>
              </div>
              {result.pensionInfo.spouseAnnual > 0 ? (
                <div style={{ flex: 1, padding: '10px 12px', borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 2, fontWeight: 600 }}>配偶者の推定年金</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#15803d' }}>
                    約{Math.round(result.pensionInfo.spouseAnnual / 12 * 10) / 10}<span style={{ fontSize: 10, fontWeight: 500, color: '#6b7280' }}>万/月</span>
                  </div>
                  <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 1 }}>年{result.pensionInfo.spouseAnnual}万円</div>
                </div>
              ) : (
                <div style={{ flex: 1, padding: '10px 12px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 2, fontWeight: 600 }}>世帯合計</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#15803d' }}>
                    約{result.pensionInfo.totalMonthly}<span style={{ fontSize: 10, fontWeight: 500, color: '#6b7280' }}>万/月</span>
                  </div>
                  <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 1 }}>{result.pensionInfo.startAge}歳〜</div>
                </div>
              )}
            </div>
            <div style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.7, padding: '8px 10px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a' }}>
              * 年金は概算です。実際の受給額はねんきんネット・ねんきん定期便でご確認ください。月の生活費（{profileData.monthlyExpense ?? 20}万円）との差分が老後の毎年の取崩し額の目安になります。
            </div>
          </AccordionSection>
        )}

        </div>{/* end Stage 3 gray container */}

        {/* ── フッターボタン ─────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          <div>
            <button onClick={() => actions.setScreen('action')} style={{
              width: '100%', padding: '15px 24px', borderRadius: 999,
              border: `1.5px solid ${C.teal}`, background: C.white, color: C.teal,
              fontSize: 15, fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z" />
              </svg>
              <span>結果を比較する</span>
            </button>
            <div style={{ textAlign: 'center', fontSize: 11, color: C.textMuted, marginTop: 6, lineHeight: 1.5 }}>
              住宅・車・教育費などの条件を変えた場合の違いを確認できます
            </div>
          </div>
          <button onClick={handleRestart} style={{
            width: '100%', padding: '17px 24px', borderRadius: 999, border: 'none',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff',
            fontSize: 16, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(34,197,94,0.25)',
          }}>
            条件を変えて再試算
          </button>
          <button onClick={handleBack} style={{
            width: '100%', padding: '13px 24px 11px', borderRadius: 999,
            border: `1.5px solid ${C.border}`, background: C.white, color: C.text,
            fontSize: 14, fontWeight: 600, cursor: 'pointer', lineHeight: 1,
          }}>
            <div>シミュレーションに戻る</div>
            <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 400, marginTop: 3 }}>
              イベント選択の続きに戻ります
            </div>
          </button>
          <button onClick={() => { actions.fullReset(); actions.setScreen('home'); }} style={{
            width: '100%', padding: '8px', border: 'none', background: 'none',
            color: C.textMuted, fontSize: 12, fontWeight: 500, cursor: 'pointer',
            textDecoration: 'underline',
          }}>
            最初からやり直す
          </button>
        </div>

        <div style={{ marginTop: 20, fontSize: 10, color: '#aabcaa', textAlign: 'left', lineHeight: 1.8 }}>
          * 本シミュレーターは概算です。重要な資産判断・住宅購入は専門家にご相談ください。
        </div>

      </div>
    </div>
  );
};
