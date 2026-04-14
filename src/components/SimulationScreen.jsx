// src/components/SimulationScreen.jsx
// シミュレーション画面 — 安全判定アプリのコア体験
//
// 主役は「年齢を進めること」ではなく「次の重要イベントを判断すること」
// - メインCTA: 「次のイベントへ進む」
// - サブ操作:  「+1年」
// - イベント選択後に生活余裕度・安全判定・資産推移が即変わる

import React from 'react';
import { useAppStore } from '../store/useAppStore.jsx';
import { LifeGauge, GaugeDelta } from './LifeGauge.jsx';
import { getEventsForAge, getNextEvent } from '../eventTrigger.js';
import { CATEGORY_META } from '../eventData.js';
import { applyGaugeDelta, gaugeToColor, gaugeToGradient, gaugeToStatus, calcDynamicScoreFromRows } from '../gaugeCalc.js';
import { runFullSimulation } from '../simulationEngine.js';
import { getHousingEventOptions, getCarEventOptions } from '../eventOptions.js';

// ─────────────────────────────────────────────────────────────
// カラー
// ─────────────────────────────────────────────────────────────
const C = {
  bg:        '#f8fafb',
  white:     '#ffffff',
  text:      '#111827',
  textMuted: '#6b7280',
  border:    '#e5e7eb',
  green:     '#22c55e',
  greenDark: '#16a34a',
  greenBg:   '#f0fdf4',
  amber:     '#f59e0b',
  amberBg:   '#fffbeb',
  red:       '#ef4444',
  redBg:     '#fef2f2',
};

// ─────────────────────────────────────────────────────────────
// getDampedDelta — 同カテゴリ繰り返しイベントの減衰
//
// 設計思想:
//   - シミュレーションエンジンは gaugeDelta を使わない（経済計算は別ロジック）
//   - 視覚ゲージ専用として、繰り返しイベントの"急落感"を自然に緩和する
//   - 車買替・教育マイルストーン・2人目以降の子どもに減衰を適用
//
// 減衰テーブル: DAMP[category][n] = n回目の適用倍率
//   car_   : 1→0.55→0.35 (7年ごと買替で4回なら -8,-4,-3,-2)
//   edu_   : 最初の3イベントは等倍、4〜6は0.65、7以降は0.45
//   child_ : 1人目等倍、2人目0.65、3人目以降0.45
// ─────────────────────────────────────────────────────────────
const DAMP_TABLE = {
  car_:   [1.00, 0.55, 0.35, 0.25],
  edu_:   [1.00, 1.00, 1.00, 0.65, 0.65, 0.65, 0.45, 0.45, 0.45, 0.35],
  child_: [1.00, 0.65, 0.45],
};

const getDampedDelta = (rawDelta, eventId, priorChoices) => {
  // プラス・ゼロは減衰なし（転職昇給・副業などは正直に反映）
  if (rawDelta >= 0) return rawDelta;

  // カテゴリプレフィックス判定
  const pfx = Object.keys(DAMP_TABLE).find(p => eventId.startsWith(p));
  if (!pfx) return rawDelta; // 単発イベント（housing/jobChange など）は減衰なし

  // 同カテゴリの「マイナス選択済み回数」を数える
  const priorNeg = priorChoices.filter(
    c => c.eventId.startsWith(pfx) && (c.gaugeDelta ?? 0) < 0,
  ).length;

  const tbl    = DAMP_TABLE[pfx];
  const factor = tbl[Math.min(priorNeg, tbl.length - 1)];
  const damped = Math.round(rawDelta * factor);

  // グローバルキャップ: 累積下落が 40点を超えたら追加 0.5 倍
  // （ベーススコアが低い状態での更なる急落を防ぐ）
  const totalApplied = priorChoices.reduce((s, c) => s + Math.min(0, c.gaugeDelta ?? 0), 0);
  if (totalApplied < -40) return Math.round(damped * 0.50);

  return damped;
};

// ─────────────────────────────────────────────────────────────
// SVGアイコン（絵文字の代替）
// ─────────────────────────────────────────────────────────────
const SIM_PATHS = {
  house:      "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  child:      "M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z",
  car:        "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-5h14v5zm-8-4H9v2h2v-2zm4 0h-2v2h2v-2z",
  briefcase:  "M10 2h4c1.1 0 2 .9 2 2v2h4c1.1 0 2 .9 2 2v11c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V8c0-1.1.9-2 2-2h4V4c0-1.1.9-2 2-2zm0 2v2h4V4h-4zM4 8v11h16V8H4z",
  bulb:       "M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z",
  hospital:   "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z",
  savings:    "M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z",
  trending:   "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z",
  chevron:    "M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z",
  graduation: "M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z",
  school:     "M12 3L1 9l4 2.18V15c0 3.31 4.03 6 8.5 6s8.5-2.69 8.5-6v-3.82L23 9 12 3zm0 2.24L19.16 9 12 12.76 4.84 9 12 5.24zM17 14.09c0 2.52-2.24 4.57-5 4.57s-5-2.05-5-4.57v-2.45L12 15l5-3.36v2.45z",
};
const EMOJI_TO_SVG = {
  '🏠': 'house',      '👶': 'child',      '🧒': 'child',     '🚗': 'car',
  '💼': 'briefcase',  '💡': 'bulb',       '🏥': 'hospital',
  '💰': 'savings',    '📈': 'trending',
  '🎓': 'graduation', '🎒': 'school',     '📚': 'school',    '🏫': 'school',
};
const SimIcon = ({ emoji, size = 52, color = '#374151' }) => {
  const key = EMOJI_TO_SVG[emoji];
  if (!key || !SIM_PATHS[key]) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ display: 'block' }}>
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ display: 'block' }}>
      <path d={SIM_PATHS[key]} />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// EventCard — イベント選択モーダル
// ─────────────────────────────────────────────────────────────
const EventCard = ({ event, currentGauge, onSelect }) => {
  const catMeta = CATEGORY_META[event.category] ?? CATEGORY_META.life;

  return (
    <>
      {/* オーバーレイ */}
      <div style={{
        position:   'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.48)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
      }} />

      {/* カード */}
      <div style={{
        position:       'fixed',
        bottom:         0, left: 0, right: 0,
        zIndex:         101,
        animation:      'eventCardUp 0.38s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        <style>{`
          @keyframes eventCardUp {
            from { opacity: 0; transform: translateY(60px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .ev-choice-btn { transition: all 0.12s ease; }
          .ev-choice-btn:active { transform: scale(0.97); }
        `}</style>

        <div style={{
          background:   C.white,
          borderRadius: '28px 28px 0 0',
          padding:      '12px 20px',
          paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))',
          maxHeight:    '80vh',
          overflowY:    'auto',
          boxShadow:    '0 -8px 40px rgba(0,0,0,0.18)',
        }}>
          {/* ハンドル */}
          <div style={{
            width: 40, height: 4, borderRadius: 2,
            background: '#e5e7eb', margin: '8px auto 20px',
          }} />

          {/* アイコン + カテゴリ */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <SimIcon emoji={event.icon} size={52} color="#374151" />
            </div>
            <div style={{
              display: 'inline-block',
              padding: '3px 12px', borderRadius: 999,
              background: catMeta.bg, color: catMeta.color,
              fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
              marginBottom: 8,
            }}>
              {catMeta.label}
            </div>
            <div style={{ fontSize: 19, fontWeight: 900, color: C.text, lineHeight: 1.3 }}>
              {event.title}
            </div>
            <div style={{ fontSize: 13, color: C.textMuted, marginTop: 6 }}>
              {event.description}
            </div>
          </div>

          {/* 選択肢ボタン */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
            {event.choices.map((choice) => {
              const nextGauge = applyGaugeDelta(currentGauge, choice.gaugeDelta);
              const isGood    = choice.gaugeDelta > 0;
              const isBad     = choice.gaugeDelta < 0;
              const borderColor = isGood ? '#22c55e' : isBad ? '#ef4444' : '#e5e7eb';
              const bgColor     = isGood ? '#f0fdf4' : isBad ? '#fef2f2' : C.white;

              return (
                <button
                  key={choice.id}
                  className="ev-choice-btn"
                  onClick={() => onSelect(choice)}
                  style={{
                    padding:      '14px 18px',
                    borderRadius: 18,
                    border:       `1.5px solid ${borderColor}`,
                    background:   bgColor,
                    cursor:       'pointer',
                    textAlign:    'left',
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'space-between',
                    gap:          12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{choice.label}</div>
                    {choice.sub && (
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{choice.sub}</div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <GaugeDelta delta={choice.gaugeDelta} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

// ─────────────────────────────────────────────────────────────
// ChoiceHistory — 選択履歴リスト
// ─────────────────────────────────────────────────────────────
const ChoiceHistory = ({ selectedChoices }) => {
  if (selectedChoices.length === 0) return null;

  return (
    <div style={{
      background:   C.white,
      borderRadius: 16,
      padding:      '14px 16px',
      border:       `1px solid ${C.border}`,
      marginBottom: 12,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.08em', marginBottom: 10 }}>
        選択履歴
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {selectedChoices.map((c, i) => (
          <div key={i} style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            fontSize:       12,
          }}>
            <span style={{ color: C.textMuted }}>{c.age}歳: {c.label}</span>
            <GaugeDelta delta={c.gaugeDelta} />
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// buildScheduledEvents — プロフィールから今後の予定イベント一覧を生成
// ─────────────────────────────────────────────────────────────
const CHILD_ORD = ['第1子', '第2子', '第3子', '第4子'];
const buildScheduledEvents = (profile, currentAge, retireAge) => {
  const events = [];
  const add = (age, label, icon) => {
    if (age > currentAge && age <= retireAge) events.push({ age, label, icon });
  };

  if (profile.housingPurchaseAge) add(profile.housingPurchaseAge, '住宅購入予定', '🏠');
  if (profile.carOwnership && profile.carFirstAge) add(profile.carFirstAge, 'マイカー購入予定', '🚗');
  if (profile.jobChangeAge) add(profile.jobChangeAge, '転職予定', '💼');

  const childAges = profile.childAges ?? [null, null, null, null];
  const numChildren = profile.numChildren ?? 0;
  for (let i = 0; i < Math.min(numChildren, childAges.length); i++) {
    const ba = childAges[i];
    if (!ba) continue;
    const ord = CHILD_ORD[i] ?? `第${i+1}子`;
    add(ba,     `${ord}誕生予定`,  '👶');
    add(ba + 6, `${ord}小学校入学`, '🎒');
    add(ba + 12,`${ord}中学入学`,   '📚');
    add(ba + 15,`${ord}高校入学`,   '🏫');
    add(ba + 18,`${ord}大学入学`,   '🎓');
  }

  events.sort((a, b) => a.age - b.age);
  return events.slice(0, 8);
};

// ─────────────────────────────────────────────────────────────
// NextEventCard — 次イベントの大カード（主役）
// ─────────────────────────────────────────────────────────────
const NextEventCard = ({ nextEvent, currentAge, onJump, disabled, profile, retireAge }) => {
  if (!nextEvent) {
    const upcoming = buildScheduledEvents(profile ?? {}, currentAge, retireAge ?? 65);
    return (
      <div style={{
        background: C.greenBg, borderRadius: 18, padding: '16px 18px',
        border: `1.5px solid ${C.green}40`, marginBottom: 12,
      }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 16 }}>✓</span>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.greenDark }}>判断イベントはすべて処理済み</div>
          </div>
          <div style={{
            fontSize: 12, color: C.textMuted, lineHeight: 1.6,
            padding: '8px 10px', background: C.white, borderRadius: 8,
            border: `1px solid ${C.green}20`,
          }}>
            あとは家計の推移を確認しながら、「退職まで一括試算」で退職時の資産を確認しましょう。
          </div>
        </div>
        {upcoming.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {upcoming.map((ev, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 12px', borderRadius: 10,
                background: C.white, border: `1px solid ${C.green}25`,
              }}>
                <div style={{ flexShrink: 0 }}><SimIcon emoji={ev.icon} size={18} color="#374151" /></div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{ev.label}</span>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 700, color: C.greenDark,
                  background: `${C.green}18`, borderRadius: 6, padding: '2px 8px',
                }}>
                  {ev.age}歳
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: C.textMuted, textAlign: 'center' }}>
            予定イベントはありません
          </div>
        )}
      </div>
    );
  }

  const yearsUntil = nextEvent.age - currentAge;
  const catMeta = CATEGORY_META[nextEvent.event.category] ?? CATEGORY_META.life;

  return (
    <div style={{
      background:   C.white,
      borderRadius: 18,
      border:       `1.5px solid ${C.amber}60`,
      marginBottom: 12,
      overflow:     'hidden',
    }}>
      {/* ヘッダー帯 */}
      <div style={{
        background: `linear-gradient(135deg, #fffbeb, #fef3c7)`,
        padding:    '12px 16px',
        borderBottom: `1px solid ${C.amber}30`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <SimIcon emoji={nextEvent.event.icon} size={24} color="#374151" />
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 6,
            background: catMeta.bg, color: catMeta.color,
            fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', marginBottom: 3,
          }}>
            次のイベント
          </div>
          <div style={{ fontSize: 15, fontWeight: 900, color: C.text, lineHeight: 1.3 }}>
            {nextEvent.event.title}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#d97706', lineHeight: 1 }}>
            {nextEvent.age}<span style={{ fontSize: 12, marginLeft: 2, fontWeight: 600 }}>歳</span>
          </div>
          <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 600 }}>
            あと{yearsUntil === 0 ? '今年' : `${yearsUntil}年`}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// fmtAsset — 資産フォーマット
// ─────────────────────────────────────────────────────────────
const fmtAsset = (n) => {
  if (n == null) return '—';
  const abs = Math.abs(Math.round(n));
  if (abs >= 10000) return `${n < 0 ? '−' : ''}${(abs / 10000).toFixed(1)}億円`;
  return `${n < 0 ? '−' : ''}${abs.toLocaleString()}万円`;
};

// ─────────────────────────────────────────────────────────────
// SimulationScreen
// ─────────────────────────────────────────────────────────────
export const SimulationScreen = ({ onBack, onFinish }) => {
  const { state, actions } = useAppStore();
  const {
    profileData,
    currentGauge,
    simCurrentAge,
    triggeredEvents,
    selectedChoices,
    pendingEvent,
  } = state;

  const profile     = profileData;
  const startAge    = profile.currentAge ?? 30;
  const retireAge   = profile.retirementAge ?? 65;
  const currentAge  = simCurrentAge ?? startAge;

  // 進捗率（0〜1）
  const progress = Math.max(0, Math.min(1, (currentAge - startAge) / (retireAge - startAge)));

  // 次のイベント
  const nextEventInfo = React.useMemo(
    () => getNextEvent(currentAge + 1, profile, triggeredEvents),
    [currentAge, profile, triggeredEvents],
  );

  // pendingEvent の choices を動的選択肢で上書き（住宅・車のみ）
  // 固定価格テンプレートではなく profileData の想定価格を基準に生成する
  const effectiveEvent = React.useMemo(() => {
    if (!pendingEvent) return null;
    if (pendingEvent.id === 'housing') {
      return { ...pendingEvent, choices: getHousingEventOptions(profileData) };
    }
    if (pendingEvent.id.startsWith('car_')) {
      return { ...pendingEvent, choices: getCarEventOptions(profileData) };
    }
    return pendingEvent;
  }, [pendingEvent, profileData]);

  // 現在資産（シミュレーションから計算）
  const simRows = React.useMemo(() => {
    try {
      const { rows } = runFullSimulation(profile, selectedChoices);
      return rows;
    } catch {
      return [];
    }
  }, [profile, selectedChoices]);

  const currentAsset = React.useMemo(() => {
    const row = simRows.find(r => r.age === currentAge);
    return row?.totalAssets ?? null;
  }, [simRows, currentAge]);

  // ── 動的スコア計算（4指標を年次シミュレーション行から毎年再計算） ──
  const dynamicGaugeResult = React.useMemo(() => {
    return calcDynamicScoreFromRows(simRows, currentAge, retireAge);
  }, [simRows, currentAge, retireAge]);

  // 表示用ゲージ: シミュレーション行があれば動的値を使用、なければストア値にフォールバック
  const displayGauge = dynamicGaugeResult?.gauge ?? currentGauge;

  // ゲージのステータス
  const gaugeStatus = gaugeToStatus(displayGauge);
  const gaugeColor  = gaugeToColor(displayGauge);
  const gaugeGrad   = gaugeToGradient(displayGauge);

  // 初期化（初回マウント時）
  React.useLayoutEffect(() => {
    // 画面最上部にスクロール（前画面の位置をリセット）
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);
  React.useEffect(() => {
    if (simCurrentAge === null) {
      actions.setSimAge(startAge);
    }
  }, []);

  // ─── 指定年齢へ進む（共通処理） ─────────────────────────
  const advanceTo = (targetAge) => {
    if (pendingEvent) return;
    if (targetAge > retireAge) { handleFinish(); return; }

    const events = getEventsForAge(targetAge, profile, triggeredEvents);
    actions.setSimAge(targetAge);

    if (events.length > 0) {
      actions.setPendingEvent({ ...events[0], _queuedAge: targetAge });
    }
  };

  // ─── +1年 / -1年 ─────────────────────────────────────────
  const handleAdvance  = () => advanceTo(currentAge + 1);
  const handleGoBack1  = () => {
    if (pendingEvent) return;
    const prevAge = Math.max(startAge, currentAge - 1);
    actions.setSimAge(prevAge);
  };

  // ─── 次のイベント（またはリタイア）まで進む ──────────────
  const handleSkipToNext = () => {
    if (pendingEvent) return;
    const targetAge = nextEventInfo ? nextEventInfo.age : retireAge;
    if (targetAge <= currentAge) { handleFinish(); return; }
    advanceTo(Math.min(targetAge, retireAge));
  };

  // ─── イベント選択処理 ────────────────────────────────────
  const handleSelect = (choice) => {
    if (!pendingEvent) return;

    const choiceAge = pendingEvent._queuedAge ?? currentAge;

    // 繰り返しイベントの減衰を適用（視覚ゲージ専用。シミュ計算には影響しない）
    const dampedDelta = getDampedDelta(choice.gaugeDelta, pendingEvent.id, selectedChoices);

    actions.selectChoice({
      eventId:       pendingEvent.id,
      choiceId:      choice.id,
      label:         choice.label,
      gaugeDelta:    choice.gaugeDelta,    // raw 保存（シミュレーションエンジン参照用）
      selectedPrice: choice.selectedPrice ?? null, // 住宅・車の動的選択価格
      age:           choiceAge,
    });

    actions.deltaGauge(dampedDelta);   // 減衰済みデルタでゲージを更新
    actions.triggerEvent(pendingEvent.id);
  };

  // ─── 結果画面へ ───────────────────────────────────────────
  const handleFinish = () => {
    const result = runFullSimulation(profile, selectedChoices);
    actions.setResult(result);

    // 前回プランをlocalStorageに保存（ホーム画面表示用）
    try {
      const savedPlan = {
        date: new Date().toLocaleDateString('ja-JP'),
        score: result.fourIndicators?.householdSafety?.score ?? result.safetySummary?.gauge ?? 0,
        status: result.fourIndicators?.householdSafety?.status ?? '',
        lifeType: profile.lifeType ?? 'couple',
        age: profile.currentAge ?? 30,
        housingAge: profile.housingPurchaseAge ?? null,
      };
      const existing = JSON.parse(localStorage.getItem('miraiTreePlans') ?? '[]');
      existing.unshift(savedPlan);
      localStorage.setItem('miraiTreePlans', JSON.stringify(existing.slice(0, 5)));
      localStorage.setItem('miraiTreeLastResult', JSON.stringify({ result, profile, selectedChoices }));
    } catch (_) {}

    if (typeof onFinish === 'function') onFinish();
    else actions.setScreen('result');
  };

  const handleBack = () => {
    if (typeof onBack === 'function') onBack();
    else actions.setScreen('input');
  };

  const isFinishing = currentAge >= retireAge;

  return (
    <div style={{
      minHeight:  '100vh',
      background: C.bg,
      fontFamily: "'Noto Sans JP', -apple-system, 'Apple Color Emoji', sans-serif",
      paddingBottom: 120,
    }}>

      {/* ── ヘッダー ─────────────────────────────────────────── */}
      <div style={{
        position:      'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background:    'rgba(248,250,251,0.96)',
        backdropFilter:'blur(10px)',
        WebkitBackdropFilter:'blur(10px)',
        borderBottom:  `1px solid ${C.border}`,
        paddingTop:    'env(safe-area-inset-top, 0px)',
      }}>
        <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handleBack} style={{
            width: 36, height: 36, borderRadius: '50%',
            border: `1.5px solid ${C.border}`, background: C.white,
            fontSize: 15, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill={C.textMuted}>
              <path d={SIM_PATHS.chevron} />
            </svg>
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>人生シミュレーション</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>
              {startAge}歳〜{retireAge}歳
            </div>
          </div>
        </div>
      </div>

      {/* ── メインコンテンツ ──────────────────────────────────── */}
      <div style={{
        padding: '16px', maxWidth: 480, margin: '0 auto',
        paddingTop: 'calc(66px + env(safe-area-inset-top, 0px))',
      }}>

        {/* ── タイムラインバー ──────────────────────────────────── */}
        {(() => {
          const totalYears = retireAge - startAge;
          const pctNow = totalYears > 0 ? ((currentAge - startAge) / totalYears) * 100 : 0;
          const nextAge = nextEventInfo?.age ?? null;
          const pctNext = nextAge && totalYears > 0 ? ((nextAge - startAge) / totalYears) * 100 : null;
          return (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: C.textMuted }}>{startAge}歳</span>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 32, fontWeight: 900, color: C.text, lineHeight: 1 }}>{currentAge}</span>
                  <span style={{ fontSize: 14, color: C.textMuted, marginLeft: 3, fontWeight: 600 }}>歳</span>
                </div>
                <span style={{ fontSize: 11, color: C.textMuted }}>{retireAge}歳</span>
              </div>
              <div style={{ position: 'relative', height: 8, background: '#f0f0f0', borderRadius: 99, overflow: 'visible', marginBottom: 4 }}>
                {/* 進捗バー */}
                <div style={{
                  position: 'absolute', top: 0, left: 0,
                  height: '100%', width: `${pctNow}%`,
                  borderRadius: 99,
                  background: `linear-gradient(90deg, ${C.green}, ${C.greenDark})`,
                  transition: 'width 0.5s ease',
                }} />
                {/* 現在地マーカー（●） */}
                <div style={{
                  position: 'absolute', top: '50%', left: `${Math.min(pctNow, 97)}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 14, height: 14, borderRadius: '50%',
                  background: C.greenDark, border: '2px solid #fff',
                  boxShadow: '0 1px 4px rgba(22,163,74,0.5)',
                  zIndex: 2,
                }} />
                {/* 次のイベントマーカー（◆） */}
                {pctNext !== null && (
                  <div style={{
                    position: 'absolute', top: '50%', left: `${Math.min(pctNext, 97)}%`,
                    transform: 'translate(-50%, -50%) rotate(45deg)',
                    width: 10, height: 10,
                    background: '#d97706', border: '2px solid #fff',
                    boxShadow: '0 1px 4px rgba(217,119,6,0.4)',
                    zIndex: 1,
                  }} />
                )}
              </div>
              {nextEventInfo && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.textMuted }}>
                  <span />
                  <span style={{ color: '#d97706', fontWeight: 600 }}>◆ {nextEventInfo.age}歳 {nextEventInfo.event?.title}</span>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── 家計安全度ゲージ ──────────────────────────────────── */}
        <div style={{
          background: '#fff', borderRadius: 16, padding: '14px 18px',
          border: `1.5px solid ${gaugeColor}30`, marginBottom: 12,
          boxShadow: `0 2px 12px ${gaugeColor}18`,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: '0.08em', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
              <span>家計安全度</span>
              <span style={{
                padding: '1px 8px', borderRadius: 999,
                background: gaugeStatus.bg, color: gaugeColor,
                fontSize: 10, fontWeight: 800,
              }}>{gaugeStatus.label}</span>
            </div>
            <div style={{ height: 8, background: '#f0f0f0', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${displayGauge}%`, borderRadius: 99,
                background: gaugeColor,
                transition: 'width 0.6s cubic-bezier(0.34,1.2,0.64,1), background 0.4s ease',
              }} />
            </div>
            {dynamicGaugeResult && (
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <span style={{ fontSize: 10, color: '#9ca3af' }}>
                  収支余剰率 <strong style={{ color: dynamicGaugeResult.surplusRate >= 0 ? C.greenDark : C.red }}>
                    {dynamicGaugeResult.surplusRatePct >= 0 ? '+' : ''}{dynamicGaugeResult.surplusRatePct}%
                  </strong>
                </span>
                <span style={{ fontSize: 10, color: '#9ca3af' }}>
                  防衛資金 <strong style={{ color: dynamicGaugeResult.emergencyMonths >= 6 ? C.greenDark : C.amber }}>
                    {dynamicGaugeResult.emergencyMonths}ヶ月
                  </strong>
                </span>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: gaugeColor, lineHeight: 1, transition: 'color 0.4s ease' }}>{displayGauge}</div>
            <div style={{ fontSize: 10, color: '#9ca3af' }}>/ 100</div>
          </div>
        </div>

        {/* ── 4枚ステータスカード ──────────────────────────────── */}
        {(() => {
          const curRow = simRows.find(r => r.age === currentAge);
          const monthlySurplus = curRow ? (curRow.totalIncome - curRow.totalExpense) / 12 : null;
          const annualSavings = curRow ? Math.max(0, curRow.totalIncome - curRow.totalExpense) : null;
          const yearsToNext = nextEventInfo ? nextEventInfo.age - currentAge : null;
          return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {/* 試算資産 */}
              <div style={{ padding: '12px 14px', background: C.white, borderRadius: 14, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, marginBottom: 4 }}>試算資産</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: currentAsset != null && currentAsset < 0 ? C.red : C.greenDark, lineHeight: 1.2 }}>
                  {currentAsset != null ? fmtAsset(currentAsset) : '—'}
                </div>
                <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>{currentAge}歳時点</div>
              </div>
              {/* 月間余剰 */}
              <div style={{ padding: '12px 14px', background: C.white, borderRadius: 14, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, marginBottom: 4 }}>月間余剰</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: monthlySurplus != null && monthlySurplus < 0 ? C.red : C.greenDark, lineHeight: 1.2 }}>
                  {monthlySurplus != null ? `${monthlySurplus >= 0 ? '+' : ''}${Math.round(monthlySurplus * 10) / 10}万` : '—'}
                </div>
                <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>現時点の収支</div>
              </div>
              {/* 年間積立見込み */}
              <div style={{ padding: '12px 14px', background: C.white, borderRadius: 14, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, marginBottom: 4 }}>年間積立見込み</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: C.greenDark, lineHeight: 1.2 }}>
                  {annualSavings != null ? `${Math.round(annualSavings)}万` : '—'}
                </div>
                <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>/ 年</div>
              </div>
              {/* 次イベントまで */}
              <div style={{ padding: '12px 14px', background: C.white, borderRadius: 14, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, marginBottom: 4 }}>次イベントまで</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: yearsToNext != null ? '#d97706' : C.textMuted, lineHeight: 1.2 }}>
                  {yearsToNext != null ? `${yearsToNext}年` : 'なし'}
                </div>
                <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>
                  {nextEventInfo ? `${nextEventInfo.age}歳・${nextEventInfo.event?.title}` : '全イベント処理済み'}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── 次のイベント（主役カード） ─────────────────────── */}
        <NextEventCard
          nextEvent={nextEventInfo}
          currentAge={currentAge}
          onJump={handleSkipToNext}
          disabled={!!pendingEvent}
          profile={profile}
          retireAge={retireAge}
        />

        {/* ── 選択履歴 ──────────────────────────────────────── */}
        <ChoiceHistory selectedChoices={selectedChoices} />

      </div>

      {/* ── 固定フッターボタン ────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '12px 20px',
        paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
        background: 'rgba(248,250,251,0.96)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderTop: `1px solid ${C.border}`,
      }}>
        {isFinishing ? (
          // ── 退職年齢到達 → 結果を見るボタン ──────────────
          <button onClick={handleFinish} style={{
            width: '100%', maxWidth: 440, display: 'block', margin: '0 auto',
            padding: '17px', borderRadius: 999, border: 'none',
            background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`,
            color: '#fff', fontSize: 16, fontWeight: 700,
            cursor: 'pointer', letterSpacing: '0.08em',
            boxShadow: `0 8px 24px ${C.green}40`,
          }}>
            安全判定を見る →
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 440, margin: '0 auto' }}>

            {/* ── メイン: 次のイベントへ進む（大ボタン） ── */}
            <button
              onClick={handleSkipToNext}
              disabled={!!pendingEvent}
              style={{
                width:        '100%',
                padding:      '16px',
                borderRadius: 999,
                border:       'none',
                background:   pendingEvent
                  ? '#d1d5db'
                  : `linear-gradient(135deg, ${C.green}, ${C.greenDark})`,
                color:        '#fff',
                fontSize:     16,
                fontWeight:   700,
                cursor:       pendingEvent ? 'default' : 'pointer',
                letterSpacing:'0.06em',
                boxShadow:    pendingEvent ? 'none' : `0 6px 20px ${C.green}38`,
              }}
            >
              {nextEventInfo
                ? `次のイベントへ進む → ${nextEventInfo.age}歳・${nextEventInfo.event?.title ?? ''}`
                : '退職まで一括試算 →'
              }
            </button>

            {/* ── サブ行: 戻る + +1年進む ── */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleGoBack1}
                disabled={currentAge <= startAge || !!pendingEvent}
                style={{
                  flexShrink:   0,
                  padding:      '9px 16px',
                  borderRadius: 999,
                  border:       `1px solid ${C.border}`,
                  background:   'transparent',
                  color:        (currentAge <= startAge || !!pendingEvent) ? '#d1d5db' : C.textMuted,
                  fontSize:     12,
                  fontWeight:   600,
                  cursor:       (currentAge <= startAge || !!pendingEvent) ? 'default' : 'pointer',
                  letterSpacing:'0.02em',
                }}
              >
                -1年戻る
              </button>
              <button
                onClick={handleAdvance}
                disabled={!!pendingEvent}
                style={{
                  flex:         1,
                  padding:      '9px',
                  borderRadius: 999,
                  border:       `1px solid ${C.border}`,
                  background:   'transparent',
                  color:        pendingEvent ? '#d1d5db' : C.textMuted,
                  fontSize:     12,
                  fontWeight:   600,
                  cursor:       pendingEvent ? 'default' : 'pointer',
                  letterSpacing:'0.02em',
                }}
              >
                +1年進む（{currentAge + 1}歳へ）
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── イベントカードモーダル ─────────────────────────────── */}
      {effectiveEvent && (
        <EventCard
          event={effectiveEvent}
          currentGauge={displayGauge}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
};
