// src/components/TimelineScreen.jsx
// 人生タイムライン画面
// selectedChoices（イベント選択）と profileData（マイルストーン）を時系列に表示

import React from 'react';
import { useAppStore } from '../store/useAppStore.jsx';
import { runFullSimulation } from '../simulationEngine.js';
import { EVENT_DEFS, CATEGORY_META } from '../eventData.js';
import { gaugeToColor } from '../gaugeCalc.js';

// ─────────────────────────────────────────────────────────────
// カラー定数
// ─────────────────────────────────────────────────────────────
const C = {
  bg:        '#f4f7f4',
  white:     '#ffffff',
  text:      '#111827',
  textMuted: '#6b7280',
  border:    '#e5e7eb',
  green:     '#16a34a',
  greenBg:   '#f0fdf4',
  greenDark: '#14532d',
  amber:     '#f59e0b',
  amberBg:   '#fffbeb',
  red:       '#ef4444',
  redBg:     '#fef2f2',
  purple:    '#8b5cf6',
  purpleBg:  '#f5f3ff',
  blue:      '#0ea5e9',
  blueBg:    '#f0f9ff',
};

// ─────────────────────────────────────────────────────────────
// タイムラインアイテムの種別定義
// ─────────────────────────────────────────────────────────────
const ITEM_STYLES = {
  start:    { dotColor: C.green,  dotBorder: '#bbf7d0', bg: C.greenBg,  textColor: C.greenDark },
  end:      { dotColor: C.green,  dotBorder: '#bbf7d0', bg: C.greenBg,  textColor: C.greenDark },
  event:    { dotColor: '#6b7280', dotBorder: '#e5e7eb', bg: C.white,   textColor: C.text },
  finance:  { dotColor: C.purple, dotBorder: '#ddd6fe', bg: C.purpleBg, textColor: '#5b21b6' },
  warning:  { dotColor: C.red,    dotBorder: '#fecaca', bg: C.redBg,    textColor: '#991b1b' },
  milestone:{ dotColor: C.amber,  dotBorder: '#fde68a', bg: C.amberBg,  textColor: '#92400e' },
};

// ─────────────────────────────────────────────────────────────
// タイムラインアイテムを構築する
// ─────────────────────────────────────────────────────────────
const buildTimelineItems = (profileData, selectedChoices, result) => {
  const items = [];
  const currentAge    = Number(profileData.currentAge    ?? 30);
  const retirementAge = Number(profileData.retirementAge ?? 65);
  const lifespan      = Number(profileData.lifespan      ?? 90);

  // ── スタート ──────────────────────────────────────────────
  items.push({
    age:   currentAge,
    type:  'start',
    icon:  '🌱',
    title: 'シミュレーション開始',
    desc:  `${currentAge}歳からの人生をシミュレート`,
    gaugeDelta: null,
    gauge: null,
  });

  // ── ライフイベント（選択済み） ─────────────────────────────
  if (Array.isArray(selectedChoices)) {
    selectedChoices.forEach((choice) => {
      const eventDef = EVENT_DEFS[choice.eventId]
        ?? Object.values(EVENT_DEFS).find(e => choice.eventId?.startsWith(e.id));
      const catMeta  = eventDef ? CATEGORY_META[eventDef.category] : null;

      items.push({
        age:        Number(choice.age ?? currentAge),
        type:       'event',
        icon:       eventDef?.icon ?? '📌',
        title:      eventDef?.title ?? choice.eventId,
        desc:       choice.label,
        gaugeDelta: choice.gaugeDelta ?? null,
        gauge:      null,
        catColor:   catMeta?.color ?? C.textMuted,
        catLabel:   catMeta?.label ?? '',
        eventId:    choice.eventId,
      });
    });
  }

  // ── 住宅購入マイルストーン ────────────────────────────────
  const hpa = Number(profileData.housingPurchaseAge ?? 0);
  if (hpa > currentAge && !selectedChoices?.some(c => c.eventId === 'housing')) {
    items.push({
      age:   hpa,
      type:  'milestone',
      icon:  '🏠',
      title: '住宅購入（予定）',
      desc:  `${hpa}歳での住宅購入を計画中`,
      gaugeDelta: null,
      gauge: null,
    });
  }

  // ── 退職マイルストーン ────────────────────────────────────
  let retireAssets = null;
  if (result?.rows) {
    const retireRow = result.rows.find(r => r.age === retirementAge);
    if (retireRow) retireAssets = retireRow.totalAssets;
  }
  items.push({
    age:   retirementAge,
    type:  'finance',
    icon:  '🎉',
    title: '退職・年金生活スタート',
    desc:  retireAssets != null
      ? `退職時の総資産: ${Math.abs(Math.round(retireAssets)).toLocaleString()}万円`
      : '退職・年金生活スタート',
    gaugeDelta: null,
    gauge: null,
  });

  // ── 資産枯渇警告 ──────────────────────────────────────────
  const depAge = result?.safetySummary?.depletionAge;
  if (depAge && depAge <= lifespan) {
    items.push({
      age:   depAge,
      type:  'warning',
      icon:  '⚠️',
      title: '資産枯渇の可能性',
      desc:  `このシナリオでは${depAge}歳頃に資産が底をつく可能性があります`,
      gaugeDelta: null,
      gauge: null,
    });
  }

  // ── 最終マイルストーン ────────────────────────────────────
  const finalRow    = result?.rows?.[result.rows.length - 1];
  const finalAssets = finalRow?.totalAssets ?? null;
  items.push({
    age:   lifespan,
    type:  'end',
    icon:  '🌳',
    title: `${lifespan}歳時点のあなたの木`,
    desc:  finalAssets != null
      ? `最終資産: ${Math.abs(Math.round(finalAssets)).toLocaleString()}万円`
      : `${lifespan}歳まで人生をシミュレート`,
    gaugeDelta: null,
    gauge: null,
  });

  // ── 年齢順ソート ──────────────────────────────────────────
  items.sort((a, b) => {
    if (a.age !== b.age) return a.age - b.age;
    // 同じ年齢ならスタート・エンドを先頭・末尾に
    const order = { start: -1, end: 1 };
    return (order[a.type] ?? 0) - (order[b.type] ?? 0);
  });

  return items;
};

// ─────────────────────────────────────────────────────────────
// ゲージ差分バッジ
// ─────────────────────────────────────────────────────────────
const GaugeBadge = ({ delta }) => {
  if (delta == null) return null;
  const positive = delta > 0;
  const color  = positive ? C.green : C.red;
  const bg     = positive ? C.greenBg : C.redBg;
  const prefix = positive ? '+' : '';
  return (
    <span style={{
      fontSize:     10,
      fontWeight:   800,
      color,
      background:   bg,
      border:       `1px solid ${positive ? '#bbf7d0' : '#fecaca'}`,
      borderRadius: 999,
      padding:      '2px 7px',
      letterSpacing:'0.03em',
      flexShrink:   0,
    }}>
      {prefix}{delta}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// タイムラインの1アイテム
// ─────────────────────────────────────────────────────────────
const TimelineItem = ({ item, isLast }) => {
  const style  = ITEM_STYLES[item.type] ?? ITEM_STYLES.event;
  const isEdge = item.type === 'start' || item.type === 'end';

  return (
    <div style={{ display: 'flex', gap: 14, marginBottom: isLast ? 0 : 0 }}>

      {/* 縦線 + ドット */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
        <div style={{
          width:        28,
          height:       28,
          borderRadius: '50%',
          background:   style.dotColor,
          border:       `3px solid ${style.dotBorder}`,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          fontSize:     14,
          flexShrink:   0,
          zIndex:       1,
          boxShadow:    isEdge ? `0 0 0 4px ${style.dotBorder}` : 'none',
        }}>
          <span style={{ lineHeight: 1 }}>{item.icon}</span>
        </div>
        {!isLast && (
          <div style={{
            width:      2,
            flex:       1,
            minHeight:  32,
            background: 'linear-gradient(180deg, #d1fae5 0%, #e5e7eb 100%)',
            margin:     '4px 0',
          }} />
        )}
      </div>

      {/* カード */}
      <div style={{
        flex:         1,
        background:   isEdge ? style.bg : C.white,
        border:       `1px solid ${isEdge ? style.dotBorder : C.border}`,
        borderRadius: 16,
        padding:      '12px 14px',
        marginBottom: isLast ? 0 : 14,
      }}>
        {/* ヘッダ行 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
          {/* 年齢バッジ */}
          <span style={{
            fontSize:     10,
            fontWeight:   700,
            color:        C.textMuted,
            background:   '#f3f4f6',
            borderRadius: 999,
            padding:      '2px 8px',
            letterSpacing:'0.04em',
          }}>
            {item.age}歳
          </span>
          {/* カテゴリバッジ（イベントのみ） */}
          {item.catLabel && (
            <span style={{
              fontSize:     10,
              fontWeight:   700,
              color:        item.catColor,
              background:   `${item.catColor}18`,
              borderRadius: 999,
              padding:      '2px 7px',
            }}>
              {item.catLabel}
            </span>
          )}
          {/* ゲージ変化バッジ */}
          <GaugeBadge delta={item.gaugeDelta} />
        </div>

        {/* タイトル */}
        <div style={{
          fontSize:   14,
          fontWeight: 800,
          color:      isEdge ? style.textColor : C.text,
          lineHeight: 1.35,
          marginBottom: 3,
        }}>
          {item.title}
        </div>

        {/* 説明 */}
        <div style={{
          fontSize:   12,
          color:      item.type === 'warning' ? style.textColor : C.textMuted,
          lineHeight: 1.5,
          fontWeight: item.type === 'warning' ? 600 : 400,
        }}>
          {item.desc}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// TimelineScreen 本体
// ─────────────────────────────────────────────────────────────
export const TimelineScreen = ({ onBack }) => {
  const { state, actions } = useAppStore();
  const { profileData, selectedChoices, resultData, currentGauge } = state;

  // resultData がストアになければここで計算
  const result = React.useMemo(() => {
    if (resultData?.safetySummary) return resultData;
    return runFullSimulation(profileData, selectedChoices ?? []);
  }, [resultData, profileData, selectedChoices]);

  const items = React.useMemo(
    () => buildTimelineItems(profileData, selectedChoices ?? [], result),
    [profileData, selectedChoices, result],
  );

  // イベント数のサマリー
  const eventCount   = (selectedChoices ?? []).length;
  const positiveCount= (selectedChoices ?? []).filter(c => (c.gaugeDelta ?? 0) > 0).length;
  const negativeCount= (selectedChoices ?? []).filter(c => (c.gaugeDelta ?? 0) < 0).length;
  const finalGauge   = result?.safetySummary?.gauge ?? currentGauge ?? 50;
  const gaugeColor   = gaugeToColor(finalGauge);

  React.useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{
      minHeight:  '100vh',
      background: C.bg,
      fontFamily: "'Noto Sans JP', -apple-system, 'Apple Color Emoji', sans-serif",
      paddingBottom: 40,
    }}>

      {/* ── ヘッダ ─────────────────────────────────────────── */}
      <div style={{
        background:   C.white,
        borderBottom: `1px solid ${C.border}`,
        padding:      `calc(env(safe-area-inset-top, 16px) + 12px) 20px 14px`,
        position:     'sticky',
        top:          0,
        zIndex:       10,
        display:      'flex',
        alignItems:   'center',
        gap:          12,
      }}>
        <button
          onClick={onBack}
          style={{
            border: 'none', background: '#f3f4f6', cursor: 'pointer',
            width: 36, height: 36, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: C.text, flexShrink: 0,
          }}
        >←</button>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>人生タイムライン</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>あなたの選択の軌跡</div>
        </div>
      </div>

      <div style={{ padding: '20px 20px 0', maxWidth: 520, margin: '0 auto' }}>

        {/* ── サマリーカード ─────────────────────────────────── */}
        <div style={{
          background:    C.white,
          borderRadius:  20,
          padding:       '16px 20px',
          border:        `1px solid ${C.border}`,
          marginBottom:  24,
          display:       'flex',
          gap:           0,
        }}>
          {[
            { label: '選択したイベント', value: `${eventCount}件`, color: C.text },
            { label: 'プラス選択', value: `${positiveCount}件`, color: C.green },
            { label: 'マイナス選択', value: `${negativeCount}件`, color: C.red },
            { label: '最終スコア', value: `${finalGauge}`, color: gaugeColor },
          ].map((item, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', borderRight: i < 3 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: item.color, lineHeight: 1.2 }}>{item.value}</div>
              <div style={{ fontSize: 9, color: C.textMuted, marginTop: 3, fontWeight: 600, letterSpacing: '0.03em' }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* ── タイムライン ──────────────────────────────────── */}
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: C.textMuted }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>タイムラインがありません</div>
            <div style={{ fontSize: 13 }}>シミュレーションを実行してください</div>
          </div>
        ) : (
          items.map((item, idx) => (
            <TimelineItem
              key={`${item.age}-${idx}`}
              item={item}
              isLast={idx === items.length - 1}
            />
          ))
        )}

        {/* ── 再シミュレーションボタン ──────────────────────── */}
        <button
          onClick={() => actions.setScreen('input')}
          style={{
            width:         '100%',
            marginTop:     28,
            border:        `1.5px solid ${C.border}`,
            borderRadius:  999,
            padding:       '14px 24px',
            fontSize:      14,
            fontWeight:    800,
            color:         C.green,
            background:    C.white,
            cursor:        'pointer',
            letterSpacing: '0.03em',
          }}
        >
          🔄 条件を変えて再シミュレーション
        </button>
      </div>
    </div>
  );
};
