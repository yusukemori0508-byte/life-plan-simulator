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
import { applyGaugeDelta, gaugeToColor, gaugeToGradient, gaugeToStatus } from '../gaugeCalc.js';
import { runFullSimulation } from '../simulationEngine.js';

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
          padding:      '12px 20px 40px',
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
            <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 10 }}>{event.icon}</div>
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
                <span style={{ fontSize: 16, flexShrink: 0 }}>{ev.icon}</span>
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
        <span style={{ fontSize: 24 }}>{nextEvent.event.icon}</span>
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

  // ゲージのステータス
  const gaugeStatus = gaugeToStatus(currentGauge);
  const gaugeColor  = gaugeToColor(currentGauge);
  const gaugeGrad   = gaugeToGradient(currentGauge);

  // 初期化（初回マウント時）
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
      eventId:    pendingEvent.id,
      choiceId:   choice.id,
      label:      choice.label,
      gaugeDelta: choice.gaugeDelta,   // raw 保存（シミュレーションエンジン参照用）
      age:        choiceAge,
    });

    actions.deltaGauge(dampedDelta);   // 減衰済みデルタでゲージを更新
    actions.triggerEvent(pendingEvent.id);
  };

  // ─── 結果画面へ ───────────────────────────────────────────
  const handleFinish = () => {
    const result = runFullSimulation(profile, selectedChoices);
    actions.setResult(result);

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
      fontFamily: '-apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif',
      paddingBottom: 120,
    }}>

      {/* ── ヘッダー ─────────────────────────────────────────── */}
      <div style={{
        position:      'sticky', top: 0, zIndex: 50,
        background:    'rgba(248,250,251,0.96)',
        backdropFilter:'blur(10px)',
        WebkitBackdropFilter:'blur(10px)',
        borderBottom:  `1px solid ${C.border}`,
        padding:       '14px 20px',
        display:       'flex',
        alignItems:    'center',
        gap:           12,
      }}>
        <button onClick={handleBack} style={{
          width: 36, height: 36, borderRadius: '50%',
          border: `1.5px solid ${C.border}`, background: C.white,
          fontSize: 15, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: C.textMuted,
        }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>人生シミュレーション</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>
            {startAge}歳〜{retireAge}歳
          </div>
        </div>
      </div>

      {/* ── メインコンテンツ ──────────────────────────────────── */}
      <div style={{ padding: '16px', maxWidth: 480, margin: '0 auto' }}>

        {/* ── 年齢・進捗バー ─────────────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: C.textMuted }}>{startAge}歳</span>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: C.text, lineHeight: 1 }}>
                {currentAge}
              </span>
              <span style={{ fontSize: 14, color: C.textMuted, marginLeft: 3, fontWeight: 600 }}>歳</span>
            </div>
            <span style={{ fontSize: 11, color: C.textMuted }}>{retireAge}歳</span>
          </div>
          <div style={{ height: 6, background: '#f0f0f0', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress * 100}%`,
              borderRadius: 99,
              background: `linear-gradient(90deg, ${C.green}, ${C.greenDark})`,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* ── 安全判定パネル ─────────────────────────────────── */}
        <div style={{
          background:   C.white,
          borderRadius: 20,
          padding:      '18px 20px',
          border:       `1.5px solid ${gaugeColor}30`,
          marginBottom: 12,
        }}>
          {/* ステータスバッジ + 現在資産 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{
              padding:      '4px 14px',
              borderRadius: 999,
              background:   gaugeStatus.bg,
              color:        gaugeStatus.color,
              fontSize:     13,
              fontWeight:   800,
              border:       `1.5px solid ${gaugeStatus.color}40`,
            }}>
              {gaugeStatus.label}
            </div>
            {currentAsset !== null && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, marginBottom: 2 }}>試算資産</div>
                <div style={{
                  fontSize:   17,
                  fontWeight: 800,
                  color:      currentAsset < 0 ? C.red : C.text,
                  lineHeight: 1,
                }}>
                  {fmtAsset(currentAsset)}
                </div>
              </div>
            )}
          </div>

          {/* ゲージバー */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: '0.06em' }}>生活安全度</span>
              <span style={{ fontSize: 24, fontWeight: 900, color: gaugeColor, lineHeight: 1 }}>{currentGauge}</span>
            </div>
            <div style={{ height: 10, background: '#f0f0f0', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${currentGauge}%`,
                borderRadius: 99, background: gaugeGrad,
                transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.textMuted, marginTop: 3 }}>
              <span>高リスク</span><span>要見直し</span><span>慎重</span><span>安全圏</span>
            </div>
          </div>
        </div>

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
        padding: '12px 20px 32px',
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
                ? `次のイベントへ進む（${nextEventInfo.age}歳）`
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
      {pendingEvent && (
        <EventCard
          event={pendingEvent}
          currentGauge={currentGauge}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
};
